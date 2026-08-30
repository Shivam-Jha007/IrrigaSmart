import type { CropName } from '../types';
import type { DiseaseId } from './diseaseKnowledge';

/**
 * Photo-model class map (V1.7 item 16; rice classes added in a later retrain).
 *
 * Translates the 27 raw class strings emitted by
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
 * model knows fourteen conditions that have no such window — spider mites are
 * not a disease at all, rice tungro is a virus spread by an insect rather than
 * weather, and two of the six plants it was trained on (apple, bell pepper) are
 * not crops this app supports. Widening `DiseaseId` with members that cannot
 * appear in `CROP_DISEASES` would make that record a lie and push an
 * "impossible" branch into every consumer of the weather path. So the overlap
 * REUSES `DiseaseId` — the farmer gets the where-to-look/what-to-look-for text
 * already written and already translated into five languages — and the
 * remainder gets its own `VisionLabelId`, which exists only on the photo path.
 */

/** The six plants in the training set. Not all are crops this app supports. */
export type VisionPlant = 'Apple' | 'Maize' | 'PepperBell' | 'Potato' | 'Rice' | 'Tomato';

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
  | 'tomatoMosaicVirus'
  | 'riceBrownSpot'
  | 'riceLeafScald'
  | 'riceSheathBlight';

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
 * The 27 classes, keyed by the EXACT string in `plant-disease-labels.json`.
 *
 * The first 23 keys are transcribed verbatim from the PlantVillage folder names
 * and are inconsistent on purpose — `Potato___Early_blight` has three
 * underscores while `Tomato_Early_blight` has one, `Corn_(maize)___Common_rust_`
 * carries a trailing underscore, and `Tomato__Target_Spot` has two. Do not tidy
 * them. A single "corrected" character silently unmaps a class, and the failure
 * mode is a farmer being shown nothing. `diseaseVision.test.ts` reads the
 * manifest off disk and asserts these keys equal it exactly, so drift fails the
 * build rather than the field.
 *
 * The 4 rice keys were added in a later retrain from a separate dataset (rice
 * has no PlantVillage entry), and were named `Rice___<Condition>` to match that
 * same `Plant___Disease` convention rather than the source dataset's own
 * unprefixed folder names (`Blast`, `Brownspot`, ...).
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

  // --- Rice: overlaps the app's Rice, and its design persona's own crop ----
  Rice___Bacterial_leaf_blight: {
    plant: 'Rice',
    appCrop: 'Rice',
    finding: { kind: 'known', disease: 'riceBacterialLeafBlight' },
  },
  Rice___Brown_spot: {
    plant: 'Rice',
    appCrop: 'Rice',
    finding: { kind: 'visionOnly', label: 'riceBrownSpot' },
  },
  Rice___Leaf_blast: {
    plant: 'Rice',
    appCrop: 'Rice',
    finding: { kind: 'known', disease: 'riceBlast' },
  },
  Rice___Leaf_scald: {
    plant: 'Rice',
    appCrop: 'Rice',
    finding: { kind: 'visionOnly', label: 'riceLeafScald' },
  },
  Rice___Sheath_blight: {
    plant: 'Rice',
    appCrop: 'Rice',
    finding: { kind: 'visionOnly', label: 'riceSheathBlight' },
  },
  Rice___healthy: { plant: 'Rice', appCrop: 'Rice', finding: { kind: 'healthy' } },
};

/**
 * The app crops the current model can say anything about at all.
 *
 * Four of ten, now that Rice — the crop of the app's design persona — has
 * coverage. Six still have none, and the UI must present that as a normal
 * state rather than a failure (see `DiseasePhotoCard`). Derived from
 * VISION_CLASSES rather than written out, so a future retrain cannot leave
 * this list stale.
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
 * The plants this model can recognise as HEALTHY. Five of six.
 *
 * Rice is the exception, and it is not a small one. The retrain that added rice
 * drew on a dataset with four disease folders and no healthy folder, so among the
 * rice classes "this leaf is fine" is not a representable output. Feed the model
 * a perfectly healthy rice leaf and the probability mass has nowhere to go but
 * blast, bacterial blight, brown spot, tungro — or another plant entirely. It
 * cannot answer "healthy rice" because no such class exists.
 *
 * A measurement rather than a worry: over six field photographs of diseased rice
 * from Wikimedia, this model put three of them in `Corn_(maize)___healthy` and
 * named a rice condition for the other three. The failure is real in both
 * directions, and the only honest response available to the UI is to say what the
 * model cannot do — see `vision.noHealthyClass`. Per-image numbers are in
 * docs/14_Leaf_Photo_Model_Measurement.md §4.
 *
 * Derived from the class map rather than written out, exactly as COVERED_CROPS
 * is: a retrain that adds a healthy-rice folder must silence the caveat by
 * itself, and one that loses a healthy folder must raise it.
 */
