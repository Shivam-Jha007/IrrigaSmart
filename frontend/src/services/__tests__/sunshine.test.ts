import { describe, expect, it } from 'vitest';
import type { DailyWeather } from '../../types';
import { dayFor, dryingPotential, isOvercast, sunshineRatio } from '../sunshine';
import { daylightHoursFor } from '../evapotranspiration';
import { assessDiseaseRisk } from '../diseaseRisk';
import { makeDaily, TODAY, shiftDay } from './fixtures';

/**
 * Sunshine normalisation and its effect on disease risk (V1.7 item 2).
 *
 * These are assertions, not snapshots. The point of the module is that a
 * sunshine figure is judged against the daylight the sky could deliver on that
 * date at that latitude, and a snapshot would happily record a wrong ceiling as
 * the new truth. Every expected number below is derived by hand from FAO-56
 * Eq. 34 and the thresholds in decisionParameters, so a drift in either shows up
 * as a failure rather than as a diff to accept.
 *
 * The latitude used throughout is the fixture farm's, 23.677°N, where daylight
 * runs ~10.7 h in January to ~13.45 h in June. That spread is the reason the
 * ratio exists: 7 bright hours is a dull day in June and a clear one in December.
 */

const LATITUDE = 23.677;

/** A day carrying exactly the fields the sunshine path reads. */
function day(overrides: Partial<DailyWeather> = {}): DailyWeather {
  return {
    date: TODAY,
    precipitationSum: 0,
    temperatureMax: 30,
    humidityMean: 70,
    windSpeedMax: 2.5,
    ...overrides,
  };
}

describe('sunshineRatio', () => {
  it('returns null when the day carries no sunshine figure', () => {
    // Not zero. Every cache written before V1.7 lacks the key, and reading that
    // as a sunless day would tell an offline farmer their canopy never dries.
    expect(sunshineRatio(day(), LATITUDE)).toBeNull();
  });

  it('returns null for a negative or non-finite figure', () => {
    expect(sunshineRatio(day({ sunshineHours: -1 }), LATITUDE)).toBeNull();
    expect(sunshineRatio(day({ sunshineHours: Number.NaN }), LATITUDE)).toBeNull();
    expect(sunshineRatio(day({ sunshineHours: Number.POSITIVE_INFINITY }), LATITUDE)).toBeNull();
  });

  it('treats a genuine zero as a real, fully overcast day', () => {
    // Distinct from absent: the provider did measure, and it measured no sun.
    expect(sunshineRatio(day({ sunshineHours: 0 }), LATITUDE)).toBe(0);
  });

  it('prefers the provider daylight hours over the computed ceiling', () => {
    // 6/12 = 0.5 exactly. The computed N for 2026-06-15 is ~13.45, which would
    // give ~0.446 — a different band — so this proves which ceiling was used.
    const ratio = sunshineRatio(day({ sunshineHours: 6, daylightHours: 12 }), LATITUDE);
    expect(ratio).toBeCloseTo(0.5, 10);
  });

  it('falls back to FAO-56 Eq. 34 daylight when the provider omits it', () => {
    const n = 6;
    const expected = n / daylightHoursFor(LATITUDE, TODAY);
    expect(sunshineRatio(day({ sunshineHours: n }), LATITUDE)).toBeCloseTo(expected, 10);
    // Sanity-check the ceiling itself against the hand-computed June value, so a
    // broken daylight function cannot cancel out inside the comparison above.
    expect(daylightHoursFor(LATITUDE, TODAY)).toBeCloseTo(13.452, 3);
  });

  it('ignores a zero or non-finite provider daylight and does not divide by it', () => {
    // A zero ceiling would yield Infinity; the module must fall back instead.
    const expected = 6 / daylightHoursFor(LATITUDE, TODAY);
    expect(sunshineRatio(day({ sunshineHours: 6, daylightHours: 0 }), LATITUDE)).toBeCloseTo(
      expected,
      10,
    );
  });

  it('clamps a sunshine figure that exceeds the daylight ceiling', () => {
    // The provider's sunshine threshold (DNI > 120 W/m²) is looser than its
    // daylight definition, so n can nudge past N on a cloudless day. That is a
    // definitional artefact, not more sun than the sky can deliver.
    expect(sunshineRatio(day({ sunshineHours: 14, daylightHours: 12 }), LATITUDE)).toBe(1);
  });

  it('scales the same sunshine figure by season', () => {
    // 7 h is dull in June and bright in December at this latitude. This is the
    // whole reason the raw hour count is not used directly anywhere.
    const june = sunshineRatio(day({ date: '2026-06-15', sunshineHours: 7 }), LATITUDE);
    const december = sunshineRatio(day({ date: '2026-12-21', sunshineHours: 7 }), LATITUDE);
    expect(june).toBeCloseTo(7 / 13.452, 3);
    expect(december).toBeCloseTo(7 / 10.539, 3);
    expect(december!).toBeGreaterThan(june!);
  });
});

