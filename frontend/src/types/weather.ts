/**
 * WeatherData — weather information used during recommendation generation
 * (docs/03_Data_Models.md).
 *
 * Units are metric (docs/11_Decision_Logic.md §10). `cloudCover` is stored for
 * forward compatibility but is not used numerically by the MVP decision logic
 * (docs/11_Decision_Logic.md §2). Weather data always carries the observation
 * timestamp so freshness/confidence can be derived (Decision Logic §8).
 */
export interface WeatherData {
  /** Air temperature in degrees Celsius. */
  temperature: number;
  /** Relative humidity as a percentage (0–100). */
  humidity: number;
  /** Forecast rainfall in millimetres. */
  rainfallForecast: number;
  /** Wind speed in metres per second. */
  windSpeed: number;
  /** Cloud cover as a percentage (0–100). Reserved for future ETo computation. */
  cloudCover: number;
  /** ISO-8601 timestamp of when the observation/forecast was produced. */
  observationTime: string;
  /** Origin of the data (e.g. provider name, or "cache"). */
  dataSource: string;
}

/**
 * DailyWeather — one day of a past/forecast daily series
 * (docs/12_Product_Roadmap_v2.md Feature 5 — Multi-Day Irrigation Planning).
 *
 * The backend returns a window of past days + today + forecast days; past days
 * feed the soil-moisture carryover (Feature 6), forecast days feed the
 * multi-day plan. Units are metric (docs/11_Decision_Logic.md §10).
 */
export interface DailyWeather {
  /** Calendar date (YYYY-MM-DD) in the farm's timezone. */
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
