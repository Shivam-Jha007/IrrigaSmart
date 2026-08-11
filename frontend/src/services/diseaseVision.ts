import type { CropName } from '../types';
// The runtime's WebAssembly binary, as a URL Vite resolves and emits itself.
//
// Without this, ORT derives the .wasm path from the location of its own module,
// which under Vite is the dependency-optimiser's `/node_modules/.vite/deps/`
// directory — where the binary was never copied. The dev server then answers
// that 404 with the SPA fallback, so the runtime receives index.html, and
// instantiation fails with "expected magic word 00 61 73 6d, found 3c 21 64 6f"
// (`<!do`). Importing it as an asset makes the URL Vite's problem rather than
// a guess, and works identically in dev and in a hashed production build.
//
// This is a `?url` import, so it contributes a string, not the runtime — the
// lazy `import()` below still keeps ORT out of the initial chunk.
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import { lookupVisionClass, verdictFor, type VisionVerdict } from './diseaseVisionMap';

/**
 * On-device photo inference (V1.7 item 16).
 *
 * Runs MobileNetV3-Small over a leaf photo entirely in the browser via
 * onnxruntime-web. Nothing leaves the phone: no upload, no API key, no cost per
 * photo, and it works with no network at all — which is why the user chose an
 * on-device model over a hosted vision API (item 18, offline-first).
 *
 * PRODUCT BOUNDARY (docs/12_Product_Roadmap_v2.md §Product Boundaries). This
 * module returns a class and a confidence. It does not diagnose. The UI must
 * phrase every result as a resemblance and route the farmer to their Krishi
 * Vigyan Kendra; see `diseaseVisionMap.MIN_CONFIDENCE` for why an unconfident
 * reading is withheld entirely.
 *
 * SHAPE OF THIS FILE
 * The pure parts — preprocessing arithmetic and argmax — are exported
 * separately from the parts that touch the DOM, the network and the ORT
 * runtime. That split is not cosmetic: the arithmetic is where a silent,
 * plausible-looking bug lives (a channel order swap or a missed /255 still
 * yields confident nonsense rather than an error), so it has to be assertable
 * without a 6 MB model or a GPU in the test runner.
 */

/**
 * The manifest shipped beside the model. Read at runtime rather than compiled
 * in, so retraining with more classes — "we may add the rice model later..or
 * multiple models" — is a file swap, not a code change.
 */
export interface ModelManifest {
  readonly architecture: string;
  readonly imageSize: number;
  readonly normalisation: { readonly mean: readonly number[]; readonly std: readonly number[] };
  readonly onnxAccuracy: number;
  readonly validationImages: number;
  readonly classes: readonly string[];
}

/** One model the app can load. Multi-model-shaped from the start. */
export interface ModelSpec {
  readonly id: string;
  readonly modelUrl: string;
  readonly manifestUrl: string;
}

/**
 * The only model that exists today. A second entry (rice, say) needs no change
 * to anything below — `loadModel` takes the spec.
 */
export const PLANT_DISEASE_MODEL: ModelSpec = {
  id: 'plant-disease-mobilenetv3',
  modelUrl: '/models/plant-disease-mobilenetv3.onnx',
  manifestUrl: '/models/plant-disease-labels.json',
};

/** A raw reading, before the crop-awareness in `verdictFor` is applied. */
export interface Reading {
  readonly classIndex: number;
  readonly rawClass: string;
  readonly confidence: number;
}

export interface VisionResult {
  readonly reading: Reading;
  readonly verdict: VisionVerdict;
  /** Wall-clock inference time, surfaced in dev to catch a pathological device. */
  readonly elapsedMs: number;
}

/** Reasons the feature cannot run, kept as codes so the UI can translate them. */
export type VisionErrorCode =
  /** The model or manifest could not be fetched — first use while offline. */
  | 'modelUnavailable'
  /** The runtime could not start: no WebAssembly, or a blocked wasm fetch. */
  | 'runtimeUnavailable'
  /** The chosen file was not a decodable image. */
  | 'imageUnreadable'
  /** Inference itself threw. */
  | 'inferenceFailed';

export class VisionError extends Error {
  readonly code: VisionErrorCode;
  constructor(code: VisionErrorCode, message: string) {
    super(message);
    this.name = 'VisionError';
    this.code = code;
  }
}

// --- Pure preprocessing ----------------------------------------------------

