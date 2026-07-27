import type { DailyWeather, WeatherData } from '../types';
import { getDb, type WeatherCacheEntry } from './db';

/**
 * Weather cache store (docs/04_System_Interfaces.md Interface 2;
 * docs/00_Master_PRD_Part2.md Offline Support).
 *
 * Caches the most recent weather per farm so recommendations remain available
 * offline. WeatherData has no id of its own, so entries are keyed by farmId.
 * The write timestamp is recorded so confidence/staleness can be derived later
 * (docs/11_Decision_Logic.md §8). The daily series (roadmap Feature 5) is
 * cached alongside so multi-day planning also works offline.
 */

export async function cacheWeather(
  farmId: string,
  weather: WeatherData,
  cachedAt: string,
  daily?: DailyWeather[],
): Promise<void> {
  const db = await getDb();
  const entry: WeatherCacheEntry = { farmId, weather, cachedAt, ...(daily ? { daily } : {}) };
  await db.put('weatherCache', entry);
}

export async function getCachedWeather(
  farmId: string,
): Promise<WeatherCacheEntry | undefined> {
  const db = await getDb();
  return db.get('weatherCache', farmId);
}

export async function clearCachedWeather(farmId: string): Promise<void> {
  const db = await getDb();
  await db.delete('weatherCache', farmId);
}
