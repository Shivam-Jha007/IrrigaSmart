/**
 * Soil property provider (docs/04_System_Interfaces.md Interface 6).
 *
 * WHY THIS EXISTS
 * Until V1.7 the app knew a farmer's soil only as one of six generic names, each
 * carrying a fixed textbook field capacity and wilting point
 * (`SOIL_HYDRAULIC_PROPERTIES` in the frontend Knowledge Base). Every irrigation
 * number the engine produces — total available water, the trigger threshold, the
 * depth to apply, the moisture gauge, the interval, the savings — is downstream
 * of those two values. A farm on the clay end of "Clay Loam" and one on the silt
 * end got identical advice.
 *
 * ISRIC SoilGrids v2.0 publishes MEASURED estimates for both, on a 250 m grid,
 * free and without a key. This module fetches them for the farm's own
 * coordinate. Verified live against lon 87.685 / lat 23.677.
 *
 * Provider: ISRIC SoilGrids v2.0 (https://rest.isric.org/soilgrids/v2.0),
 * CC-BY 4.0. Reference: Poggio et al. (2021), SOIL 7, 217-240.
 *
 * WHAT THIS MODULE DELIBERATELY DOES NOT DO
 * It does not collapse the profile into a single number. Which layers matter
 * depends on how deep the crop's roots currently reach, and that changes with
 * the crop and its growth stage — knowledge that lives in the on-device engine,
 * not here (see the Phase 3 split in the roadmap: the engine stays on-device so
 * it keeps working offline). So the layers are returned as-is and the frontend
 * weights them over the root zone.
 */

import { suggestSoilTypeFromWrb } from './location.js';

/**
 * Provenance of a single water-content value after reconciliation.
 * `soilgrids` — the measured value, cross-check passed.
 * `saxton-rawls` — the measured value disagreed with the pedotransfer
 *   prediction in the unsafe direction, so the prediction was substituted.
 */
export type ThetaSource = 'soilgrids' | 'saxton-rawls';

/** One SoilGrids depth interval, converted into the units the engine uses. */
export interface SoilLayer {
  /** Interval top in centimetres below the surface. */
  topCm: number;
  /** Interval bottom in centimetres below the surface. */
  bottomCm: number;
  /** Clay content, percent by weight. */
  clayPct: number;
  /** Sand content, percent by weight. */
  sandPct: number;
  /** Silt content, percent by weight. */
  siltPct: number;
  /** Volumetric water content at field capacity, m³/m³. */
  thetaFC: number;
  /** Volumetric water content at wilting point, m³/m³. */
  thetaPWP: number;
  /** Where `thetaFC` came from after the cross-check. */
  thetaFCSource: ThetaSource;
  /** Where `thetaPWP` came from after the cross-check. */
  thetaPWPSource: ThetaSource;
  /** Bulk density of the fine earth fraction, kg/dm³. */
  bulkDensity: number;
  /** Soil organic carbon, percent by weight. */
  organicCarbonPct: number;
}

/** The six soil types the Knowledge Base supports (frontend `SoilType`). */
export type SupportedSoilName =
  | 'Sandy'
  | 'Sandy Loam'
  | 'Loamy'
  | 'Silty Loam'
  | 'Clay Loam'
  | 'Clay';

export interface SoilPropertiesPayload {
  /** Depth intervals, shallowest first. Empty if the provider returned nothing usable. */
  layers: SoilLayer[];
  /** USDA textural class of the topsoil, e.g. "silt loam". */
  usdaTextureClass: string | null;
  /** `usdaTextureClass` mapped onto the six supported names. */
  suggestedSoilName: SupportedSoilName | null;
  /**
   * Whether the profile is usable at all.
   * `measured` — use `layers`; each layer records per-value provenance in
   * `thetaFCSource`/`thetaPWPSource`, since a layer may mix a SoilGrids field
   * capacity with a Saxton-Rawls wilting point.
   * `table` — nothing usable came back, fall back to the Knowledge Base table.
   * The frontend must honour this rather than reading `layers` blindly.
   */
  source: 'measured' | 'table';
  /** Why `source` is `table`, for the UI and for debugging. Null when measured. */
  fallbackReason: string | null;
  provider: string;
}

