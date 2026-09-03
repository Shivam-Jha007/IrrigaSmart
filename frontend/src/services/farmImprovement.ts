import type { ConfidenceLevel } from '../types';
import {
  cropLabelKey,
  diseaseNameKey,
  methodLabelKey,
  soilLabelKey,
  type TranslateFn,
  type TranslationKey,
} from '../i18n';
import { isKnown, type FarmContext } from './farmContext';
import { fertilizerCoversCrop } from './fertilizerKnowledge';
import { leachingRequirement } from './waterQuality';
import { isFieldMeasurement } from './provenance';
import { isSurfaceMethod, surfaceMethodWarned } from './slopeAdjustment';
import { soilTypeFromTexture } from './soilProfile';

/**
 * Farm improvement plan (PRD §15).
 *
 * WHAT THIS IS
 * A prioritised list of things that could be better on ONE farm, derived from
 * the canonical §6 `FarmContext` by a fixed set of detectors. It answers "what
 * should I fix about this farm" — a different question from "what should I do
 * today", which the decision engine already answers on the recommendation card.
 *
 * IT IS A PRIORITISED PLAN, NOT A WARNING DUMP
 * PRD §15 is explicit about this and it is the hardest part to get right. A list
 * that always has items in it teaches farmers to ignore the list. So:
 *
 *   - Every detector is silent unless it has the data it needs. A farm the app
 *     knows nothing about produces zero issues, not nine "unknown" ones.
 *   - No detector fires on a condition that is true of every farm. Soil
 *     fertility is `UNKNOWN` for every farm in the app today (no Soil Health
 *     Card reading is persisted anywhere — see `FarmContextFertility`), so
 *     "fertility is unmeasured" would appear on 100% of farms and is NOT a
 *     detector here. That leaves FERTILITY as the one §15 category with no
 *     detector, which is the honest state rather than a gap to be padded.
 *   - Today's irrigation decision is not restated as an improvement. The
 *     approved plan listed a `chronic-depletion` detector; it is absent because
 *     `FarmContext` carries one day of depletion and no history of it, so
 *     "chronic" cannot be established from the available data and a single dry
 *     day is just the recommendation card said twice.
 *   - Ranking is severity → confidence → fixed detector order, so the list does
 *     not reshuffle between renders and the top item is stable enough to act on.
 *
 * IT DECIDES NOTHING AGRONOMIC OF ITS OWN
 * Each detector is a comparison against a value or threshold that already exists
 * and is already cited: `phSuitability` against `CROP_PH_RANGE`,
 * `surfaceMethodWarned` against `SLOPE.METHOD_WARNING_PERCENT`,
 * `fertilizerCoversCrop` against the transcribed booklet tables. Nothing here
 * introduces a new number, and nothing recomputes one the engine produced.
 *
 * CONFIDENCE IS CAPPED BY WHAT THE ISSUE RESTS ON (PRD §7, §28 Guardrail 6)
 * An issue built on a `REGIONAL_ESTIMATE` cannot be `High`, however clean the
 * comparison is. `soil.phSuitability` is `CALCULATED`, but it is calculated on
 * top of a 250 m map prediction, so a pH mismatch is reported at `Medium` at
 * best — and at `Low` when the reading sits inside `TOLERANCE_MARGIN_PH` of the
 * crop's band, where a small map error flips the verdict. `farmContext.ts`
 * anticipates exactly this ("the improvement engine caps the confidence of
 * anything built on it rather than dressing the comparison up as certainty").
 *
 * WHY ISSUES CARRY TRANSLATION KEYS AND NOT STRINGS
 * PRD §15 specifies `title`, `explanation` and `possibleActions` as text. This
 * module returns `titleKey` / `explanationKey` / `actionKeys` plus a variable bag
 * instead, and that is a deliberate deviation. The app ships in five languages
 * and the detectors branch on English data-model enums (`'Flood'`, `'Clay
 * Loam'`); building English prose here and translating it later is impossible,
 * and building it in the farmer's language here would put Bengali strings inside
 * the object the detectors compare against. Keys keep the detector
 * language-independent and the output fully localised — including values that are
 * themselves enums, which travel in `labelVars` as keys and are translated by
 * `resolveIssueVars` at the point of display.
 *
 * NOTHING HERE NAMES A PRODUCT OR STATES A DOSE
 * The permanent product boundary (docs/12_Product_Roadmap_v2.md) applies to this
 * list as much as to the Copilot: no action key names a pesticide, fungicide or
 * chemical, none states a quantity, concentration or schedule, and the disease
 * detector says the weather favours a disease rather than that one is present.
 * Where a farmer's next question is "how much?", the action says the app cannot
 * answer it and points at the Krishi Vigyan Kendra.
 */

