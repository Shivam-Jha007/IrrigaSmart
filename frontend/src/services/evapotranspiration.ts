/**
 * Reference evapotranspiration (ETo) — FAO-56 implementation.
 *
 * Source: Allen, R.G., Pereira, L.S., Raes, D., Smith, M. (1998).
 * "Crop evapotranspiration — Guidelines for computing crop water requirements."
 * FAO Irrigation and Drainage Paper 56. Equation numbers below refer to it.
 *
 * WHY THIS EXISTS
 * The primary ETo path is the value the weather provider computes with the same
 * FAO-56 Penman-Monteith equation from hourly data (`DailyWeather.et0FaoMm`) —
 * that stays the preferred input and this module never overrides it. This module
 * covers the days when it is missing: an old cache, a provider gap, or a farmer
 * offline since before V1.7.
 *
 * What it REPLACES is the previous fallback, `ETO_REF = 5.0 mm/day` scaled by a
 * season factor and a hand-tuned weather multiplier. That number had no source;
 * it was an engineering guess presented to farmers as agronomy. Everything here
 * traces to a published equation instead.
 *
 * THE LADDER (best available data wins; see `estimateEto`)
 *   1. Provider FAO-56 Penman-Monteith            — handled by the caller
 *   2. Local FAO-56 Penman-Monteith, reduced data — `penmanMonteithEto`
 *   3. Hargreaves-Samani                          — `hargreavesEto`
 *   4. (caller's last resort for caches too old to support even 3)
 *
 * Tier 2 follows FAO-56 Chapter 4 "Procedures for missing climatic data", which
 * explicitly sanctions estimating the missing terms and then applying the full
 * equation. Tier 3 is FAO-56 Eq. 52, recommended where only air temperature is
 * available.
 *
 * Every function here is pure: same inputs, same output, no clock, no network.
 */

/** Solar constant, MJ m⁻² min⁻¹ (FAO-56 Eq. 28). */
const SOLAR_CONSTANT = 0.082;
/** Stefan-Boltzmann constant, MJ K⁻⁴ m⁻² day⁻¹ (FAO-56 Eq. 39). */
const STEFAN_BOLTZMANN = 4.903e-9;
/** Canopy reflection coefficient for the grass reference surface (FAO-56 Eq. 38). */
const ALBEDO = 0.23;
/**
 * Ångström coefficients for the fraction of Ra reaching earth (FAO-56 Eq. 35).
 * Exported for the regression test that documents why this equation is NOT in
 * the ETo path — see `solarRadiation`.
 */
export const ANGSTROM_A = 0.25;
export const ANGSTROM_B = 0.5;
/**
 * Hargreaves radiation adjustment coefficient (FAO-56 Eq. 50).
 * 0.16 for interior locations, 0.19 for coastal. Most Indian cropland is
 * interior, so 0.16 is the default; a coastal farm slightly under-estimates Rs,
 * which errs toward advising LESS water — the safe direction for a farmer.
 */
const K_RS_INTERIOR = 0.16;

/**
 * Daily mean wind as a fraction of the daily maximum.
 *
 * The provider gives `wind_speed_10m_max`, but Penman-Monteith wants the daily
 * MEAN. Feeding the maximum straight in would inflate the aerodynamic term and
 * over-advise water. 0.65 is a mid-range value for the max→mean ratio over land;
 * it is the largest single approximation in this module and is why tier 2 is a
 * fallback rather than a replacement for the provider's value.
 */
const WIND_MEAN_FROM_MAX = 0.65;

/** FAO-56 §Eq. 47: below this, the equation is evaluated at 0.5 m/s. */
const MIN_U2_MS = 0.5;

/**
 * Is a relative humidity reading real, as opposed to a fabricated placeholder?
 *
 * This guard exists because upstream code substitutes 0 for a missing value
 * (`relative_humidity_2m_mean ?? 0` at the provider boundary). A daily MEAN
 * relative humidity of 0% does not occur anywhere on earth — the driest desert
 * daily means sit near 10–20% — so 0 always means "unknown", never "bone dry".
 *
 * Distinguishing the two matters a great deal here. Treating a fabricated 0 as
 * real inflates the vapour pressure deficit and, on a representative Indian
 * summer day, over-states ETo by about 28% (7.03 vs 5.50 mm/day). That would
 * advise a farmer to apply MORE water than the crop needs — the unsafe
 * direction, and exactly the failure mode this whole module exists to remove.
 * Rejecting it instead lets FAO-56 Eq. 48 supply a principled estimate.
 */
function usableHumidity(value: number | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0 && value <= 100;
}