export class SoilProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'SoilProviderError';
  }
}

const SOILGRIDS_PROPERTIES_URL = 'https://rest.isric.org/soilgrids/v2.0/properties/query';
const PROVIDER_USER_AGENT = 'IrrigaSmart/1.1 (+https://github.com/Shivam-Jha007/IrrigaSmart)';

/**
 * Depths requested. Stops at 60 cm because that is past the low-end rooting
 * depth of every crop the app supports (FAO-56 Table 22, irrigation-scheduling
 * end), so the deeper SoilGrids intervals would never be weighted in.
 */
const DEPTHS = ['0-5cm', '5-15cm', '15-30cm', '30-60cm'] as const;

const PROPERTIES = ['clay', 'sand', 'silt', 'wv0033', 'wv1500', 'bdod', 'soc'] as const;
type PropertyName = (typeof PROPERTIES)[number];

/**
 * SoilGrids is a static dataset fetched once per farm, so a slow reply is still
 * worth waiting for. MEASURED, not guessed: the 7-property × 4-depth query takes
 * ~15 s at the reference coordinate, against ~1.7 s for a single property. A 20 s
 * budget was tried first and timed out on a live call; 45 s leaves real headroom
 * without letting a hung socket sit forever. Nothing user-facing blocks on this —
 * the farm form's soil suggestion comes from the fast classification endpoint.
 */
const REQUEST_TIMEOUT_MS = 45_000;

interface SoilGridsLayer {
  name?: string;
  unit_measure?: { d_factor?: number };
  depths?: Array<{ label?: string; values?: { mean?: number | null } }>;
}

interface SoilGridsResponse {
  properties?: { layers?: SoilGridsLayer[] };
}

/**
 * Convert one raw SoilGrids value into its documented target units.
 *
 * The API returns integers scaled by a per-property `d_factor` that it publishes
 * in the response — 10 for clay/sand/silt (g/kg → %), 100 for bulk density
 * (cg/cm³ → kg/dm³), 10 for the water-content layers. Hardcoding 10 would be
 * wrong for bulk density by a factor of ten, so the factor is always read from
 * the response and a missing one is treated as missing data rather than as 1.
 */
function scaled(raw: number | null | undefined, dFactor: number | undefined): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  if (typeof dFactor !== 'number' || !Number.isFinite(dFactor) || dFactor <= 0) return null;
  return raw / dFactor;
}

function parseDepthLabel(label: string): { topCm: number; bottomCm: number } | null {
  const m = label.match(/^(\d+)-(\d+)cm$/);
  if (!m) return null;
  const topCm = Number(m[1]);
  const bottomCm = Number(m[2]);
  if (!Number.isFinite(topCm) || !Number.isFinite(bottomCm) || bottomCm <= topCm) return null;
  return { topCm, bottomCm };
}

/**
 * USDA soil textural classification from sand/silt/clay percentages.
 *
 * This is the standard USDA-NRCS texture triangle, expressed as its boundary
 * rules in the conventional order — the tests are checked against the published
 * triangle. It replaces the previous approach of guessing texture from a WRB
 * reference group NAME, which could only ever produce three coarse buckets and
 * mapped, for example, every Luvisol to "Clay" regardless of its actual clay
 * content.
 */
export function usdaTextureClass(sandPct: number, siltPct: number, clayPct: number): string | null {
  const sand = sandPct;
  const silt = siltPct;
  const clay = clayPct;
  if (![sand, silt, clay].every((v) => Number.isFinite(v) && v >= 0 && v <= 100)) return null;
  // Allow a few points of rounding slack; SoilGrids layers need not sum to 100.
  if (Math.abs(sand + silt + clay - 100) > 5) return null;

  if (silt + 1.5 * clay < 15) return 'sand';
  if (silt + 1.5 * clay >= 15 && silt + 2 * clay < 30) return 'loamy sand';
  if (clay >= 7 && clay < 20 && sand > 52 && silt + 2 * clay >= 30) return 'sandy loam';
  if (clay < 7 && silt < 50 && silt + 2 * clay >= 30) return 'sandy loam';
  if (silt >= 50 && clay >= 12 && clay < 27) return 'silt loam';
  if (silt >= 50 && silt < 80 && clay < 12) return 'silt loam';
  if (silt >= 80 && clay < 12) return 'silt';
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return 'loam';
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return 'sandy clay loam';
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return 'clay loam';
  if (clay >= 27 && clay < 40 && sand <= 20) return 'silty clay loam';
  if (clay >= 35 && sand > 45) return 'sandy clay';
  if (clay >= 40 && silt >= 40) return 'silty clay';
  if (clay >= 40) return 'clay';
  // Anything reaching here sits on a boundary the rules above did not claim;
  // returning null is honest, and the caller falls back to the table.
  return null;
}