export const PLANTS_WITH_HEALTHY_CLASS: readonly VisionPlant[] = Object.values(VISION_CLASSES)
  .filter((entry) => entry.finding.kind === 'healthy')
  .map((entry) => entry.plant)
  .filter((plant, index, all) => all.indexOf(plant) === index);

/** Whether the model has any healthy class for this plant. */
export function plantHasHealthyClass(plant: VisionPlant): boolean {
  return PLANTS_WITH_HEALTHY_CLASS.includes(plant);
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
 * The model reports 99.76% held-out accuracy, but that is on laboratory-style
 * training images against uniform backgrounds; published evaluations show
 * accuracy collapsing on real field photographs, and the roadmap's own risk note
 * says a confidently wrong model is worse than none
 * (docs/12_Product_Roadmap_v2.md §Disease Diagnosis from Images). A softmax over
 * 27 classes is near-saturated on in-distribution photos, so a genuinely
 * uncertain reading — the out-of-distribution case, which in the field is the
 * COMMON case — falls well below this. The threshold is set high deliberately:
 * showing nothing is a recoverable disappointment, showing the wrong disease
 * name to someone about to act on it is not.
 */
export const MIN_CONFIDENCE = 0.7;
export const MIN_TENTATIVE_CONFIDENCE = 0.25;

/**
 * How a result should be presented, decided from the reading plus the farm's
 * crop. This is the whole presentation decision, kept out of the component so
 * it can be asserted directly.
 */
export type VisionVerdict =
  /** Below MIN_CONFIDENCE — say so, ask for a better photo. */
  | { readonly kind: 'unsure'; readonly confidence: number }
  | {
      readonly kind: 'tentative';
      readonly entry: VisionClass;
      readonly confidence: number;
      readonly plantHasHealthyClass: boolean;
    }
  /** Confident, and the class belongs to the crop the farmer selected. */
  | {
      readonly kind: 'match';
      readonly entry: VisionClass;
      readonly confidence: number;
      /**
       * False when the model has no healthy class for this plant — i.e. when it
       * could not have told the farmer their leaf was fine even if it were, so a
       * named condition is the only kind of answer it can give. Carried on the
       * verdict rather than recomputed in the component so the card cannot
       * forget to ask, and so the caveat is asserted where the decision is made.
       *
       * Only meaningful alongside a named finding: a `healthy` finding is itself
       * proof that its plant has a healthy class.
       */
      readonly plantHasHealthyClass: boolean;
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
  /**
   * Confident, a HEALTHY class, and a plant that is not the farm's crop.
   *
   * Split from `otherPlant` because collapsing the two produced the worst output
   * this feature is capable of. `Corn_(maize)___healthy` is where this model puts
   * leaves it does not recognise: over ten field photographs of diseased plants
   * it was never trained on, it chose that class for both onion photographs at
   * 89% and 96% confidence. Rendered through the shared path, a farmer holding a
   * visibly diseased onion leaf read "this leaf looks similar to healthy leaves
   * (96% similar)" with a mismatch note above it — a confident all-clear on a sick
   * plant, which is a worse outcome than a wrong disease name because it ends the
   * investigation instead of misdirecting it.
   *
   * A healthy reading for a plant the farmer is not growing is evidence about
   * nothing. This kind exists so the component cannot state otherwise. The full
   * measurement is in docs/14_Leaf_Photo_Model_Measurement.md §5.
   */
  | {
      readonly kind: 'otherPlantHealthy';
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

  if (!Number.isFinite(confidence)) {
    return { kind: 'unsure', confidence: 0 };
  }

  const isOnCrop = crop !== null && entry.appCrop === crop;
  if (isOnCrop && crop === 'Rice' && confidence >= MIN_TENTATIVE_CONFIDENCE) {
    return {
      kind: confidence >= MIN_CONFIDENCE ? 'match' : 'tentative',
      entry,
      confidence,
      plantHasHealthyClass: plantHasHealthyClass(entry.plant),
    };
  }

  if (confidence < MIN_CONFIDENCE) {
    return { kind: 'unsure', confidence };
  }

  if (crop !== null && entry.appCrop !== crop) {
    return entry.finding.kind === 'healthy'
      ? { kind: 'otherPlantHealthy', entry, confidence }
      : { kind: 'otherPlant', entry, confidence };
  }

  return {
    kind: 'match',
    entry,
    confidence,
    plantHasHealthyClass: plantHasHealthyClass(entry.plant),
  };
}
