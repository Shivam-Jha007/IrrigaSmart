/**
 * Weather provider integration (docs/04_System_Interfaces.md Interface 5).
 *
 * The backend owns the weather provider so the frontend depends only on a
 * stable internal shape and the provider can change without frontend changes.
 * Provider: Open-Meteo (https://open-meteo.com) — free, no API key required.
 *
 * The response shape mirrors the frontend WeatherData model
 * (docs/03_Data_Models.md): temperature (°C), humidity (%), rainfallForecast
 * (mm, today's total), windSpeed (m/s), cloudCover (%), observationTime (ISO),
 * dataSource. Units match docs/11_Decision_Logic.md §10 (metric).
 */

export interface DailyWeatherPayload {
  /** Calendar date (YYYY-MM-DD) in the location's timezone. */
  date: string;
  /** Total precipitation for the day in millimetres. */
  precipitationSum: number;
  /** Maximum air temperature in degrees Celsius. */
  temperatureMax: number;
  /** Minimum air temperature in degrees Celsius. */
  temperatureMin?: number;
  /** Mean relative humidity as a percentage. */
  humidityMean: number;
  /** Maximum wind speed in metres per second. */
  windSpeedMax: number;
  /**
   * Reference evapotranspiration for the day in millimetres, computed by the
   * provider using FAO-56 Penman-Monteith (docs/11_Decision_Logic.md §2).
   * Optional: absent if the provider omits it for that day, in which case the
   * engine falls back to its own estimate.
   */
  et0FaoMm?: number;
  /**
   * Bright sunshine hours (n in FAO-56 notation). Converted from the provider's
   * seconds at this boundary so no consumer ever handles raw seconds.
   */
  sunshineHours?: number;
  /** Daylight hours (N in FAO-56 notation) — the maximum n can reach. */
  daylightHours?: number;
  /** Total incoming shortwave radiation for the day in MJ/m². */
  radiationMj?: number;
}

export interface WeatherPayload {
  temperature: number;
  humidity: number;
  rainfallForecast: number;
  windSpeed: number;
  cloudCover: number;
  observationTime: string;
  dataSource: string;
  /**
   * Daily series covering the past 2 days, today, and the next 4 days
   * (docs/12_Product_Roadmap_v2.md Feature 5 — Multi-Day Irrigation Planning;
   * past days feed the soil-moisture carryover of Feature 6).
   */
  daily: DailyWeatherPayload[];
}

interface OpenMeteoResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    cloud_cover?: number;
    precipitation?: number;
  };
  daily?: {
    time?: string[];
    precipitation_sum?: Array<number | null>;
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
    relative_humidity_2m_mean?: Array<number | null>;
    wind_speed_10m_max?: Array<number | null>;
    et0_fao_evapotranspiration?: Array<number | null>;
    /** Seconds of bright sunshine — converted to hours before it leaves here. */
    sunshine_duration?: Array<number | null>;
    /** Seconds between sunrise and sunset — converted to hours before it leaves here. */
    daylight_duration?: Array<number | null>;
    shortwave_radiation_sum?: Array<number | null>;
  };
}

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/** Past days included so the engine can model recent-rainfall carryover. */
const PAST_DAYS = 2;
/** Today + 4 ahead → a 5-day planning window (roadmap Feature 5). */
const FORECAST_DAYS = 5;

/** Provider-specific error carrying an HTTP status for the API layer. */
export class WeatherProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'WeatherProviderError';
  }
}

/** Convert a provider duration in seconds to hours, or undefined if absent. */
function secondsToHours(seconds: number | null | undefined): number | undefined {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return undefined;
  return Math.round((seconds / 3600) * 100) / 100;
}

/**
 * Build a single-key object only when the value is usable, so an unknown value
 * is OMITTED rather than serialised as null or defaulted to a number the engine
 * would treat as real. `allowZero` distinguishes "genuinely zero" (an overcast
 * day really has 0 sunshine hours) from "missing".
 */
function optional<K extends string>(
  key: K,
  value: number | null | undefined,
  { allowZero = false }: { allowZero?: boolean } = {},
): Partial<Record<K, number>> {
  if (typeof value !== 'number' || !Number.isFinite(value)) return {};
  if (!allowZero && value <= 0) return {};
  return { [key]: value } as Record<K, number>;
}

function buildUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover,precipitation',
    // temperature_2m_min + sunshine/daylight/radiation added in V1.7: the first
    // three feed the Hargreaves-Samani ETo fallback when the provider's FAO-56
    // value is missing, and sunshine hours are shown to the farmer directly
    // (docs/12_Product_Roadmap_v2.md item 2).
    daily: [
      'precipitation_sum',
      'temperature_2m_max',
      'temperature_2m_min',
      'relative_humidity_2m_mean',
      'wind_speed_10m_max',
      'et0_fao_evapotranspiration',
      'sunshine_duration',
      'daylight_duration',
      'shortwave_radiation_sum',
    ].join(','),
    wind_speed_unit: 'ms',
    timezone: 'auto',
    past_days: String(PAST_DAYS),
    forecast_days: String(FORECAST_DAYS),
  });
  return `${OPEN_METEO_URL}?${params.toString()}`;
}

/**
 * Fetch current weather + today's forecast rainfall for a coordinate.
 * Throws WeatherProviderError on invalid input or upstream failure.
 */
export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherPayload> {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new WeatherProviderError('latitude must be between -90 and 90', 400);
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new WeatherProviderError('longitude must be between -180 and 180', 400);
  }

  let response: globalThis.Response;
  try {
    response = await fetch(buildUrl(latitude, longitude));
  } catch {
    throw new WeatherProviderError('weather provider is unreachable', 502);
  }

  if (!response.ok) {
    throw new WeatherProviderError(`weather provider returned ${response.status}`, 502);
  }

  const body = (await response.json()) as OpenMeteoResponse;
  const current = body.current;
  if (!current) {
    throw new WeatherProviderError('weather provider returned no current data', 502);
  }

  // Prefer today's forecast total for rainfall; fall back to instantaneous.
  const dailyRain = body.daily?.precipitation_sum?.[PAST_DAYS];
  const rainfallForecast = dailyRain ?? current.precipitation ?? 0;

  const dates = body.daily?.time ?? [];
  const daily: DailyWeatherPayload[] = dates.map((date, i) => {
    // Unlike the other fields, ETo is left absent rather than defaulted to 0:
    // a zero would silently zero out crop water demand, whereas an absent
    // value makes the engine fall back to its own estimate. The same reasoning
    // applies to every optional field below — absent means "unknown", and only
    // a positive finite number is meaningful for any of them.
    const et0 = body.daily?.et0_fao_evapotranspiration?.[i];
    return {
      date,
      precipitationSum: body.daily?.precipitation_sum?.[i] ?? 0,
      temperatureMax: body.daily?.temperature_2m_max?.[i] ?? 0,
      // These two default to 0 because the frontend type requires a number.
      // 0 is a PLACEHOLDER, not a reading: a daily mean humidity of 0% and a
      // daily maximum wind of 0 m/s do not occur. Consumers must not take them
      // literally — `frontend/src/services/evapotranspiration.ts` rejects both
      // via `usableHumidity`/`usableWind`, because feeding a fabricated 0 into
      // FAO-56 over-states ETo by ~28% and would advise excess irrigation.
      humidityMean: body.daily?.relative_humidity_2m_mean?.[i] ?? 0,
      windSpeedMax: body.daily?.wind_speed_10m_max?.[i] ?? 0,
      ...optional('temperatureMin', body.daily?.temperature_2m_min?.[i], { allowZero: true }),
      ...(typeof et0 === 'number' && Number.isFinite(et0) && et0 > 0 ? { et0FaoMm: et0 } : {}),
      // Seconds → hours at the boundary: nothing downstream should ever have to
      // know the provider reports these in seconds.
      ...optional('sunshineHours', secondsToHours(body.daily?.sunshine_duration?.[i]), { allowZero: true }),
      ...optional('daylightHours', secondsToHours(body.daily?.daylight_duration?.[i])),
      ...optional('radiationMj', body.daily?.shortwave_radiation_sum?.[i]),
    };
  });

  return {
    temperature: current.temperature_2m ?? 0,
    humidity: current.relative_humidity_2m ?? 0,
    rainfallForecast,
    windSpeed: current.wind_speed_10m ?? 0,
    cloudCover: current.cloud_cover ?? 0,
    observationTime: current.time ? new Date(current.time).toISOString() : new Date().toISOString(),
    dataSource: 'open-meteo',
    daily,
  };
}
