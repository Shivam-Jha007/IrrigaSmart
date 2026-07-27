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

export interface WeatherPayload {
  temperature: number;
  humidity: number;
  rainfallForecast: number;
  windSpeed: number;
  cloudCover: number;
  observationTime: string;
  dataSource: string;
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
    precipitation_sum?: Array<number | null>;
  };
}

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

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
    daily: 'precipitation_sum',
    wind_speed_unit: 'ms',
    timezone: 'auto',
    forecast_days: '1',
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
  const dailyRain = body.daily?.precipitation_sum?.[0];
  const rainfallForecast = dailyRain ?? current.precipitation ?? 0;

  return {
    temperature: current.temperature_2m ?? 0,
    humidity: current.relative_humidity_2m ?? 0,
    rainfallForecast,
    windSpeed: current.wind_speed_10m ?? 0,
    cloudCover: current.cloud_cover ?? 0,
    observationTime: current.time ? new Date(current.time).toISOString() : new Date().toISOString(),
    dataSource: 'open-meteo',
  };
}
