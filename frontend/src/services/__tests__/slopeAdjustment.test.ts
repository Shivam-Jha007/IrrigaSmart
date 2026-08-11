import { describe, expect, it } from 'vitest';
import type { FarmTerrain, IrrigationMethod } from '../../types';
import { intakeFactor, runoffFactor, warnsSurfaceMethod } from '../slopeAdjustment';
import { runMinutes, flowLitersPerMinute } from '../irrigationTiming';
import { generateRecommendation } from '../decisionEngine';
import { SLOPE } from '../decisionParameters';
import { makeCrop, makeDaily, makeFarm, makeSoil, makeWeather, NOW } from './fixtures';

/**
 * Slope adjustments (V1.7 item 10).
 *
 * Assertions, not snapshots. The two properties that matter here are safety
 * properties — absent terrain changes nothing, and an over-read slope cannot
 * drive the numbers far — and a snapshot would record a violation of either as
 * the new truth. Every expected number is derived from the constants in
 * `decisionParameters.SLOPE` by hand.
 *
 * The most important test in this file is the first one: it is the item 0
 * guarantee that every farm created before terrain existed keeps its numbers.
 */

function terrain(slopePercent: number, overrides: Partial<FarmTerrain> = {}): FarmTerrain {
  return {
    slopePercent,
    aspect: 'S',
    aspectDegrees: 180,
    elevationM: 61,
    sampleSpacingM: 150,
    confidence: 'approximate',
    provider: 'test',
    fetchedAt: NOW,
    latitude: 23.677,
    longitude: 87.685,
    ...overrides,
  };
}

describe('the absent-terrain identity (item 0)', () => {
  it('is exactly 1 for undefined, so a pre-V1.7 farm is untouched', () => {
    // Exact equality, not toBeCloseTo. A factor of 0.99999 would pass a
    // tolerance check and still move every stored depletion figure.
    expect(runoffFactor(undefined)).toBe(1);
    expect(intakeFactor(undefined)).toBe(1);
  });

  it('is exactly 1 for a slope inside the deadband', () => {
    for (const slope of [0, 0.5, 1, 2, 2.9, SLOPE.DEADBAND_PERCENT]) {
      expect(runoffFactor(terrain(slope))).toBe(1);
      expect(intakeFactor(terrain(slope))).toBe(1);
    }
  });

  it('is exactly 1 for a nonsense slope rather than NaN', () => {
    // A NaN here would multiply through the whole water balance and make every
    // `dr < raw` comparison false — the engine would silently never irrigate.
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -5]) {
      expect(runoffFactor(terrain(bad))).toBe(1);
      expect(intakeFactor(terrain(bad))).toBe(1);
    }
  });

  it('leaves runMinutes and flow byte-identical when the factor is omitted', () => {
    // The optional parameter's default must reproduce the old two-argument call
    // for every method, since these are what a farmer reads off the card.
    const methods: IrrigationMethod[] = ['Drip', 'Sprinkler', 'Furrow', 'Flood'];
    for (const method of methods) {
      for (const depth of [1, 5, 20, 60]) {
        expect(runMinutes(depth, method, 1)).toBe(runMinutes(depth, method));
      }
      expect(flowLitersPerMinute(method, 4046.86, 1)).toBe(flowLitersPerMinute(method, 4046.86));
    }
  });
});

describe('runoffFactor', () => {
  it('takes 5% of effective rain per 1% of slope above the deadband', () => {
    // 3% deadband, so 5% slope is 2% of excess -> 1 - 2 x 0.05 = 0.9.
    expect(runoffFactor(terrain(5))).toBeCloseTo(0.9, 10);
    expect(runoffFactor(terrain(8))).toBeCloseTo(0.75, 10);
    expect(runoffFactor(terrain(13))).toBeCloseTo(0.5, 10);
  });

  it('never falls below the floor, however steep the reading', () => {
    // The provider under-reports steep ground, so the steepest readings are the
    // least trustworthy. The floor is what stops them dominating the result.
    expect(runoffFactor(terrain(15))).toBe(SLOPE.RUNOFF_FLOOR);
    expect(runoffFactor(terrain(40))).toBe(SLOPE.RUNOFF_FLOOR);
    expect(runoffFactor(terrain(300))).toBe(SLOPE.RUNOFF_FLOOR);
  });

  it('is monotone in slope and never leaves (0, 1]', () => {
    let previous = 1;
    for (let slope = 0; slope <= 60; slope += 0.5) {
      const f = runoffFactor(terrain(slope));
      expect(f).toBeGreaterThan(0);
      expect(f).toBeLessThanOrEqual(1);
      expect(f).toBeLessThanOrEqual(previous);
      previous = f;
    }
  });
});