/**
 * Convert RGBA bytes from a canvas into the NCHW float tensor the model wants.
 *
 * Three transformations, in this order, and every one of them is a place where
 * a wrong-but-silent result comes from:
 *   1. drop alpha — the model has 3 input channels, not 4;
 *   2. scale 0–255 to 0–1 — `ToTensor()` in the training transform did this,
 *      and skipping it feeds values ~255x too large into the normalisation;
 *   3. subtract the ImageNet mean and divide by the std, PER CHANNEL.
 *
 * The output is NCHW — all R values, then all G, then all B — because that is
 * what PyTorch exports expect. Canvas data is interleaved RGBA per pixel, so
 * this is a transpose, not a copy. Getting it wrong produces a tensor that is
 * the right size and the right dtype and completely meaningless: the model will
 * still return a confident-looking class. That is precisely the bug this
 * function exists to make testable.
 *
 * `mean`/`std` come from the manifest rather than being hard-coded, so a model
 * retrained with different normalisation cannot be silently mis-fed.
 */
export function preprocess(
  rgba: Uint8ClampedArray,
  size: number,
  mean: readonly number[],
  std: readonly number[],
): Float32Array {
  const pixels = size * size;
  if (rgba.length !== pixels * 4) {
    throw new VisionError(
      'imageUnreadable',
      `expected ${pixels * 4} RGBA bytes for ${size}x${size}, received ${rgba.length}`,
    );
  }
  if (mean.length !== 3 || std.length !== 3) {
    throw new VisionError(
      'modelUnavailable',
      'manifest normalisation must carry exactly 3 means and 3 stds',
    );
  }

  const out = new Float32Array(pixels * 3);
  for (let i = 0; i < pixels; i += 1) {
    const src = i * 4;
    for (let c = 0; c < 3; c += 1) {
      // `noUncheckedIndexedAccess` makes these possibly-undefined; the length
      // checks above already rule that out, so default rather than branch.
      const value = (rgba[src + c] ?? 0) / 255;
      const m = mean[c] ?? 0;
      const s = std[c] ?? 1;
      // Channel-major: channel c occupies [c*pixels, (c+1)*pixels).
      out[c * pixels + i] = (value - m) / s;
    }
  }
  return out;
}

/**
 * Largest value and its index.
 *
 * Softmax is IN-GRAPH in this export — the output is already a probability
 * distribution, so the winning value IS the confidence and must not be passed
 * through softmax again. Doing so would compress everything towards 1/23 and
 * push every honest reading below MIN_CONFIDENCE, silently disabling the whole
 * feature. Asserted in the tests.
 */
export function argmax(scores: ArrayLike<number>): { index: number; value: number } {
  if (scores.length === 0) {
    throw new VisionError('inferenceFailed', 'model returned an empty output tensor');
  }
  let bestIndex = 0;
  let bestValue = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < scores.length; i += 1) {
    const value = scores[i] ?? Number.NEGATIVE_INFINITY;
    if (value > bestValue) {
      bestValue = value;
      bestIndex = i;
    }
  }
  return { index: bestIndex, value: bestValue };
}

/**
 * Source rectangle for a centre crop to a square.
 *
 * The training images are square; a phone photo is not. Squashing a 4:3 photo
 * into 224x224 distorts every lesion's aspect ratio, so the largest centred
 * square is taken first and then scaled. Centre — rather than top-left —
 * because a farmer framing a leaf puts it in the middle.
 */
export function centreCrop(
  width: number,
  height: number,
): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height);
  return {
    sx: Math.floor((width - side) / 2),
    sy: Math.floor((height - side) / 2),
    side,
  };
}

// --- Runtime edge ----------------------------------------------------------

/**
 * ORT is imported lazily, inside the loader, for one concrete reason: a static
 * import pulls its bundle into the app's initial chunk, so every farmer who
 * never opens the camera — including the seven crops out of ten the model
 * cannot help at all — still pays for it on first paint. The dashboard must
 * stay fast on a low-end phone (docs/05_UI_UX_Spec.md).
 *
 * The `/wasm` entry point, not the default one. The package's default export
 * bundles the WebGPU-capable "jsep" runtime, whose binary is 26.8 MB — four
 * times the model it would run and far past anything defensible on a rural
 * connection. `/wasm` ships the CPU-only binary (13.5 MB), which is the
 * execution provider `startSession` actually asks for; the WebGPU one would
 * never have been used, only downloaded. This is a build-output fact, not a
 * preference — see the asset table in `vite build`.
 */
type Ort = typeof import('onnxruntime-web/wasm');

interface LoadedModel {
  readonly session: import('onnxruntime-web/wasm').InferenceSession;
  readonly manifest: ModelManifest;
  readonly ort: Ort;
}

/**
 * In-flight or settled load, cached per model id.
 *
 * The PROMISE is cached, not the result: two rapid taps must not start two
 * 6 MB downloads and two runtime inits. A rejected load is evicted so a farmer
 * who was offline on the first try can succeed on the second.
 */
const loads = new Map<string, Promise<LoadedModel>>();

async function fetchManifest(url: string): Promise<ModelManifest> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new VisionError('modelUnavailable', `manifest fetch failed: HTTP ${response.status}`);
  }
  return (await response.json()) as ModelManifest;
}

