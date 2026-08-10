/**
 * Services layer for IrrigaSmart (Application layer,
 * docs/01_System_Architecture.md).
 *
 * Business logic (decision engine, weather, API access) lives here. UI imports
 * from this barrel; it never contains irrigation calculations itself
 * (docs/07_Engineering_Rules.md: Architecture Rules).
 */
export {
  generateRecommendation,
  type DecisionInput,
  type DecisionResult,
  type DecisionSuccess,
  type IrrigationPlan,
  type IrrigationPlanDay,
  type ValidationFailure,
  type WaterBalanceState,
} from './decisionEngine';
export {
  getKc,
  SOIL_PROFILES,
  METHOD_LABELS,
  SUPPORTED_CROPS,
  SUPPORTED_SOILS,
  SUPPORTED_METHODS,
} from './knowledgeBase';
export { ApiError, apiGet, apiPost } from './apiClient';
export { fetchWeather, getWeatherForFarm } from './weatherService';
export { fetchMeasuredSoil, fetchSoilSuggestion } from './soilService';
export {
  rootZoneWater,
  sameCoordinate,
  textureDisagreement,
  type RootZoneWater,
} from './soilProfile';
export {
  detectCurrentPosition,
  fetchLocationInfo,
  GeolocationError,
  searchPlaces,
  type Coordinates,
  type GeolocationErrorCode,
  type LocationInfo,
  type LocationSearchHit,
} from './locationService';
export {
  buildCustomReminder,
  dueNotifications,
  fireBrowserNotification,
  isSameLocalDay,
  notificationText,
  planNotifications,
  RAIN_WARNING_MM,
  RAIN_WARNING_WINDOW_DAYS,
  type CustomReminderResult,
  type NotificationInput,
} from './notificationService';
export {
  CROP_CALENDAR,
  getSeasonForDate,
  getSeasonForMonth,
  getSeasonalGuidance,
  type CropCalendarEntry,
  type SeasonalGuidance,
} from './regionalKnowledge';
export { CROP_DISEASES, type DiseaseId, type DiseaseProfile } from './diseaseKnowledge';
export {
  assessDiseaseRisk,
  type DiseaseRiskAssessment,
  type FavourableDay,
} from './diseaseRisk';
export {
  dayFor,
  dryingPotential,
  isOvercast,
  sunshineRatio,
  type DryingPotential,
} from './sunshine';
export { fetchTerrain } from './terrainService';
export { intakeFactor, runoffFactor, warnsSurfaceMethod } from './slopeAdjustment';
export { DAY_MS, localDayString } from './dateUtils';
export {
  chooseIrrigationWindow,
  farmAreaM2,
  flowLitersPerMinute,
  runMinutes,
  type TimingInput,
} from './irrigationTiming';
export { computeWaterSavings, creditedSaving, type SavingsInput } from './waterSavings';
export {
  historyToPrune,
  orphanedRecommendationIds,
  remindersToPrune,
} from './storageMaintenance';

// --- Farmer assistant (item 17) ---
export {
  answerFromRules,
  classify,
  normalise,
  type AssistantContext,
  type AssistantIntent,
  type RuleAnswer,
} from './assistantRules';
export {
  askAssistant,
  MAX_QUESTION_CHARS,
  type AssistantAnswer,
  type AssistantSource,
  type AssistantTurn,
  type AskOptions,
} from './assistantService';
export { buildAssistantContext, type ContextInput } from './assistantContext';
export {
  speak,
  speechInputSupported,
  speechOutputSupported,
  startListening,
  stopSpeaking,
  type ListenHandlers,
  type ListenSession,
} from './speech';
