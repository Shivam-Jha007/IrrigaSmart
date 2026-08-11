import type { CropName } from '../types';
import type { DiseaseId } from './diseaseKnowledge';

/**
 * Photo-model class map (V1.7 item 16).
 *
 * Translates the 23 raw class strings emitted by
 * `public/models/plant-disease-mobilenetv3.onnx` into something the UI can show
 * a farmer. Pure data and pure functions — no ONNX, no DOM, no fetch — so the
 * whole mapping is testable without loading a 6 MB model
 * (docs/09_AI_Implementation_Guide.md: keep I/O at the edge).
 *
 * PRODUCT BOUNDARY (docs/12_Product_Roadmap_v2.md §Product Boundaries —
 * permanent, and explicitly extended to image features). Nothing in this module
 * names a chemical, states a dose, or asserts that a disease is present. A class
 * here means "the photo resembles the training photos of X", never "you have X".
 * The wording lives in i18n; this module only ever yields an identifier.
 *
 * WHY THE MODEL'S CLASSES ARE NOT FOLDED INTO `DiseaseId`
 * `DiseaseId` is the union of weather-driven diseases, and every member of it
 * carries a temperature/humidity infection window in CROP_DISEASES. The photo
 * model knows twelve conditions that have no such window — spider mites are not
 * a disease at all, and two of the five plants it was trained on (apple, bell
 * pepper) are not crops this app supports. Widening `DiseaseId` with members
 * that cannot appear in `CROP_DISEASES` would make that record a lie and push an
 * "impossible" branch into every consumer of the weather path. So the overlap
 * REUSES `DiseaseId` — the farmer gets the where-to-look/what-to-look-for text
 * already written and already translated into five languages — and the
 * remainder gets its own `VisionLabelId`, which exists only on the photo path.
 */

/** The five plants in the training set. Not all are crops this app supports. */
export type VisionPlant = 'Apple' | 'Maize' | 'PepperBell' | 'Potato' | 'Tomato';

/**
 * A condition the photo model knows that has no `DiseaseId`, because it has no
 * weather infection window in the knowledge base. i18n key suffix.
 */
export type VisionLabelId =
  | 'appleScab'
  | 'appleBlackRot'
  | 'cedarAppleRust'
  | 'grayLeafSpot'
  | 'pepperBacterialSpot'
  | 'tomatoBacterialSpot'
  | 'tomatoLeafMould'
  | 'septoriaLeafSpot'
  | 'spiderMites'
  | 'targetSpot'
  | 'tomatoYellowLeafCurlVirus'
  | 'tomatoMosaicVirus';

/**
 * What a class means.
 *
 * `known` reuses the weather-path knowledge (same disease, same five-language
 * text). `visionOnly` is a condition only the camera can reach. `healthy` is a
 * state in its own right, deliberately not modelled as "no disease found" —
 * "this leaf looks like the healthy training photos" and "the model could not
 * tell" are different messages and must not collapse into one.
 */
export type VisionFinding =
  | { readonly kind: 'healthy' }
  | { readonly kind: 'known'; readonly disease: DiseaseId }
  | { readonly kind: 'visionOnly'; readonly label: VisionLabelId };

export interface VisionClass {
  /** The plant the class belongs to. */
  readonly plant: VisionPlant;
  /** The app crop this plant is, or null when the app does not grow it. */
  readonly appCrop: CropName | null;
  readonly finding: VisionFinding;
}

/**
 * The 23 classes, keyed by the EXACT string in `plant-disease-labels.json`.
 *
 * The keys are transcribed verbatim from the PlantVillage folder names and are
 * inconsistent on purpose — `Potato___Early_blight` has three underscores while
 * `Tomato_Early_blight` has one, `Corn_(maize)___Common_rust_` carries a
 * trailing underscore, and `Tomato__Target_Spot` has two. Do not tidy them.
 * A single "corrected" character silently unmaps a class, and the failure mode
 * is a farmer being shown nothing. `diseaseVisionMap.test.ts` reads the manifest
 * off disk and asserts these keys equal it exactly, so drift fails the build
 * rather than the field.
 */
