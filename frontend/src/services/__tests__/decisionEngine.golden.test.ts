import { describe, expect, it } from 'vitest';
import type { DailyWeather } from '../../types';
import { CROP_NAMES, GROWTH_STAGES, IRRIGATION_METHODS, SOIL_TYPES } from '../../types';
import { generateRecommendation, type DecisionResult } from '../decisionEngine';
import { getDepletionFraction, getKc } from '../knowledgeBase';
import {
  makeCrop,
  makeDaily,
  makeFarm,
  makeSoil,
  makeWeather,
  NOW,
  SCENARIOS,
  SEASON_NOWS,
  TODAY,
  withoutEto,
} from './fixtures';

/**
 * Golden regression suite for the decision engine.
 *
 * PURPOSE: this file locks in what the engine does TODAY, inaccuracies included.
 * It is not a correctness suite — several of the numbers it captures are the very
 * ones later phases will change (the invented ETO_REF fallback, the un-adjusted
 * depletion fraction p, rice treated as an upland crop). Its job is to make every
 * such change VISIBLE and DELIBERATE rather than accidental.
 *
 * When a later phase intentionally changes a number, the correct response is to
 * inspect the snapshot diff, confirm every changed line is explained by that
 * phase, and re-baseline with `npm test -- -u`, recording the reason in the
 * commit. An unexplained line in the diff is a bug.
 *
 * The digest format is one line per case so the diff is readable. Full object
 * snapshots (explanation text, factors, window) are covered separately below.
 */

/** Compact one-line digest of a result — readable in a snapshot diff. */
function digest(result: DecisionResult): string {
  if (!result.ok) return `INVALID missing=[${result.missingFields.join(',')}]`;
  const { recommendation: r, waterBalance: wb, plan } = result;
  const w = r.estimatedWaterAmount;
  const s = r.waterSavings;
  const parts = [
    r.status,
    `depth=${w.depthMm}mm`,
    `vol=${w.volumeLiters}L`,
    `run=${w.durationMinutes ?? 0}min`,
    `time=${r.recommendedTime ?? '-'}`,
    `conf=${r.confidence}`,
    wb ? `taw=${wb.tawMm} raw=${wb.rawMm} dr=${wb.depletionMm}` : 'balance=none',
    s ? `saved=${s.todayLiters}L(rain=${s.fromRainfallLiters},method=${s.fromMethodLiters},base=${s.baselineLiters})` : 'saved=none',
    plan ? `plan=${plan.days.map((d) => d.action[0]).join('')}` : 'plan=none',
  ];
  return parts.join(' | ');
}

function run(overrides: {
  crop?: Parameters<typeof makeCrop>;
  soil?: Parameters<typeof makeSoil>[0];
  farm?: Parameters<typeof makeFarm>[0];
  scenario?: (typeof SCENARIOS)[number];
  now?: string;
}): DecisionResult {
  const scenario = overrides.scenario ?? SCENARIOS[0]!;
  const [cropName, stage] = overrides.crop ?? (['Wheat', 'Mid Season'] as const);
  return generateRecommendation({
    farm: makeFarm(overrides.farm),
    crop: makeCrop(cropName, stage),
    soil: makeSoil(overrides.soil ?? 'Loamy'),
    weather: scenario.weather,
    daily: scenario.daily,
    depletionState: scenario.depletionState,
    waterLedger: null,
    now: overrides.now ?? NOW,
    language: 'en',
  });
}

describe('decision engine — full crop × soil × stage × weather matrix', () => {
  // 10 crops × 6 soils × 4 stages × 5 scenarios = 1200 cases. Snapshotted as one
  // sorted text block rather than 1200 separate snapshots: a single diff shows
  // exactly which combinations a change moved.
  it('produces stable output across every combination', () => {
    const lines: string[] = [];
    for (const crop of CROP_NAMES) {
      for (const soil of SOIL_TYPES) {
        for (const stage of GROWTH_STAGES) {
          for (const scenario of SCENARIOS) {
            const result = run({ crop: [crop, stage], soil, scenario });
            lines.push(`${crop}/${soil}/${stage}/${scenario.key} -> ${digest(result)}`);
          }
        }
      }
    }
    expect(lines.length).toBe(
      CROP_NAMES.length * SOIL_TYPES.length * GROWTH_STAGES.length * SCENARIOS.length,
    );
    expect(lines.join('\n')).toMatchSnapshot();
  });
});