/** The seven §15 categories. */
export type FarmIssueCategory =
  | 'SOIL'
  | 'WATER'
  | 'IRRIGATION'
  | 'DISEASE'
  | 'FERTILITY'
  | 'CROP'
  | 'CLIMATE';

/** The three §15 severities. */
export type FarmIssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * The stable identity of each detector.
 *
 * A closed union rather than a free string so that a card, a test or a future
 * "don't show me this again" preference can refer to one issue without matching
 * on prose that translation would break.
 */
export type FarmIssueId =
  | 'ph-mismatch'
  | 'texture-disagreement'
  | 'soil-profile-missing'
  | 'soil-water-from-table'
  | 'surface-method-on-slope'
  | 'low-retention-surface-method'
  | 'disease-pressure'
  | 'stale-advice'
  | 'fertilizer-table-missing'
  | 'water-quality';

export interface FarmIssue {
  id: FarmIssueId;
  category: FarmIssueCategory;
  severity: FarmIssueSeverity;
  titleKey: TranslationKey;
  explanationKey: TranslationKey;
  /** One or more things the farmer could do. Never a dose, never a product. */
  actionKeys: readonly TranslationKey[];
  /** Plain values interpolated as-is: numbers, and text with no translation. */
  vars: Record<string, string | number>;
  /**
   * Values that are themselves enums, carried as translation keys so the
   * finished sentence is entirely in the farmer's language. Always present,
   * empty when there are none — `exactOptionalPropertyTypes` makes an optional
   * property here cost every caller a `delete`.
   */
  labelVars: Record<string, TranslationKey>;
  confidence: ConfidenceLevel;
}

/**
 * How many issues are treated as "the plan": shown expanded on the card, and
 * handed to the Copilot as `topIssues`.
 *
 * One constant for both so the assistant and the card cannot disagree about what
 * this farm's main problems are. A farmer who reads three items on screen and
 * then asks the assistant "what should I fix?" must hear about those three.
 */
export const TOP_ISSUE_COUNT = 3;

// --- Ranking ---

const SEVERITY_RANK: Record<FarmIssueSeverity, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = { High: 3, Medium: 2, Low: 1 };

// --- Detectors ---
//
// Each takes the whole context and returns an issue or null. Every one begins by
// checking that it has what it needs, because `isKnown` is the only thing
// standing between "this farm has a problem" and "this farm has no data".

type Detector = (fc: FarmContext) => FarmIssue | null;

/**
 * Topsoil pH outside the crop's preferred band.
 *
 * The band comes from `CROP_PH_RANGE` (cited per crop) and the verdict from
 * `phSuitability`, both already projected into `FarmContext`. The reading itself
 * is a 250 m map prediction, which is why the explanation says so in the same
 * sentence as the number and why the actions are "get a test" rather than
 * "add lime" — Guardrail 1 and Guardrail 2 in one issue.
 */