describe('intakeFactor', () => {
  it('slows the application rate by 4% per 1% of slope above the deadband', () => {
    expect(intakeFactor(terrain(5))).toBeCloseTo(0.92, 10);
    expect(intakeFactor(terrain(10))).toBeCloseTo(0.72, 10);
  });

  it('never falls below the floor, so a run cannot more than double', () => {
    expect(intakeFactor(terrain(20))).toBe(SLOPE.INTAKE_FLOOR);
    expect(intakeFactor(terrain(90))).toBe(SLOPE.INTAKE_FLOOR);
  });

  it('lengthens the run without changing the depth', () => {
    // The point of the cap: same water, gentler. A farmer on a slope is told to
    // run longer, never to apply more.
    const flat = runMinutes(12, 'Sprinkler', 1);
    const sloped = runMinutes(12, 'Sprinkler', intakeFactor(terrain(10)));
    expect(sloped).toBeGreaterThan(flat);
    // 12 mm / (8 mm/h x 0.72) = 2.083 h = 125 min, against 90 flat.
    expect(flat).toBe(90);
    expect(sloped).toBe(125);
  });

  it('keeps flow x duration consistent with the advised volume', () => {
    // Flow and duration are shown side by side; if they were computed at
    // different rates their product would not match the litres above them.
    const intake = intakeFactor(terrain(10));
    const areaM2 = 4046.86;
    const depthMm = 12;
    const minutes = runMinutes(depthMm, 'Sprinkler', intake);
    const flow = flowLitersPerMinute('Sprinkler', areaM2, intake);
    // 1 mm over 1 m2 is 1 L, so the volume implied by flow x minutes must land
    // within rounding of the depth x area the card states.
    expect(minutes * flow).toBeCloseTo(depthMm * areaM2, -3);
  });

  it('ignores an out-of-range factor rather than producing an absurd run', () => {
    // A zero or negative rate would give Infinity or a negative run time.
    expect(runMinutes(12, 'Sprinkler', 0)).toBe(90);
    expect(runMinutes(12, 'Sprinkler', -1)).toBe(90);
    expect(runMinutes(12, 'Sprinkler', 2)).toBe(90);
    expect(runMinutes(12, 'Sprinkler', Number.NaN)).toBe(90);
  });
});

describe('warnsSurfaceMethod', () => {
  it('warns for flood and furrow past the warning threshold only', () => {
    expect(warnsSurfaceMethod(terrain(4), 'Flood')).toBe(true);
    expect(warnsSurfaceMethod(terrain(4), 'Furrow')).toBe(true);
    expect(warnsSurfaceMethod(terrain(2), 'Flood')).toBe(false);
    expect(warnsSurfaceMethod(terrain(2.1), 'Flood')).toBe(true);
  });

  it('never warns for drip or sprinkler, which do not sheet water downhill', () => {
    expect(warnsSurfaceMethod(terrain(30), 'Drip')).toBe(false);
    expect(warnsSurfaceMethod(terrain(30), 'Sprinkler')).toBe(false);
  });

  it('warns below the runoff deadband, because advice is cheap and wrong maths is not', () => {
    // 2.5% is inside the deadband the water balance declines to act on, yet a
    // flood farmer there still benefits from hearing about contour furrows.
    expect(runoffFactor(terrain(2.5))).toBe(1);
    expect(warnsSurfaceMethod(terrain(2.5), 'Flood')).toBe(true);
  });

  it('does not warn without a terrain record or on a bad reading', () => {
    expect(warnsSurfaceMethod(undefined, 'Flood')).toBe(false);
    expect(warnsSurfaceMethod(terrain(Number.NaN), 'Flood')).toBe(false);
  });
});

describe('end-to-end through the decision engine', () => {
  const base = {
    crop: makeCrop('Wheat', 'Mid Season'),
    soil: makeSoil('Loamy'),
    weather: makeWeather({ rainfallForecast: 10 }),
    daily: makeDaily(() => ({ precipitationSum: 10 })),
    depletionState: null,
    waterLedger: null,
    language: 'en' as const,
    now: NOW,
  };

  it('produces identical output for a farm with no terrain record', () => {
    // The golden snapshots are the wider version of this guarantee; this states
    // it directly so a failure names the cause instead of showing a diff.
    const without = generateRecommendation({ ...base, farm: makeFarm() });
    const withFlat = generateRecommendation({ ...base, farm: makeFarm({ terrain: terrain(1) }) });
    expect(withFlat).toEqual(without);
  });

  it('credits less rain on a slope, so the deficit is larger', () => {
    const flat = generateRecommendation({ ...base, farm: makeFarm() });
    const sloped = generateRecommendation({ ...base, farm: makeFarm({ terrain: terrain(10) }) });
    if (!('recommendation' in flat) || !('recommendation' in sloped)) {
      throw new Error('both fixtures must produce a recommendation');
    }
    const flatDr = flat.waterBalance?.depletionMm ?? 0;
    const slopedDr = sloped.waterBalance?.depletionMm ?? 0;
    expect(slopedDr).toBeGreaterThan(flatDr);
  });

  it('keeps the plan and the same-day decision on one rainfall figure', () => {
    // The reason `effectiveRain` exists as a single function: four call sites
    // previously computed this independently, and a farm whose plan credited
    // more rain than its own decision did would be visibly self-contradictory.
    const sloped = generateRecommendation({ ...base, farm: makeFarm({ terrain: terrain(10) }) });
    if (!('recommendation' in sloped)) throw new Error('expected a recommendation');
    const today = sloped.plan?.days.find((d) => d.offsetDays === 0);
    // 10 mm x 0.75 (Loamy) x 0.65 (7% excess x 0.05) = 4.875, which the engine's
    // round() reports as 4.87: 4.875 has no exact binary representation, so
    // Math.round(4.875 * 100) rounds the stored value (4.87499...) down.
    expect(today?.rainfallMm).toBeCloseTo(4.87, 2);
  });
});
