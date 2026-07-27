import type {
  ConfidenceLevel,
  Crop,
  DailyWeather,
  EstimatedWaterAmount,
  Farm,
  Language,
  Recommendation,
  RecommendationFactor,
  RecommendationStatus,
  Soil,
  WeatherData,
} from '../types';
import { getKc } from './knowledgeBase';
import { buildExplanation } from './explanationText';
import {
  AREA_TO_M2,
  CARRYOVER_DAYS,
  clamp,
  ETO_REF,
  FRESH_MAX_HOURS,
  HUM_STRONG_DELTA,
  IRRIGATION_TIME_DEFAULT,
  KC_HIGH,
  KC_LOW,
  METHOD_EFFICIENCY,
  METHOD_LOW_EFFICIENCY,
  PLAN_DAYS_AHEAD,
  PLAN_MEDIUM_MAX_OFFSET,
  RAIN_EFF_FACTOR,
  SKIP_THRESHOLD_MM,
  STALE_MAX_HOURS,
  TEMP_STRONG_DELTA,
  WEATHER,
  WIND_STRONG_DELTA,
} from './decisionParameters';

/**
 * Decision Engine (docs/02_Decision_Engine.md, docs/11_Decision_Logic.md).
 *
 * Deterministic and framework-independent (docs/07_Engineering_Rules.md:
 * Decision Engine Rules). Identical inputs always produce identical output.
 * `now` is injected rather than read from the clock so results are reproducible
 * and testable. `language` selects the explanation wording (roadmap Feature 2)
 * and is likewise an explicit input, keeping determinism.
 *
 * V1.2 additions (docs/11_Decision_Logic.md §10–§11): decision factors with
 * relative influence (roadmap Feature 4), a soil-moisture carryover deficit
 * from recent days' rainfall (Feature 6), and a multi-day irrigation plan
 * (Feature 5). When `daily` is null the engine reproduces the V1.1 formula
 * exactly, so offline use with an old cache is unchanged.
 */

export interface DecisionInput {
  farm: Farm;
  crop: Crop;
  soil: Soil;
  /** Latest available weather, or null when none exists (Decision Logic §8). */
  weather: WeatherData | null;
  /**
   * Past + forecast daily series (Decision Logic §11), or null when
   * unavailable. Past days feed the carryover deficit; future days feed the
   * irrigation plan.
   */
  daily: DailyWeather[] | null;
  /** Current time as an ISO-8601 string, injected for determinism. */
  now: string;
  /** Language for the farmer-facing explanation (roadmap Feature 2). */
  language: Language;
}

/** A missing required field prevents recommendation (Decision Engine Stage 1). */
export interface ValidationFailure {
  ok: false;
  missingFields: string[];
}

/** One day of the multi-day irrigation plan (Decision Logic §11). */
export interface IrrigationPlanDay {
  /** Calendar date (YYYY-MM-DD, farm-local). */
  date: string;
  /** Days from today (0 = today). */
  offsetDays: number;
  /** Effective rainfall expected that day in mm. */
  rainfallMm: number;
  /** Crop water demand for that day in mm. */
  demandMm: number;
  action: RecommendationStatus;
  confidence: ConfidenceLevel;
}

export interface IrrigationPlan {
  days: IrrigationPlanDay[];
  /** First day (including today) advised for irrigation, if any. */
  recommendedIrrigationDate: string | null;
  /** First day where forecast rain covers demand, if any. */
  nextRainCoveredDate: string | null;
}

export interface DecisionSuccess {
  ok: true;
  recommendation: Recommendation;
  /** Multi-day plan (Decision Logic §11), or null without daily data. */
  plan: IrrigationPlan | null;
}

export type DecisionResult = ValidationFailure | DecisionSuccess;

/** Stage 1 — Validation. Ensures a complete profile before proceeding. */
function validate(input: DecisionInput): string[] {
  const missing: string[] = [];
  const { farm, crop } = input;
  if (!crop.name) missing.push('Crop');
  if (!farm.soilType) missing.push('Soil Type');
  if (!(farm.area > 0)) missing.push('Field Size');
  if (!farm.irrigationMethod) missing.push('Irrigation Method');
  if (!farm.location) missing.push('Location');
  if (!crop.growthStage) missing.push('Growth Stage');
  return missing;
}

