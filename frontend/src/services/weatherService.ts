import type { Farm, WeatherData } from '../types';
import { cacheWeather, getCachedWeather } from '../storage';
import { apiGet, ApiError } from './apiClient';

/**
 * Weather service (docs/06_Development_Roadmap.md Phase 4;
 * docs/04_System_Interfaces.md Interface 1 & 5).
 *
 * Fetches weather from the backend and caches it per farm for offline use.
 * Offline-first behaviour (docs/00_Master_PRD_Part2.md): when the network is
 * unavailable, the most recently cached weather is returned so recommendations
 * can still be generated. The `dataSource` field marks whether data came live
 * from the provider or from the local cache.
 */

/** Result of a weather lookup, including whether the data is from cache. */
export interface WeatherResult {
  weather: WeatherData;
  /** True when served from the offline cache rather than a live fetch. */
  fromCache: boolean;
}

/**
 * Fetch live weather for a coordinate via the backend. Does not touch the
 * cache — callers that want caching + offline fallback use getWeatherForFarm.
 */
export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherData> {
  return apiGet<WeatherData>('/api/weather', { lat: latitude, lon: longitude });
}

/**
 * Get weather for a farm with caching and offline fallback.
 *
 * Attempts a live fetch first; on success the result is cached against the
 * farm. If the fetch fails (offline or provider down), the last cached weather
 * for the farm is returned with `fromCache: true` and its `dataSource` marked
 * as "cache". Returns null only when live fetch fails and no cache exists.
 *
 * @param now ISO-8601 timestamp injected for deterministic cache stamping.
 */
export async function getWeatherForFarm(farm: Farm, now: string): Promise<WeatherResult | null> {
  try {
    const weather = await fetchWeather(farm.location.latitude, farm.location.longitude);
    await cacheWeather(farm.id, weather, now);
    return { weather, fromCache: false };
  } catch (error) {
    // Only fall back to cache for network/provider failures; rethrow
    // programming errors so they surface during development.
    if (!(error instanceof ApiError)) {
      throw error;
    }
    const cached = await getCachedWeather(farm.id);
    if (!cached) {
      return null;
    }
    return {
      weather: { ...cached.weather, dataSource: 'cache' },
      fromCache: true,
    };
  }
}
