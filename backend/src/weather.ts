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
  /** Mean relative humidity as a percentage. */
  humidityMean: number;
  /** Maximum wind speed in metres per second. */
  windSpeedMax: number;
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
    relative_humidity_2m_mean?: Array<number | null>;
    wind_speed_10m_max?: Array<number | null>;
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

function buildUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover,precipitation',
    daily: 'precipitation_sum,temperature_2m_max,relative_humidity_2m_mean,wind_speed_10m_max',
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
  const daily: DailyWeatherPayload[] = dates.map((date, i) => ({
    date,
    precipitationSum: body.daily?.precipitation_sum?.[i] ?? 0,
    temperatureMax: body.daily?.temperature_2m_max?.[i] ?? 0,
    humidityMean: body.daily?.relative_humidity_2m_mean?.[i] ?? 0,
    windSpeedMax: body.daily?.wind_speed_10m_max?.[i] ?? 0,
  }));

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