describe('dryingPotential', () => {
  /** A day whose ratio is exactly `ratio`, by pinning the daylight ceiling. */
  function atRatio(ratio: number): DailyWeather {
    return day({ sunshineHours: ratio * 10, daylightHours: 10 });
  }

  it('bands on the documented 0.3 / 0.6 boundaries, inclusive upward', () => {
    expect(dryingPotential(atRatio(0.0), LATITUDE)).toBe('poor');
    expect(dryingPotential(atRatio(0.29), LATITUDE)).toBe('poor');
    // 0.3 is OVERCAST_RATIO: at the threshold the day is no longer overcast.
    expect(dryingPotential(atRatio(0.3), LATITUDE)).toBe('moderate');
    expect(dryingPotential(atRatio(0.59), LATITUDE)).toBe('moderate');
    // 0.6 is BRIGHT_RATIO: at the threshold the canopy dries.
    expect(dryingPotential(atRatio(0.6), LATITUDE)).toBe('good');
    expect(dryingPotential(atRatio(1.0), LATITUDE)).toBe('good');
  });

  it('is null, not "good", when sunshine is unknown', () => {
    // A missing figure must not be reported as a bright day: the timing rule
    // reads this to decide whether to push a sprinkler run off a dull evening.
    expect(dryingPotential(day(), LATITUDE)).toBeNull();
    expect(isOvercast(day(), LATITUDE)).toBe(false);
  });

  it('flags only the poor band as overcast', () => {
    expect(isOvercast(atRatio(0.2), LATITUDE)).toBe(true);
    expect(isOvercast(atRatio(0.45), LATITUDE)).toBe(false);
    expect(isOvercast(atRatio(0.9), LATITUDE)).toBe(false);
  });
});

describe('dayFor', () => {
  it('finds a day by date and tolerates a missing series', () => {
    const series = makeDaily(() => ({}));
    expect(dayFor(series, TODAY)?.date).toBe(TODAY);
    expect(dayFor(series, '1999-01-01')).toBeNull();
    expect(dayFor(null, TODAY)).toBeNull();
  });
});