export const VISION_CLASSES: Readonly<Record<string, VisionClass>> = {
  // --- Apple: not a crop this app supports ---------------------------------
  Apple___Apple_scab: {
    plant: 'Apple',
    appCrop: null,
    finding: { kind: 'visionOnly', label: 'appleScab' },
  },
  Apple___Black_rot: {
    plant: 'Apple',
    appCrop: null,
    finding: { kind: 'visionOnly', label: 'appleBlackRot' },
  },
  Apple___Cedar_apple_rust: {
    plant: 'Apple',
    appCrop: null,
    finding: { kind: 'visionOnly', label: 'cedarAppleRust' },
  },
  Apple___healthy: { plant: 'Apple', appCrop: null, finding: { kind: 'healthy' } },

  // --- Maize: overlaps the app's Maize --------------------------------------
  'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': {
    plant: 'Maize',
    appCrop: 'Maize',
    // Cercospora zeae-maydis has no entry in CROP_DISEASES, so it stays
    // vision-only rather than being forced onto a turcicum/rust identifier it
    // is not. Confusing gray leaf spot with northern leaf blight is the single
    // most common maize misidentification in the field.
    finding: { kind: 'visionOnly', label: 'grayLeafSpot' },
  },
  'Corn_(maize)___Common_rust_': {
    plant: 'Maize',
    appCrop: 'Maize',
    finding: { kind: 'known', disease: 'maizeCommonRust' },
  },
  'Corn_(maize)___Northern_Leaf_Blight': {
    plant: 'Maize',
    appCrop: 'Maize',
    // Same organism as the knowledge base's entry (Exserohilum turcicum);
    // "northern leaf blight" and "turcicum leaf blight" are two names for it.
    finding: { kind: 'known', disease: 'maizeTurcicumLeafBlight' },
  },
  'Corn_(maize)___healthy': { plant: 'Maize', appCrop: 'Maize', finding: { kind: 'healthy' } },

  // --- Bell pepper: not a crop this app supports ----------------------------
  Pepper__bell___Bacterial_spot: {
    plant: 'PepperBell',
    appCrop: null,
    finding: { kind: 'visionOnly', label: 'pepperBacterialSpot' },
  },
  Pepper__bell___healthy: { plant: 'PepperBell', appCrop: null, finding: { kind: 'healthy' } },

  // --- Potato: overlaps the app's Potato ------------------------------------
  Potato___Early_blight: {
    plant: 'Potato',
    appCrop: 'Potato',
    finding: { kind: 'known', disease: 'earlyBlight' },
  },
  Potato___Late_blight: {
    plant: 'Potato',
    appCrop: 'Potato',
    finding: { kind: 'known', disease: 'lateBlight' },
  },
  Potato___healthy: { plant: 'Potato', appCrop: 'Potato', finding: { kind: 'healthy' } },

  // --- Tomato: overlaps the app's Tomato ------------------------------------
  Tomato_Bacterial_spot: {
    plant: 'Tomato',
    appCrop: 'Tomato',
    finding: { kind: 'visionOnly', label: 'tomatoBacterialSpot' },
  },
  Tomato_Early_blight: {
    plant: 'Tomato',
    appCrop: 'Tomato',
    finding: { kind: 'known', disease: 'earlyBlight' },
  },
  Tomato_Late_blight: {
    plant: 'Tomato',
    appCrop: 'Tomato',
    finding: { kind: 'known', disease: 'lateBlight' },
  },
  Tomato_Leaf_Mold: {
    plant: 'Tomato',
    appCrop: 'Tomato',
    finding: { kind: 'visionOnly', label: 'tomatoLeafMould' },
  },
  Tomato_Septoria_leaf_spot: {
    plant: 'Tomato',
    appCrop: 'Tomato',
    finding: { kind: 'visionOnly', label: 'septoriaLeafSpot' },
  },
  Tomato_Spider_mites_Two_spotted_spider_mite: {
    plant: 'Tomato',
    appCrop: 'Tomato',
    // A mite, not a pathogen. It stays vision-only because the knowledge base
    // is a *disease* base; calling it a disease in the UI would be wrong.
    finding: { kind: 'visionOnly', label: 'spiderMites' },
  },
  Tomato__Target_Spot: {
    plant: 'Tomato',
    appCrop: 'Tomato',
    finding: { kind: 'visionOnly', label: 'targetSpot' },
  },
  Tomato__Tomato_YellowLeaf__Curl_Virus: {
    plant: 'Tomato',
    appCrop: 'Tomato',
    finding: { kind: 'visionOnly', label: 'tomatoYellowLeafCurlVirus' },
  },
  Tomato__Tomato_mosaic_virus: {
    plant: 'Tomato',
    appCrop: 'Tomato',
    finding: { kind: 'visionOnly', label: 'tomatoMosaicVirus' },
  },
  Tomato_healthy: { plant: 'Tomato', appCrop: 'Tomato', finding: { kind: 'healthy' } },
};