/** Weather signals the multiplier reads (shared by current and daily data). */
interface WeatherSignals {
  temperature: number;
  humidity: number;
  windSpeed: number;
}

/** Stage 3 helper — bounded weather multiplier (Decision Logic §2). */
function weatherMultiplier(weather: WeatherSignals): number {
  const adjTemp = clamp(
    1 + (weather.temperature - WEATHER.T_BASE) * WEATHER.TEMP_SENS,
    WEATHER.TEMP_MIN,
    WEATHER.TEMP_MAX,
  );
  const adjHum = clamp(
    1 + (WEATHER.H_BASE - weather.humidity) * WEATHER.HUM_SENS,
    WEATHER.HUM_MIN,
    WEATHER.HUM_MAX,
  );
  const adjWind = clamp(
    1 + (weather.windSpeed - WEATHER.W_BASE) * WEATHER.WIND_SENS,
    WEATHER.WIND_MIN,
    WEATHER.WIND_MAX,
  );
  return clamp(adjTemp * adjHum * adjWind, WEATHER.WMULT_MIN, WEATHER.WMULT_MAX);
}

/** Crop water demand for one daily-series day in mm (Decision Logic §2, §11). */
function dailyDemand(kc: number, day: DailyWeather): number {
  const multiplier = weatherMultiplier({
    temperature: day.temperatureMax,
    humidity: day.humidityMean,
    windSpeed: day.windSpeedMax,
  });
  return kc * ETO_REF * multiplier;
}

