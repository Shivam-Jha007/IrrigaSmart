import type {
  ConfidenceLevel,
  Crop,
  EstimatedWaterAmount,
  Farm,
  Language,
  Recommendation,
  RecommendationStatus,
  Soil,
  WeatherData,
} from '../types';
import { getKc } from './knowledgeBase';
import { buildExplanation } from './explanationText';
import {
  AREA_TO_M2,
  clamp,
  ETO_REF,
  FRESH_MAX_HOURS,
  IRRIGATION_TIME_DEFAULT,
  METHOD_EFFICIENCY,
  RAIN_EFF_FACTOR,
  SKIP_THRESHOLD_MM,
  STALE_MAX_HOURS,
  WEATHER,
} from './decisionParameters';

/**
 * Decision Engine (docs/02_Decision_Engine.md, docs/11_Decision_Logic.md).
 *
 * Deterministic and framework-independent (docs/07_Engineering_Rules.md:
 * Decision Engine Rules). Identical inputs always produce identical output.
 * `now` is injected rather than read from the clock so results are reproducible
 * and testable. `language` selects the explanation wording (roadmap Feature 2)
 * and is likewise an explicit input, keeping determinism.
 */

export interface DecisionInput {
  farm: Farm;
  crop: Crop;
  soil: Soil;
  /** Latest available weather, or null when none exists (Decision Logic §8). */
  weather: WeatherData | null;
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

export interface DecisionSuccess {
  ok: true;
  recommendation: Recommendation;
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

/** Stage 3 helper — bounded weather multiplier (Decision Logic §2). */
function weatherMultiplier(weather: WeatherData): number {
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

/** Stage 8 — Confidence from data freshness and completeness (Decision Logic §8). */
function computeConfidence(weather: WeatherData | null, now: string): ConfidenceLevel {
  if (!weather) return 'Low';
  const ageHours = (new Date(now).getTime() - new Date(weather.observationTime).getTime()) / 3_600_000;
  if (ageHours <= FRESH_MAX_HOURS) return 'High';
  if (ageHours <= STALE_MAX_HOURS) return 'Medium';
  return 'Low';
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

  const { farm, crop, soil, weather, now, language } = input;

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

  // Net irrigation need (Decision Logic §4)
  const nir = Math.max(0, etcAdj - pe);

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
    },
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