/**
 * Is a wind reading real? Same reasoning as `usableHumidity` — the provider
 * boundary substitutes 0, and a daily MAXIMUM wind speed of exactly 0 m/s means
 * the field was not reported, not that the air was perfectly still all day.
 * FAO-56 Chapter 4's 2 m/s default is a better answer than a fabricated calm.
 */
function usableWind(value: number | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

export interface EtoInputs {
  /** Calendar date, YYYY-MM-DD. */
  date: string;
  /** Farm latitude in decimal degrees (negative south). */
  latitude: number;
  /** Maximum air temperature, °C. */
  temperatureMax: number;
  /** Minimum air temperature, °C. */
  temperatureMin: number;
  /**
   * Mean relative humidity, % (0–100). Optional — estimated from Tmin via
   * FAO-56 Eq. 48 if absent. A value of 0, or anything outside (0, 100], is
   * treated as absent rather than as data; see `usableHumidity`.
   */
  humidityMean?: number;
  /**
   * Maximum wind speed at 10 m, m/s. Optional — FAO-56's 2 m/s worldwide
   * default is used if absent. A value of 0 is treated as absent, not as a
   * genuinely windless day; see `usableWind`.
   */
  windSpeedMax?: number;
  /** Bright sunshine hours (n). Recorded for display and disease risk; see `solarRadiation`. */
  sunshineHours?: number;
  /** Daylight hours (N). Computed from latitude and date when absent. */
  daylightHours?: number;
  /** Measured incoming shortwave radiation, MJ/m²/day. Preferred over any estimate. */
  radiationMj?: number;
  /** Site elevation in metres above sea level. Defaults to sea level. */
  elevationM?: number;
}

export type EtoMethod = 'penman-monteith' | 'hargreaves';

export interface EtoEstimate {
  /** Reference evapotranspiration, mm/day. */
  etoMm: number;
  /** Which equation produced it — surfaced so the UI can be honest about it. */
  method: EtoMethod;
  /** How the solar radiation term was obtained. */
  radiationSource: 'measured' | 'temperature-range';
}

/** Day of year (1–366) from a YYYY-MM-DD string, UTC-anchored so it cannot drift. */
export function dayOfYear(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const year = y ?? 1970;
  const start = Date.UTC(year, 0, 1);
  const target = Date.UTC(year, (m ?? 1) - 1, d ?? 1);
  return Math.round((target - start) / 86_400_000) + 1;
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Extraterrestrial radiation Ra, MJ m⁻² day⁻¹ (FAO-56 Eq. 21).
 *
 * The radiation arriving at the top of the atmosphere — a pure function of
 * latitude and date, with no weather in it at all. Everything else in the
 * radiation chain is expressed as a fraction of this.
 */
export function extraterrestrialRadiation(latitude: number, date: string): number {
  const j = dayOfYear(date);
  const phi = toRadians(latitude);
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * j) / 365); // Eq. 23
  const delta = 0.409 * Math.sin((2 * Math.PI * j) / 365 - 1.39); // Eq. 24
  // Eq. 25. The argument is clamped because |tanφ·tanδ| exceeds 1 inside the
  // polar circles, where the sun does not rise or set — irrelevant for Indian
  // farms but a NaN if left unguarded.
  const sunsetHourAngle = Math.acos(clampToUnit(-Math.tan(phi) * Math.tan(delta)));
  return (
    ((24 * 60) / Math.PI) *
    SOLAR_CONSTANT *
    dr *
    (sunsetHourAngle * Math.sin(phi) * Math.sin(delta) +
      Math.cos(phi) * Math.cos(delta) * Math.sin(sunsetHourAngle))
  );
}

/** Daylight hours N (FAO-56 Eq. 34) — the ceiling that sunshine hours n approach. */
export function daylightHoursFor(latitude: number, date: string): number {
  const j = dayOfYear(date);
  const phi = toRadians(latitude);
  const delta = 0.409 * Math.sin((2 * Math.PI * j) / 365 - 1.39);
  const sunsetHourAngle = Math.acos(clampToUnit(-Math.tan(phi) * Math.tan(delta)));
  return (24 / Math.PI) * sunsetHourAngle;
}

/** Saturation vapour pressure at temperature T in °C, kPa (FAO-56 Eq. 11). */
export function saturationVapourPressure(temperatureC: number): number {
  return 0.6108 * Math.exp((17.27 * temperatureC) / (temperatureC + 237.3));
}

/** Slope of the saturation vapour pressure curve, kPa/°C (FAO-56 Eq. 13). */
function vapourPressureCurveSlope(tMeanC: number): number {
  return (4098 * saturationVapourPressure(tMeanC)) / Math.pow(tMeanC + 237.3, 2);
}