async function startSession(spec: ModelSpec): Promise<LoadedModel> {
  let ort: Ort;
  try {
    ort = await import('onnxruntime-web/wasm');
  } catch (cause) {
    throw new VisionError('runtimeUnavailable', `onnxruntime-web failed to load: ${String(cause)}`);
  }

  const manifest = await fetchManifest(spec.manifestUrl);

  try {
    // Single-threaded WASM on purpose. Cross-origin isolation (COOP/COEP) is
    // required for threads, and enabling it would break the app's cross-origin
    // image and API usage; a MobileNetV3-Small forward pass is a few hundred
    // milliseconds single-threaded, which is well inside what a farmer will
    // wait for after taking a photo.
    ort.env.wasm.numThreads = 1;
    // Point the runtime at the asset Vite emitted; see the import at the top.
    ort.env.wasm.wasmPaths = { wasm: ortWasmUrl };
    const session = await ort.InferenceSession.create(spec.modelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    return { session, manifest, ort };
  } catch (cause) {
    throw new VisionError(
      'runtimeUnavailable',
      `could not create an inference session: ${String(cause)}`,
    );
  }
}

/** Load (or reuse) a model. Safe to call repeatedly and concurrently. */
export function loadModel(spec: ModelSpec = PLANT_DISEASE_MODEL): Promise<LoadedModel> {
  const cached = loads.get(spec.id);
  if (cached) return cached;

  const pending = startSession(spec).catch((error: unknown) => {
    loads.delete(spec.id);
    throw error;
  });
  loads.set(spec.id, pending);
  return pending;
}

/** Whether the model is already resident, so the UI can warn about the download. */
export function modelIsLoaded(spec: ModelSpec = PLANT_DISEASE_MODEL): boolean {
  return loads.has(spec.id);
}

/** Test seam — drops the cache so each test starts from a cold runtime. */
export function resetModelCache(): void {
  loads.clear();
}

/**
 * Decode a file and scale it to `size`x`size`, returning raw RGBA.
 *
 * `createImageBitmap` rather than an `<img>` + object URL: it decodes off the
 * main thread, so the UI does not jank on a 12 MP phone photo, and it honours
 * EXIF orientation with `imageOrientation: 'from-image'` — without which every
 * portrait photo from an iPhone arrives rotated 90 degrees and the model sees a
 * sideways leaf.
 */
export async function decodeToRgba(
  file: Blob,
  size: number,
): Promise<Uint8ClampedArray> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (cause) {
    throw new VisionError('imageUnreadable', `could not decode the image: ${String(cause)}`);
  }

  try {
    const { sx, sy, side } = centreCrop(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new VisionError('imageUnreadable', 'the browser refused a 2D canvas context');
    }
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
    return ctx.getImageData(0, 0, size, size).data;
  } finally {
    // Free the decoded frame promptly; a 12 MP bitmap is ~48 MB, and holding
    // several after repeated photos is enough to be killed on a low-end phone.
    bitmap.close();
  }
}

/**
 * Classify one photo.
 *
 * `crop` is the selected farm's crop, used only to decide presentation
 * (`verdictFor`) — it never filters or biases the model's own output, so the
 * reading stays honest and the UI can say "this looks like a tomato disease,
 * but your field is maize".
 */
export async function classifyPhoto(
  file: Blob,
  crop: CropName | null,
  spec: ModelSpec = PLANT_DISEASE_MODEL,
): Promise<VisionResult> {
  const { session, manifest, ort } = await loadModel(spec);
  const size = manifest.imageSize;
  const rgba = await decodeToRgba(file, size);
  const input = preprocess(rgba, size, manifest.normalisation.mean, manifest.normalisation.std);

  const startedAt = performance.now();
  let scores: ArrayLike<number>;
  try {
    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];
    if (!inputName || !outputName) {
      throw new VisionError('inferenceFailed', 'the model declares no input or output');
    }
    const tensor = new ort.Tensor('float32', input, [1, 3, size, size]);
    const outputs = await session.run({ [inputName]: tensor });
    const output = outputs[outputName];
    if (!output) {
      throw new VisionError('inferenceFailed', `the model produced no "${outputName}" output`);
    }
    scores = output.data as Float32Array;
  } catch (cause) {
    if (cause instanceof VisionError) throw cause;
    throw new VisionError('inferenceFailed', `inference threw: ${String(cause)}`);
  }
  const elapsedMs = performance.now() - startedAt;

  const { index, value } = argmax(scores);
  const rawClass = manifest.classes[index] ?? '';
  const reading: Reading = { classIndex: index, rawClass, confidence: value };

  return { reading, verdict: verdictFor(rawClass, value, crop), elapsedMs };
}

/** Re-exported so the UI imports one module. */
export { lookupVisionClass };