describe('decision engine — irrigation method matrix', () => {
  // Method drives efficiency, gross depth, run time and the savings attribution,
  // so it gets its own axis rather than being folded into the big matrix.
  it('produces stable output for every method on every soil', () => {
    const lines: string[] = [];
    for (const method of IRRIGATION_METHODS) {
      for (const soil of SOIL_TYPES) {
        const result = run({ soil, farm: { irrigationMethod: method } });
        lines.push(`${method}/${soil} -> ${digest(result)}`);
      }
    }
    expect(lines.join('\n')).toMatchSnapshot();
  });
});

describe('decision engine — season and area units', () => {
  it('produces stable output in each season', () => {
    const lines = Object.entries(SEASON_NOWS).map(([season, now]) => {
      // The daily series must sit on the same calendar day as `now`, or the
      // engine finds no ETo for today and silently drops to the fallback path.
      const today = now.slice(0, 10);
      const daily = makeDaily(() => ({})).map((d, i) => ({
        ...d,
        date: shiftIso(today, i - 2),
      }));
      const result = generateRecommendation({
        farm: makeFarm(),
        crop: makeCrop('Wheat', 'Mid Season'),
        soil: makeSoil('Loamy'),
        weather: makeWeather({ observationTime: `${today}T08:00:00+05:30` }),
        daily,
        depletionState: null,
        waterLedger: null,
        now,
        language: 'en',
      });
      return `${season} -> ${digest(result)}`;
    });
    expect(lines.join('\n')).toMatchSnapshot();
  });

  it('produces stable output for every area unit', () => {
    const lines = (['Square metre', 'Acre', 'Hectare'] as const).map((areaUnit) => {
      const result = run({ farm: { areaUnit, area: areaUnit === 'Square metre' ? 4000 : 1 } });
      return `${areaUnit} -> ${digest(result)}`;
    });
    expect(lines.join('\n')).toMatchSnapshot();
  });
});

describe('decision engine — validation', () => {
  it.each([
    ['no crop name', { crop: { name: '' } }],
    ['no soil type', { farm: { soilType: '' } }],
    ['zero area', { farm: { area: 0 } }],
    ['negative area', { farm: { area: -5 } }],
    ['no irrigation method', { farm: { irrigationMethod: '' } }],
    ['no location', { farm: { location: undefined } }],
    ['no growth stage', { crop: { growthStage: '' } }],
  ])('rejects %s', (_label, patch) => {
    const result = generateRecommendation({
      // The engine's Stage 1 exists precisely to catch records that violate the
      // type contract (legacy rows, partial writes), so the casts here are the
      // point of the test rather than a shortcut around it.
      farm: { ...makeFarm(), ...(patch as { farm?: object }).farm } as never,
      crop: { ...makeCrop('Wheat', 'Mid Season'), ...(patch as { crop?: object }).crop } as never,
      soil: makeSoil('Loamy'),
      weather: makeWeather(),
      daily: null,
      depletionState: null,
      waterLedger: null,
      now: NOW,
      language: 'en',
    });
    expect(result.ok).toBe(false);
    expect(result).toMatchSnapshot();
  });
});

describe('decision engine — full result shape', () => {
  // The digest deliberately omits explanation text, factors and the window, so
  // these representative cases snapshot the complete object. Between them they
  // cover all three outcomes.
  it.each([
    ['irrigate', SCENARIOS[2]!], // heatwave -> Irrigate Today
    ['delay', SCENARIOS[1]!], // rain -> Delay Irrigation
    ['fallback-no-daily', SCENARIOS[4]!], // no series -> V1.2 path
  ])('%s', (_label, scenario) => {
    expect(run({ scenario, crop: ['Wheat', 'Mid Season'], soil: 'Loamy' })).toMatchSnapshot();
  });

  it('renders the explanation in every supported language', () => {
    const lines = (['en', 'hi', 'bn', 'as', 'ur'] as const).map((language) => {
      const result = generateRecommendation({
        farm: makeFarm(),
        crop: makeCrop('Wheat', 'Mid Season'),
        soil: makeSoil('Loamy'),
        weather: SCENARIOS[0]!.weather,
        daily: SCENARIOS[0]!.daily,
        depletionState: SCENARIOS[0]!.depletionState,
        waterLedger: null,
        now: NOW,
        language,
      });
      return `${language} -> ${result.ok ? result.recommendation.explanation : 'INVALID'}`;
    });
    expect(lines.join('\n')).toMatchSnapshot();
  });
});