/** Atmospheric pressure from elevation, kPa (FAO-56 Eq. 7). */
function atmosphericPressure(elevationM: number): number {
  return 101.3 * Math.pow((293 - 0.0065 * elevationM) / 293, 5.26);
}

/**
 * FAO-56 Penman-Monteith reference evapotranspiration, mm/day (Eq. 6).
 *
 * Applied here with terms estimated per FAO-56 Chapter 4 where an input is
 * missing, which is the procedure the paper itself prescribes for reduced data.
 */
export function penmanMonteithEto(input: EtoInputs): EtoEstimate {
  const { latitude, date, temperatureMax: tMax, temperatureMin: tMin } = input;
  const elevation = input.elevationM ?? 0;
  const tMean = (tMax + tMin) / 2;

  // --- Vapour pressure -----------------------------------------------------
  // es from Tmax and Tmin rather than from Tmean: using Tmean under-estimates
  // es and therefore the vapour pressure deficit (FAO-56 Eq. 12).
  const es = (saturationVapourPressure(tMax) + saturationVapourPressure(tMin)) / 2;
  const ea = usableHumidity(input.humidityMean)
    ? (input.humidityMean / 100) * es // Eq. 19
    : // Eq. 48: with no usable humidity, assume dewpoint ≈ Tmin. Valid for humid
      // climates; in arid ones it over-estimates ea and so under-states ETo —
      // again the direction that advises less water rather than more.
      saturationVapourPressure(tMin);
  const vapourDeficit = Math.max(0, es - ea);

  // --- Radiation -----------------------------------------------------------
  const ra = extraterrestrialRadiation(latitude, date);
  const { rs, source: radiationSource } = solarRadiation(input, ra);
  // Clear-sky radiation (Eq. 37), the reference Rs is compared against.
  const rso = (0.75 + 2e-5 * elevation) * ra;
  const rns = (1 - ALBEDO) * rs; // Eq. 38
  // Net longwave (Eq. 39). The cloudiness term is clamped to [0, 1]: Rs can
  // marginally exceed Rso on very clear days, which would otherwise push the
  // factor above 1 and over-state longwave loss.
  const cloudiness = rso > 0 ? clamp01(1.35 * (rs / rso) - 0.35) : 0.35;
  const rnl =
    STEFAN_BOLTZMANN *
    ((Math.pow(tMax + 273.16, 4) + Math.pow(tMin + 273.16, 4)) / 2) *
    (0.34 - 0.14 * Math.sqrt(Math.max(0, ea))) *
    cloudiness;
  const rn = rns - rnl;
  // Soil heat flux is negligible at a daily step (Eq. 42).
  const g = 0;

  // --- Aerodynamic ---------------------------------------------------------
  // 10 m → 2 m wind conversion (Eq. 47), after the max→mean approximation.
  const u10 = usableWind(input.windSpeedMax)
    ? input.windSpeedMax * WIND_MEAN_FROM_MAX
    : // FAO-56 Chapter 4: 2 m/s is the recommended worldwide default when wind
      // is unavailable. Stated at 2 m, so it needs no height conversion.
      null;
  const u2 = Math.max(MIN_U2_MS, u10 == null ? 2 : u10 * (4.87 / Math.log(67.8 * 10 - 5.42)));

  // --- Combine (Eq. 6) -----------------------------------------------------
  const delta = vapourPressureCurveSlope(tMean);
  const gamma = 0.665e-3 * atmosphericPressure(elevation);
  const numerator = 0.408 * delta * (rn - g) + gamma * (900 / (tMean + 273)) * u2 * vapourDeficit;
  const denominator = delta + gamma * (1 + 0.34 * u2);

  return {
    etoMm: round2(Math.max(0, numerator / denominator)),
    method: 'penman-monteith',
    radiationSource,
  };
}

