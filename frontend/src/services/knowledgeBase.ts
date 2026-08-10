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

/**
 * FAO-56 single crop coefficients by stage (Knowledge Base §3.2).
 *
 * Audited line by line against FAO-56 Table 12 (V1.7). Verified source:
 * https://www.fao.org/4/x0490e/x0490e0b.htm
 *
 * Table 12 leaves many Kc_ini cells blank, in which case the BOLD GROUP value
 * applies — 0.3 for cereals, 0.4 for legumes, 0.5 for roots/tubers, 0.6 for
 * Solanaceae, 0.7 for small vegetables. Reading a blank cell as "no value" is
 * how the Soybean error below got in.
 *
 * Where Table 12 publishes a range, the choice is recorded per crop rather than
 * left implicit.
 */
interface CropKc {
  initial: number;
  mid: number;
  late: number;
}

const CROP_KC: Record<CropName, CropKc> = {
  // Table 12 exactly. Kc_end 0.90 is the "harvested at grain maturity" value;
  // 0.60 applies only to rice harvested fresh, which is not the Indian practice.
  Rice: { initial: 1.05, mid: 1.2, late: 0.9 },
  // Spring Wheat (cereals group Kc_ini 0.3), NOT Winter Wheat. Indian rabi wheat
  // is sown in November and harvested in March, without the vernalisation and
  // overwintering dormancy that defines FAO's winter wheat, so the spring-wheat
  // row is the correct one despite the crop being grown in the winter season.
  // Kc_end 0.25 is the machine-harvest value; 0.4 is for hand-harvested crops.
  Wheat: { initial: 0.3, mid: 1.15, late: 0.25 },
  // Kc_end 0.35 = after complete field drying of the grain, which is how grain
  // maize is taken in India. (0.60 is for harvest at high grain moisture.)
  Maize: { initial: 0.3, mid: 1.2, late: 0.35 },
  // Kc_mid range 1.15–1.20 and Kc_end range 0.70–0.50; the lower mid and higher
  // end are the conservative pair — less water mid-season, and no early cut-off.
  Cotton: { initial: 0.35, mid: 1.15, late: 0.7 },
  Sugarcane: { initial: 0.4, mid: 1.25, late: 0.75 },
  // CORRECTED V1.7: was 0.50. Table 12 leaves Soybean's Kc_ini blank, so the
  // legume group value 0.40 applies. The old 0.50 over-stated initial-stage
  // demand by 25%, advising more water than the crop could use.
  Soybean: { initial: 0.4, mid: 1.15, late: 0.5 },
  Groundnut: { initial: 0.4, mid: 1.15, late: 0.6 },
  // Kc_end range 0.70–0.90; 0.80 is mid-range. Table 12 footnote 2 allows
  // raising Kc_mid to 1.20 for staked tomatoes reaching 1.5–2 m — not applied,
  // since the app does not ask whether the crop is staked.
  Tomato: { initial: 0.6, mid: 1.15, late: 0.8 },
  // Kc_end 0.75 for normal harvest; ~0.40 for long-season potatoes with vine
  // kill, which the app has no way to know about.
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

/**
 * Soil hydraulic properties (Knowledge Base §4.3, V1.6).
 * Derived from Saxton & Rawls (2006) SSSAJ 70(5), 1569–1578.
 * Volumetric water content at field capacity (θ_FC) and permanent wilting
 * point (θ_PWP), in m³/m³. Used to compute total available water (TAW) for
 * the root-zone water balance (Decision Logic §4b).
 */
interface SoilHydraulicProperties {
  /** Field capacity (volumetric water content, m³/m³). */
  thetaFC: number;
  /** Permanent wilting point (volumetric water content, m³/m³). */
  thetaPWP: number;
  /** Available water capacity (m³/m³), for reference — equals thetaFC − thetaPWP. */
  awc: number;
}

export const SOIL_HYDRAULIC_PROPERTIES: Record<SoilType, SoilHydraulicProperties> = {
  Sandy: { thetaFC: 0.14, thetaPWP: 0.042, awc: 0.098 },
  'Sandy Loam': { thetaFC: 0.208, thetaPWP: 0.063, awc: 0.145 },
  Loamy: { thetaFC: 0.27, thetaPWP: 0.117, awc: 0.153 },
  'Silty Loam': { thetaFC: 0.33, thetaPWP: 0.133, awc: 0.197 },
  'Clay Loam': { thetaFC: 0.318, thetaPWP: 0.197, awc: 0.121 },
  Clay: { thetaFC: 0.396, thetaPWP: 0.272, awc: 0.124 },
};

/**
 * Root depths and depletion fractions (Knowledge Base §3.3, V1.6).
 *
 * Zr (rooting depth, metres) and p (depletion fraction for no stress) per crop,
 * from FAO-56 Table 22. Audited against the published table in V1.7. Verified
 * source: https://www.fao.org/4/x0490e/x0490e0e.htm
 *
 * Table 22 publishes Zr as a RANGE, and its footnote 1 is explicit about which
 * end to take: the smaller values are for irrigation scheduling, the larger for
 * soil-water-stress modelling and rainfed situations. This app schedules
 * irrigation, so every Zr below sits at or near the low end of its range. That
 * is deliberate and conservative — a shallower assumed root zone means less
 * stored water, so the engine advises irrigating sooner rather than letting a
 * crop it cannot see run dry.
 *
 * Every p below matches Table 22 exactly. They are the values for ETc ≈ 5
 * mm/day and must be adjusted for the actual rate — see `getDepletionFraction`.
 */
interface RootZoneProperties {
  /** Rooting depth at Initial stage (metres). */
  zrInitial: number;
  /** Rooting depth at Mid Season stage (metres). */
  zrMid: number;
  /** Rooting depth at Late Season stage (metres). */
  zrLate: number;
  /** Depletion fraction for no stress at ETc ≈ 5 mm/day (dimensionless, 0–1). */
  p: number;
}

export const ROOT_ZONE_PROPERTIES: Record<CropName, RootZoneProperties> = {
  // KNOWN DEVIATION, scheduled for correction with the rice ponding model.
  // Table 22 gives Zr 0.5–1.0 m; 0.3 is below even the low end. Raising Zr
  // alone would not fix rice, because the whole depletion model is wrong for it:
  // puddled rice is managed to a maintained ponding depth with percolation
  // losses, not refilled from a depletion deficit. Both change together, or the
  // engine trades one wrong answer for a differently wrong one.
  Rice: { zrInitial: 0.2, zrMid: 0.3, zrLate: 0.3, p: 0.2 },
  // Spring Wheat row (1.0–1.5 m), matching the Kc choice above.
  Wheat: { zrInitial: 0.3, zrMid: 1.0, zrLate: 1.1, p: 0.55 },
  Maize: { zrInitial: 0.3, zrMid: 1.0, zrLate: 1.1, p: 0.55 },
  Cotton: { zrInitial: 0.4, zrMid: 1.2, zrLate: 1.2, p: 0.65 },
  // CORRECTED V1.7: zrMid/zrLate were 1.0, below Table 22's 1.2–2.0 m range.
  // 1.2 is the low end, per footnote 1. Under-stating the root zone under-stated
  // TAW, so the engine triggered sugarcane irrigation more often and shallower
  // than the crop's actual reserve warranted.
  Sugarcane: { zrInitial: 0.4, zrMid: 1.2, zrLate: 1.2, p: 0.65 },
  Soybean: { zrInitial: 0.3, zrMid: 0.7, zrLate: 0.7, p: 0.5 },
  Groundnut: { zrInitial: 0.3, zrMid: 0.6, zrLate: 0.6, p: 0.5 },
  Tomato: { zrInitial: 0.3, zrMid: 0.7, zrLate: 0.7, p: 0.4 },
  Potato: { zrInitial: 0.25, zrMid: 0.5, zrLate: 0.5, p: 0.35 },
  Onion: { zrInitial: 0.2, zrMid: 0.4, zrLate: 0.4, p: 0.3 },
};

/** FAO-56 Table 22 note 2: the tabulated p values assume this ETc rate. */
const P_TABLE_ETC_MM = 5;
/** FAO-56 Chapter 8 p-adjustment slope, per mm/day of ETc. */
const P_ADJUST_PER_MM = 0.04;
/** FAO-56 Chapter 8: the adjusted p is limited to this range. */
const P_MIN = 0.1;
const P_MAX = 0.8;

/**
 * Depletion fraction p, adjusted for the actual evaporative demand
 * (FAO-56 Chapter 8): `p = p_Table22 + 0.04 × (5 − ETc)`, clipped to [0.1, 0.8].
 *
 * WHY THIS IS NOT A CONSTANT
 * p is the fraction of total available water a crop can lose before it starts
 * suffering stress, and it moves with demand. On a hot day the roots cannot pull
 * water fast enough to keep up with transpiration, so stress begins at a SMALLER
 * depletion; on a cool day the crop can safely draw the soil down further. The
 * engine previously used the table value unchanged, which meant it applied a
 * 5 mm/day assumption to every day of the year — triggering too late in a
 * heatwave (the direction that risks the crop) and too early in cool weather
 * (the direction that wastes water).
 *
 * `etcMm` is the crop's own water demand for the day, not reference ETo.
 * A non-finite or negative value falls back to the unadjusted table value
 * rather than inventing an adjustment.
 */
export function getDepletionFraction(crop: CropName, etcMm: number): number {
  const p = ROOT_ZONE_PROPERTIES[crop].p;
  if (!Number.isFinite(etcMm) || etcMm < 0) return p;
  const adjusted = p + P_ADJUST_PER_MM * (P_TABLE_ETC_MM - etcMm);
  return Math.min(P_MAX, Math.max(P_MIN, adjusted));
}

/**
 * Resolve the rooting depth for a crop at a given growth stage (metres).
 * Development-stage Zr is interpolated between Initial and Mid, exactly as Kc
 * is (Knowledge Base §3.3).
 */
export function getZr(crop: CropName, stage: GrowthStage): number {
  const rz = ROOT_ZONE_PROPERTIES[crop];
  switch (stage) {
    case 'Initial':
      return rz.zrInitial;
    case 'Development':
      return (rz.zrInitial + rz.zrMid) / 2;
    case 'Mid Season':
      return rz.zrMid;
    case 'Late Season':
      return rz.zrLate;
  }
}


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
