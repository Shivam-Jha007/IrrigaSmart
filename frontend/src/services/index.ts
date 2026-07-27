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
} from './decisionEngine';
export {
  getKc,
  SOIL_PROFILES,
  METHOD_LABELS,
  SUPPORTED_CROPS,
  SUPPORTED_SOILS,
  SUPPORTED_METHODS,
} from './knowledgeBase';
export { ApiError, apiGet } from './apiClient';
export { fetchWeather, getWeatherForFarm } from './weatherService';
export {
  detectCurrentPosition,
  fetchLocationInfo,
  GeolocationError,
  type Coordinates,
  type GeolocationErrorCode,
  type LocationInfo,
} from './locationService';
export {
  dueNotifications,
  fireBrowserNotification,
  isSameLocalDay,
  notificationText,
  planNotifications,
  RAIN_WARNING_MM,
  RAIN_WARNING_WINDOW_DAYS,
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
