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
 * ISRIC SoilGrids v2.0 gives a far better starting point: a per-coordinate
 * estimate of both, free and without a key. This module fetches it for the
 * farm's own coordinate. Verified live against lon 87.685 / lat 23.677.
 *
 * WHAT SOILGRIDS ACTUALLY IS — AND WHAT IT IS NOT
 * It is a global digital soil mapping PREDICTION, not a measurement of anyone's
 * field. Quantile random forests are fitted to ~240 000 soil profile
 * observations plus environmental covariates, then used to predict each property
 * on a 250 m grid; the paper's own title is "SoilGrids 2.0: producing soil
 * information for the globe with quantified spatial uncertainty" (Poggio et al.
 * 2021, SOIL 7, 217-240). So a value returned here describes the 250 m cell the
 * farm sits in, not the plough layer the farmer walks on, and it must never be
 * presented to a farmer as a soil test (PRD §7, §28 Guardrail 1). Everything
 * derived from it is labelled REGIONAL_ESTIMATE at the boundary — see
 * `frontend/src/services/provenance.ts`.
 *
 * That is not a reason to distrust it. It is the best openly available estimate
 * for an arbitrary coordinate, and a per-coordinate prediction beats a six-row
 * textbook table for exactly the reason above. It is a reason to label it
 * honestly, and to keep pointing the farmer at a Soil Health Card test for the
 * values that matter most.
 *
 * NAMING, FOR FUTURE READERS
 * The identifiers below still say `measured` — `source: 'measured' | 'table'`,
 * `ThetaSource`, and `MeasuredSoilProfile` on the frontend. They mean "from the
 * provider, as opposed to from the generic table", which is the distinction the
 * code branches on. They are deliberately NOT renamed: those names are written
 * into stored IndexedDB records and 50-odd golden snapshots, and a mass rename
 * would risk the working engine to change no farmer-visible word. The doc
 * comments and the farmer-facing labels are what had to stop implying a
 * measurement. A rename remains available as tidy-up if the storage schema is
 * ever versioned for another reason.
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
 *
 * pH (item: crop pH suitability) rides along in the same query as a bonus
 * property: `phh2o`, one extra property on a request that already fetches
 * seven others at the same depths, so there is no second ~15 s round trip. It
 * gets none of the FC/PWP cross-check treatment above — there is no
 * independent pedotransfer prediction for pH the way there is for water
 * retention — and it never gates `source`/`fallbackReason`: a soil with usable
 * texture and water values but no pH reading is still `measured`, just with
 * `phH2O: null` on the affected layer(s). Whether a given pH suits a given crop
 * is a Knowledge Base question, deliberately answered on-device for the same
 * reason as the water balance (see `cropPhKnowledge.ts`).
 *
 * Because pH has no second opinion behind it, it is the value most in need of
 * the honest label: it reaches the farmer through `PhSuitabilityCard`, which
 * says plainly that it is an area estimate and that a Soil Health Card test is
 * the way to get the real number.
 */

import { suggestSoilTypeFromWrb } from './location.js';

