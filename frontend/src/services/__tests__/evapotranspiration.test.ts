import { describe, expect, it } from 'vitest';
import {
  ANGSTROM_A,
  ANGSTROM_B,
  dayOfYear,
  daylightHoursFor,
  estimateEto,
  extraterrestrialRadiation,
  hargreavesEto,
  penmanMonteithEto,
  saturationVapourPressure,
} from '../evapotranspiration';

/**
 * Validation suite for the ETo fallback.
 *
 * The oracle is Open-Meteo's own `et0_fao_evapotranspiration`, which is FAO-56
 * Penman-Monteith computed from the same underlying variables at an HOURLY step
 * with true mean wind. Our fallback works from the DAILY aggregates the API
 * returns, so exact agreement is not expected or wanted — what matters is that
 * it lands close enough to be a useful substitute when the provider value is
 * missing, and that it never invents a number the way `ETO_REF = 5.0` did.
 *
 * The fixture below is a real response captured on 2026-08-08 for the reference
 * farm coordinate. Anyone can reproduce it:
 *
 *   curl "https://api.open-meteo.com/v1/forecast?latitude=23.677&longitude=87.685\
 *   &daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,\
 *   wind_speed_10m_max,et0_fao_evapotranspiration,sunshine_duration,\
 *   daylight_duration,shortwave_radiation_sum&wind_speed_unit=ms&timezone=auto"
 */

/** Grid cell Open-Meteo actually resolved the request to, not the requested point. */
const LATITUDE = 23.655535;
const ELEVATION_M = 61;

interface FixtureDay {
  date: string;
  tmax: number;
  tmin: number;
  rh: number;
  wind: number;
  /** The provider's FAO-56 Penman-Monteith value — the oracle. */
  eto: number;
  sun: number;
  day: number;
  rad: number;
}

const FIXTURE: readonly FixtureDay[] = [
  { date: '2026-08-01', tmax: 32.1, tmin: 26.4, rh: 85, wind: 3.96, eto: 4.16, sun: 10.68, day: 13.22, rad: 19.61 },
  { date: '2026-08-02', tmax: 33.1, tmin: 27, rh: 89, wind: 3.2, eto: 3.91, sun: 7.36, day: 13.2, rad: 18.51 },
  { date: '2026-08-03', tmax: 32.2, tmin: 25.6, rh: 89, wind: 2.85, eto: 3.24, sun: 5.43, day: 13.19, rad: 15.13 },
  { date: '2026-08-04', tmax: 32.2, tmin: 27, rh: 88, wind: 3.68, eto: 3.1, sun: 4.97, day: 13.17, rad: 14.32 },
  { date: '2026-08-05', tmax: 31.6, tmin: 26.2, rh: 91, wind: 2.79, eto: 3.05, sun: 5.03, day: 13.15, rad: 14.14 },
  { date: '2026-08-06', tmax: 31.1, tmin: 25.5, rh: 82, wind: 1.96, eto: 3.31, sun: 6.41, day: 13.13, rad: 15.25 },
  { date: '2026-08-07', tmax: 31.7, tmin: 25.9, rh: 86, wind: 4.35, eto: 4.08, sun: 10.95, day: 13.11, rad: 19.77 },
  { date: '2026-08-08', tmax: 31.5, tmin: 25.1, rh: 88, wind: 4.97, eto: 3.35, sun: 7.79, day: 13.1, rad: 16.51 },
  { date: '2026-08-09', tmax: 31.9, tmin: 25.8, rh: 86, wind: 3.57, eto: 4.12, sun: 10.6, day: 13.08, rad: 19.65 },
  { date: '2026-08-10', tmax: 32.6, tmin: 25.8, rh: 86, wind: 3.35, eto: 4.53, sun: 10.66, day: 13.06, rad: 21.53 },
];

function toInputs(d: FixtureDay) {
  return {
    date: d.date,
    latitude: LATITUDE,
    temperatureMax: d.tmax,
    temperatureMin: d.tmin,
    humidityMean: d.rh,
    windSpeedMax: d.wind,
    elevationM: ELEVATION_M,
  };
}

