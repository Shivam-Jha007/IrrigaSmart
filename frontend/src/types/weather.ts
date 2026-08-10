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
  /**
   * Cloud cover as a percentage (0–100). Display only — radiation reaches the
   * engine through the provider's FAO-56 ETo (`DailyWeather.et0FaoMm`).
   */
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
  /**
   * Minimum air temperature in degrees Celsius.
   *
   * Optional for the same reason as every field below: a cache written before
   * V1.7 does not carry it. Present, it enables the Hargreaves-Samani ETo
   * fallback, which needs the daily temperature RANGE (Tmax − Tmin).
   */
  temperatureMin?: number;
  /** Mean relative humidity as a percentage. */
  humidityMean: number;
  /** Maximum wind speed in metres per second. */
  windSpeedMax: number;
  /**
   * Reference evapotranspiration for the day in millimetres, computed by the
   * weather provider using FAO-56 Penman-Monteith
   * (docs/11_Decision_Logic.md §2, primary crop-water-demand path).
   *
   * Optional by design: days cached before V1.5 do not carry it, and a farmer
   * offline with an old cache must still receive advice. Days without it fall
   * back to a Hargreaves-Samani estimate (docs/11_Decision_Logic.md §2a).
   */
  et0FaoMm?: number;
  /**
   * Bright sunshine hours (FAO-56 `n`). Already converted from the provider's
   * seconds by the backend. Used, not merely displayed: the sunshine ratio n/N
   * feeds the radiation term of the ETo fallback and raises the disease-risk
   * score when low sunshine coincides with high humidity.
   */
  sunshineHours?: number;
  /** Daylight hours (FAO-56 `N`) — the ceiling `sunshineHours` is measured against. */
  daylightHours?: number;
  /** Total incoming shortwave radiation for the day in MJ/m². */
  radiationMj?: number;
}