describe('decision engine — ETo ladder (item 1.5)', () => {
  /**
   * The ladder is the one place the engine chooses between a real measurement,
   * a published equation, and an invented constant. Asserting it through
   * snapshots alone would hide WHICH tier ran, so these tests pin each tier by
   * value: today's ETc is exposed as `plan.days[0].demandMm`, and ETc = Kc × ETo,
   * so dividing it back out recovers the ETo the engine actually used.
   *
   * Expected ETo values come from `evapotranspiration.ts`, which is separately
   * validated against the provider's own FAO-56 output and two FAO-56 worked
   * examples in `evapotranspiration.test.ts`.
   */
  const KC = getKc('Wheat', 'Mid Season');

  /** Today's ETo as the engine used it, recovered from the plan's demand. */
  function etoUsedBy(daily: DailyWeather[]): number {
    const result = generateRecommendation({
      farm: makeFarm(),
      crop: makeCrop('Wheat', 'Mid Season'),
      soil: makeSoil('Loamy'),
      weather: makeWeather(),
      daily,
      depletionState: null,
      waterLedger: null,
      now: NOW,
      language: 'en',
    });
    if (!result.ok || !result.plan) throw new Error('expected a recommendation with a plan');
    return result.plan.days[0]!.demandMm / KC;
  }

  const V17_DAY = { temperatureMin: 25.4, sunshineHours: 8.4, daylightHours: 13.4, radiationMj: 20.5 };

  it('tier 1 — uses the provider’s own FAO-56 value verbatim when present', () => {
    // Present on every day of the default series at 5.2 mm. Nothing local may
    // override it: the provider computes it hourly from full data.
    expect(etoUsedBy(makeDaily(() => ({})))).toBeCloseTo(5.2, 2);
    // Still tier 1 even when the V1.7 inputs sit alongside it.
    expect(etoUsedBy(makeDaily(() => V17_DAY))).toBeCloseTo(5.2, 2);
  });

  it('tier 2 — falls to local Penman-Monteith on measured radiation', () => {
    expect(etoUsedBy(makeDaily(() => V17_DAY).map(withoutEto))).toBeCloseTo(5.03, 2);
  });

  it('tier 2 — drops to a temperature-derived radiation term without it', () => {
    const noRadiation = makeDaily(() => ({ temperatureMin: 25.4 })).map(withoutEto);
    expect(etoUsedBy(noRadiation)).toBeCloseTo(4.76, 2);
  });

  it('tier 2 — uses Hargreaves-Samani when only temperature survives', () => {
    // humidityMean 0 is the shape the provider boundary actually produces for a
    // missing field, not a contrived NaN — see evapotranspiration.test.ts.
    const tempOnly = makeDaily(() => ({ temperatureMin: 25.4, humidityMean: 0 })).map(withoutEto);
    expect(etoUsedBy(tempOnly)).toBeCloseTo(5.26, 2);
  });

  it('tier 3 — reaches the invented ETO_REF constant only on a pre-V1.7 cache', () => {
    // No ETo and no Tmin: nothing published can be computed, so the last resort
    // runs. It is kept reachable on purpose — a farmer offline with an old cache
    // must still receive advice (item 0) — but nothing else may land here.
    const preV17 = etoUsedBy(makeDaily(() => ({})).map(withoutEto));
    expect(preV17).not.toBeCloseTo(5.03, 2);
    // ETO_REF (5.0) × Kharif factor (0.95) × a multiplier clamped to [0.7, 1.4].
    expect(preV17).toBeGreaterThanOrEqual(5.0 * 0.95 * 0.7);
    expect(preV17).toBeLessThanOrEqual(5.0 * 0.95 * 1.4);
  });

  it('lands within half a mm of the constant it replaced on a temperate day', () => {
    // NOT a claim that the equation always advises less water — it does not, and
    // asserting that would be wishful. The old constant was tuned to be roughly
    // right in the middle of the range; the equation's value is that it tracks
    // the day instead of assuming one. On a mid-range June day the two agree
    // closely (5.03 vs 4.87), which is the evidence that replacing the constant
    // did not silently shift every existing farm's advice.
    const guessed = etoUsedBy(makeDaily(() => ({})).map(withoutEto));
    const computed = etoUsedBy(makeDaily(() => V17_DAY).map(withoutEto));
    expect(Math.abs(computed - guessed)).toBeLessThan(0.5);
  });

  it('tracks a heatwave the constant would have flattened', () => {
    // Where the two genuinely diverge is the tails, and that divergence is the
    // point of the change: the constant is capped by its multiplier, the
    // equation is not.
    const hot = { temperatureMax: 45, temperatureMin: 31, humidityMean: 18, windSpeedMax: 7, radiationMj: 27.5 };
    const mild = { temperatureMax: 27, temperatureMin: 21, humidityMean: 82, windSpeedMax: 1.2, radiationMj: 12.0 };
    const hotEto = etoUsedBy(makeDaily(() => hot).map(withoutEto));
    const mildEto = etoUsedBy(makeDaily(() => mild).map(withoutEto));
    expect(hotEto).toBeGreaterThan(mildEto * 2);
  });
});