/**
 * Map a USDA class onto the six names the Knowledge Base supports.
 * Several USDA classes collapse onto one supported name — that is expected, and
 * the measured θ values are what carry the finer distinction from here on.
 */
const USDA_TO_SUPPORTED: Record<string, SupportedSoilName> = {
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

/**
 * Saxton & Rawls (2006) pedotransfer functions, SSSAJ 70(5), 1569-1578,
 * Table 1 Eq. 1 and 2 — water content at 1500 kPa (wilting point) and 33 kPa
 * (field capacity) predicted from texture and organic matter.
 *
 * Used here ONLY as an independent second opinion on the measured values, never
 * as the primary source. Sand and clay enter as weight FRACTIONS while organic
 * matter enters as a PERCENT; mixing those up is the classic way to misuse these
 * equations, so the units are named in the signature.
 */
export function saxtonRawls(
  sandFraction: number,
  clayFraction: number,
  organicMatterPct: number,
): { thetaFC: number; thetaPWP: number } {
  const S = sandFraction;
  const C = clayFraction;
  const OM = organicMatterPct;

  const t1500 =
    -0.024 * S + 0.487 * C + 0.006 * OM + 0.005 * (S * OM) - 0.013 * (C * OM) + 0.068 * (S * C) + 0.031;
  const thetaPWP = t1500 + (0.14 * t1500 - 0.02);

  const t33 =
    -0.251 * S + 0.195 * C + 0.011 * OM + 0.006 * (S * OM) - 0.027 * (C * OM) + 0.452 * (S * C) + 0.299;
  const thetaFC = t33 + (1.283 * t33 * t33 - 0.374 * t33 - 0.015);

  return { thetaFC, thetaPWP };
}

/** Van Bemmelen factor: organic matter ≈ organic carbon × 1.724. */
const OM_FROM_OC = 1.724;

/**
 * How far a measured θ may sit from the Saxton & Rawls prediction before the
 * measurement is replaced. SoilGrids is a spatial model, and an individual
 * 250 m pixel can be wrong — near a river, a quarry, or a mapping artefact.
 *
 * MEASURED AGAINST REAL DATA, NOT CHOSEN BY FEEL. At the reference farm
 * (lon 87.685 / lat 23.677) SoilGrids' field capacity agrees with Saxton-Rawls
 * to within 0.5-5% at every depth, while its wilting point sits 17-32% BELOW
 * the prediction at every depth. That is a systematic offset in wv1500, not
 * pixel noise, and it is documented in the SoilGrids literature as the weaker
 * of the two retentions. 25% therefore keeps every FC value and rejects the
 * PWP values, which is the intended outcome — see `reconcile`.
 */
const CROSS_CHECK_TOLERANCE = 0.25;

/**
 * Sanity limits on any θ value. Values outside these cannot describe a real
 * soil, and a negative available water capacity would make TAW negative and the
 * engine's advice nonsense.
 */
const THETA_MIN = 0.01;
const THETA_MAX = 0.75;
/** Below this, available water is too small to schedule against meaningfully. */
const MIN_AWC = 0.02;

/**
 * Reconcile one measured value against its Saxton & Rawls prediction.
 *
 * WHY THIS IS NOT SYMMETRIC
 * The two retentions fail in opposite directions for the farmer. Available
 * water is `θFC − θPWP`, so an under-stated PWP INFLATES available water, which
 * inflates both TAW and the trigger threshold, and the engine waits longer than
 * the crop can afford. An over-stated PWP merely irrigates early and wastes some
 * water. The same asymmetry applies to FC with the signs swapped.
 *
 * So a disagreement is resolved toward the prediction only when the measurement
 * errs the dangerous way, or when it is extreme in either direction. A
 * measurement that is conservative relative to the prediction is kept, because
 * the measurement is the more local evidence and erring safe is acceptable.
 */
function reconcile(
  measured: number,
  predicted: number,
  /** Which direction of measurement error starves the crop. */
  unsafeWhen: 'measured-below-predicted' | 'measured-above-predicted',
): { value: number; source: ThetaSource } {
  if (!Number.isFinite(measured) || measured < THETA_MIN || measured > THETA_MAX) {
    return { value: predicted, source: 'saxton-rawls' };
  }
  const relativeError = Math.abs(measured - predicted) / predicted;
  if (relativeError <= CROSS_CHECK_TOLERANCE) {
    return { value: measured, source: 'soilgrids' };
  }
  const unsafe =
    unsafeWhen === 'measured-below-predicted' ? measured < predicted : measured > predicted;
  return unsafe ? { value: predicted, source: 'saxton-rawls' } : { value: measured, source: 'soilgrids' };
}

interface Validation {
  ok: boolean;
  reason: string | null;
}

/** Final physical plausibility check on the reconciled profile. */
export function validateMeasured(layers: SoilLayer[]): Validation {
  if (layers.length === 0) return { ok: false, reason: 'provider returned no usable layers' };

  for (const l of layers) {
    if (l.thetaFC < THETA_MIN || l.thetaFC > THETA_MAX) {
      return { ok: false, reason: `field capacity ${l.thetaFC.toFixed(3)} outside physical range` };
    }
    if (l.thetaPWP < THETA_MIN || l.thetaPWP > THETA_MAX) {
      return { ok: false, reason: `wilting point ${l.thetaPWP.toFixed(3)} outside physical range` };
    }
    if (l.thetaFC - l.thetaPWP < MIN_AWC) {
      return {
        ok: false,
        reason: `available water ${(l.thetaFC - l.thetaPWP).toFixed(3)} m³/m³ too small to schedule against`,
      };
    }
  }

  return { ok: true, reason: null };
}

/** Reshape the provider's property-major response into depth-major layers. */
export function parseSoilGrids(body: SoilGridsResponse): SoilLayer[] {
  const layers = body.properties?.layers ?? [];
  /** property → depth label → value in target units. */
  const table = new Map<PropertyName, Map<string, number>>();

  for (const layer of layers) {
    const name = layer.name as PropertyName | undefined;
    if (!name || !PROPERTIES.includes(name)) continue;
    const dFactor = layer.unit_measure?.d_factor;
    const byDepth = new Map<string, number>();
    for (const depth of layer.depths ?? []) {
      if (!depth.label) continue;
      const value = scaled(depth.values?.mean, dFactor);
      if (value !== null) byDepth.set(depth.label, value);
    }
    table.set(name, byDepth);
  }

  const out: SoilLayer[] = [];
  for (const label of DEPTHS) {
    const bounds = parseDepthLabel(label);
    if (!bounds) continue;

    const clayPct = table.get('clay')?.get(label);
    const sandPct = table.get('sand')?.get(label);
    const siltPct = table.get('silt')?.get(label);
    const fcPctVol = table.get('wv0033')?.get(label);
    const pwpPctVol = table.get('wv1500')?.get(label);
    const bulkDensity = table.get('bdod')?.get(label);
    const socGPerKg = table.get('soc')?.get(label);

    // A layer missing any of these cannot be used; skipping it is better than
    // substituting a default that would look like real data downstream.
    if (
      clayPct === undefined ||
      sandPct === undefined ||
      siltPct === undefined ||
      fcPctVol === undefined ||
      pwpPctVol === undefined
    ) {
      continue;
    }

    // Two conversions, not one: d_factor takes the raw integer to the
    // documented target unit of 10⁻² cm³/cm³ (i.e. percent by volume), and
    // ÷100 takes percent to the m³/m³ the water balance works in. Stopping
    // after the first would over-state every soil's water by 100×.
    const measuredFC = fcPctVol / 100;
    const measuredPWP = pwpPctVol / 100;
    // SOC arrives in g/kg; 1% = 10 g/kg.
    const organicCarbonPct = socGPerKg === undefined ? 0 : socGPerKg / 10;

    const predicted = saxtonRawls(sandPct / 100, clayPct / 100, organicCarbonPct * OM_FROM_OC);
    // An over-stated FC and an under-stated PWP both inflate available water,
    // which is the direction that makes the engine wait too long.
    const fc = reconcile(measuredFC, predicted.thetaFC, 'measured-above-predicted');
    const pwp = reconcile(measuredPWP, predicted.thetaPWP, 'measured-below-predicted');

    out.push({
      topCm: bounds.topCm,
      bottomCm: bounds.bottomCm,
      clayPct,
      sandPct,
      siltPct,
      thetaFC: fc.value,
      thetaPWP: pwp.value,
      thetaFCSource: fc.source,
      thetaPWPSource: pwp.source,
      bulkDensity: bulkDensity ?? 0,
      organicCarbonPct,
    });
  }

  return out.sort((a, b) => a.topCm - b.topCm);
}

function buildUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({ lon: String(longitude), lat: String(latitude) });
  for (const p of PROPERTIES) params.append('property', p);
  for (const d of DEPTHS) params.append('depth', d);
  params.append('value', 'mean');
  return `${SOILGRIDS_PROPERTIES_URL}?${params.toString()}`;
}

