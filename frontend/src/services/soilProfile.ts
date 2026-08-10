import type { MeasuredSoilProfile, SoilLayer, SoilType } from '../types';
import { SOIL_HYDRAULIC_PROPERTIES } from './knowledgeBase';

/**
 * Root-zone weighting of a measured soil profile (V1.7, item 1).
 *
 * WHY THIS LIVES ON THE DEVICE
 * The backend returns SoilGrids' depth intervals as-is because which of them
 * matter depends on how deep the crop's roots currently reach — and that is a
 * function of the crop and its growth stage, knowledge that lives here in the
 * engine. A single number computed server-side would have to assume one root
 * depth for every crop, which is the generic-table problem this replaces.
 *
 * WHY THICKNESS-WEIGHTING AND NOT A PLAIN MEAN
 * SoilGrids' intervals are deliberately uneven — 0-5, 5-15, 15-30, 30-60 cm.
 * Averaging them equally gives the 5 cm topsoil the same say as the 30 cm layer
 * beneath it, a 6× over-weighting of the layer that holds least of the root
 * zone's water. Each layer therefore contributes in proportion to how much of
 * the root zone it actually occupies, which is the standard profile-averaging
 * approach behind FAO-56's TAW = 1000 × (θFC − θPWP) × Zr for a layered soil.
 */

/** θFC and θPWP for a root zone, plus where they came from. */
export interface RootZoneWater {
  /** Volumetric water content at field capacity, m³/m³. */
  thetaFC: number;
  /** Volumetric water content at wilting point, m³/m³. */
  thetaPWP: number;
  /**
   * `measured` — weighted from the farm's own SoilGrids profile.
   * `table` — the Knowledge Base six-row table (offline, pre-V1.7 farm, or a
   *   profile that failed validation).
   */
  source: 'measured' | 'table';
  /**
   * Fraction of the root zone actually covered by measured layers, 0-1. Below
   * `MIN_ROOT_ZONE_COVERAGE` the profile is rejected in favour of the table:
   * extrapolating 0-60 cm of measurement across a 1.5 m root zone would dress a
   * guess about the subsoil as a measurement.
   */
  coverage: number;
}

/**
 * How much of the root zone must be covered by measured layers before the
 * measurement is preferred to the table.
 *
 * The provider is queried to 60 cm (past the low-end Zr of every supported
 * crop), so a shallow-rooted crop is fully covered and the deepest-rooted are
 * covered well past this floor. 0.6 keeps the measurement wherever it genuinely
 * describes most of the root zone and drops it where it would be mostly
 * extrapolation.
 */
const MIN_ROOT_ZONE_COVERAGE = 0.6;

/** Sanity band on a weighted result; outside it, something is wrong upstream. */
const THETA_MIN = 0.01;
const THETA_MAX = 0.75;
/** Below this the available water is too small to schedule against. */
const MIN_AWC = 0.02;

/** Overlap in centimetres between a layer and the root zone [0, zrCm]. */
function overlapCm(layer: SoilLayer, zrCm: number): number {
  const top = Math.max(0, Math.min(layer.topCm, zrCm));
  const bottom = Math.max(0, Math.min(layer.bottomCm, zrCm));
  return Math.max(0, bottom - top);
}

/**
 * Weight a measured profile over a root zone of depth `zrMetres`.
 *
 * Returns the Knowledge Base table values whenever the measurement cannot be
 * trusted for this root zone — no profile, `source: 'table'`, too little
 * coverage, or a physically implausible result. The caller does not need to
 * branch: `source` on the result says which happened.
 */
export function rootZoneWater(
  soilName: SoilType,
  profile: MeasuredSoilProfile | undefined,
  zrMetres: number,
): RootZoneWater {
  const table = SOIL_HYDRAULIC_PROPERTIES[soilName];
  const fromTable = (coverage: number): RootZoneWater => ({
    thetaFC: table.thetaFC,
    thetaPWP: table.thetaPWP,
    source: 'table',
    coverage,
  });

  if (!profile || profile.layers.length === 0) {
    return fromTable(0);
  }
  if (!Number.isFinite(zrMetres) || zrMetres <= 0) return fromTable(0);

  const zrCm = zrMetres * 100;
  let weight = 0;
  let fcSum = 0;
  let pwpSum = 0;

  for (const layer of profile.layers) {
    const cm = overlapCm(layer, zrCm);
    if (cm <= 0) continue;
    weight += cm;
    fcSum += layer.thetaFC * cm;
    pwpSum += layer.thetaPWP * cm;
  }

  const coverage = weight / zrCm;
  if (weight <= 0 || coverage < MIN_ROOT_ZONE_COVERAGE) return fromTable(coverage);

  const thetaFC = fcSum / weight;
  const thetaPWP = pwpSum / weight;

  // A weighted mean of validated layers should not be able to leave the band,
  // but this is the last gate before the number becomes irrigation advice, and
  // a negative AWC would make TAW negative and every downstream figure nonsense.
  if (
    !Number.isFinite(thetaFC) ||
    !Number.isFinite(thetaPWP) ||
    thetaFC < THETA_MIN ||
    thetaFC > THETA_MAX ||
    thetaPWP < THETA_MIN ||
    thetaPWP > THETA_MAX ||
    thetaFC - thetaPWP < MIN_AWC
  ) {
    return fromTable(coverage);
  }

  return { thetaFC, thetaPWP, source: 'measured', coverage };
}

/**
 * Whether a stored profile still describes a coordinate.
 *
 * The tolerance is a quarter of SoilGrids' 250 m cell, expressed in degrees
 * (~0.001° ≈ 111 m). Tighter would refetch on GPS jitter alone; looser would
 * keep a profile from a neighbouring cell that may be a different soil.
 */
const COORDINATE_TOLERANCE_DEG = 0.001;

export function sameCoordinate(
  profile: Pick<MeasuredSoilProfile, 'latitude' | 'longitude'>,
  latitude: number,
  longitude: number,
): boolean {
  return (
    Math.abs(profile.latitude - latitude) <= COORDINATE_TOLERANCE_DEG &&
    Math.abs(profile.longitude - longitude) <= COORDINATE_TOLERANCE_DEG
  );
}

/**
 * Whether the profile disagrees with the farmer's confirmed soil type enough to
 * be worth mentioning. Advisory only — the farmer's own answer always wins,
 * because they have stood in the field and a 250 m grid cell has not.
 */
export function textureDisagreement(
  soilName: SoilType,
  profile: MeasuredSoilProfile | undefined,
): string | null {
  if (!profile?.usdaTextureClass) return null;
  const suggested = USDA_TO_SOIL_TYPE[profile.usdaTextureClass];
  if (!suggested || suggested === soilName) return null;
  return profile.usdaTextureClass;
}

/**
 * USDA class → the six supported soil names. Mirrors the backend mapping; kept
 * here so the disagreement check works offline from the stored profile.
 */
const USDA_TO_SOIL_TYPE: Record<string, SoilType> = {
  sand: 'Sandy',
  'loamy sand': 'Sandy',
  'sandy loam': 'Sandy Loam',
  'sandy clay loam': 'Sandy Loam',
  loam: 'Loamy',
  'silt loam': 'Silty Loam',
  silt: 'Silty Loam',
  'clay loam': 'Clay Loam',
  'silty clay loam': 'Clay Loam',
  'sandy clay': 'Clay',
  'silty clay': 'Clay',
  clay: 'Clay',
};