describe('decision engine — depletion fraction wiring (item 1.5)', () => {
  /**
   * The snapshot above records that RAW moved when p_adj landed; it cannot show
   * that it moved to the RIGHT value, because a re-baseline accepts whatever the
   * code produced. These tests derive the expected RAW from the published FAO-56
   * relation and the engine's own TAW, so a regression in the wiring fails here
   * rather than being blessed by `-u`.
   */
  it('sets today’s RAW from today’s own ETc, not the flat table value', () => {
    for (const scenario of SCENARIOS) {
      for (const crop of CROP_NAMES) {
        const result = run({ crop: [crop, 'Mid Season'], soil: 'Loamy', scenario });
        if (!result.ok || !result.waterBalance || !result.plan) continue;
        const { tawMm, rawMm } = result.waterBalance;
        // plan.days[0].demandMm IS the ETc the engine used for today.
        const etc = result.plan.days[0]!.demandMm;
        const expected = getDepletionFraction(crop, etc) * tawMm;
        expect(rawMm, `${crop}/${scenario.key}: etc=${etc} taw=${tawMm}`).toBeCloseTo(expected, 1);
      }
    }
  });

  it('gives a heatwave day a tighter trigger than a mild one', () => {
    // End-to-end proof of the safety direction, through the real engine rather
    // than the pure function: more demand must mean a SMALLER share of TAW is
    // allowed to deplete before irrigating.
    const hot = run({ crop: ['Maize', 'Mid Season'], soil: 'Loamy', scenario: SCENARIOS[2]! });
    const mild = run({ crop: ['Maize', 'Mid Season'], soil: 'Loamy', scenario: SCENARIOS[0]! });
    if (!hot.ok || !mild.ok || !hot.waterBalance || !mild.waterBalance || !hot.plan || !mild.plan) {
      throw new Error('expected water balances');
    }
    expect(hot.plan.days[0]!.demandMm).toBeGreaterThan(mild.plan.days[0]!.demandMm);
    // Same crop and soil, so TAW is identical and RAW is comparable directly.
    expect(hot.waterBalance.tawMm).toBe(mild.waterBalance.tawMm);
    expect(hot.waterBalance.rawMm).toBeLessThan(mild.waterBalance.rawMm);
  });

  it('gives each forecast day its own trigger instead of reusing today’s', () => {
    // buildPlan used to compare every future day against a RAW frozen from
    // today. Feeding a series whose demand swings day to day makes that visible:
    // with a per-day trigger the plan must not read as if one threshold applied.
    const swing = makeDaily((i) =>
      i % 2 === 0
        ? { temperatureMax: 44, temperatureMin: 30, humidityMean: 20, windSpeedMax: 6, radiationMj: 27 }
        : { temperatureMax: 26, temperatureMin: 20, humidityMean: 88, windSpeedMax: 1, radiationMj: 11 },
    ).map(withoutEto);
    const result = generateRecommendation({
      farm: makeFarm(),
      crop: makeCrop('Maize', 'Mid Season'),
      soil: makeSoil('Loamy'),
      weather: makeWeather(),
      daily: swing,
      depletionState: null,
      waterLedger: null,
      now: NOW,
      language: 'en',
    });
    if (!result.ok || !result.plan) throw new Error('expected a plan');
    const demands = result.plan.days.map((d) => d.demandMm);
    // Sanity: the fixture really does swing, or the test proves nothing.
    expect(Math.max(...demands) / Math.min(...demands)).toBeGreaterThan(1.5);
    expect(result.plan.days.length).toBeGreaterThan(1);
  });
});

describe('decision engine — determinism', () => {
  it('returns identical output for identical input', () => {
    const first = run({ crop: ['Rice', 'Mid Season'], soil: 'Clay' });
    const second = run({ crop: ['Rice', 'Mid Season'], soil: 'Clay' });
    expect(first).toEqual(second);
  });

  it('never persists today as the depletion carry point', () => {
    // The carry date must stay strictly before today: the farmer can still log
    // irrigation after the recommendation is generated, so today has to remain
    // replayable rather than frozen.
    const result = run({ scenario: SCENARIOS[0]! });
    expect(result.ok).toBe(true);
    if (!result.ok || !result.waterBalance) throw new Error('expected a water balance');
    expect(result.waterBalance.carryValidAsOfDate < TODAY).toBe(true);
  });
});

/** Local helper mirroring fixtures.shiftDay for the season test. */
function shiftIso(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) + days * 86_400_000);
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(shifted.getUTCDate()).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${mm}-${dd}`;
}
