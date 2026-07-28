import type { AreaUnit, IrrigationMethod, Season, SoilType } from '../types';

/**
 * Decision Engine tunable parameters (docs/11_Decision_Logic.md §9).
 *
 * Single source of truth for every numeric constant that influences a
 * recommendation. These are tunable ENGINEERING parameters, not scientific
 * constants; changing a value here must never require changing engine logic.
 */

/** Reference evapotranspiration baseline in mm/day (Decision Logic §2, §9). */
export const ETO_REF = 5.0;

/**
 * Regional seasonal ETo factors (Decision Logic §2 / §9;
 * docs/10_Knowledge_Base.md §9.4; roadmap Feature 8). Multiplies ETo_ref to
 * shift the demand baseline by Indian cropping season before the
 * weather multiplier applies.
 */
export const SEASONAL_ETO_FACTOR: Record<Season, number> = {
  Kharif: 0.95,
  Rabi: 0.9,
  Zaid: 1.15,
};

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
  'Sandy Loam': 0.65,
  Loamy: 0.75,
  'Silty Loam': 0.8,
  'Clay Loam': 0.8,
  Clay: 0.85,
};

/** "Monitor Tomorrow" cutoff in mm by soil (Decision Logic §5 / §9). */
export const SKIP_THRESHOLD_MM: Record<SoilType, number> = {
  Sandy: 1.0,
  'Sandy Loam': 1.2,
  Loamy: 1.5,
  'Silty Loam': 1.6,
  'Clay Loam': 1.8,
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

/** Confidence parameters (Decision Logic §8 / §9). */
export const FRESH_MAX_HOURS = 6;
export const STALE_MAX_HOURS = 24;

/**
 * Irrigation application rate in mm/hour by method (Decision Logic §6 / §9).
 *
 * How fast each method delivers water over the field. Turns a gross
 * application depth into a run time so the farmer is told how LONG to irrigate,
 * not just how much. These are typical smallholder system rates, not device
 * specifications — a farmer with a measured pump output will differ, so run
 * time is always presented as an estimate.
 */
export const METHOD_APPLICATION_RATE_MM_H: Record<IrrigationMethod, number> = {
  Drip: 3,
  Sprinkler: 8,
  Furrow: 25,
  Flood: 40,
};

/** Shortest run time worth advising; below this, timing precision is noise. */
export const MIN_RUN_MINUTES = 5;

/**
 * Irrigation timing parameters (Decision Logic §7 / §9).
 *
 * These replace the former single fixed 06:00 default. The window is chosen
 * from the season, the day's heat and wind, how long the run takes, and what
 * time the farmer is actually asking — so the advised time moves with
 * conditions instead of always reading "06:00".
 */
export const TIMING = {
  /** Earliest start hour ever advised (pre-dawn). */
  EARLIEST_HOUR: 4,
  /** Baseline morning start hour. */
  BASE_HOUR: 6,
  /** Latest morning start hour (cool season, short runs). */
  LATEST_MORNING_HOUR: 8,
  /** Irrigation should finish by this hour to avoid the evaporation peak. */
  MORNING_DEADLINE_HOUR: 10,
  /** Earliest evening start hour, once the afternoon heat has broken. */
  EVENING_HOUR: 17,
  /** Evening irrigation should finish by this hour. */
  EVENING_DEADLINE_HOUR: 21,
  /** Rabi (cool season) shifts the start later by this many hours. */
  COOL_SEASON_SHIFT_H: 1.5,
  /** Zaid (hot season) shifts the start earlier by this many hours. */
  HOT_SEASON_SHIFT_H: 1,
  /** An unusually hot day shifts the start earlier by this many hours. */
  HOT_DAY_SHIFT_H: 0.5,
  /** A windy day shifts spray irrigation earlier by this many hours. */
  WINDY_SHIFT_H: 1,
  /** Advised start times are rounded up to a multiple of this many minutes. */
  ROUND_MINUTES: 15,
} as const;

/**
 * Baseline practice for the water-saved comparison (Decision Logic §6).
 *
 * Savings are stated against untimed flood irrigation that gives no credit to
 * rainfall — the habit IrrigaSmart is meant to replace. Comparing per DAY of
 * crop demand (not per irrigation event) keeps the figure independent of how
 * often either schedule waters, so it never over-counts a skipped day whose
 * deficit simply carries forward.
 */
export const SAVINGS_BASELINE_METHOD: IrrigationMethod = 'Flood';

/**
 * Automatic cleanup windows (docs/07_Engineering_Rules.md: storage stays
 * bounded). History and delivered reminders are pruned on app launch so local
 * storage cannot grow without limit on a farmer's phone.
 */
/** Days of recommendation history kept before automatic deletion. */
export const HISTORY_RETENTION_DAYS = 60;
/** Days a delivered reminder is kept before automatic deletion. */
export const REMINDER_RETENTION_DAYS = 7;

/**
 * Multi-day planning parameters (docs/11_Decision_Logic.md §11;
 * docs/12_Product_Roadmap_v2.md Features 5 & 6).
 */
/** Past days whose rainfall/demand feed the soil-moisture carryover deficit. */
export const CARRYOVER_DAYS = 2;
/** Forecast days beyond today included in the irrigation plan (today + 4). */
export const PLAN_DAYS_AHEAD = 4;
/** Plan days up to this offset get Medium confidence; further days get Low. */
export const PLAN_MEDIUM_MAX_OFFSET = 2;

/**
 * Factor-influence thresholds (docs/11_Decision_Logic.md §10;
 * roadmap Feature 4). Presentation-level: they classify how each factor
 * influenced the recommendation, never the outcome itself.
 */
/** Kc at/above which the crop is a strong demand-raising factor. */
export const KC_HIGH = 1.1;
/** Kc at/below which the crop lowers demand. */
export const KC_LOW = 0.6;
/** °C above/below T_BASE at which temperature influence becomes strong. */
export const TEMP_STRONG_DELTA = 4;
/** % below/above H_BASE at which humidity influence becomes strong. */
export const HUM_STRONG_DELTA = 15;
/** m/s above W_BASE at which wind influence becomes strong. */
export const WIND_STRONG_DELTA = 2;
/** Method efficiency at/below which the method strongly raises applied water. */
export const METHOD_LOW_EFFICIENCY = 0.6;

/** Bound a value to an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