/**
 * The app crops the current model can say anything about at all.
 *
 * Three of ten. Seven — including Rice, the crop of the app's design persona —
 * have no coverage whatsoever, and the UI must present that as a normal state
 * rather than a failure (see `DiseasePhotoCard`). Derived from VISION_CLASSES
 * rather than written out, so adding a rice model later cannot leave this list
 * stale.
 */
export const COVERED_CROPS: readonly CropName[] = Object.values(VISION_CLASSES)
  .map((entry) => entry.appCrop)
  .filter((crop): crop is CropName => crop !== null)
  .filter((crop, index, all) => all.indexOf(crop) === index);

/** Whether the current model was trained on anything resembling this crop. */
export function visionCoversCrop(crop: CropName): boolean {
  return COVERED_CROPS.includes(crop);
}

/**
 * Look up a raw class string.
 *
 * Returns null for anything not in the manifest instead of throwing: a model
 * swapped under the app's feet must degrade to "cannot read this photo", not
 * crash the dashboard.
 *
 * An own-property check rather than a plain index, because the class name
 * arrives from a JSON file rather than from code. A bare `VISION_CLASSES[raw]`
 * resolves inherited properties, so a manifest listing `constructor` or
 * `toString` yields `Object` — which is truthy, has no `.finding`, and takes
 * down the card that renders it. Caught by a test rather than in the field.
 *
 * `Object.prototype.hasOwnProperty.call` rather than the tidier `Object.hasOwn`
 * because this project targets ES2021 and `Object.hasOwn` is ES2022; raising the
 * whole project's lib for one call site is not a trade worth making.
 */
export function lookupVisionClass(raw: string): VisionClass | null {
  if (!Object.prototype.hasOwnProperty.call(VISION_CLASSES, raw)) return null;
  return VISION_CLASSES[raw] ?? null;
}

/**
 * Minimum confidence before a result is shown as a resemblance at all.
 *
 * The model reports 99.75% held-out accuracy, but that is on PlantVillage
 * laboratory images against uniform backgrounds; published evaluations show
 * accuracy collapsing on real field photographs, and the roadmap's own risk note
 * says a confidently wrong model is worse than none
 * (docs/12_Product_Roadmap_v2.md §Disease Diagnosis from Images). A softmax over
 * 23 classes is near-saturated on in-distribution photos, so a genuinely
 * uncertain reading — the out-of-distribution case, which in the field is the
 * COMMON case — falls well below this. The threshold is set high deliberately:
 * showing nothing is a recoverable disappointment, showing the wrong disease
 * name to someone about to act on it is not.
 */
export const MIN_CONFIDENCE = 0.7;

/**
 * How a result should be presented, decided from the reading plus the farm's
 * crop. This is the whole presentation decision, kept out of the component so
 * it can be asserted directly.
 */
export type VisionVerdict =
  /** Below MIN_CONFIDENCE — say so, ask for a better photo. */
  | { readonly kind: 'unsure'; readonly confidence: number }
  /** Confident, and the class belongs to the crop the farmer selected. */
  | {
      readonly kind: 'match';
      readonly entry: VisionClass;
      readonly confidence: number;
    }
  /**
   * Confident, but the class belongs to a different plant than the farm's crop.
   * Shown with a warning rather than suppressed: it usually means the model is
   * out of its depth, but it may equally mean the farmer photographed a
   * different plant, and silently hiding a reading the model actually produced
   * would be dishonest.
   */
  | {
      readonly kind: 'otherPlant';
      readonly entry: VisionClass;
      readonly confidence: number;
    }
  /** The class string is not in the manifest at all. */
  | { readonly kind: 'unknownClass'; readonly raw: string };

/**
 * Decide what to show for one reading.
 *
 * `crop` is the crop of the selected farm; pass null when no farm is selected,
 * which suppresses the cross-plant warning rather than firing it spuriously.
 */
export function verdictFor(
  raw: string,
  confidence: number,
  crop: CropName | null,
): VisionVerdict {
  const entry = lookupVisionClass(raw);
  if (!entry) return { kind: 'unknownClass', raw };

  // Guard NaN explicitly: `NaN >= MIN_CONFIDENCE` is false, so a NaN would
  // already land in `unsure`, but relying on that reads as an accident.
  if (!Number.isFinite(confidence) || confidence < MIN_CONFIDENCE) {
    return { kind: 'unsure', confidence: Number.isFinite(confidence) ? confidence : 0 };
  }

  if (crop !== null && entry.appCrop !== crop) {
    return { kind: 'otherPlant', entry, confidence };
  }
  return { kind: 'match', entry, confidence };
}