const phMismatch: Detector = (fc) => {
  const { ph, phSuitability, phOptimalMin, phOptimalMax } = fc.soil;
  if (!isKnown(phSuitability) || phSuitability.value === 'suitable') return null;
  if (!isKnown(ph) || !isKnown(phOptimalMin) || !isKnown(phOptimalMax)) return null;
  if (!isKnown(fc.crop.name)) return null;

  const significant = phSuitability.value === 'significant-issue';
  return {
    id: 'ph-mismatch',
    category: 'SOIL',
    severity: significant ? 'HIGH' : 'MEDIUM',
    titleKey: 'improve.ph.title',
    explanationKey: 'improve.ph.explain',
    actionKeys: ['improve.ph.actionTest', 'improve.ph.actionKvk'],
    vars: {
      ph: ph.value.toFixed(1),
      min: phOptimalMin.value.toFixed(1),
      max: phOptimalMax.value.toFixed(1),
    },
    labelVars: { crop: cropLabelKey(fc.crop.name.value) },
    // A real field test would settle it outright. Short of that: a significant
    // issue survives being wrong by more than TOLERANCE_MARGIN_PH, whereas
    // "slightly outside" sits inside that margin and a small map error flips it.
    confidence: isFieldMeasurement(ph.provenance) ? 'High' : significant ? 'Medium' : 'Low',
  };
};

/**
 * The soil map maps to a different soil type than the farmer recorded.
 *
 * Reported at LOW with LOW confidence on purpose: the farmer's answer wins and
 * stays winning. What makes this worth a line at all is that the water-holding
 * figures rest on the recorded type, so a farmer who was unsure when they
 * answered has a reason to check.
 */
const textureDisagreement: Detector = (fc) => {
  const { type, textureDisagreement: disagreement } = fc.soil;
  if (!isKnown(disagreement) || !isKnown(type)) return null;
  const suggested = soilTypeFromTexture(disagreement.value);
  if (suggested === null) return null;

  return {
    id: 'texture-disagreement',
    category: 'SOIL',
    severity: 'LOW',
    titleKey: 'improve.texture.title',
    explanationKey: 'improve.texture.explain',
    actionKeys: ['improve.texture.action'],
    vars: {},
    labelVars: { yours: soilLabelKey(type.value), theirs: soilLabelKey(suggested) },
    confidence: 'Low',
  };
};

/**
 * No SoilGrids profile is stored for this farm at all.
 *
 * Tested structurally — none of the three map-derived soil fields is known —
 * rather than by matching the reason string on any one of them, which would
 * break the moment that prose is reworded. Silent when there is no soil type
 * either, because that means there is no farm rather than no soil data.
 */
const soilProfileMissing: Detector = (fc) => {
  if (!isKnown(fc.soil.type)) return null;
  const hasProfile =
    isKnown(fc.soil.ph) || isKnown(fc.soil.textureClass) || isKnown(fc.soil.organicCarbonPct);
  if (hasProfile) return null;

  return {
    id: 'soil-profile-missing',
    category: 'SOIL',
    severity: 'LOW',
    titleKey: 'improve.soilProfile.title',
    explanationKey: 'improve.soilProfile.explain',
    actionKeys: ['improve.soilProfile.action'],
    vars: {},
    labelVars: { soil: soilLabelKey(fc.soil.type.value) },
    // A fact about what is in storage, not an estimate of anything.
    confidence: 'High',
  };
};

/**
 * A profile IS stored, but the water balance still used the six-row table.
 *
 * Mutually exclusive with `soil-profile-missing` by construction, so a farm with
 * no soil data is told once rather than twice. This one means the stored profile
 * did not cover the root zone, which is a different fix.
 */
const soilWaterFromTable: Detector = (fc) => {
  const basis = fc.water.soilWaterBasis;
  if (!isKnown(basis) || basis.value !== 'table') return null;
  if (!isKnown(fc.soil.type)) return null;
  const hasProfile =
    isKnown(fc.soil.ph) || isKnown(fc.soil.textureClass) || isKnown(fc.soil.organicCarbonPct);
  if (!hasProfile) return null;

  return {
    id: 'soil-water-from-table',
    category: 'WATER',
    severity: 'LOW',
    titleKey: 'improve.soilWater.title',
    explanationKey: 'improve.soilWater.explain',
    actionKeys: ['improve.soilWater.action'],
    vars: {},
    labelVars: { soil: soilLabelKey(fc.soil.type.value) },
    // Which code path ran is knowable exactly; only its inputs are estimates.
    confidence: 'High',
  };
};

