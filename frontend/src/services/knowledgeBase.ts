import type { CropName, GrowthStage, IrrigationMethod, SoilType } from '../types';
import { CROP_NAMES, SOIL_TYPES } from '../types';

/**
 * Agricultural knowledge base (docs/10_Knowledge_Base.md).
 *
 * This module is the single source of the agronomic FACTS the Decision Engine
 * reads. It contains no decision logic and no tunable engine parameters — those
 * live in decisionParameters.ts. Values here are transcribed from the Knowledge
 * Base document and must reference authoritative sources before being changed
 * (Knowledge Base Principle 7 — Scientific Integrity).
 */

/** FAO-56 single crop coefficients by stage (Knowledge Base §3.2). */
interface CropKc {
  initial: number;
  mid: number;
  late: number;
}

const CROP_KC: Record<CropName, CropKc> = {
  Rice: { initial: 1.05, mid: 1.2, late: 0.9 },
  Wheat: { initial: 0.3, mid: 1.15, late: 0.25 },
  Maize: { initial: 0.3, mid: 1.2, late: 0.35 },
  Cotton: { initial: 0.35, mid: 1.15, late: 0.7 },
  Sugarcane: { initial: 0.4, mid: 1.25, late: 0.75 },
  Soybean: { initial: 0.5, mid: 1.15, late: 0.5 },
  Groundnut: { initial: 0.4, mid: 1.15, late: 0.6 },
  Tomato: { initial: 0.6, mid: 1.15, late: 0.8 },
  Potato: { initial: 0.5, mid: 1.15, late: 0.75 },
  Onion: { initial: 0.7, mid: 1.05, late: 0.75 },
};

/**
 * Resolve the crop coefficient for a crop at a given growth stage.
 * Development-stage Kc is interpolated between Initial and Mid (Knowledge Base §3.2).
 */
export function getKc(crop: CropName, stage: GrowthStage): number {
  const kc = CROP_KC[crop];
  switch (stage) {
    case 'Initial':
      return kc.initial;
    case 'Development':
      return (kc.initial + kc.mid) / 2;
    case 'Mid Season':
      return kc.mid;
    case 'Late Season':
      return kc.late;
  }
}

/** Qualitative soil behaviour used in explanations (Knowledge Base §4.1). */
interface SoilProfile {
  waterHolding: 'Low' | 'Moderate' | 'High';
  drainage: 'High' | 'Moderate' | 'Slow';
  frequency: 'Frequent' | 'Moderate' | 'Less Frequent';
}

export const SOIL_PROFILES: Record<SoilType, SoilProfile> = {
  Sandy: { waterHolding: 'Low', drainage: 'High', frequency: 'Frequent' },
  'Sandy Loam': { waterHolding: 'Low', drainage: 'High', frequency: 'Frequent' },
  Loamy: { waterHolding: 'Moderate', drainage: 'Moderate', frequency: 'Moderate' },
  'Silty Loam': { waterHolding: 'Moderate', drainage: 'Moderate', frequency: 'Moderate' },
  'Clay Loam': { waterHolding: 'High', drainage: 'Slow', frequency: 'Less Frequent' },
  Clay: { waterHolding: 'High', drainage: 'Slow', frequency: 'Less Frequent' },
};

/** Qualitative method labels used in explanations (Knowledge Base §5.1). */
export const METHOD_LABELS: Record<IrrigationMethod, string> = {
  Drip: 'high-efficiency drip',
  Sprinkler: 'sprinkler',
  Furrow: 'furrow',
  Flood: 'flood',
};

export const SUPPORTED_CROPS: readonly CropName[] = CROP_NAMES;
export const SUPPORTED_SOILS: readonly SoilType[] = SOIL_TYPES;
export const SUPPORTED_METHODS: readonly IrrigationMethod[] = [
  'Drip',
  'Sprinkler',
  'Furrow',
  'Flood',
];
