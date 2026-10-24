import type { CropName } from '../types';
import type { DiseaseId } from './diseaseKnowledge';

/**
 * The Final_Model checkpoint is a focused, rice-only three-class classifier.
 * These keys must stay identical to the checkpoint class list because the
 * manifest is checked against this map in the service tests.
 */
export type VisionPlant = 'Rice';

/** Photo-only findings that do not have a weather-risk DiseaseId. */
export type VisionLabelId = 'riceBrownSpot' | 'riceSheathBlight';

export type VisionFinding =
  | { readonly kind: 'healthy' }
  | { readonly kind: 'known'; readonly disease: DiseaseId }
  | { readonly kind: 'visionOnly'; readonly label: VisionLabelId };

export interface VisionClass {
  readonly plant: VisionPlant;
  readonly appCrop: CropName;
  readonly finding: VisionFinding;
}

/** Exact class labels emitted by Final_Model/runs/E2_torch_mobilenetv3_3class. */
export const VISION_CLASSES: Readonly<Record<string, VisionClass>> = {
  healthy: { plant: 'Rice', appCrop: 'Rice', finding: { kind: 'healthy' } },
  brown_spot: {
    plant: 'Rice',
    appCrop: 'Rice',
    finding: { kind: 'visionOnly', label: 'riceBrownSpot' },
  },
  sheath_blight: {
    plant: 'Rice',
    appCrop: 'Rice',
    finding: { kind: 'visionOnly', label: 'riceSheathBlight' },
  },
};

/** The replacement model supports rice only. */
export const COVERED_CROPS: readonly CropName[] = ['Rice'];

/** The photo check is offered for rice farms only. */
export const VISION_ENABLED_CROPS: readonly CropName[] = ['Rice'];

export function visionCoversCrop(crop: CropName): boolean {
  return VISION_ENABLED_CROPS.includes(crop);
}

export const PLANTS_WITH_HEALTHY_CLASS: readonly VisionPlant[] = ['Rice'];

export function plantHasHealthyClass(plant: VisionPlant): boolean {
  return PLANTS_WITH_HEALTHY_CLASS.includes(plant);
}

export function lookupVisionClass(raw: string): VisionClass | null {
  if (!Object.prototype.hasOwnProperty.call(VISION_CLASSES, raw)) return null;
  return VISION_CLASSES[raw] ?? null;
}

/** Final_Model's supported-condition confidence gate. */
export const MIN_CONFIDENCE = 0.75;
/** Kept for compatibility with callers that distinguish tentative readings. */
export const MIN_TENTATIVE_CONFIDENCE = MIN_CONFIDENCE;

export type VisionVerdict =
  | { readonly kind: 'unsure'; readonly confidence: number }
  | { readonly kind: 'notRiceLeaf'; readonly similarity: number; readonly similarityThreshold: number }
  | { readonly kind: 'unsupportedCondition'; readonly confidence: number; readonly threshold: number }
  | { readonly kind: 'tentative'; readonly entry: VisionClass; readonly confidence: number; readonly plantHasHealthyClass: boolean }
  | {
      readonly kind: 'match';
      readonly entry: VisionClass;
      readonly confidence: number;
      readonly plantHasHealthyClass: boolean;
    }
  | { readonly kind: 'otherPlant'; readonly entry: VisionClass; readonly confidence: number }
  | { readonly kind: 'otherPlantHealthy'; readonly entry: VisionClass; readonly confidence: number }
  | { readonly kind: 'unknownClass'; readonly raw: string };

/**
 * Decide how a Final_Model reading should be presented after the caller has
 * applied the similarity gate.  Only the top class is ever exposed to the UI;
 * percentages and ranked alternatives remain internal.
 */
export function verdictFor(
  raw: string,
  confidence: number,
  crop: CropName | null,
  gate?: {
    readonly similarity: number;
    readonly similarityThreshold: number;
    readonly confidenceThreshold?: number;
  },
): VisionVerdict {
  if (gate && gate.similarity < gate.similarityThreshold) {
    return {
      kind: 'notRiceLeaf',
      similarity: gate.similarity,
      similarityThreshold: gate.similarityThreshold,
    };
  }

  const entry = lookupVisionClass(raw);
  if (!entry) return { kind: 'unknownClass', raw };
  if (!Number.isFinite(confidence)) return { kind: 'unsure', confidence: 0 };
  const confidenceThreshold = gate?.confidenceThreshold ?? MIN_CONFIDENCE;
  if (confidence < confidenceThreshold) {
    return { kind: 'unsupportedCondition', confidence, threshold: confidenceThreshold };
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