/**
 * Flood or furrow irrigation on ground the elevation map reads as sloping.
 *
 * Delegates the threshold to `surfaceMethodWarned` so this and the profile-shaped
 * `warnsSurfaceMethod` cannot drift apart. Confidence is `Low` and the
 * explanation says why: the same ~90 m DEM that produces this figure is recorded
 * as fabricating ~3% slope on provably flat ground, so the advisory may sharpen
 * advice and must never be stated as fact.
 */
const surfaceMethodOnSlope: Detector = (fc) => {
  const { slopePercent, irrigationMethod } = fc.farm;
  if (!isKnown(slopePercent) || !isKnown(irrigationMethod)) return null;
  if (!surfaceMethodWarned(slopePercent.value, irrigationMethod.value)) return null;

  return {
    id: 'surface-method-on-slope',
    category: 'IRRIGATION',
    severity: 'MEDIUM',
    titleKey: 'improve.slopeMethod.title',
    explanationKey: 'improve.slopeMethod.explain',
    actionKeys: ['improve.slopeMethod.actionShorter', 'improve.slopeMethod.actionAsk'],
    vars: { slope: slopePercent.value.toFixed(1) },
    labelVars: { method: methodLabelKey(irrigationMethod.value) },
    confidence: 'Low',
  };
};

/**
 * A soil the farmer told us holds water poorly, irrigated by flood or furrow.
 *
 * Both inputs are `USER_PROVIDED`, so the facts are as solid as this app gets;
 * `Medium` rather than `High` because the conclusion drawn from them is general
 * extension guidance (water applied faster than a coarse soil accepts it drains
 * past the root zone) and not a figure this app computed for this field. No
 * quantity is suggested, only a smaller-and-more-often shape.
 */
const lowRetentionSurfaceMethod: Detector = (fc) => {
  const { waterRetention, type } = fc.soil;
  const method = fc.farm.irrigationMethod;
  if (!isKnown(waterRetention) || waterRetention.value !== 'Low') return null;
  if (!isKnown(type) || !isKnown(method) || !isSurfaceMethod(method.value)) return null;

  return {
    id: 'low-retention-surface-method',
    category: 'IRRIGATION',
    severity: 'MEDIUM',
    titleKey: 'improve.retentionMethod.title',
    explanationKey: 'improve.retentionMethod.explain',
    actionKeys: ['improve.retentionMethod.actionSplit', 'improve.retentionMethod.actionAsk'],
    vars: {},
    labelVars: { soil: soilLabelKey(type.value), method: methodLabelKey(method.value) },
    confidence: 'Medium',
  };
};

/**
 * The weather favours a disease of this crop (PRD §28 Guardrail 4).
 *
 * Requires the disease to be NAMED as well as the level to be raised: at
 * `Moderate` or above `FarmContext` always carries the name, and an unnamed
 * "some disease is likely" line is not something a farmer can go and look for.
 * The confidence is the engine's own — the disease assessment publishes one, and
 * inventing a second here would let the plan and the disease card disagree.
 */
const diseasePressure: Detector = (fc) => {
  const { level, disease, confidence } = fc.disease;
  if (!isKnown(level) || (level.value !== 'Moderate' && level.value !== 'High')) return null;
  if (!isKnown(disease)) return null;

  return {
    id: 'disease-pressure',
    category: 'DISEASE',
    severity: level.value === 'High' ? 'HIGH' : 'MEDIUM',
    titleKey: 'improve.disease.title',
    explanationKey: 'improve.disease.explain',
    actionKeys: [
      'improve.disease.actionLook',
      'improve.disease.actionPhoto',
      'improve.disease.actionKvk',
    ],
    vars: {},
    labelVars: { disease: diseaseNameKey(disease.value) },
    confidence: isKnown(confidence) ? confidence.value : 'Medium',
  };
};

