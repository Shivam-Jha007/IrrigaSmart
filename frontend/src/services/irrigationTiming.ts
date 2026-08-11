import type {
  Farm,
  IrrigationMethod,
  IrrigationWindow,
  Season,
  TimingReason,
  WeatherData,
} from '../types';
import type { DryingPotential } from './sunshine';
import {
  AREA_TO_M2,
  clamp,
  METHOD_APPLICATION_RATE_MM_H,
  MIN_RUN_MINUTES,
  TEMP_STRONG_DELTA,
  TIMING,
  WEATHER,
  WIND_STRONG_DELTA,
} from './decisionParameters';

/**
 * Irrigation timing (docs/11_Decision_Logic.md §7).
 *
 * Deterministic and framework-independent, like the rest of the engine: `now`
 * is injected, never read from the clock, so the same inputs always yield the
 * same window.
 *
 * Previously the engine returned a single fixed 06:00 for every farm on every
 * day. That is defensible as an evaporation heuristic but useless as advice —
 * it ignores how long the run takes, how hot and windy the day is, which season
 * it is, and the fact that a farmer opening the app at 11am cannot act on a
 * 6am instruction. This module computes a WINDOW (start plus run length) and
 * reports which of those considerations decided it.
 */

/**
 * Estimated run time in minutes to apply a gross depth with a given method.
 *
 * `intake` is the slope intake multiplier in (0, 1] from `slopeAdjustment`:
 * sloped ground takes water in more slowly, so the same depth has to be applied
 * over a longer, gentler run or the surplus runs downhill. It DIVIDES the rate
 * rather than scaling the depth, because the crop's requirement does not change
 * with the ground's tilt — only the pace at which it can be delivered does.
 *
 * Optional, and 1 means "no adjustment": every caller that omits it gets
 * byte-identical run times to the pre-terrain behaviour, which is what keeps
 * farms with no terrain record — every farm created before V1.7, and every farm
 * created while the provider was unreachable — working exactly as before.
 */
export function runMinutes(
  grossDepthMm: number,
  method: IrrigationMethod,
  intake = 1,
): number {
  if (grossDepthMm <= 0) return 0;
  const hours = grossDepthMm / effectiveRateMmH(method, intake);
  return Math.max(MIN_RUN_MINUTES, Math.round(hours * 60));
}

/**
 * The method's application rate after the slope intake multiplier, mm/hour.
 *
 * A non-finite or non-positive `intake` would make the rate zero or negative
 * and the run time Infinity or negative, so it is treated as no adjustment —
 * a bad terrain reading must not be able to produce an absurd run time.
 */
function effectiveRateMmH(method: IrrigationMethod, intake: number): number {
  const rate = METHOD_APPLICATION_RATE_MM_H[method];
  if (!Number.isFinite(intake) || intake <= 0 || intake > 1) return rate;
  return rate * intake;
}

/**
 * Estimated delivery in litres per minute across `areaM2` at the method's
 * application rate. One millimetre over one square metre is one litre, so
 * mm/hour × m² is litres/hour.
 *
 * Takes the same `intake` multiplier as `runMinutes` and must be passed the same
 * value: flow and duration are shown side by side, and their product has to come
 * back to the advised volume or the card contradicts itself.
 */
export function flowLitersPerMinute(
  method: IrrigationMethod,
  areaM2: number,
  intake = 1,
): number {
  return Math.round((effectiveRateMmH(method, intake) * areaM2) / 60);
}

/** A farm's area in square metres, whatever unit the farmer entered it in. */
export function farmAreaM2(farm: Farm): number {
  return farm.area * AREA_TO_M2[farm.areaUnit];
}

export interface TimingInput {
  season: Season;
  /** Latest weather, or null when none is available (timing then uses season only). */
  weather: WeatherData | null;
  method: IrrigationMethod;
  /** Estimated run time from runMinutes(). */
  durationMinutes: number;
  /** Current time as an ISO-8601 string, injected for determinism. */
  now: string;
  /**
   * Today's canopy drying potential from sunshine hours (item 2), or null when
   * the day carries no sunshine figure.
   *
   * Optional on purpose. Every caller that omits it gets byte-identical timing
   * to the pre-V1.7 behaviour, which is what keeps a farmer on an old offline
   * cache — where no sunshine was ever stored — working exactly as before.
   */
  drying?: DryingPotential | null;
}

