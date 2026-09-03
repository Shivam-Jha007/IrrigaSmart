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
 * Depth of the standard "plough layer" soil test — the depth an Indian Soil
 * Health Card or a farmer's own hand sample is drawn from, and the depth every
 * crop pH recommendation in the literature is actually measured against.
 * Unlike TAW, pH suitability is a topsoil question, not a root-zone one: a
 * crop's roots draw water from a metre or more down, but liming/amendment
 * advice and "will this crop's nutrients be available" both hinge on the
 * layer the seed germinates in and the plough disturbs, not the subsoil.
 */
const TOPSOIL_DEPTH_CM = 15;

/**
 * Thickness-weighted mean pH over the topsoil (0-15 cm), the standard sampling
 * depth for a soil test. Mirrors the thickness-weighting rationale in
 * `rootZoneWater` — SoilGrids' 0-5/5-15 cm intervals are uneven, so a plain
 * mean would let the thin 5 cm layer outvote the thicker one beneath it.
 *
 * Returns null when there is no profile, or every layer overlapping the
 * topsoil is missing a pH reading — never a fabricated average from partial
 * data pretending to be a whole-topsoil reading. Layers that lack a value are
 * skipped while the weighting still counts only the depth actually covered, so
 * a profile with pH at 0-5 cm and none at 5-15 cm reports the 0-5 cm figure
 * rather than nothing.
 *
 * WHY `typeof` AND NOT `=== null`
 * `phH2O` is typed `number | null`, so `=== null` looks sufficient — but a
 * profile stored by a build that predates the pH property has no such key at
 * all, and IndexedDB hands it back as `undefined`. `undefined === null` is
 * false, so that layer would not be skipped, `l.phH2O * cm` would be `NaN`, and
 * one legacy layer would poison the whole mean. The `Number.isFinite` guard at
 * the end happens to catch it today, which is the right answer for the wrong
 * reason: it also throws away the perfectly good reading from any sibling layer
 * that does carry pH.
 */
export function topsoilPh(profile: MeasuredSoilProfile | undefined): number | null {
  if (!profile || profile.layers.length === 0) return null;

  let weight = 0;
  let phSum = 0;
  for (const l of profile.layers) {
    if (typeof l.phH2O !== 'number' || !Number.isFinite(l.phH2O)) continue;
    const cm = overlapCm(l, TOPSOIL_DEPTH_CM);
    if (cm <= 0) continue;
    weight += cm;
    phSum += l.phH2O * cm;
  }

  if (weight <= 0) return null;
  const ph = phSum / weight;
  return Number.isFinite(ph) ? ph : null;
}

/**
 * Thickness-weighted mean organic carbon over the same topsoil interval, in
 * percent. Same weighting and the same reasoning as `topsoilPh` above — the
 * 0-5/5-15 cm intervals are uneven, so a plain mean would over-weight the thin
 * top layer.
 *
 * WHY THE TOPSOIL AND NOT THE ROOT ZONE. Organic matter is concentrated in the
 * plough layer and falls away sharply below it, so a root-zone average would
 * dilute the figure with subsoil and describe neither. The plough layer is also
 * the depth an Indian Soil Health Card reports organic carbon at, so this is the
 * number a farmer could actually compare against their own card.
 *
 * WHAT IT IS FOR, AND WHAT IT IS NOT FOR. It is context — a farmer on 0.4% OC
 * has a different soil from one on 1.2%, and the improvement plan can say so.
 * It is NOT an input to any fertilizer or amendment quantity: turning organic
 * carbon into a nitrogen credit needs a mineralisation rate this app has no
 * regional basis for, and inventing one would be exactly the fabricated dose
 * the product boundary forbids (PRD §28 Guardrail 2).
 *
 * Returns null when there is no profile or no overlapping layer, never 0 —
 * "we don't know" and "this soil has no carbon" are different statements.
 */
export function topsoilOrganicCarbon(profile: MeasuredSoilProfile | undefined): number | null {
  if (!profile || profile.layers.length === 0) return null;

  let weight = 0;
  let ocSum = 0;
  for (const l of profile.layers) {
    const cm = overlapCm(l, TOPSOIL_DEPTH_CM);
    if (cm <= 0) continue;
    weight += cm;
    ocSum += l.organicCarbonPct * cm;
  }

  if (weight <= 0) return null;
  const oc = ocSum / weight;
  return Number.isFinite(oc) ? oc : null;
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
 * Whether a stored profile carries every layer property the current app reads.
 *
 * WHY THIS IS NOT THE SAME QUESTION AS `sameCoordinate`
 * A profile is cached per farm and only refetched when the pin moves, which is
 * right for a static raster — the soil at a coordinate does not change. But the
 * set of properties the app ASKS FOR grows: `organicCarbonPct` arrived with the
 * improvement plan and `phH2O` with the pH card, and a record written before
 * each of those has no such key. Coordinate-only invalidation therefore leaves
 * an older farm permanently missing whatever was added since — its pH card stays
 * blank forever, with nothing wrong at the coordinate and nothing wrong with the
 * provider. This predicate is what lets the store tell that apart and refetch in
 * the background.
 *
 * `null` is NOT incomplete. It is a real answer from a current fetch — "the
 * provider had no usable value at this depth" — and refetching would only get
 * the same null again. The distinction being drawn is between a key that was
 * never written and a key whose answer is nothing, which is the same
 * measured-versus-unknown line PRD §7 draws everywhere else.
 *
 * EXTEND THIS when a new property is added to `SoilLayer`, or existing farms
 * will silently never see it.
 */
export function profileCarriesEveryReadProperty(profile: MeasuredSoilProfile): boolean {
  if (profile.layers.length === 0) return false;
  return profile.layers.every(
    (l) =>
      // Written since the pH card; absent on anything stored before it.
      (typeof l.phH2O === 'number' || l.phH2O === null) &&
      // Written since the improvement plan's organic-carbon context line.
      typeof l.organicCarbonPct === 'number',
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
 * The soil type a USDA textural class corresponds to, or null for a class this
 * app does not map.
 *
 * Exposed so a consumer that has already been told the map disagrees can say
 * WHAT it suggests in the farmer's own language: `textureDisagreement` returns
 * the raw USDA string ("clay loam"), which has no translation, whereas a
 * `SoilType` does (`enum.soil.*`). Interpolating the English class into a
 * Bengali sentence is the half-localised output `assistantContext` already
 * refuses to produce.
 */
export function soilTypeFromTexture(usdaTextureClass: string | null | undefined): SoilType | null {
  if (!usdaTextureClass) return null;
  return USDA_TO_SOIL_TYPE[usdaTextureClass] ?? null;
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