/**
 * Today's advice was built without fresh weather (PRD §28 Guardrail 5).
 *
 * Two shapes, one detector: no weather at all is materially worse than stale
 * weather, so it is `MEDIUM` where the cache is `LOW`. Only fires when advice
 * exists to be qualified — flags on a farm with no recommendation would be
 * describing a fetch that never happened.
 */
const staleAdvice: Detector = (fc) => {
  if (!isKnown(fc.irrigation.status)) return null;
  const { weatherMissing, fromCache } = fc.irrigation;
  if (!weatherMissing && !fromCache) return null;

  return {
    id: 'stale-advice',
    category: 'CLIMATE',
    severity: weatherMissing ? 'MEDIUM' : 'LOW',
    titleKey: weatherMissing ? 'improve.weatherData.titleMissing' : 'improve.weatherData.titleCached',
    explanationKey: weatherMissing
      ? 'improve.weatherData.explainMissing'
      : 'improve.weatherData.explainCached',
    actionKeys: ['improve.weatherData.action'],
    vars: {},
    labelVars: {},
    // Whether the fetch succeeded is recorded, not estimated.
    confidence: 'High',
  };
};

/**
 * The app has no fertilizer schedule for this crop.
 *
 * Worth saying out loud rather than leaving the farmer to find an empty page:
 * `fertilizerKnowledge` transcribes a booklet that covers six crops and returns
 * null for the rest, and the one thing it must never do is fill the gap with a
 * guessed dose (PRD §25).
 */
const fertilizerTableMissing: Detector = (fc) => {
  if (!isKnown(fc.crop.name) || fertilizerCoversCrop(fc.crop.name.value)) return null;

  return {
    id: 'fertilizer-table-missing',
    category: 'CROP',
    severity: 'LOW',
    titleKey: 'improve.fertTable.title',
    explanationKey: 'improve.fertTable.explain',
    actionKeys: ['improve.fertTable.action'],
    vars: {},
    labelVars: { crop: cropLabelKey(fc.crop.name.value) },
    // A fact about this app's own tables.
    confidence: 'High',
  };
};

/**
 * Irrigation-water or soil chemistry beyond what the engine acts on
 * numerically (V2.2).
 *
 * FIRES ONLY ON THE FARMER'S OWN TEST VALUES, all `USER_PROVIDED`, so the
 * comparisons carry `High` confidence. The thresholds are FAO-29 Table 1/12
 * and its Indian-extension adaptations (the values your reference table also
 * cites): SAR > 3 with ECw < 0.7 risks sodium build-up; boron > 0.7 mg/L is
 * toxic to sensitive crops; bicarbonate > 1.5 meq/L clogs emitters with white
 * scale; ESP > 5% closes soil pores; and an ECw the crop's own FAO-29
 * tolerance cannot be leached against is unusable for that crop.
 *
 * ONE DETECTOR, NOT SIX: a single test slip usually trips several thresholds
 * at once (saline water is often sodic and boronic too), and six separate
 * cards would be one problem announced six times. The worst breach sets the
 * severity; the explanation lists every breach the tests showed.
 */
const WATER_QUALITY_LIMITS = {
  sar: 3,
  boronMgl: 0.7,
  bicarbonateMeql: 1.5,
  espPct: 5,
} as const;