/**
 * Methods that throw water over the canopy rather than delivering it at or
 * below the soil surface.
 *
 * Only these care about drying potential: leaf wetness is what fungal spores
 * need to germinate, and furrow, flood and drip leave the leaves dry, so the
 * sky's drying power is irrelevant to them.
 */
const WETS_CANOPY: Record<IrrigationMethod, boolean> = {
  Drip: false,
  Sprinkler: true,
  Furrow: false,
  Flood: false,
};

/** Local hour-of-day as a fraction (e.g. 06:30 → 6.5). */
function hourOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
}

/** Round an hour-of-day up to the next TIMING.ROUND_MINUTES boundary. */
function roundUpToStep(hours: number): number {
  const step = TIMING.ROUND_MINUTES / 60;
  return Math.ceil(hours / step) * step;
}

/** Format an hour-of-day fraction as "HH:MM". */
function formatHour(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Choose the irrigation window for a day on which irrigation is advised.
 *
 * Order matters: the seasonal baseline is set first, weather then nudges it,
 * a long run pulls the start earlier so it finishes before the evaporation
 * peak, and finally the current time is honoured — the advised window is never
 * in the past.
 */
export function chooseIrrigationWindow(input: TimingInput): IrrigationWindow {
  const { season, weather, method, durationMinutes, now } = input;
  const runHours = durationMinutes / 60;
  // A sprinkler run finishing at dusk on a dull day leaves free water on the
  // leaves all night, which is precisely the condition foliar pathogens need.
  // Both halves must hold: a dull day matters only for a method that wets the
  // canopy, and a canopy-wetting method is fine on a day with drying power.
  const wetCanopyOvernightRisk = input.drying === 'poor' && WETS_CANOPY[method];

  let start: number = TIMING.BASE_HOUR;
  let reason: TimingReason = 'morning-default';

  // Season sets the baseline: summer demands the coolest hours, winter mornings
  // are cold and dew-laden so a later start is better for the crop.
  if (season === 'Zaid') {
    start -= TIMING.HOT_SEASON_SHIFT_H;
    reason = 'hot-season';
  } else if (season === 'Rabi') {
    start += TIMING.COOL_SEASON_SHIFT_H;
    reason = 'cool-season';
  }

  // A hot day pulls the start earlier regardless of season.
  if (weather && weather.temperature >= WEATHER.T_BASE + TEMP_STRONG_DELTA) {
    start -= TIMING.HOT_DAY_SHIFT_H;
    reason = 'hot-day';
  }

  // Sprinkler spray drifts and evaporates in wind; the calmest hours are just
  // before dawn. Drip, furrow and flood deliver at ground level, so wind does
  // not move the window for them.
  if (method === 'Sprinkler' && weather && weather.windSpeed >= WEATHER.W_BASE + WIND_STRONG_DELTA) {
    start -= TIMING.WINDY_SHIFT_H;
    reason = 'windy';
  }

  // A long run has to start early enough to finish before midday heat.
  if (start + runHours > TIMING.MORNING_DEADLINE_HOUR) {
    start = TIMING.MORNING_DEADLINE_HOUR - runHours;
    reason = 'long-run';
  }

  start = clamp(start, TIMING.EARLIEST_HOUR, TIMING.LATEST_MORNING_HOUR);

  // Never advise a time that has already gone. Prefer finishing this morning,
  // then the evening slot, and only then tomorrow's morning window.
  const nowHours = hourOfDay(now);
  let nextDay = false;
  if (nowHours > start) {
    const soonest = roundUpToStep(nowHours);
    if (soonest + runHours <= TIMING.MORNING_DEADLINE_HOUR) {
      start = soonest;
      reason = 'later-today';
    } else {
      const evening = Math.max(TIMING.EVENING_HOUR, soonest);
      if (evening + runHours <= TIMING.EVENING_DEADLINE_HOUR && !wetCanopyOvernightRisk) {
        start = evening;
        reason = 'evening-slot';
      } else {
        // Either too late for both slots, or the evening slot was given up to
        // avoid soaking the canopy on a dull evening. Both keep the computed
        // morning window and move it to tomorrow, when the leaves will have a
        // full day to dry — half a day's delay against an infection window that
        // lasts the whole season.
        nextDay = true;
        if (wetCanopyOvernightRisk) reason = 'drying-window';
      }
    }
  }

  return {
    start: formatHour(start),
    end: formatHour(start + runHours),
    nextDay,
    reason,
  };
}