/**
 * Provenance of a single water-content value after reconciliation.
 * `soilgrids` — the provider's own predicted value, cross-check passed.
 * `saxton-rawls` — the provider's value disagreed with the pedotransfer
 *   prediction in the unsafe direction, so the prediction was substituted.
 *
 * Both are estimates; this records which estimate won, not measurement versus
 * guess.
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
  /**
   * Predicted soil pH by the pH-in-water method (SoilGrids `phh2o`), standard
   * pH units. `null` when the provider had no usable value for this depth — pH
   * is not required for the water-balance figures above, so a missing reading
   * never drops the whole layer the way a missing clay/FC/PWP value does.
   */
  phH2O: number | null;
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
   *
   * `measured` here means "from the provider rather than from the generic
   * table". It does NOT mean this field was tested: both branches are estimates,
   * one per-coordinate and one per-soil-name. See the naming note in the module
   * header, and `provenance.ts` for the label the farmer is actually shown.
   */
  source: 'measured' | 'table';
  /** Why `source` is `table`, for the UI and for debugging. Null when measured. */
  fallbackReason: string | null;
  /**
   * Whether a `table` result is worth asking for again.
   *
   * `true` only when the fallback was a TRANSIENT provider failure — a timeout,
   * a dropped connection, a 5xx — that a later request may get past. `false` for
   * a `measured` answer (nothing to retry) and for a DETERMINISTIC `table` one (a
   * 4xx, or values that failed the cross-check), where asking again returns the
   * same thing.
   *
   * This is the batch-level `retryable` (see `BatchOutcome`) surfaced to the
   * caller. The frontend keys its background retry off it, so a slow spell at the
   * provider heals itself instead of leaving the pH card blank until a manual
   * reload — while a coordinate the provider genuinely has nothing for is not
   * re-fetched every session.
   */
  retryable: boolean;
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
type DepthLabel = (typeof DEPTHS)[number];

/** Exported for the partition assertion in `soil.test.ts`; not part of the API. */
export const SOIL_DEPTHS: readonly DepthLabel[] = DEPTHS;

const PROPERTIES = ['clay', 'sand', 'silt', 'wv0033', 'wv1500', 'bdod', 'soc', 'phh2o'] as const;
type PropertyName = (typeof PROPERTIES)[number];

/**
 * The depths above, requested in two halves rather than all at once.
 *
 * WHY THE QUERY IS SPLIT — TO BOUND THE WORST CASE, NOT BECAUSE 32 CELLS CANNOT WORK
 * SoilGrids' response time varies enormously for one identical request, and the
 * variation grows with the number of property × depth cells asked for. Timed live
 * against the reference coordinate (lon 87.685 / lat 23.677) on 2026-08-18, two
 * measurement rounds hours apart:
 *
 *                                          round 1        round 2
 *    8 properties × 4 depths  = 32 cells   TIMED OUT      200 in  5.6 s
 *                                          at 50 s
 *    6 properties × 4 depths  = 24 cells   200 in 29.0 s  --
 *    5 properties × 4 depths  = 20 cells   200 in 14.4 s  --
 *    8 properties × 2 depths  = 16 cells   200 in 18.0 s  200 in ~3.6 s
 *    8 properties × 2 depths  = 16 cells   200 in  5.0 s  200 in ~3.6 s
 *    2 properties × 2 depths  =  4 cells   200 in  1.3 s  --
 *
 * An earlier version of this comment concluded from round 1 that "the single
 * whole-profile query is no longer serviceable at all". Round 2 falsifies that:
 * the same 32-cell shape returned 200 in 5.6 s. The honest reading is that the
 * provider's latency is highly variable — a 9x spread on the same request — and
 * that the fast case says nothing about the slow one.
 *
 * The split is kept, because it is what makes the slow case survivable rather
 * than what makes the request possible. Two halves fail independently and retry
 * independently, so a bad round costs one 30 s budget on one half instead of
 * losing the whole profile; and each half is small enough that its own worst
 * observed time (18 s) still fits inside that budget, which the 32-cell shape's
 * worst observed time (>50 s) does not.
 *
 * Splitting by DEPTH rather than by property is what makes this lossless — every
 * half still carries all eight properties, so no layer is ever assembled from
 * defaults, and `parseSoilGrids` is already depth-keyed, so parsing each half and
 * concatenating yields exactly what one successful 8 × 4 call would have
 * returned. Verified in both rounds: the halves reported the same d_factors and
 * the same values as the whole-profile call (clay 28.3/30.1/32.2/35.0 %, phh2o
 * 6.4/6.4/6.5/6.5).
 *
 * Typed as `DepthLabel` rather than `string`, so a mistyped label here is a
 * compile error instead of a silently missing soil layer. `soil.test.ts` also
 * asserts the batches partition `DEPTHS` exactly — no depth dropped, none asked
 * for twice.
 */