describe('diseaseRisk sunshine weighting', () => {
  /**
   * Three consecutive favourable Rice days ending today: 2026-06-13..15.
   * Rice blast wants Tmax in [25, 33] and mean humidity >= 80, so 26 °C / 92 %
   * is favourable and the run ends today, making all three observed days.
   */
  function favourableRun(sunshine?: { hours: number; daylight: number }): DailyWeather[] {
    return makeDaily(
      () => ({
        temperatureMax: 26,
        humidityMean: 92,
        ...(sunshine ? { sunshineHours: sunshine.hours, daylightHours: sunshine.daylight } : {}),
      }),
      -2,
      0,
    );
  }

  it('reproduces the pre-V1.7 score exactly when no day carries sunshine', () => {
    // 3 observed days x 1.0 = 3.0. This is the guarantee that an old cache
    // behaves identically to before the feature landed (item 0, item 18).
    const a = assessDiseaseRisk('Rice', favourableRun(), TODAY, LATITUDE);
    expect(a?.observedRun).toBe(3);
    expect(a?.score).toBe(3.0);
    expect(a?.overcastDays).toBe(0);
  });

  it('lifts the score by the multiplier for each overcast day inside the run', () => {
    // ratio 0.2 -> poor. 3 x (1.0 x 1.3) = 3.9, and all three are counted.
    const a = assessDiseaseRisk('Rice', favourableRun({ hours: 2, daylight: 10 }), TODAY, LATITUDE);
    expect(a?.observedRun).toBe(3);
    expect(a?.overcastDays).toBe(3);
    expect(a?.score).toBe(3.9);
  });

  it('leaves a bright favourable spell unweighted', () => {
    // ratio 0.8 -> good. Sunshine only ever sharpens a risk; it never softens
    // one, so a bright run scores the same 3.0 as an unknown-sunshine run.
    const a = assessDiseaseRisk('Rice', favourableRun({ hours: 8, daylight: 10 }), TODAY, LATITUDE);
    expect(a?.overcastDays).toBe(0);
    expect(a?.score).toBe(3.0);
  });

  it('cannot manufacture a warning from a single dull day', () => {
    // One observed overcast favourable day scores 1.3 — still Low, below the
    // 1.5 Moderate boundary. This is the property that justifies a multiplier
    // over an additive bonus: run length stays in charge of the verdict.
    const one = makeDaily(() => ({
      temperatureMax: 26,
      humidityMean: 92,
      sunshineHours: 2,
      daylightHours: 10,
    }), 0, 0);
    const a = assessDiseaseRisk('Rice', one, TODAY, LATITUDE);
    expect(a?.score).toBe(1.3);
    expect(a?.level).toBe('Low');
  });

  it('escalates a spell that was already near the boundary', () => {
    // 2 observed + 1 forecast = 2.5 unweighted (Moderate). All three overcast:
    // 2 x 1.3 + 1 x 0.65 = 3.25, which crosses SCORE_HIGH at 3.0. The extra
    // hours of leaf wetness are what decide this case.
    const spell = makeDaily(
      () => ({
        temperatureMax: 26,
        humidityMean: 92,
        sunshineHours: 2,
        daylightHours: 10,
      }),
      -1,
      1,
    );
    const dull = assessDiseaseRisk('Rice', spell, TODAY, LATITUDE);
    expect(dull?.observedRun).toBe(2);
    expect(dull?.forecastRun).toBe(1);
    expect(dull?.score).toBe(3.25);
    expect(dull?.level).toBe('High');

    // The same spell with sunshine stripped stays Moderate, which is what makes
    // the escalation attributable to the sky rather than to the humidity.
    const bare = assessDiseaseRisk(
      'Rice',
      makeDaily(() => ({ temperatureMax: 26, humidityMean: 92 }), -1, 1),
      TODAY,
      LATITUDE,
    );
    expect(bare?.score).toBe(2.5);
    expect(bare?.level).toBe('Moderate');
  });

  it('does not count an overcast day that sits outside the favourable spell', () => {
    // Yesterday is dull but unfavourably hot and dry, so it breaks the run and
    // has no leaf wetness to prolong. Only today may contribute.
    const series = makeDaily(
      (offset) =>
        offset === 0
          ? { temperatureMax: 26, humidityMean: 92, sunshineHours: 2, daylightHours: 10 }
          : { temperatureMax: 44, humidityMean: 15, sunshineHours: 2, daylightHours: 10 },
      -2,
      0,
    );
    const a = assessDiseaseRisk('Rice', series, TODAY, LATITUDE);
    expect(a?.observedRun).toBe(1);
    expect(a?.overcastDays).toBe(1);
    expect(a?.score).toBe(1.3);
  });

  it('reports the drying potential on the trigger day it names', () => {
    // The trigger is the LATEST contributing favourable day, which for an
    // observed run is today — the weather the farmer can still walk out and see,
    // not the day the spell opened.
    const a = assessDiseaseRisk('Rice', favourableRun({ hours: 2, daylight: 10 }), TODAY, LATITUDE);
    expect(a?.trigger?.date).toBe(TODAY);
    expect(a?.trigger?.drying).toBe('poor');
  });

  it('names the opening forecast day when there is no observed run', () => {
    const forecastOnly = makeDaily(
      (offset) =>
        offset > 0
          ? { temperatureMax: 26, humidityMean: 92, sunshineHours: 2, daylightHours: 10 }
          : { temperatureMax: 44, humidityMean: 15 },
      0,
      2,
    );
    const a = assessDiseaseRisk('Rice', forecastOnly, TODAY, LATITUDE);
    expect(a?.observedRun).toBe(0);
    expect(a?.trigger?.date).toBe(shiftDay(TODAY, 1));
    expect(a?.trigger?.drying).toBe('poor');
  });
});
