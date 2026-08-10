import type { DailyWeather } from '../types';
import { daylightHoursFor } from './evapotranspiration';
import { SUNSHINE, clamp } from './decisionParameters';

/**
 * Sunshine hours as a usable signal (V1.7, item 2).
 *
 * WHY A SEPARATE MODULE
 * Sunshine reaches three different consumers — disease risk, irrigation timing,
 * and the dashboard — and each needs the same normalisation first. Putting the
 * ratio in one place stops three slightly different definitions of "overcast"
 * drifting apart, which is exactly what happened to the soil source field
 * before it was collapsed to one representation.
 *
 * WHY A RATIO AND NOT RAW HOURS
 * Six sunshine hours in December at 23°N is a bright day; six in June is a dull
 * one, because daylight itself runs from about 10.8 h to 13.4 h over the year.
 * Raw hours would therefore mean different things in different months and
 * latitudes. FAO-56 solves this with the relative sunshine duration n/N (Eq. 35
 * discussion), and that is what every threshold here is expressed against.
 *
 * WHAT THIS IS NOT USED FOR
 * Not the ETo radiation term. Ångström-Prescott was implemented, measured
 * against the provider's own FAO-56 ETo, and rejected for over-stating
 * radiation by ~25% — see the long note in `evapotranspiration.ts`. That
 * rejection is about the calibration of two published coefficients, not about
 * the sunshine data itself, which is perfectly serviceable for the comparative
 * judgements below.
 */

/**
 * How well a wet canopy will dry, derived from relative sunshine duration.
 *
 * `poor` — mostly overcast. Free water sits on leaves for hours longer, which is
 *   the single strongest driver of foliar fungal infection.
 * `moderate` — broken cloud; the canopy dries, but slowly.
 * `good` — largely clear; a wetted canopy dries within the day.
 */
export type DryingPotential = 'poor' | 'moderate' | 'good';

/**
 * Relative sunshine duration n/N for a day, or null when it cannot be computed.
 *
 * Null is a first-class answer, not a zero: a day with no `sunshineHours` (any
 * cache written before V1.7) must not be read as a sunless day, or every
 * offline farmer would be told their canopy never dries.
 *
 * `latitude` is used only when the provider's own daylight figure is missing;
 * N is pure astronomy (FAO-56 Eq. 34), so recomputing it locally is exact
 * rather than an approximation.
 */
export function sunshineRatio(day: DailyWeather, latitude: number): number | null {
  const n = day.sunshineHours;
  if (n == null || !Number.isFinite(n) || n < 0) return null;

  const provided = day.daylightHours;
  const N =
    provided != null && Number.isFinite(provided) && provided > 0
      ? provided
      : daylightHoursFor(latitude, day.date);
  if (!Number.isFinite(N) || N <= 0) return null;

  // Clamped because the provider's sunshine threshold (direct normal irradiance
  // above 120 W/m²) is looser than the daylight definition, so n can nudge past
  // N on a cloudless day. A ratio above 1 is a definitional artefact, not more
  // sun than the sky can deliver.
  return clamp(n / N, 0, 1);
}

/** Classify a day's drying potential; null when sunshine is unavailable. */
export function dryingPotential(day: DailyWeather, latitude: number): DryingPotential | null {
  const ratio = sunshineRatio(day, latitude);
  if (ratio == null) return null;
  if (ratio < SUNSHINE.OVERCAST_RATIO) return 'poor';
  if (ratio < SUNSHINE.BRIGHT_RATIO) return 'moderate';
  return 'good';
}

/**
 * Whether a day is overcast enough to prolong leaf wetness materially.
 *
 * Separate from `dryingPotential` because disease scoring asks a yes/no question
 * and should not have to know which side of the three-way split counts.
 */
export function isOvercast(day: DailyWeather, latitude: number): boolean {
  return dryingPotential(day, latitude) === 'poor';
}

/** Find a day in a series by date, so consumers need not re-sort or re-scan. */
export function dayFor(daily: DailyWeather[] | null, date: string): DailyWeather | null {
  if (!daily) return null;
  return daily.find((d) => d.date === date) ?? null;
}