/** Mean absolute error against the provider, in mm/day. */
function meanAbsoluteError(values: Array<{ got: number; want: number }>): number {
  const total = values.reduce((sum, v) => sum + Math.abs(v.got - v.want), 0);
  return total / values.length;
}

describe('astronomical terms', () => {
  it('computes day of year without timezone drift', () => {
    expect(dayOfYear('2026-01-01')).toBe(1);
    expect(dayOfYear('2026-12-31')).toBe(365);
    expect(dayOfYear('2024-12-31')).toBe(366); // leap year
    expect(dayOfYear('2026-08-08')).toBe(220);
  });

  it('matches the provider’s daylight hours to within about ten minutes', () => {
    // Independent check on the Ra/δ/ωs chain: daylight comes from the same
    // sunset hour angle Ra does, so agreement here validates both.
    //
    // A residual ~8 minutes is expected and correct: FAO-56 Eq. 34 gives
    // GEOMETRIC daylight (sun centre at the horizon), while the provider
    // reports apparent sunrise-to-sunset, which atmospheric refraction and the
    // solar disc radius lengthen. Neither is wrong; they measure different things.
    for (const d of FIXTURE) {
      const diff = Math.abs(daylightHoursFor(LATITUDE, d.date) - d.day);
      expect(diff, `${d.date}: geometric ${daylightHoursFor(LATITUDE, d.date)}, apparent ${d.day}`).toBeLessThan(0.2);
      expect(diff).toBeGreaterThan(0.05); // the refraction offset is systematic, not noise
    }
  });

  it('reproduces the FAO-56 worked value for Ra', () => {
    // FAO-56 Example 8: 3 September at 20°S → Ra ≈ 32.2 MJ m⁻² day⁻¹.
    expect(extraterrestrialRadiation(-20, '2026-09-03')).toBeCloseTo(32.2, 0);
  });

  it('reproduces the FAO-56 worked value for saturation vapour pressure', () => {
    // FAO-56 Example 3: e°(24.5 °C) = 3.075 kPa, e°(15 °C) = 1.705 kPa.
    expect(saturationVapourPressure(24.5)).toBeCloseTo(3.075, 3);
    expect(saturationVapourPressure(15)).toBeCloseTo(1.705, 3);
  });
});

describe('Penman-Monteith fallback vs the provider’s FAO-56 value', () => {
  it('agrees within 0.5 mm/day on every day, using measured radiation', () => {
    const results = FIXTURE.map((d) => {
      const est = penmanMonteithEto({ ...toInputs(d), radiationMj: d.rad });
      expect(est.radiationSource).toBe('measured');
      return { date: d.date, got: est.etoMm, want: d.eto };
    });
    for (const r of results) {
      expect(Math.abs(r.got - r.want), `${r.date}: got ${r.got}, provider ${r.want}`).toBeLessThan(0.5);
    }
    // Measured 0.198 mm/day when written. The residual is a consistent slight
    // OVER-estimate, dominated by the daily-max→mean wind approximation.
    expect(meanAbsoluteError(results)).toBeLessThan(0.3);
  });

  it('degrades gracefully when only temperature and humidity are available', () => {
    const results = FIXTURE.map((d) => {
      const est = penmanMonteithEto(toInputs(d));
      expect(est.radiationSource).toBe('temperature-range');
      return { date: d.date, got: est.etoMm, want: d.eto };
    });
    // Measured 0.389 mm/day when written. Stated honestly rather than padded:
    // this tier infers radiation from the daily temperature range alone.
    expect(meanAbsoluteError(results)).toBeLessThan(0.6);
  });

  it('ignores sunshine hours entirely, because using them made ETo worse', () => {
    // Regression guard for the finding documented in `solarRadiation`. If
    // someone re-adds Ångström-Prescott to the ETo path, the first assertion
    // fails. The second records the measurement that justified leaving it out,
    // so the decision can be revisited with evidence rather than re-litigated.
    const d = FIXTURE[0]!;
    const withSun = penmanMonteithEto({ ...toInputs(d), sunshineHours: d.sun, daylightHours: d.day });
    const withoutSun = penmanMonteithEto(toInputs(d));
    expect(withSun).toEqual(withoutSun);

    const angstromError =
      FIXTURE.reduce((sum, day) => {
        const ra = extraterrestrialRadiation(LATITUDE, day.date);
        const rsAngstrom = (ANGSTROM_A + ANGSTROM_B * Math.min(1, day.sun / day.day)) * ra;
        const est = penmanMonteithEto({ ...toInputs(day), radiationMj: rsAngstrom });
        return sum + Math.abs(est.etoMm - day.eto);
      }, 0) / FIXTURE.length;
    const temperatureError = meanAbsoluteError(
      FIXTURE.map((day) => ({ got: penmanMonteithEto(toInputs(day)).etoMm, want: day.eto })),
    );
    expect(angstromError).toBeGreaterThan(temperatureError);
  });
});