/** Farm-local calendar date (YYYY-MM-DD) for an ISO timestamp. */
function localDateString(iso: string): string {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Ascending date comparator for DailyWeather entries. */
function byDate(a: DailyWeather, b: DailyWeather): number {
  return a.date.localeCompare(b.date);
}

/**
 * Soil-moisture carryover deficit in mm (Decision Logic §11 Step 4b).
 * Chains each past day's deficit: deficit grows by the day's demand and
 * shrinks by its effective rainfall, floored at zero.
 */
function carryoverDeficit(kc: number, soil: Soil, daily: DailyWeather[], todayDate: string): number {
  const pastDays = daily
    .filter((d) => d.date < todayDate)
    .sort(byDate)
    .slice(-CARRYOVER_DAYS);
  let deficit = 0;
  for (const day of pastDays) {
    const demand = dailyDemand(kc, day);
    const pe = day.precipitationSum * RAIN_EFF_FACTOR[soil.name];
    deficit = Math.max(0, deficit + demand - pe);
  }
  return deficit;
}

/** Stage 8 — Confidence from data freshness and completeness (Decision Logic §8). */
function computeConfidence(weather: WeatherData | null, now: string): ConfidenceLevel {
  if (!weather) return 'Low';
  const ageHours = (new Date(now).getTime() - new Date(weather.observationTime).getTime()) / 3_600_000;
  if (ageHours <= FRESH_MAX_HOURS) return 'High';
  if (ageHours <= STALE_MAX_HOURS) return 'Medium';
  return 'Low';
}

/**
 * Decision factors with relative influence (Decision Logic §10;
 * roadmap Feature 4). Classification is deterministic and uses only the
 * thresholds in decisionParameters.ts; factors never change the outcome.
 */
function buildFactors(
  kc: number,
  crop: Crop,
  soil: Soil,
  farm: Farm,
  weather: WeatherData | null,
  pe: number,
  etcAdj: number,
): RecommendationFactor[] {
  const factors: RecommendationFactor[] = [];

  factors.push({
    name: 'crop',
    value: crop.name,
    influence: kc >= KC_HIGH ? 'increases' : kc <= KC_LOW ? 'decreases' : 'neutral',
    strength: kc >= KC_HIGH ? 'strong' : kc <= KC_LOW ? 'moderate' : 'weak',
  });

  const stage = crop.growthStage;
  factors.push({
    name: 'growthStage',
    value: stage,
    influence:
      stage === 'Mid Season'
        ? 'increases'
        : stage === 'Initial' || stage === 'Late Season'
          ? 'decreases'
          : 'neutral',
    strength: stage === 'Mid Season' ? 'strong' : stage === 'Development' ? 'weak' : 'moderate',
  });

  if (weather) {
    const t = weather.temperature;
    factors.push({
      name: 'temperature',
      value: `${Math.round(t)}°C`,
      influence:
        t >= WEATHER.T_BASE + TEMP_STRONG_DELTA
          ? 'increases'
          : t <= WEATHER.T_BASE - TEMP_STRONG_DELTA
            ? 'decreases'
            : 'neutral',
      strength:
        Math.abs(t - WEATHER.T_BASE) >= TEMP_STRONG_DELTA
          ? 'strong'
          : t === WEATHER.T_BASE
            ? 'weak'
            : 'moderate',
    });

    factors.push({
      name: 'rainfall',
      value: `${weather.rainfallForecast.toFixed(1)} mm`,
      influence: pe > 0 ? 'decreases' : 'neutral',
      strength: pe >= etcAdj ? 'strong' : pe > 0 ? 'moderate' : 'weak',
    });

    const h = weather.humidity;
    factors.push({
      name: 'humidity',
      value: `${Math.round(h)}%`,
      influence:
        h <= WEATHER.H_BASE - HUM_STRONG_DELTA
          ? 'increases'
          : h >= WEATHER.H_BASE + HUM_STRONG_DELTA
            ? 'decreases'
            : 'neutral',
      strength: Math.abs(h - WEATHER.H_BASE) >= HUM_STRONG_DELTA ? 'strong' : 'weak',
    });

    const w = weather.windSpeed;
    factors.push({
      name: 'wind',
      value: `${w.toFixed(1)} m/s`,
      influence: w >= WEATHER.W_BASE + WIND_STRONG_DELTA ? 'increases' : 'neutral',
      strength: w >= WEATHER.W_BASE + WIND_STRONG_DELTA ? 'strong' : 'weak',
    });
  }

  factors.push({
    name: 'soil',
    value: soil.name,
    influence: soil.name === 'Sandy' ? 'increases' : soil.name === 'Clay' ? 'decreases' : 'neutral',
    strength: soil.name === 'Loamy' ? 'weak' : 'moderate',
  });

  const efficiency = METHOD_EFFICIENCY[farm.irrigationMethod];
  factors.push({
    name: 'irrigationMethod',
    value: farm.irrigationMethod,
    influence: efficiency <= METHOD_LOW_EFFICIENCY ? 'increases' : 'neutral',
    strength: efficiency <= METHOD_LOW_EFFICIENCY ? 'moderate' : 'weak',
  });

  return factors;
}

/**
 * Multi-day irrigation plan (Decision Logic §11; roadmap Feature 5).
 * Seeded with today's recommendation, then chains a simulated deficit over the
 * forecast days, assuming advised irrigation is performed (deficit resets).
 */
function buildPlan(
  kc: number,
  soil: Soil,
  daily: DailyWeather[],
  todayDate: string,
  today: { status: RecommendationStatus; confidence: ConfidenceLevel; pe: number; etcAdj: number; nir: number },
): IrrigationPlan {
  const days: IrrigationPlanDay[] = [
    {
      date: todayDate,
      offsetDays: 0,
      rainfallMm: round(today.pe, 2),
      demandMm: round(today.etcAdj, 2),
      action: today.status,
      confidence: today.confidence,
    },
  ];

  // NIR already includes the past carryover deficit, so it is the deficit
  // carried forward when today is not irrigated; advised irrigation resets it.
  let runningDeficit = today.status === 'Irrigate Today' ? 0 : today.nir;
  const futureDays = daily
    .filter((d) => d.date > todayDate)
    .sort(byDate)
    .slice(0, PLAN_DAYS_AHEAD);

  futureDays.forEach((day, index) => {
    const demand = dailyDemand(kc, day);
    const pe = day.precipitationSum * RAIN_EFF_FACTOR[soil.name];
    runningDeficit = Math.max(0, runningDeficit + demand - pe);

    let action: RecommendationStatus;
    if (pe >= demand) {
      action = 'Delay Irrigation';
    } else if (runningDeficit < SKIP_THRESHOLD_MM[soil.name]) {
      action = 'Monitor Tomorrow';
    } else {
      action = 'Irrigate Today';
    }
    if (action === 'Irrigate Today') runningDeficit = 0;

    const offsetDays = index + 1;
    days.push({
      date: day.date,
      offsetDays,
      rainfallMm: round(pe, 2),
      demandMm: round(demand, 2),
      action,
      confidence: offsetDays <= PLAN_MEDIUM_MAX_OFFSET ? 'Medium' : 'Low',
    });
  });

  return {
    days,
    recommendedIrrigationDate: days.find((d) => d.action === 'Irrigate Today')?.date ?? null,
    nextRainCoveredDate: days.find((d) => d.action === 'Delay Irrigation')?.date ?? null,
  };
}

/**
 * Run the full decision pipeline for a single farm.
 * Returns either a validation failure (missing fields) or a recommendation.
 */
export function generateRecommendation(input: DecisionInput): DecisionResult {
  // Stage 1 — Validation
  const missingFields = validate(input);
  if (missingFields.length > 0) {
    return { ok: false, missingFields };
  }

  const { farm, crop, soil, weather, daily, now, language } = input;
  const todayDate = localDateString(now);

  // Stage 2 — Knowledge retrieval
  const kc = getKc(crop.name, crop.growthStage);

  // Stage 3/4 — Weather analysis + crop demand.
  // With no weather, assume a neutral multiplier so a recommendation still exists
  // offline; confidence will reflect the missing data.
  const multiplier = weather ? weatherMultiplier(weather) : 1;
  const etcAdj = kc * ETO_REF * multiplier;

  // Effective rainfall (Decision Logic §3)
  const rainfall = weather?.rainfallForecast ?? 0;
  const pe = rainfall * RAIN_EFF_FACTOR[soil.name];

  // Carryover deficit from recent days (Decision Logic §11 Step 4b)
  const deficitPast = daily ? carryoverDeficit(kc, soil, daily, todayDate) : 0;

  // Net irrigation need (Decision Logic §4)
  const nir = Math.max(0, etcAdj - pe + deficitPast);

  // Stage 5 — Decision outcome (Decision Logic §5)
  let status: RecommendationStatus;
  if (pe >= etcAdj) {
    status = 'Delay Irrigation';
  } else if (nir < SKIP_THRESHOLD_MM[soil.name]) {
    status = 'Monitor Tomorrow';
  } else {
    status = 'Irrigate Today';
  }

  // Stage 6 — Water estimation (only meaningful when irrigating)
  let water: EstimatedWaterAmount = { depthMm: 0, volumeLiters: 0 };
  if (status === 'Irrigate Today') {
    const grossDepth = nir / METHOD_EFFICIENCY[farm.irrigationMethod];
    const areaM2 = farm.area * AREA_TO_M2[farm.areaUnit];
    water = {
      depthMm: round(grossDepth, 2),
      volumeLiters: Math.round(grossDepth * areaM2),
    };
  }

  // Stage 7 — Recommended time
  const recommendedTime = status === 'Irrigate Today' ? IRRIGATION_TIME_DEFAULT : null;

  // Stage 8 — Confidence
  const confidence = computeConfidence(weather, now);

  // Stage 9 — Explanation
  const explanation = buildExplanation(
    {
      status,
      cropName: crop.name,
      growthStage: crop.growthStage,
      soilName: soil.name,
      method: farm.irrigationMethod,
      rainMeaningful: pe > 0,
      hot: weather ? weather.temperature > WEATHER.T_BASE : false,
    },
    language,
  );

  // Stage 10 — Decision factors (roadmap Feature 4)
  const factors = buildFactors(kc, crop, soil, farm, weather, pe, etcAdj);

  // Stage 11 — Multi-day plan (roadmap Feature 5), only with daily data
  const plan = daily
    ? buildPlan(kc, soil, daily, todayDate, { status, confidence, pe, etcAdj, nir })
    : null;

  return {
    ok: true,
    recommendation: {
      id: `rec-${farm.id}-${now}`,
      farmId: farm.id,
      status,
      recommendedTime,
      estimatedWaterAmount: water,
      explanation,
      confidence,
      generatedTime: now,
      factors,
    },
    plan,
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