/**
 * Fetch measured soil hydraulic properties for a coordinate.
 *
 * Throws only on invalid input. Every provider failure resolves to a payload
 * with `source: 'table'` and a reason, because the app must keep working on the
 * Knowledge Base table when SoilGrids is unreachable — a farmer offline in a
 * field still needs advice (item 0 / item 18).
 */
export async function fetchSoilProperties(
  latitude: number,
  longitude: number,
): Promise<SoilPropertiesPayload> {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new SoilProviderError('latitude must be between -90 and 90', 400);
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new SoilProviderError('longitude must be between -180 and 180', 400);
  }

  // Every failure path still gets a soil-type suggestion if one can be had. The
  // WRB classification is a different endpoint answering a coarser question, so
  // it frequently succeeds when the property query has timed out — and the farm
  // form's suggestion is the part the farmer sees immediately.
  const tableOnly = async (reason: string): Promise<SoilPropertiesPayload> => ({
    layers: [],
    usdaTextureClass: null,
    suggestedSoilName: await suggestSoilTypeFromWrb(latitude, longitude),
    source: 'table',
    fallbackReason: reason,
    provider: 'isric-soilgrids-v2',
  });

  let response: globalThis.Response;
  try {
    response = await fetch(buildUrl(latitude, longitude), {
      headers: { 'User-Agent': PROVIDER_USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return tableOnly('soil provider is unreachable');
  }
  if (!response.ok) {
    return tableOnly(`soil provider returned ${response.status}`);
  }

  let body: SoilGridsResponse;
  try {
    body = (await response.json()) as SoilGridsResponse;
  } catch {
    return tableOnly('soil provider returned an unreadable response');
  }

  const layers = parseSoilGrids(body);
  const validation = validateMeasured(layers);

  const top = layers[0];
  const texture = top ? usdaTextureClass(top.sandPct, top.siltPct, top.clayPct) : null;
  // The triangle returns null on a boundary it does not claim, and on a
  // coordinate with no texture data at all. Falling back to the WRB group name
  // keeps the pre-V1.7 behaviour available rather than regressing the farm form
  // to no suggestion — coarser, but better than nothing, and it costs under a
  // second on a path that only runs when the triangle abstained.
  const suggestedSoilName: SupportedSoilName | null = texture
    ? (USDA_TO_SUPPORTED[texture] ?? null)
    : await suggestSoilTypeFromWrb(latitude, longitude);

  if (!validation.ok) {
    return {
      // The texture is still reported when it classified: it is derived from
      // sand/silt/clay only and does not depend on the θ values that failed, so
      // it can still improve the farmer's soil-type suggestion.
      layers: [],
      usdaTextureClass: texture,
      suggestedSoilName,
      source: 'table',
      fallbackReason: validation.reason,
      provider: 'isric-soilgrids-v2',
    };
  }

  return {
    layers,
    usdaTextureClass: texture,
    suggestedSoilName,
    source: 'measured',
    fallbackReason: null,
    provider: 'isric-soilgrids-v2',
  };
}
