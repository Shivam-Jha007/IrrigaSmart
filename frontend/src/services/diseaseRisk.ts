import type { ConfidenceLevel, CropName, DailyWeather, DiseaseRiskLevel } from '../types';
import { CROP_DISEASES, type DiseaseId, type DiseaseProfile } from './diseaseKnowledge';
import { CARRYOVER_DAYS, DISEASE_RISK, PLAN_DAYS_AHEAD } from './decisionParameters';
import { isOvercast, type DryingPotential, dryingPotential } from './sunshine';

/**
 * Weather-based disease risk (docs/11_Decision_Logic.md §12;
 * docs/12_Product_Roadmap_v2.md Version 1.3 Feature 9).
 *
 * Deterministic and framework-independent, exactly like the Decision Engine:
 * identical inputs always produce identical output, and `today` is injected
 * rather than read from the clock so results are reproducible and testable.
 *
 * ADVISORY ONLY. This module reads the same cached daily weather series the
 * irrigation plan uses, but nothing here feeds back into the irrigation
 * recommendation — its status, water amount, timing, confidence and factors are
 * byte-identical whether or not this runs (docs/02_Decision_Engine.md, note on
 * disease risk). It was kept outside the pipeline deliberately: an advisory
 * signal that cannot change the outcome should not be able to change it by
 * accident.
 *
 * It reads only cached data and makes no network request, so it works fully
 * offline like every other part of the app.
 *
 * The output never names a chemical, never states a dose, and never claims a
 * disease is present — only that the weather favours it (docs/11 §12f).
 *
 * V1.7 adds sunshine to the scoring (item 2). A day's temperature and wetness
 * still decide whether it is favourable at all; sunshine only weighs how heavily
 * a favourable day counts, because it measures the energy available to dry the
 * canopy and therefore how long free water persists on the leaf. Days from a
 * cache with no sunshine figure score exactly as they did before, so an offline
 * farmer on an old cache sees no change in behaviour (item 18).
 */

/** Days in the assessment window: past + today + forecast (docs/11 §12e). */
const WINDOW_DAYS = CARRYOVER_DAYS + 1 + PLAN_DAYS_AHEAD;

/** The weather on the most recent day whose conditions favoured the disease. */
export interface FavourableDay {
  /** YYYY-MM-DD. */
  date: string;
  temperatureMax: number;
  humidityMean: number;
  precipitationSum: number;
  /**
   * How well the canopy could dry that day, from sunshine (item 2). Null when
   * the day carries no sunshine figure — which is not the same as a dull day and
   * must not be rendered as one.
   */
  drying: DryingPotential | null;
}

/** One crop's disease risk assessment (docs/11 §12d). */
export interface DiseaseRiskAssessment {
  crop: CropName;
  /** The disease whose conditions are most strongly met. */
  disease: DiseaseId;
  level: DiseaseRiskLevel;
  /** Weighted favourable-day score (docs/11 §12c). Rounded to 2 decimals. */
  score: number;
  /** Consecutive favourable days ending today; 0 when today is unfavourable. */
  observedRun: number;
  /** Consecutive favourable days starting tomorrow. */
  forecastRun: number;
  /**
   * How many days inside those runs were overcast enough to keep the canopy wet
   * for hours longer (item 2). Reported so the card can name the reason the
   * score is elevated instead of showing an unexplained number, and so a farmer
   * can sanity-check it against the sky they can see.
   */
  overcastDays: number;
  /**
   * Weather from the latest favourable day, so the explanation can name the
   * conditions responsible instead of asserting a conclusion. Null when no day
   * in the window was favourable.
   */
  trigger: FavourableDay | null;
  /** How much of the window had data (docs/11 §12e) — not correctness. */
  confidence: ConfidenceLevel;
}

/**
 * Is this day favourable for infection? (docs/11 §12a)
 *
 * The temperature band and the wetness requirement must BOTH hold on the same
 * day — neither alone is sufficient (docs/10 §10.1). Rain satisfies wetness on
 * its own because it wets the canopy directly, whatever the day's mean humidity.
 */
function isFavourable(day: DailyWeather, profile: DiseaseProfile): boolean {
  const tempOk =
    day.temperatureMax >= profile.maxTempMinC && day.temperatureMax <= profile.maxTempMaxC;
  const wet =
    day.humidityMean >= profile.meanHumidityMin ||
    day.precipitationSum >= DISEASE_RISK.WET_DAY_RAIN_MM;
  return tempOk && wet;
}

/** Ascending date comparator, mirroring the engine's own ordering. */
function byDate(a: DailyWeather, b: DailyWeather): number {
  return a.date.localeCompare(b.date);
}

/** Round to 2 decimals so scores compare and display cleanly. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Map a weighted score to a risk level (docs/11 §12c). */
function levelForScore(score: number): DiseaseRiskLevel {
  if (score >= DISEASE_RISK.SCORE_HIGH) return 'High';
  if (score >= DISEASE_RISK.SCORE_MODERATE) return 'Moderate';
  if (score > 0) return 'Low';
  return 'None';
}

