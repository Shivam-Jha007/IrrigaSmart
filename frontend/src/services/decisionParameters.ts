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

/**
 * Sunshine thresholds (V1.7 item 2), expressed as relative sunshine duration
 * n/N so they mean the same thing in every month and at every latitude.
 *
 * The provider derives sunshine from direct normal irradiance above 120 W/m²,
 * a looser test than the Campbell-Stokes definition FAO-56's radiation
 * coefficients were calibrated against, so it reports MORE sunshine than a
 * classical recorder would. Both thresholds are therefore set low: the aim is
 * to identify genuinely dull days, and a lenient sunshine measure means a day
 * still has to be markedly overcast to fall below them.
 */
export const SUNSHINE = {
  /** Below this the canopy stays wet for hours longer — a dull, overcast day. */
  OVERCAST_RATIO: 0.3,
  /** At/above this the day is effectively clear and a wetted canopy dries. */
  BRIGHT_RATIO: 0.6,
} as const;

/**
 * Terrain slope parameters (V1.7 item 10).
 *
 * The slope figure these act on comes from a ~90 m DEM sampled over a 300 m
 * cross, and the backend module documents two measured limits on it: on
 * genuinely flat ground the DEM's own error can fabricate ~3% slope (verified on
 * the Punjab plain), and on a genuinely steep hillside the long baseline reads
 * well below the true grade (verified at Manali). Every threshold below is set
 * with that error budget in mind, which is why the deadband is wide and the
 * effect is capped.
 */
export const SLOPE = {
  /**
   * Below this, slope is ignored entirely and every number matches the
   * pre-terrain behaviour exactly.
   *
   * 3% because that is what the DEM reports on ground that is provably flat, so
   * anything under it is indistinguishable from measurement error. This is
   * deliberately far more conservative than the agronomic literature, which
   * treats runoff as significant from about 1%: acting at 1% here would apply a
   * runoff penalty to level fields on the strength of DEM noise, and telling a
   * farmer on a flat plain that their rain is running away is a worse failure
   * than missing a gentle grade.
   */
  DEADBAND_PERCENT: 3,
  /**
   * Effective rainfall lost per 1% of slope above the deadband.
   *
   * Follows the direction of the SCS curve-number treatment of slope — steeper
   * ground sheds a larger share of a storm — but the coefficient is a tuned
   * engineering value, not a published one, because the curve-number method
   * works from a hydrologic soil group and a land-use class the app does not
   * ask the farmer for. 5% per 1% slope keeps the adjustment inside the range
   * the runoff literature reports for cultivated land without pretending to a
   * precision the input cannot support.
   */
  RUNOFF_PER_PERCENT: 0.05,
  /**
   * Floor on the runoff multiplier. At most 40% of the effective rain the flat
   * case would have credited is ever taken away.
   *
   * A cap is required, not optional: the slope figure under-reports steep ground
   * (Manali reads ~5.7% for a hillside past 30%), so an uncapped penalty would
   * be driven by the least trustworthy readings. Capping means the worst case is
   * that a steep farm is advised to irrigate somewhat more than it strictly
   * needs, which is the safe direction for the crop.
   */
  RUNOFF_FLOOR: 0.4,
  /**
   * Slope above which flood and furrow irrigation earn an ADVISORY.
   *
   * Advisory only — it recommends contour furrows or drip and never changes the
   * farmer's recorded method or the numbers derived from it. The farmer knows
   * their field; this figure does not.
   */
  METHOD_WARNING_PERCENT: 2,
  /**
   * Application-rate multiplier per 1% of slope above the deadband.
   *
   * Water applied faster than the soil can take it in runs off, and a slope
   * lowers the rate at which that happens. Slowing the assumed application rate
   * lengthens the advised run time for the same depth, which is exactly the
   * advice a farmer on a slope needs: same water, applied gentler.
   */
  INTAKE_PER_PERCENT: 0.04,
  /**
   * Floor on the application-rate multiplier. The advised run may at most be
   * stretched to twice its flat-ground length, so an over-read slope cannot
   * produce a run time long enough that a farmer dismisses the whole figure.
   */
  INTAKE_FLOOR: 0.5,
} as const;

/**
 * Disease risk scoring parameters (docs/11_Decision_Logic.md §12 / §9;
 * docs/12_Product_Roadmap_v2.md Version 1.3 Feature 9).
 *
 * Only the generic scoring knobs live here. The per-disease temperature bands
 * and humidity thresholds are agronomic FACTS and live in the knowledge module
 * (diseaseKnowledge.ts, from docs/10_Knowledge_Base.md §10.4), exactly as Kc
 * does — this file owns how facts are weighed, never what they are.
 */
export const DISEASE_RISK = {
  /** mm of rain that makes a day count as wet regardless of mean humidity. */
  WET_DAY_RAIN_MM: 2.0,
  /** Weight of a favourable day that has already happened. */
  OBSERVED_DAY_WEIGHT: 1.0,
  /**
   * Weight of a favourable forecast day. Lower than an observed day because the
   * forecast may not verify and infection has not yet had the chance to occur.
   */
  FORECAST_DAY_WEIGHT: 0.5,
  /**
   * Multiplier applied to a favourable day that is also OVERCAST (item 2).
   *
   * Foliar infection needs free water to sit on the leaf long enough for a spore
   * to germinate and penetrate, so leaf-wetness DURATION — not merely its
   * presence — is what published infection models integrate. The app has no
   * wetness sensor, but sunshine is a direct measure of the energy available to
   * evaporate that water: a dull day keeps the canopy wet for hours longer than
   * a bright one with identical humidity and rainfall.
   *
   * Deliberately a multiplier and not an additive bonus. A bonus would let dull
   * weather accumulate score independently of how long the favourable spell
   * actually is, so a single dull day could reach a level that ought to require
   * a sustained spell. Scaling each day's own weight keeps the run length in
   * charge of the verdict and lets sunshine only sharpen it.
   *
   * 1.3 is set so it cannot manufacture a warning on its own: a lone overcast
   * favourable day scores 1.3, still Low, and two observed overcast days score
   * 2.6, still Moderate. It escalates only where a spell was already close to
   * the boundary — e.g. two observed plus one forecast day, 2.5 → 3.25 — which
   * is the case where the extra hours of wetness genuinely decide the outcome.
   */
  OVERCAST_DAY_MULTIPLIER: 1.3,
  /** Score at/above which risk is High (three observed favourable days). */
  SCORE_HIGH: 3.0,
  /** Score at/above which risk is Moderate (two observed favourable days). */
  SCORE_MODERATE: 1.5,
  /** Fraction of the window needing data for High assessment confidence. */
  COVERAGE_HIGH: 0.85,
  /** Fraction of the window needing data for Medium assessment confidence. */
  COVERAGE_MEDIUM: 0.5,
} as const;

/** Bound a value to an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
