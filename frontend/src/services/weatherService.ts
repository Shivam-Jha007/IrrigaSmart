import type { DailyWeather, Farm, WeatherData } from '../types';
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
 *
 * The response includes a daily series (past days + forecast) used by the
 * multi-day plan and carryover logic (docs/11_Decision_Logic.md §11); it is
 * cached alongside the current weather for offline planning.
 */

/** Current weather plus its daily series, as returned by the backend. */
export interface WeatherReport {
  weather: WeatherData;
  daily: DailyWeather[];
}

/** Result of a weather lookup, including whether the data is from cache. */
export interface WeatherResult {
  weather: WeatherData;
  /** Daily series, or null when the cache predates V1.2 (plan is skipped). */
  daily: DailyWeather[] | null;
  /** True when served from the offline cache rather than a live fetch. */
  fromCache: boolean;
}

/** Backend payload shape: WeatherData fields plus the daily series. */
type BackendWeatherPayload = WeatherData & { daily: DailyWeather[] };

/**
 * Fetch live weather for a coordinate via the backend. Does not touch the
 * cache — callers that want caching + offline fallback use getWeatherForFarm.
 */
export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherReport> {
  const { daily, ...weather } = await apiGet<BackendWeatherPayload>('/api/weather', {
    lat: latitude,
    lon: longitude,
  });
  return { weather, daily };
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
    const report = await fetchWeather(farm.location.latitude, farm.location.longitude);
    await cacheWeather(farm.id, report.weather, now, report.daily);
    return { weather: report.weather, daily: report.daily, fromCache: false };
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
      daily: cached.daily ?? null,
      fromCache: true,
    };
  }
}
