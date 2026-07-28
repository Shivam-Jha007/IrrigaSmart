/**
 * Storage layer for IrrigaSmart (docs/04_System_Interfaces.md Interface 2).
 *
 * This is the single boundary for all local persistence. UI and services import
 * from here; nothing outside this folder opens IndexedDB directly
 * (docs/07_Engineering_Rules.md: Storage Rules).
 */
export { DB_NAME, DB_VERSION, closeDb, DbBlockedError, type WeatherCacheEntry } from './db';
export { type Repository, createRepository } from './repository';
export {
  cropRepository,
  farmRepository,
  farmerRepository,
  getFarmsByFarmer,
  getHistoryByFarm,
  getLedgerByFarm,
  getNotificationsByFarm,
  getRecommendationsByFarm,
  historyRepository,
  notificationRepository,
  recommendationRepository,
  soilRepository,
  waterLedgerRepository,
} from './repositories';
export { DEFAULT_SETTINGS, getSettings, saveSettings } from './settingsStore';
export { cacheWeather, clearCachedWeather, getCachedWeather } from './weatherCacheStore';