const waterQuality: Detector = (fc) => {
  // The thresholds compared against exist only in the codebase's own vetted
  // table, so these literals belong in the detector.
  const water = fc.water;
  const breaches: Array<{ key: string; value: number }> = [];
  if (isKnown(water.qualitySar) && water.qualitySar.value > WATER_QUALITY_LIMITS.sar) {
    breaches.push({ key: 'sar', value: water.qualitySar.value });
  }
  if (isKnown(water.qualityBoron) && water.qualityBoron.value > WATER_QUALITY_LIMITS.boronMgl) {
    breaches.push({ key: 'boron', value: water.qualityBoron.value });
  }
  if (
    isKnown(water.qualityBicarbonate) &&
    water.qualityBicarbonate.value > WATER_QUALITY_LIMITS.bicarbonateMeql
  ) {
    breaches.push({ key: 'bicarbonate', value: water.qualityBicarbonate.value });
  }
  if (isKnown(water.soilEsp) && water.soilEsp.value > WATER_QUALITY_LIMITS.espPct) {
    breaches.push({ key: 'esp', value: water.soilEsp.value });
  }
  // An ECw too saline for THIS crop to be leached against (leachingRequirement
  // returns null) is the one breach that outranks the others: no amount of
  // extra water makes that water safe for that crop.
  let unusableWater = false;
  if (isKnown(water.qualityEc) && isKnown(fc.crop.name)) {
    unusableWater = leachingRequirement(water.qualityEc.value, fc.crop.name.value) === null;
    if (unusableWater) breaches.push({ key: 'ecw', value: water.qualityEc.value });
  }
  if (breaches.length === 0) return null;

  const summary = breaches
    .map(({ key, value }) => `${key} ${value > 10 ? Math.round(value) : value}`)
    .join(', ');
  return {
    id: 'water-quality',
    category: 'WATER',
    severity: unusableWater || breaches.length >= 3 ? 'HIGH' : 'MEDIUM',
    titleKey: 'improve.waterQuality.title',
    explanationKey: 'improve.waterQuality.explain',
    actionKeys: ['improve.waterQuality.action'],
    vars: { breaches: summary },
    labelVars: {},
    // Every value is the farmer's own lab number.
    confidence: 'High',
  };
};

/**
 * The detectors, in the order that breaks a severity-and-confidence tie.
 *
 * The order is part of the contract, not an accident of how the file grew: it
 * runs soil chemistry before soil data quality before irrigation practice before
 * disease before freshness, so two equally-ranked issues always appear the same
 * way round. Append rather than reorder.
 */
const DETECTORS: readonly Detector[] = [
  phMismatch,
  textureDisagreement,
  soilProfileMissing,
  soilWaterFromTable,
  surfaceMethodOnSlope,
  lowRetentionSurfaceMethod,
  diseasePressure,
  staleAdvice,
  fertilizerTableMissing,
  waterQuality,
];

/**
 * Everything this farm could improve, worst first.
 *
 * Pure and total: no storage, no network, no clock. Safe to call on every render
 * and it returns an empty array — not a placeholder issue — for a farm the app
 * knows nothing about.
 */
export function detectFarmIssues(fc: FarmContext): FarmIssue[] {
  return DETECTORS.map((detect) => detect(fc))
    .filter((issue): issue is FarmIssue => issue !== null)
    .map((issue, order) => ({ issue, order }))
    .sort(
      (a, b) =>
        SEVERITY_RANK[b.issue.severity] - SEVERITY_RANK[a.issue.severity] ||
        CONFIDENCE_RANK[b.issue.confidence] - CONFIDENCE_RANK[a.issue.confidence] ||
        // The explicit index rather than relying on sort stability: stability is
        // guaranteed by the language, but the guarantee is easier to read here.
        a.order - b.order,
    )
    .map(({ issue }) => issue);
}

/**
 * The interpolation bag for one issue, with enum values translated.
 *
 * Called at the point of display — by the card and by `assistantContext` — so
 * that `{crop}` becomes "ধান" for a Bengali farmer rather than "Rice". Plain
 * `vars` win over `labelVars` on a name collision, which no detector creates and
 * a future one should not either.
 */
export function resolveIssueVars(issue: FarmIssue, t: TranslateFn): Record<string, string | number> {
  const resolved: Record<string, string | number> = {};
  for (const [name, key] of Object.entries(issue.labelVars)) resolved[name] = t(key);
  return { ...resolved, ...issue.vars };
}
