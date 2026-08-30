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
export {
  fetchMeasuredSoil,
  fetchSoilSuggestion,
  type MeasuredSoilOutcome,
} from './soilService';
export {
  profileCarriesEveryReadProperty,
  rootZoneWater,
  sameCoordinate,
  soilTypeFromTexture,
  textureDisagreement,
  topsoilOrganicCarbon,
  topsoilPh,
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

// --- Photo disease model (item 16) ---
export {
  COVERED_CROPS,
  MIN_CONFIDENCE,
  PLANTS_WITH_HEALTHY_CLASS,
  VISION_CLASSES,
  lookupVisionClass,
  plantHasHealthyClass,
  verdictFor,
  visionCoversCrop,
  type VisionClass,
  type VisionFinding,
  type VisionLabelId,
  type VisionPlant,
  type VisionVerdict,
} from './diseaseVisionMap';
export {
  argmax,
  centreCrop,
  classifyPhoto,
  decodeToRgba,
  loadModel,
  modelIsLoaded,
  PLANT_DISEASE_MODEL,
  preprocess,
  resetModelCache,
  VisionError,
  type ModelManifest,
  type ModelSpec,
  type Reading,
  type VisionErrorCode,
  type VisionResult,
} from './diseaseVision';
export {
  REFERENCE_IMAGES,
  WEATHER_REFERENCE_IMAGES,
  creditLineFor,
  referenceImagesFor,
  weatherReferenceImagesFor,
  type DiseaseReferenceImage,
  type ImageCredit,
} from './diseaseReference';
export { summarizePhotoCheck, type PhotoCheckSummary } from './photoCheckSummary';
export {
  dayFor,
  dryingPotential,
  isOvercast,
  sunshineRatio,
  type DryingPotential,
} from './sunshine';
export { fetchTerrain } from './terrainService';

// --- Fertilizer recommendation (soil-test-based dosing tables) ---
export {
  classifyNutrient,
  classifySoilFertility,
  FERTILIZER_COVERED_CROPS,
  FERTILIZER_TABLES,
  fertilizerCoversCrop,
  fertilizerVarietiesFor,
  fertilizerZonesFor,
  getFertilizerRecommendation,
  type FertilityLevel,
  type FertilizerCropTable,
  type FertilizerRecommendation,
  type FertilizerSoilZone,
  type FertilizerZoneEntry,
  type NpkDoseKgHa,
  type SoilNutrientReadingKgHa,
} from './fertilizerKnowledge';
export {
  intakeFactor,
  isSurfaceMethod,
  runoffFactor,
  surfaceMethodWarned,
  warnsSurfaceMethod,
} from './slopeAdjustment';
export {
  CROP_PH_RANGE,
  phSuitability,
  TOLERANCE_MARGIN_PH,
  type CropPhRange,
  type PhSuitability,
} from './cropPhKnowledge';
// --- Data provenance (PRD §7 / Guardrail 1) ---
export {
  isFieldMeasurement,
  ORIGIN,
  PROVENANCE_LABELS,
  sourced,
  unknown,
  type Provenance,
  type Sourced,
} from './provenance';
// --- Canonical farm picture (PRD §6) ---
export {
  buildFarmContext,
  isKnown,
  type FarmContext,
  type FarmContextCrop,
  type FarmContextDisease,
  type FarmContextFarm,
  type FarmContextFertility,
  type FarmContextHistory,
  type FarmContextImpact,
  type FarmContextInput,
  type FarmContextIrrigation,
  type FarmContextSoil,
  type FarmContextWater,
  type FarmContextWeather,
} from './farmContext';
// --- Farm improvement plan (PRD §15) ---
export {
  detectFarmIssues,
  resolveIssueVars,
  TOP_ISSUE_COUNT,
  type FarmIssue,
  type FarmIssueCategory,
  type FarmIssueId,
  type FarmIssueSeverity,
} from './farmImprovement';
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
export { detectSpokenLanguage } from './languageDetection';
export {
  askAssistant,
  assistantTopicActions,
  farmBriefing,
  MAX_QUESTION_CHARS,
  type AssistantAction,
  type AssistantAnswer,
  type AssistantSource,
  type AssistantTopic,
  type AssistantTurn,
  type AskOptions,
} from './assistantService';
export { buildAssistantContext, type ContextInput } from './assistantContext';
export {
  alternatesFor,
  chooseVoice,
  speak,
  speechInputSupported,
  speechOutputSupported,
  startListening,
  stopSpeaking,
  type ListenHandlers,
  type ListenSession,
} from './speech';
// --- Live audio Copilot seam (PRD §13). Interface only; nothing implements it. ---
export {
  unavailableVoiceProvider,
  voiceConversationSupported,
  VoiceUnavailableError,
  type VoiceProvider,
  type VoiceProviderId,
  type VoiceUnavailableReason,
} from './voiceProvider';