const DEPTH_BATCHES: ReadonlyArray<readonly DepthLabel[]> = [
  ['0-5cm', '5-15cm'],
  ['15-30cm', '30-60cm'],
];

/** Exported for the partition assertion in `soil.test.ts`; not part of the API. */
export const SOIL_DEPTH_BATCHES: ReadonlyArray<readonly DepthLabel[]> = DEPTH_BATCHES;

/**
 * Per-half budget. Sized from the table above: the slowest half measured 18 s,
 * so 30 s leaves real headroom without letting a hung socket sit forever. It is
 * deliberately NOT the old 45 s — that number was sized for a request shape
 * this module no longer sends, and keeping it would let a stalled half burn
 * three quarters of a minute before the retry that is likely to succeed.
 *
 * SoilGrids is a static dataset fetched once per farm, so a slow reply is still
 * worth waiting for. Nothing user-facing blocks on this — the farm form's soil
 * suggestion comes from the fast classification endpoint.
 */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * How long to wait before the single retry of a failed half. The failures this
 * absorbs are the provider shedding load (503 in well under a second, or a
 * timeout), so a short pause is enough to land on the other side of a burst; a
 * long one would just add latency to a farm's first recommendation.
 */
const RETRY_DELAY_MS = 1_500;

/**
 * WHY THIS MODULE CACHES AT ALL
 * Creating one farm calls `GET /api/soil` TWICE for the same point — once from
 * the form for its soil-type chip (`fetchSoilSuggestion`) and once from the
 * background profile fetch (`fetchMeasuredSoil`). Without a cache that is two
 * full property queries, ~46 s of upstream work, for one answer. The cache holds
 * the IN-FLIGHT PROMISE rather than only the settled result, because those two
 * calls fire within milliseconds of each other: a result-only cache would miss
 * on the second one every time, which is the case that actually matters.
 *
 * WHY THE KEY IS THE EXACT COORDINATE AND NOT A ROUNDED GRID CELL
 * Rounding to SoilGrids' own 250 m cell would raise the hit rate, and it is the
 * obvious optimisation — but two points either side of a cell boundary would
 * then be served each other's estimate, and the app would be presenting one
 * cell's prediction as if it described a different piece of ground. That is the
 * provenance compromise PRD §7 forbids, and it would be invisible. Exact-match
 * keying is lossless and already fixes the double call, which was the whole
 * problem.
 */
interface CacheEntry {
  /** The in-flight or settled fetch. Shared by every caller for this key. */
  readonly payload: Promise<SoilPropertiesPayload>;
  /** Epoch ms after which this entry is no longer served. Mutable: see below. */
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * SoilGrids is a static raster — the value at a coordinate does not change
 * between one irrigation decision and the next — so a long success TTL costs
 * nothing in accuracy. A day is chosen rather than "forever" so a corrected
 * upstream release is picked up without a redeploy.
 */
const CACHE_TTL_SUCCESS_MS = 24 * 60 * 60 * 1_000;

/**
 * A fallback answer is cached only briefly. It is a statement about the
 * provider's health, not about the soil, so holding it for a day would keep
 * serving `source: 'table'` long after the outage ended. A minute is enough to
 * spare the farmer's second call from re-paying two timeouts, and short enough
 * that a retry a moment later gets the real profile.
 */
const CACHE_TTL_FAILURE_MS = 60_000;

/**
 * Provisional expiry for an entry that has not settled yet, replaced with the
 * real TTL the moment the outcome is known.
 *
 * Sized above the true worst case: two halves, each two attempts of
 * REQUEST_TIMEOUT_MS with a RETRY_DELAY_MS pause, is ~123 s, and the WRB
 * suggestion on the fallback path carries no timeout of its own. Five minutes
 * therefore keeps concurrent callers sharing one flight in every real case,
 * while still guaranteeing that a genuinely stuck promise cannot pin the entry
 * indefinitely — a later caller past this window starts a fresh attempt.
 */
const CACHE_TTL_IN_FLIGHT_MS = 5 * 60 * 1_000;

/**
 * Entry ceiling. One entry is a handful of numbers plus four soil layers, so
 * 500 is well under a megabyte, and no realistic single deployment tracks more
 * distinct farm coordinates than that between restarts.
 */
const CACHE_MAX_ENTRIES = 500;

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
    // pH has no independent cross-check the way FC/PWP do, and it plays no
    // part in the water balance, so a missing value here is recorded as null
    // rather than dropping the whole layer.
    const phH2O = table.get('phh2o')?.get(label) ?? null;

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
      phH2O,
    });
  }

  return out.sort((a, b) => a.topCm - b.topCm);
}

