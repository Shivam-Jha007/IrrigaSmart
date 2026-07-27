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