/**
 * Incoming solar radiation Rs, MJ m⁻² day⁻¹, from the best source available.
 *
 * WHY SUNSHINE HOURS ARE NOT USED HERE
 * The obvious third option is Ångström-Prescott (FAO-56 Eq. 35),
 * `Rs = (0.25 + 0.50·n/N)·Ra`, since the provider gives us n and N. It was
 * implemented and measured against ten days of the provider's own FAO-56 ETo at
 * the reference coordinate, and it came out WORSE than the temperature-range
 * method it was meant to improve on:
 *
 *   measured radiation   MAE 0.20 mm/day
 *   temperature range    MAE 0.39 mm/day
 *   Ångström-Prescott    MAE 0.92 mm/day   ← systematically ~25% high
 *
 * The cause is a definition mismatch, not a coding error. The coefficients 0.25
 * and 0.50 are calibrated against Campbell-Stokes bright sunshine, whereas
 * Open-Meteo derives `sunshine_duration` from direct normal irradiance above
 * 120 W/m² — a looser threshold that reports more sunshine hours, inflating n/N.
 * Observed transmissivity Rs/Ra over those days was 0.36–0.56 while Ångström
 * predicted 0.44–0.65.
 *
 * Over-estimating Rs over-estimates ETo, which would advise farmers to apply
 * MORE water than they need — the unsafe direction. So the equation is left out
 * until there are locally calibrated as/bs coefficients to justify it.
 * `evapotranspiration.test.ts` keeps the comparison as a regression guard.
 *
 * Sunshine hours are still fetched, shown and used — for disease risk and
 * drying-window advice — just not for this term.
 */
function solarRadiation(
  input: EtoInputs,
  ra: number,
): { rs: number; source: EtoEstimate['radiationSource'] } {
  if (input.radiationMj != null && Number.isFinite(input.radiationMj) && input.radiationMj > 0) {
    return { rs: input.radiationMj, source: 'measured' };
  }

  // Hargreaves radiation formula (FAO-56 Eq. 50): the daily temperature range
  // is a proxy for cloudiness, because clouds suppress daytime heating and trap
  // night-time heat, narrowing the range.
  const range = Math.max(0, input.temperatureMax - input.temperatureMin);
  const rs = K_RS_INTERIOR * Math.sqrt(range) * ra;
  // Never exceed clear-sky radiation: on a very wide-range day the proxy can
  // otherwise imply more radiation than a cloudless sky delivers.
  const rso = (0.75 + 2e-5 * (input.elevationM ?? 0)) * ra;
  return { rs: Math.min(rs, rso), source: 'temperature-range' };
}

/**
 * Hargreaves-Samani reference evapotranspiration, mm/day (FAO-56 Eq. 52).
 *
 * ETo = 0.0023 × Ra_mm × (Tmean + 17.8) × √(Tmax − Tmin)
 *
 * Needs only air temperature, latitude and date, so it survives the thinnest
 * cache. Ra is converted from MJ m⁻² day⁻¹ to mm/day by 0.408 (Eq. 20) because
 * the coefficient 0.0023 is defined against the equivalent-evaporation form.
 */
export function hargreavesEto(input: {
  date: string;
  latitude: number;
  temperatureMax: number;
  temperatureMin: number;
}): EtoEstimate {
  const { temperatureMax: tMax, temperatureMin: tMin } = input;
  const raMm = 0.408 * extraterrestrialRadiation(input.latitude, input.date);
  const tMean = (tMax + tMin) / 2;
  const range = Math.max(0, tMax - tMin);
  const eto = 0.0023 * raMm * (tMean + 17.8) * Math.sqrt(range);
  return { etoMm: round2(Math.max(0, eto)), method: 'hargreaves', radiationSource: 'temperature-range' };
}

/**
 * Estimate ETo from whatever the day actually carries.
 *
 * Returns null when even the temperature range is unavailable, so the caller
 * can fall through to its own last resort rather than being handed a number
 * that was invented here. Never guessing is the point of this module.
 */
export function estimateEto(input: Partial<EtoInputs> & { date: string; latitude: number }): EtoEstimate | null {
  const { temperatureMax: tMax, temperatureMin: tMin } = input;
  if (tMax == null || !Number.isFinite(tMax)) return null;
  if (tMin == null || !Number.isFinite(tMin)) return null;
  // A zero or inverted range means the record is wrong, not that the day was
  // isothermal; both Eq. 50 and Eq. 52 would return an implausible ~0 mm.
  if (tMax <= tMin) return null;

  const full: EtoInputs = { ...input, temperatureMax: tMax, temperatureMin: tMin };
  const pm = penmanMonteithEto(full);
  // Penman-Monteith with an estimated radiation term AND no usable humidity is
  // thinner than it looks — both of its two data-driven terms are then inferred
  // from the same temperature range. Hargreaves is the better-validated equation
  // at that point. `usableHumidity` rather than a null check, so a fabricated 0
  // cannot keep the engine on an equation it no longer has the data for.
  if (pm.radiationSource === 'temperature-range' && !usableHumidity(input.humidityMean)) {
    return hargreavesEto(full);
  }
  return pm;
}

function clampToUnit(value: number): number {
  return Math.min(1, Math.max(-1, value));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
