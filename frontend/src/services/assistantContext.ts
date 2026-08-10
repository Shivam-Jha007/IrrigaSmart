import type { DailyWeather, WeatherData } from '../types';
import type { FarmProfile, RecommendationView, WaterProgress } from '../app/appTypes';
import {
  confidenceBadgeKey,
  cropLabelKey,
  diseaseNameKey,
  methodLabelKey,
  soilLabelKey,
  stageLabelKey,
  statusLabelKey,
  type TranslateFn,
} from '../i18n';
import type { AssistantContext } from './assistantRules';

/**
 * Build the assistant's view of the farm (item 17).
 *
 * WHY THIS IS ITS OWN MODULE
 * Both answer paths — the offline rules and the model — read the same
 * AssistantContext, so this is the single place where "what the assistant knows"
 * is defined. If the Dashboard assembled it inline, the rules and the prompt
 * could drift apart the moment either changed, and the farmer would get two
 * different answers to the same question depending on their signal strength.
 *
 * EVERY FIGURE IS COPIED, NEVER COMPUTED
 * This module reads the decision engine's output and the water ledger; it does
 * no irrigation arithmetic of its own (docs/07_Engineering_Rules.md: the UI
 * layer performs no calculations). Rounding for display is the only change made
 * to any number, and it is applied once, here, so the rules and the model quote
 * identical figures.
 *
 * ENUM VALUES ARE TRANSLATED HERE
 * The data model stores enums in English (docs/03_Data_Models.md). They are
 * translated at this boundary rather than at each use so that a Bengali farmer's
 * answer reads entirely in Bengali — interpolating "Irrigate Today" into a
 * Bengali sentence is the kind of half-localised output that makes an app feel
 * like it was not built for its user. The model reads the translated value
 * equally well.
 *
 * ABSENT IS ABSENT
 * A field the app does not have is omitted, never defaulted. The prompt builder
 * on the backend skips missing fields for the same reason: a substituted value
 * is a number a farmer can act on that nothing in the app can reproduce.
 */

export interface ContextInput {
  profile: FarmProfile | undefined;
  view: RecommendationView | null;
  weather: WeatherData | null;
  today: DailyWeather | null;
  waterProgress: WaterProgress | null;
  language: string;
  t: TranslateFn;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildAssistantContext({
  profile,
  view,
  weather,
  today,
  waterProgress,
  language,
  t,
}: ContextInput): AssistantContext {
  const context: AssistantContext = { language };

  if (profile) {
    context.farmName = profile.farm.name;
    if (profile.farm.location.label) context.locationLabel = profile.farm.location.label;
    context.cropName = t(cropLabelKey(profile.crop.name));
    context.growthStage = t(stageLabelKey(profile.crop.growthStage));
    context.soilType = t(soilLabelKey(profile.soil.name));
    context.irrigationMethod = t(methodLabelKey(profile.farm.irrigationMethod));
    context.areaLabel = `${profile.farm.area} ${profile.farm.areaUnit}`;
    // Slope exists only on farms created after item 10, and only when the DEM
    // provider answered. Absent everywhere else, and that is the honest state.
    if (profile.farm.terrain) {
      context.slopePercent = round1(profile.farm.terrain.slopePercent);
    }
  }

  if (view) {
    const { recommendation } = view;
    context.status = t(statusLabelKey(recommendation.status));
    context.explanation = recommendation.explanation;
    context.confidence = t(confidenceBadgeKey(recommendation.confidence));
    context.depthMm = recommendation.estimatedWaterAmount.depthMm;
    context.volumeLiters = recommendation.estimatedWaterAmount.volumeLiters;
    if (recommendation.estimatedWaterAmount.durationMinutes !== undefined) {
      context.durationMinutes = recommendation.estimatedWaterAmount.durationMinutes;
    }
    if (recommendation.irrigationWindow) {
      context.windowStart = recommendation.irrigationWindow.start;
      context.windowEnd = recommendation.irrigationWindow.end;
    }

    if (view.waterBalance) {
      context.depletionMm = round1(view.waterBalance.depletionMm);
      context.readilyAvailableMm = round1(view.waterBalance.rawMm);
      context.totalAvailableMm = round1(view.waterBalance.tawMm);
    }

    if (view.diseaseRisk) {
      context.diseaseRiskLevel = view.diseaseRisk.level;
      // Named only when the weather actually favours one. On a 'None' day,
      // naming the crop's most likely disease would put a disease name in front
      // of a farmer with nothing behind it.
      if (view.diseaseRisk.level !== 'None') {
        context.diseaseName = t(diseaseNameKey(view.diseaseRisk.disease));
      }
    }

    // Tomorrow, from the multi-day plan. Index 1 is tomorrow because the plan
    // starts at today; a single-day plan has no tomorrow to report.
    const tomorrow = view.plan?.days[1];
    if (tomorrow) context.tomorrowStatus = t(statusLabelKey(tomorrow.action));
  }

  if (weather) {
    context.temperatureC = Math.round(weather.temperature);
    context.humidityPercent = Math.round(weather.humidity);
  }

  // Today's rain: the daily forecast is the figure the engine used, so it wins
  // over the current-conditions snapshot whenever both exist.
  if (today) {
    context.rainfallForecastMm = round1(today.precipitationSum);
  } else if (weather) {
    context.rainfallForecastMm = round1(weather.rainfallForecast);
  }

  if (waterProgress) {
    context.savedTodayLiters = Math.round(waterProgress.savedTodayLiters);
    context.savedLifetimeLiters = Math.round(waterProgress.savedLifetimeLiters);
  }

  return context;
}

/** Re-exported so callers need only one import for the assistant's data shape. */
export type { AssistantContext };