describe('Hargreaves-Samani', () => {
  it('stays in the right range on the same days', () => {
    const results = FIXTURE.map((d) => ({
      date: d.date,
      got: hargreavesEto({
        date: d.date,
        latitude: LATITUDE,
        temperatureMax: d.tmax,
        temperatureMin: d.tmin,
      }).etoMm,
      want: d.eto,
    }));
    for (const r of results) {
      expect(r.got).toBeGreaterThan(1);
      expect(r.got).toBeLessThan(9);
    }
    // Measured 0.513 mm/day when written. Hargreaves cannot see the monsoon
    // humidity that suppresses ETo, so it reads slightly high here — acceptable
    // for the tier that runs when nothing but temperature survived in the cache.
    expect(meanAbsoluteError(results)).toBeLessThan(0.8);
  });

  it('is only reached when Penman-Monteith would have less to work with', () => {
    // With humidity present, PM on a temperature-derived radiation term beat
    // Hargreaves on this fixture (MAE 0.389 vs 0.513), which is why the ladder
    // prefers it. Locking that ordering in.
    const pm = meanAbsoluteError(
      FIXTURE.map((d) => ({ got: penmanMonteithEto(toInputs(d)).etoMm, want: d.eto })),
    );
    const hs = meanAbsoluteError(
      FIXTURE.map((d) => ({
        got: hargreavesEto({ date: d.date, latitude: LATITUDE, temperatureMax: d.tmax, temperatureMin: d.tmin })
          .etoMm,
        want: d.eto,
      })),
    );
    expect(pm).toBeLessThan(hs);
  });

  it('is a pure function of temperature, latitude and date', () => {
    const args = { date: '2026-08-08', latitude: 23.6, temperatureMax: 34, temperatureMin: 24 };
    expect(hargreavesEto(args)).toEqual(hargreavesEto(args));
  });

  it('rises with the temperature range, as the cloudiness proxy implies', () => {
    const narrow = hargreavesEto({ date: '2026-04-15', latitude: 23.6, temperatureMax: 34, temperatureMin: 30 });
    const wide = hargreavesEto({ date: '2026-04-15', latitude: 23.6, temperatureMax: 40, temperatureMin: 20 });
    expect(wide.etoMm).toBeGreaterThan(narrow.etoMm);
  });
});