function buildUrl(
  latitude: number,
  longitude: number,
  depths: readonly DepthLabel[],
): string {
  const params = new URLSearchParams({ lon: String(longitude), lat: String(latitude) });
  for (const p of PROPERTIES) params.append('property', p);
  for (const d of depths) params.append('depth', d);
  params.append('value', 'mean');
  return `${SOILGRIDS_PROPERTIES_URL}?${params.toString()}`;
}

/**
 * One half's result. `retryable` distinguishes "the provider is struggling"
 * from "the provider says no": a 503 or a timeout is worth one more attempt, a
 * 400 or 404 is the same answer every time and retrying only adds latency to a
 * failure the farmer is already waiting on.
 */
type BatchOutcome =
  | { readonly ok: true; readonly body: SoilGridsResponse }
  | { readonly ok: false; readonly reason: string; readonly retryable: boolean };

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Fetch one depth half. Never throws — every failure comes back as a
 * `BatchOutcome` carrying the reason string the payload will report, so the
 * caller has one shape to handle and the farmer-facing wording stays in one
 * place.
 */
async function fetchBatch(
  latitude: number,
  longitude: number,
  depths: readonly DepthLabel[],
): Promise<BatchOutcome> {
  let response: globalThis.Response;
  try {
    response = await fetch(buildUrl(latitude, longitude, depths), {
      headers: { 'User-Agent': PROVIDER_USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // Covers both a dead network and the AbortSignal timeout; both are worth
    // one retry, and neither can be told apart usefully here.
    return { ok: false, reason: 'soil provider is unreachable', retryable: true };
  }
  if (!response.ok) {
    return {
      ok: false,
      reason: `soil provider returned ${response.status}`,
      retryable: response.status >= 500,
    };
  }

  try {
    return { ok: true, body: (await response.json()) as SoilGridsResponse };
  } catch {
    // A 200 with a truncated body is what a load-shedding proxy produces, so
    // this is transient rather than a permanent contract violation.
    return {
      ok: false,
      reason: 'soil provider returned an unreadable response',
      retryable: true,
    };
  }
}

/** `fetchBatch` plus a single retry for the transient failures (item A2). */
async function fetchBatchWithRetry(
  latitude: number,
  longitude: number,
  depths: readonly DepthLabel[],
): Promise<BatchOutcome> {
  const first = await fetchBatch(latitude, longitude, depths);
  if (first.ok || !first.retryable) return first;
  await sleep(RETRY_DELAY_MS);
  return fetchBatch(latitude, longitude, depths);
}

/**
 * Fetch measured soil hydraulic properties for a coordinate.
 *
 * Throws only on invalid input. Every provider failure resolves to a payload
 * with `source: 'table'` and a reason, because the app must keep working on the
 * Knowledge Base table when SoilGrids is unreachable — a farmer offline in a
 * field still needs advice (item 0 / item 18).
 *
 * Results are shared through the module cache described above, so the two calls
 * farm creation makes for the same point cost one upstream fetch.
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

  // Validation first, so a bad request throws for its caller rather than being
  // memoised as if it were an answer about a real coordinate.
  const key = `${latitude},${longitude}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.payload;

  const payload = fetchUncached(latitude, longitude);
  const entry: CacheEntry = { payload, expiresAt: now + CACHE_TTL_IN_FLIGHT_MS };
  cache.set(key, entry);

  payload
    .then((result) => {
      // Correct the provisional expiry now the outcome is known. Mutating the
      // stored entry rather than re-setting the key keeps insertion order, which
      // is what makes the oldest-first eviction in `pruneCache` meaningful.
      entry.expiresAt =
        Date.now() +
        (result.source === 'measured' ? CACHE_TTL_SUCCESS_MS : CACHE_TTL_FAILURE_MS);
    })
    .catch(() => {
      // `fetchUncached` resolves on every provider failure, so a rejection here
      // is a defect in this module rather than an upstream problem. Evict it, so
      // a bug cannot be served to every later caller for a day.
      if (cache.get(key) === entry) cache.delete(key);
    });

  pruneCache();
  return payload;
}

/**
 * Keep the cache bounded: expired entries first, then oldest-first until the
 * ceiling is met. `Map` preserves insertion order, so its own iteration order is
 * the eviction order — no separate bookkeeping, and no LRU, because these values
 * are equally cheap to refetch and hit rate is not the point (correctness of the
 * double-call case is).
 */
function pruneCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
  for (const key of cache.keys()) {
    if (cache.size <= CACHE_MAX_ENTRIES) break;
    cache.delete(key);
  }
}

/**
 * Drop everything cached. Exists for tests: a module-level cache would
 * otherwise let one case's stubbed provider answer another case's fetch, and
 * that kind of cross-talk fails intermittently rather than honestly.
 */
export function clearSoilCache(): void {
  cache.clear();
}

/**
 * The actual fetch, cache-free. Input is already validated by the caller.
 *
 * Separated from `fetchSoilProperties` so the caching decision is readable in
 * one place and this function stays a straight line: two halves, parse, merge,
 * validate.
 */
async function fetchUncached(
  latitude: number,
  longitude: number,
): Promise<SoilPropertiesPayload> {
  // Every failure path still gets a soil-type suggestion if one can be had. The
  // WRB classification is a different endpoint answering a coarser question, so
  // it frequently succeeds when the property query has timed out — and the farm
  // form's suggestion is the part the farmer sees immediately.
  const tableOnly = async (reason: string, retryable: boolean): Promise<SoilPropertiesPayload> => ({
    layers: [],
    usdaTextureClass: null,
    suggestedSoilName: await suggestSoilTypeFromWrb(latitude, longitude),
    source: 'table',
    fallbackReason: reason,
    retryable,
    provider: 'isric-soilgrids-v2',
  });

  // Sequential, not Promise.all: two concurrent 16-cell queries invite the same
  // load-shedding that the split exists to avoid, and ~23 s measured total is
  // nothing user-facing — the form's suggestion comes from the fast endpoint and
  // the profile lands in the background.
  const layers: SoilLayer[] = [];
  for (const depths of DEPTH_BATCHES) {
    const outcome = await fetchBatchWithRetry(latitude, longitude, depths);
    // Both halves must land for a measured answer. Half a profile would still
    // parse and still validate, and the missing depths would silently reduce
    // root-zone coverage — a quieter, worse failure than falling back to the
    // table, which at least says so. The batch's own `retryable` rides along, so
    // a timeout falls back as worth-retrying while a 4xx falls back as final.
    if (!outcome.ok) return tableOnly(outcome.reason, outcome.retryable);
    layers.push(...parseSoilGrids(outcome.body));
  }
  layers.sort((a, b) => a.topCm - b.topCm);

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
      // The values came back and failed the cross-check; the same coordinate
      // returns the same values, so there is nothing a retry would fix.
      retryable: false,
      provider: 'isric-soilgrids-v2',
    };
  }

  return {
    layers,
    usdaTextureClass: texture,
    suggestedSoilName,
    source: 'measured',
    fallbackReason: null,
    retryable: false,
    provider: 'isric-soilgrids-v2',
  };
}
