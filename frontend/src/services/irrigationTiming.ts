import type {
  Farm,
  IrrigationMethod,
  IrrigationWindow,
  Season,
  TimingReason,
  WeatherData,
} from '../types';
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

/** Estimated run time in minutes to apply a gross depth with a given method. */
export function runMinutes(grossDepthMm: number, method: IrrigationMethod): number {
  if (grossDepthMm <= 0) return 0;
  const hours = grossDepthMm / METHOD_APPLICATION_RATE_MM_H[method];
  return Math.max(MIN_RUN_MINUTES, Math.round(hours * 60));
}

/**
 * Estimated delivery in litres per minute across `areaM2` at the method's
 * application rate. One millimetre over one square metre is one litre, so
 * mm/hour × m² is litres/hour.
 */
export function flowLitersPerMinute(method: IrrigationMethod, areaM2: number): number {
  return Math.round((METHOD_APPLICATION_RATE_MM_H[method] * areaM2) / 60);
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
}

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
      if (evening + runHours <= TIMING.EVENING_DEADLINE_HOUR) {
        start = evening;
        reason = 'evening-slot';
      } else {
        // Too late for both slots — keep the computed morning window, tomorrow.
        nextDay = true;
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
