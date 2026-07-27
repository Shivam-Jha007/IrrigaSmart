import type { AreaUnit, IrrigationMethod, SoilType } from '../types';

/**
 * Decision Engine tunable parameters (docs/11_Decision_Logic.md §9).
 *
 * Single source of truth for every numeric constant that influences a
 * recommendation. These are tunable ENGINEERING parameters, not scientific
 * constants; changing a value here must never require changing engine logic.
 */

/** Reference evapotranspiration baseline in mm/day (Decision Logic §2, §9). */
export const ETO_REF = 5.0;

/** Weather multiplier parameters (Decision Logic §2 / §9). */
export const WEATHER = {
  T_BASE: 30,
  TEMP_SENS: 0.02,
  TEMP_MIN: 0.8,
  TEMP_MAX: 1.3,
  H_BASE: 55,
  HUM_SENS: 0.003,
  HUM_MIN: 0.9,
  HUM_MAX: 1.1,
  W_BASE: 2,
  WIND_SENS: 0.02,
  WIND_MIN: 1.0,
  WIND_MAX: 1.2,
  WMULT_MIN: 0.7,
  WMULT_MAX: 1.5,
} as const;

/** Effective-rainfall fraction by soil (Decision Logic §3 / §9). */
export const RAIN_EFF_FACTOR: Record<SoilType, number> = {
  Sandy: 0.6,
  Loamy: 0.75,
  Clay: 0.85,
};

/** "Monitor Tomorrow" cutoff in mm by soil (Decision Logic §5 / §9). */
export const SKIP_THRESHOLD_MM: Record<SoilType, number> = {
  Sandy: 1.0,
  Loamy: 1.5,
  Clay: 2.0,
};

/** Irrigation application efficiency by method (Decision Logic §6 / §9). */
export const METHOD_EFFICIENCY: Record<IrrigationMethod, number> = {
  Drip: 0.9,
  Sprinkler: 0.75,
  Furrow: 0.6,
  Flood: 0.5,
};

/** Area unit → square metres (Decision Logic §9). */
export const AREA_TO_M2: Record<AreaUnit, number> = {
  'Square metre': 1,
  Acre: 4046.86,
  Hectare: 10000,
};

/** Confidence and timing parameters (Decision Logic §8, §7 / §9). */
export const FRESH_MAX_HOURS = 6;
export const STALE_MAX_HOURS = 24;
export const IRRIGATION_TIME_DEFAULT = '06:00';

/** Bound a value to an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