describe('fabricated placeholder values', () => {
  /**
   * The provider boundary substitutes 0 for a missing field
   * (`relative_humidity_2m_mean ?? 0`, `wind_speed_10m_max ?? 0` in
   * backend/src/weather.ts). Before V1.7 those zeroes only ever reached the
   * CLAMPED weather multiplier, so the damage was bounded. FAO-56 has no such
   * clamp, so a placeholder that leaks in here is amplified rather than absorbed.
   *
   * Both zeroes push ETo the same way — UP — which advises more water than the
   * crop needs. These tests exist so the guard is never quietly removed.
   */
  const day = { date: '2026-06-15', latitude: 23.677, temperatureMax: 34, temperatureMin: 25.4, radiationMj: 20.5 };

  it('treats 0% mean humidity as missing, not as desert air', () => {
    // A daily MEAN relative humidity of 0% does not occur on earth. Taken
    // literally it inflated this day's ETo from 5.50 to 7.03 mm — 28% high.
    const zero = penmanMonteithEto({ ...day, humidityMean: 0 });
    const absent = penmanMonteithEto(day);
    expect(zero).toEqual(absent);
    expect(zero.etoMm).toBeLessThan(6);
  });

  it('treats 0 m/s maximum wind as missing, not as a windless day', () => {
    const zero = penmanMonteithEto({ ...day, humidityMean: 62, windSpeedMax: 0 });
    const absent = penmanMonteithEto({ ...day, humidityMean: 62 });
    expect(zero).toEqual(absent);
  });

  it('rejects out-of-range humidity rather than propagating it', () => {
    for (const bad of [-5, 101, 1000, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(penmanMonteithEto({ ...day, humidityMean: bad })).toEqual(penmanMonteithEto(day));
    }
  });

  it('does not let a fabricated humidity keep the ladder on Penman-Monteith', () => {
    // Without radiation, humidity is the only thing separating tier 2's two
    // branches. A placeholder 0 must not masquerade as the data that justifies
    // staying on the fuller equation.
    const thin = { date: day.date, latitude: day.latitude, temperatureMax: 34, temperatureMin: 25.4 };
    expect(estimateEto({ ...thin, humidityMean: 0 })?.method).toBe('hargreaves');
    expect(estimateEto({ ...thin, humidityMean: 62 })?.method).toBe('penman-monteith');
  });

  it('keeps a genuinely low humidity reading', () => {
    // The guard rejects 0 and out-of-range values only. A real arid-day reading
    // must still raise ETo, or the fix would have broken the equation.
    const arid = penmanMonteithEto({ ...day, humidityMean: 15 });
    const humid = penmanMonteithEto({ ...day, humidityMean: 85 });
    expect(arid.etoMm).toBeGreaterThan(humid.etoMm);
  });
});

describe('estimateEto — the ladder', () => {
  it('prefers Penman-Monteith when radiation is available', () => {
    const d = FIXTURE[7]!;
    expect(estimateEto({ ...toInputs(d), radiationMj: d.rad })?.method).toBe('penman-monteith');
    expect(estimateEto(toInputs(d))?.method).toBe('penman-monteith');
  });

  it('falls to Hargreaves only when both radiation and humidity are missing', () => {
    const d = FIXTURE[7]!;
    const thin = {
      date: d.date,
      latitude: LATITUDE,
      temperatureMax: d.tmax,
      temperatureMin: d.tmin,
    };
    expect(estimateEto(thin)?.method).toBe('hargreaves');
    // Humidity alone is enough to keep the better equation.
    expect(estimateEto({ ...thin, humidityMean: d.rh })?.method).toBe('penman-monteith');
  });

  it('returns null rather than a guess when temperature is unusable', () => {
    const base = { date: '2026-08-08', latitude: LATITUDE };
    expect(estimateEto(base)).toBeNull();
    expect(estimateEto({ ...base, temperatureMax: 34 })).toBeNull();
    // Inverted or flat range means a bad record, not an isothermal day.
    expect(estimateEto({ ...base, temperatureMax: 30, temperatureMin: 30 })).toBeNull();
    expect(estimateEto({ ...base, temperatureMax: 25, temperatureMin: 30 })).toBeNull();
    expect(estimateEto({ ...base, temperatureMax: Number.NaN, temperatureMin: 20 })).toBeNull();
  });

  it('never returns a negative or absurd value across a wide input sweep', () => {
    for (const lat of [8, 23.6, 34]) {
      for (const month of ['01', '04', '07', '10']) {
        for (const [tmax, tmin] of [
          [12, 2],
          [30, 20],
          [48, 28],
        ] as const) {
          const est = estimateEto({
            date: `2026-${month}-15`,
            latitude: lat,
            temperatureMax: tmax,
            temperatureMin: tmin,
            humidityMean: 55,
          });
          expect(est).not.toBeNull();
          expect(est!.etoMm).toBeGreaterThanOrEqual(0);
          // Reference ETo above ~15 mm/day does not occur in Indian conditions;
          // if this ever trips, the equation has a sign or unit error.
          expect(est!.etoMm).toBeLessThan(15);
        }
      }
    }
  });
});