/** Assessment confidence from how much of the window had data (docs/11 §12e). */
function coverageConfidence(daysAvailable: number): ConfidenceLevel {
  const coverage = daysAvailable / WINDOW_DAYS;
  if (coverage >= DISEASE_RISK.COVERAGE_HIGH) return 'High';
  if (coverage >= DISEASE_RISK.COVERAGE_MEDIUM) return 'Medium';
  return 'Low';
}

/** One disease's score over the window (docs/11 §12b–c). */
interface ProfileScore {
  profile: DiseaseProfile;
  score: number;
  observedRun: number;
  forecastRun: number;
  overcastDays: number;
  trigger: FavourableDay | null;
}

/**
 * Weight one favourable day, scaling by how poorly the canopy dries (item 2).
 *
 * `baseWeight` carries the observed-vs-forecast distinction; sunshine only
 * multiplies it. A day with no sunshine figure returns the base weight
 * unchanged, so the pre-V1.7 result is reproduced exactly.
 */
function dayWeight(day: DailyWeather, latitude: number, baseWeight: number): number {
  return isOvercast(day, latitude) ? baseWeight * DISEASE_RISK.OVERCAST_DAY_MULTIPLIER : baseWeight;
}

function scoreProfile(
  profile: DiseaseProfile,
  sorted: DailyWeather[],
  today: string,
  latitude: number,
): ProfileScore {
  // Infection needs SUSTAINED favourable conditions, so consecutive days are
  // counted rather than totals (docs/11 §12b).
  const past = sorted.filter((d) => d.date <= today);
  const endsToday = past.length > 0 && past[past.length - 1]!.date === today;
  // The observed run must END at today. If the series has no entry for today —
  // a stale cache, say — there is no run to speak of and the assessment rests on
  // the forecast alone, rather than on a spell that may already have broken.
  // Weight is accumulated alongside the run length rather than multiplied at the
  // end, because only the days INSIDE a run may contribute — an overcast day
  // outside the spell has no wetness to prolong.
  let observedRun = 0;
  let observedWeight = 0;
  let overcastDays = 0;
  if (endsToday) {
    for (let i = past.length - 1; i >= 0; i -= 1) {
      const day = past[i]!;
      if (!isFavourable(day, profile)) break;
      observedRun += 1;
      observedWeight += dayWeight(day, latitude, DISEASE_RISK.OBSERVED_DAY_WEIGHT);
      if (isOvercast(day, latitude)) overcastDays += 1;
    }
  }

  const future = sorted.filter((d) => d.date > today);
  let forecastRun = 0;
  let forecastWeight = 0;
  for (const day of future) {
    if (!isFavourable(day, profile)) break;
    forecastRun += 1;
    forecastWeight += dayWeight(day, latitude, DISEASE_RISK.FORECAST_DAY_WEIGHT);
    if (isOvercast(day, latitude)) overcastDays += 1;
  }

  const score = round2(observedWeight + forecastWeight);

  // The trigger day must be one that actually contributed to the score, so the
  // explanation quotes the weather that caused the warning rather than some
  // earlier favourable day that no longer counts. An observed run ends at
  // today; otherwise the first favourable forecast day opens the spell.
  let source: DailyWeather | null = null;
  if (observedRun > 0) {
    source = past[past.length - 1]!;
  } else if (forecastRun > 0) {
    source = future[0]!;
  }

  return {
    profile,
    score,
    observedRun,
    forecastRun,
    overcastDays,
    trigger: source
      ? {
          date: source.date,
          temperatureMax: source.temperatureMax,
          humidityMean: source.humidityMean,
          precipitationSum: source.precipitationSum,
          drying: dryingPotential(source, latitude),
        }
      : null,
  };
}

/**
 * Assess disease risk for a crop over the cached daily weather window.
 *
 * Returns null when no daily series is available. That is deliberately NOT the
 * same as a level of "None": "cannot assess" and "conditions are unfavourable"
 * are different statements, and the farmer must be able to tell them apart
 * (docs/11 §12e).
 *
 * @param crop  the farm's crop
 * @param daily past + forecast daily series, or null when unavailable
 * @param today local YYYY-MM-DD for the day being evaluated, injected for determinism
 * @param latitude farm latitude, used only to derive daylight hours for the
 *   sunshine ratio when the provider did not send them. Required rather than
 *   optional so a caller cannot silently lose the sunshine term by omitting it.
 */
export function assessDiseaseRisk(
  crop: CropName,
  daily: DailyWeather[] | null,
  today: string,
  latitude: number,
): DiseaseRiskAssessment | null {
  if (!daily || daily.length === 0) return null;

  const sorted = [...daily].sort(byDate);
  const profiles = CROP_DISEASES[crop];

  // Every profile is evaluated; the crop's reported risk is the highest-scoring
  // one. Ties break by declaration order, which keeps the result deterministic
  // (docs/11 §12d).
  let best: ProfileScore | null = null;
  for (const profile of profiles) {
    const candidate = scoreProfile(profile, sorted, today, latitude);
    if (!best || candidate.score > best.score) best = candidate;
  }
  if (!best) return null;

  return {
    crop,
    disease: best.profile.id,
    level: levelForScore(best.score),
    score: best.score,
    observedRun: best.observedRun,
    forecastRun: best.forecastRun,
    overcastDays: best.overcastDays,
    trigger: best.trigger,
    confidence: coverageConfidence(sorted.length),
  };
}
