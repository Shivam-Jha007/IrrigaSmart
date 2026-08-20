/**
 * Data provenance vocabulary (PRD §7, Guardrail 1).
 *
 * WHY THIS EXISTS
 * The app mixes values of very different standing: a soil type the farmer chose
 * while standing in their own field, a pH the machine-learning model behind
 * ISRIC SoilGrids predicted for a 250 m cell, a rainfall figure that has not
 * happened yet, and a water depth the decision engine derived from all three.
 * Before this module they all arrived at the UI and at the language model as
 * bare numbers, which is how "Soil pH: 6.4" came to be shown to farmers for a
 * value that is a regional model prediction. A farmer who believes that number
 * is a test of their field may skip the soil test that would have told them the
 * truth.
 *
 * So: every uncertain value that crosses a boundary — into a screen, or into a
 * prompt — carries where it came from. The vocabulary is closed. These seven
 * labels are the whole set and nothing may invent an eighth, because the
 * downstream contract ("never present a REGIONAL_ESTIMATE as a measurement")
 * can only be enforced against a fixed list.
 *
 * WHAT THIS MODULE IS NOT
 * It is not a rewrite of the decision engine. `decisionEngine`, `waterSavings`,
 * `irrigationTiming` and the knowledge-base tables keep their existing plain
 * numeric signatures; wrapping their internals would change nothing a farmer
 * sees while putting every golden snapshot at risk. Provenance is applied at
 * the boundaries — `farmContext.ts`, the assistant context, and the cards that
 * render an estimate — which is exactly where the honesty is needed.
 */

/**
 * Where a value came from (PRD §7). The complete, closed list.
 *
 * `MEASURED` — an instrument or laboratory reading of THIS field. Nothing in the
 *   app currently produces one; it exists so that a future soil-test import, a
 *   Soil Health Card scan or a sensor has a truthful label to claim.
 * `USER_PROVIDED` — the farmer told us. Authoritative about their own farm
 *   (crop, area, soil type, irrigation method) and not to be second-guessed by
 *   a model prediction: they have stood in the field and a 250 m grid cell has
 *   not.
 * `REGIONAL_ESTIMATE` — a value predicted for the area, not observed on this
 *   farm: SoilGrids pH/texture/organic carbon, the ~90 m DEM slope, and the
 *   Knowledge Base's six-row soil-hydraulics table. The label that matters most,
 *   because it is the one most easily mistaken for a measurement.
 * `FORECAST` — has not happened yet. Weather.
 * `CALCULATED` — the decision engine derived it deterministically from inputs
 *   that themselves carry provenance (FAO-56 water balance, irrigation depth,
 *   run time, disease risk score).
 * `INFERRED` — a weaker derivation: a judgement or classification rather than an
 *   equation, e.g. reading a growth stage from a sowing date.
 * `UNKNOWN` — we do not have it. A first-class outcome, not a failure. Water
 *   quality and pump energy are UNKNOWN today and must say so rather than be
 *   filled in with a plausible number.
 */
export type Provenance =
  | 'MEASURED'
  | 'USER_PROVIDED'
  | 'REGIONAL_ESTIMATE'
  | 'FORECAST'
  | 'CALCULATED'
  | 'INFERRED'
  | 'UNKNOWN';

/**
 * The vocabulary as data, so tests can assert exhaustiveness and the UI can
 * enumerate it. Keep in sync with `Provenance` — the `satisfies` clause makes a
 * divergence a compile error rather than a silently missing label.
 */
export const PROVENANCE_LABELS = [
  'MEASURED',
  'USER_PROVIDED',
  'REGIONAL_ESTIMATE',
  'FORECAST',
  'CALCULATED',
  'INFERRED',
  'UNKNOWN',
] as const satisfies readonly Provenance[];

/**
 * A value with its source attached.
 *
 * `origin` and `asOf` are `T | null` rather than optional properties on purpose:
 * `exactOptionalPropertyTypes` is enabled, so `{ ...s, origin: undefined }` is
 * NOT assignable to `origin?: string`, and every spread-and-override of a
 * provenanced value would need a `delete`. Explicit null costs one word and
 * removes the whole class of error.
 */
export interface Sourced<T> {
  value: T;
  provenance: Provenance;
  /**
   * Who or what produced it, in words a farmer could be shown — "a 250 m soil
   * map (ISRIC SoilGrids v2.0)", not "soilgrids". Null when the provenance
   * label alone says everything (`USER_PROVIDED`).
   */
  origin: string | null;
  /**
   * ISO timestamp of when the value was obtained, when known (PRD §28
   * Guardrail 5: data freshness must be visible). Null for values with no
   * meaningful age, such as a table lookup.
   */
  asOf: string | null;
}

/** Attach a source to a value. */
export function sourced<T>(
  value: T,
  provenance: Provenance,
  origin: string | null = null,
  asOf: string | null = null,
): Sourced<T> {
  return { value, provenance, origin, asOf };
}

/**
 * A value the app does not have, with the reason recorded.
 *
 * The reason is not decoration: "no water-quality data source exists" is what
 * stops the next reader from assuming the field is merely unpopulated and
 * "helpfully" defaulting it.
 */
export function unknown(reason: string): Sourced<null> {
  return { value: null, provenance: 'UNKNOWN', origin: reason, asOf: null };
}

/**
 * Whether a value may honestly be spoken of as a reading from this field.
 *
 * Only `MEASURED` qualifies. `USER_PROVIDED` is authoritative but is a farmer's
 * answer, not an instrument's; `REGIONAL_ESTIMATE` is a prediction for the area.
 * Used by the pH card and the assistant to decide between "your soil pH is" and
 * "the estimated soil pH here is" — the distinction PRD Guardrail 1 exists for.
 */
export function isFieldMeasurement(provenance: Provenance): boolean {
  return provenance === 'MEASURED';
}

/**
 * Canonical origin strings.
 *
 * Shared so the same value is described identically wherever it surfaces — the
 * pH card, the improvement plan and the model's prompt must not each invent
 * their own phrasing for the same 250 m grid cell, or a farmer comparing two
 * screens learns to distrust both.
 */
export const ORIGIN = {
  /**
   * ISRIC SoilGrids v2.0. Deliberately spells out that it is a prediction:
   * SoilGrids is quantile-random-forest digital soil mapping, and its own paper
   * is titled "producing soil information for the globe with quantified spatial
   * uncertainty" (Poggio et al. 2021, SOIL 7, 217-240, CC-BY 4.0). It is the
   * best openly available estimate for a coordinate and it is not a soil test.
   */
  soilGrids: 'a 250 m soil map prediction (ISRIC SoilGrids v2.0), not a test of this field',
  /** ~90 m elevation model. Its measured limits are recorded in slopeAdjustment.ts. */
  demSlope: 'a coarse ~90 m elevation map, so the figure is rough',
  /** The Knowledge Base six-row soil-hydraulics table (Saxton & Rawls 2006). */
  soilTable: 'a generic table for this soil type, not this farm',
  /** Answered by the farmer during onboarding or in Settings. */
  farmer: null,
  /** The weather provider's forecast series. */
  forecast: 'a weather forecast, which can change',
  /** The on-device decision engine (FAO-56 water balance). */
  engine: 'calculated by the app from the figures above',
  /** The farm's own irrigation log in the water ledger. */
  ledger: "this farm's own irrigation log",
} as const;
