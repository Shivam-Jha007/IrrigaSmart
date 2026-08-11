import { describe, expect, it } from 'vitest';
import { IRRIGATION_METHODS, SOIL_TYPES, CROP_NAMES } from '../../types';
import { computeWaterSavings, creditedSaving } from '../waterSavings';
import { chooseIrrigationWindow, farmAreaM2, flowLitersPerMinute, runMinutes } from '../irrigationTiming';
import { assessDiseaseRisk } from '../diseaseRisk';
import { buildCustomReminder, dueNotifications, planNotifications } from '../notificationService';
import { historyToPrune, orphanedRecommendationIds, remindersToPrune } from '../storageMaintenance';
import {
  getDepletionFraction,
  getKc,
  getZr,
  ROOT_ZONE_PROPERTIES,
  SOIL_HYDRAULIC_PROPERTIES,
} from '../knowledgeBase';
import { getSeasonalGuidance } from '../regionalKnowledge';
import { makeDaily, makeFarm, makeWeather, NOW, TODAY, shiftDay } from './fixtures';
import type { AppNotification, HistoryRecord, Recommendation } from '../../types';

/**
 * Golden regression suite for the services that surround the decision engine.
 *
 * Same contract as decisionEngine.golden.test.ts: this captures CURRENT
 * behaviour so later phases cannot change it silently. Notably, the savings
 * snapshot here records the inflated baseline that Phase 4 replaces — that
 * number is expected to drop, and the diff is how the drop gets reviewed.
 */

describe('waterSavings — current baseline (Phase 4 will change these numbers)', () => {
  it('across every method, with and without rain', () => {
    const lines: string[] = [];
    for (const method of IRRIGATION_METHODS) {
      for (const rain of [0, 2, 6]) {
        const s = computeWaterSavings({
          demandMm: 5.98,
          effectiveRainMm: rain,
          method,
          areaM2: 4046.86,
        });
        lines.push(
          `${method}/rain=${rain}mm -> today=${s.todayLiters}L rain=${s.fromRainfallLiters}L method=${s.fromMethodLiters}L baseline=${s.baselineLiters}L`,
        );
      }
    }
    expect(lines.join('\n')).toMatchSnapshot();
  });

  it('credits savings in proportion to what the farmer actually logged', () => {
    const lines = [
      ['nothing advised', creditedSaving(0, 0, 0)],
      ['no irrigation needed, full credit', creditedSaving(1000, 0, 0)],
      ['half the advised run logged', creditedSaving(1000, 2000, 1000)],
      ['full run logged', creditedSaving(1000, 2000, 2000)],
      ['over-applied, capped at full', creditedSaving(1000, 2000, 5000)],
      ['negative applied, floored at zero', creditedSaving(1000, 2000, -500)],
    ] as const;
    expect(lines.map(([l, v]) => `${l} -> ${v}L`).join('\n')).toMatchSnapshot();
  });

  it('documents the daily-baseline assumption that inflates the total', () => {
    // Flood is the baseline method, so a farmer who already floods is told they
    // save nothing, forever — while a drip farmer is credited the same
    // efficiency delta every single day, including days with no irrigation.
    // Both are artefacts of the per-day-of-demand framing, not of behaviour.
    const flood = computeWaterSavings({ demandMm: 5.98, effectiveRainMm: 0, method: 'Flood', areaM2: 4046.86 });
    const drip = computeWaterSavings({ demandMm: 5.98, effectiveRainMm: 0, method: 'Drip', areaM2: 4046.86 });
    expect(flood.todayLiters).toBe(0);
    expect(drip.todayLiters).toBeGreaterThan(20_000);
  });
});

describe('irrigationTiming', () => {
  it('run time and flow for every method', () => {
    const lines = IRRIGATION_METHODS.flatMap((method) =>
      [1, 5, 20, 60].map(
        (depth) =>
          `${method}/${depth}mm -> ${runMinutes(depth, method)}min, flow=${flowLitersPerMinute(method, 4046.86)}L/min`,
      ),
    );
    expect(lines.join('\n')).toMatchSnapshot();
  });

  it('chooses a window across seasons, weather and time of day', () => {
    const lines: string[] = [];
    for (const season of ['Kharif', 'Rabi', 'Zaid'] as const) {
      for (const [label, weather] of [
        ['mild', makeWeather()],
        ['hot', makeWeather({ temperature: 44 })],
        ['windy', makeWeather({ windSpeed: 9 })],
        ['none', null],
      ] as const) {
        for (const [timeLabel, now] of [
          ['dawn', '2026-06-15T04:00:00+05:30'],
          ['morning', '2026-06-15T08:30:00+05:30'],
          ['afternoon', '2026-06-15T15:00:00+05:30'],
          ['night', '2026-06-15T22:00:00+05:30'],
        ] as const) {
          for (const method of ['Drip', 'Sprinkler'] as const) {
            const w = chooseIrrigationWindow({ season, weather, method, durationMinutes: 90, now });
            lines.push(
              `${season}/${label}/${timeLabel}/${method} -> ${w.start}-${w.end} nextDay=${w.nextDay} (${w.reason})`,
            );
          }
        }
      }
    }
    expect(lines.join('\n')).toMatchSnapshot();
  });

  it('converts every area unit', () => {
    const lines = (['Square metre', 'Acre', 'Hectare'] as const).map(
      (areaUnit) => `${areaUnit} x1 -> ${farmAreaM2(makeFarm({ areaUnit, area: 1 }))}m2`,
    );
    expect(lines.join('\n')).toMatchSnapshot();
  });
});

describe('diseaseRisk', () => {
  // Matches makeFarm's fixture location. The daily fixtures carry no
  // sunshineHours, so the V1.7 sunshine weighting is inert across this matrix
  // and the latitude only satisfies the signature — the snapshot is unchanged.
  const LATITUDE = 23.677;

  it('assesses every crop under favourable, unfavourable and mixed weather', () => {
    const favourable = makeDaily(() => ({ temperatureMax: 26, humidityMean: 92, precipitationSum: 4 }));
    const unfavourable = makeDaily(() => ({ temperatureMax: 44, humidityMean: 15, precipitationSum: 0 }));
    // Favourable only in the forecast: exercises the observed-run-must-end-today rule.
    const mixed = makeDaily((offset) =>
      offset > 0
        ? { temperatureMax: 26, humidityMean: 92, precipitationSum: 4 }
        : { temperatureMax: 44, humidityMean: 15, precipitationSum: 0 },
    );
    const lines: string[] = [];
    for (const crop of CROP_NAMES) {
      for (const [label, daily] of [
        ['favourable', favourable],
        ['unfavourable', unfavourable],
        ['forecast-only', mixed],
      ] as const) {
        const a = assessDiseaseRisk(crop, daily, TODAY, LATITUDE);
        lines.push(
          a
            ? `${crop}/${label} -> ${a.level} ${a.disease} score=${a.score} obs=${a.observedRun} fc=${a.forecastRun} conf=${a.confidence}`
            : `${crop}/${label} -> null`,
        );
      }
    }
    expect(lines.join('\n')).toMatchSnapshot();
  });

  it('returns null rather than "None" when it cannot assess', () => {
    // "cannot assess" and "conditions are unfavourable" are different statements
    // and the farmer must be able to tell them apart (docs/11 §12e).
    expect(assessDiseaseRisk('Rice', null, TODAY, LATITUDE)).toBeNull();
    expect(assessDiseaseRisk('Rice', [], TODAY, LATITUDE)).toBeNull();
  });

  it('never lets an observed run survive a stale series', () => {
    // Series ends yesterday: the spell may already have broken, so the observed
    // run must be zero and only the forecast may contribute.
    const stale = makeDaily(() => ({ temperatureMax: 26, humidityMean: 92 }), -4, -1);
    const a = assessDiseaseRisk('Rice', stale, TODAY, LATITUDE);
    expect(a?.observedRun).toBe(0);
  });
});

describe('notificationService', () => {
  const rec = (status: Recommendation['status'], time: string | null): Recommendation => ({
    id: 'rec-1',
    farmId: 'farm-1',
    status,
    recommendedTime: time,
    estimatedWaterAmount: { depthMm: 12, volumeLiters: 48_000, durationMinutes: 240, flowLitersPerMinute: 200 },
    explanation: 'test',
    confidence: 'High',
    generatedTime: NOW,
  });

  it('plans reminders and rainfall warnings', () => {
    let n = 0;
    const newId = (p: string) => `${p}-${(n += 1)}`;
    const plan = {
      days: [
        { date: TODAY, offsetDays: 0, rainfallMm: 0, demandMm: 6, action: 'Irrigate Today' as const, confidence: 'High' as const },
        { date: shiftDay(TODAY, 1), offsetDays: 1, rainfallMm: 18, demandMm: 6, action: 'Delay Irrigation' as const, confidence: 'Medium' as const },
        { date: shiftDay(TODAY, 2), offsetDays: 2, rainfallMm: 4, demandMm: 6, action: 'Monitor Tomorrow' as const, confidence: 'Medium' as const },
        { date: shiftDay(TODAY, 3), offsetDays: 3, rainfallMm: 40, demandMm: 6, action: 'Delay Irrigation' as const, confidence: 'Low' as const },
      ],
      recommendedIrrigationDate: TODAY,
      nextRainCoveredDate: shiftDay(TODAY, 1),
    };
    // Day 3 is beyond RAIN_WARNING_WINDOW_DAYS and must NOT produce a warning
    // despite having the most rain — a forecast that far out is not actionable.
    expect(
      planNotifications({ farm: makeFarm(), recommendation: rec('Irrigate Today', '06:00'), plan, now: NOW, newId }),
    ).toMatchSnapshot();
  });

  it('plans nothing when irrigation is not advised and no rain is coming', () => {
    const newId = (p: string) => `${p}-1`;
    expect(
      planNotifications({ farm: makeFarm(), recommendation: rec('Monitor Tomorrow', null), plan: null, now: NOW, newId }),
    ).toEqual([]);
  });

  it('rolls a past custom reminder time to tomorrow instead of rejecting it', () => {
    const past = buildCustomReminder(makeFarm(), '05:30', { volumeLiters: 100, durationMinutes: 30 }, NOW, 'n1');
    const future = buildCustomReminder(makeFarm(), '18:30', { volumeLiters: 100, durationMinutes: 30 }, NOW, 'n2');
    expect(past.nextDay).toBe(true);
    expect(future.nextDay).toBe(false);
    expect({ past, future }).toMatchSnapshot();
  });

  it('returns due, undelivered notifications oldest first', () => {
    const mk = (id: string, dueAt: string, deliveredAt: string | null): AppNotification => ({
      id,
      farmId: 'farm-1',
      kind: 'irrigation-reminder',
      source: 'auto',
      dueAt,
      createdAt: NOW,
      deliveredAt,
      context: { farmName: 'Test Field' },
    });
    const due = dueNotifications(
      [
        mk('later', '2026-06-15T09:00:00+05:30', null),
        mk('overdue', '2026-06-15T06:00:00+05:30', null),
        mk('older', '2026-06-14T06:00:00+05:30', null),
        mk('already-delivered', '2026-06-15T06:00:00+05:30', '2026-06-15T06:01:00+05:30'),
      ],
      NOW,
    );
    expect(due.map((d) => d.id)).toEqual(['older', 'overdue']);
  });
});

describe('storageMaintenance', () => {
  const hist = (id: string, farmId: string, generatedDate: string): HistoryRecord => ({
    id,
    farmId,
    recommendationId: `rec-${id}`,
    generatedDate,
  });

  it('keeps only the newest record per farm per day, and drops what is too old', () => {
    const records = [
      hist('a', 'farm-1', '2026-06-15T06:00:00+05:30'),
      hist('b', 'farm-1', '2026-06-15T18:00:00+05:30'),
      hist('c', 'farm-1', '2026-06-14T06:00:00+05:30'),
      hist('d', 'farm-2', '2026-06-15T07:00:00+05:30'),
      hist('e', 'farm-1', '2025-01-01T06:00:00+05:30'),
    ];
    const pruned = historyToPrune(records, NOW).map((r) => r.id).sort();
    // 'a' loses to the later 'b' the same day; 'e' is past retention. Farm 2's
    // record survives because the day bucket is keyed by farm as well as date.
    expect(pruned).toEqual(['a', 'e']);
  });

  it('never prunes an undelivered reminder however old', () => {
    const mk = (id: string, deliveredAt: string | null): AppNotification => ({
      id,
      farmId: 'farm-1',
      kind: 'irrigation-reminder',
      source: 'auto',
      dueAt: '2024-01-01T06:00:00+05:30',
      createdAt: '2024-01-01T00:00:00+05:30',
      deliveredAt,
      context: { farmName: 'Test Field' },
    });
    const pruned = remindersToPrune([mk('old-delivered', '2024-01-01T06:00:00+05:30'), mk('never-fired', null)], NOW);
    expect(pruned.map((n) => n.id)).toEqual(['old-delivered']);
  });

  it('finds recommendations no surviving history references', () => {
    expect(orphanedRecommendationIds(['rec-a', 'rec-b', 'rec-c'], [hist('b', 'farm-1', NOW)])).toEqual([
      'rec-a',
      'rec-c',
    ]);
  });
});

describe('knowledgeBase — the tables Phase 1 and Phase 2 revise', () => {
  it('Kc for every crop and stage', () => {
    const lines = CROP_NAMES.flatMap((crop) =>
      (['Initial', 'Development', 'Mid Season', 'Late Season'] as const).map(
        (stage) => `${crop}/${stage} -> ${getKc(crop, stage)}`,
      ),
    );
    expect(lines.join('\n')).toMatchSnapshot();
  });

  it('soil hydraulic properties', () => {
    const lines = SOIL_TYPES.map((s) => {
      const p = SOIL_HYDRAULIC_PROPERTIES[s];
      return `${s} -> thetaFC=${p.thetaFC} thetaPWP=${p.thetaPWP} awc=${p.awc}`;
    });
    expect(lines.join('\n')).toMatchSnapshot();
  });

  it('root depth and depletion fraction for every crop and stage', () => {
    // Zr had no direct coverage before V1.7, so the Sugarcane correction showed
    // up only as moved TAW deep inside the 1200-line engine matrix. Zr and p are
    // FAO-56 Table 22 facts and deserve their own visible record.
    const lines = CROP_NAMES.flatMap((crop) => [
      ...(['Initial', 'Development', 'Mid Season', 'Late Season'] as const).map(
        (stage) => `${crop}/${stage} -> zr=${getZr(crop, stage)}m`,
      ),
      `${crop}/p@5mm -> ${ROOT_ZONE_PROPERTIES[crop].p}`,
    ]);
    expect(lines.join('\n')).toMatchSnapshot();
  });
});

/**
 * These are not snapshots. A snapshot would only prove p_adj stayed whatever it
 * was the day it was recorded; these assert the FAO-56 Chapter 8 relation itself
 * (`p = p_Table22 + 0.04 × (5 − ETc)`, clipped to [0.1, 0.8]), so a wrong sign or
 * a dropped clip fails loudly instead of being re-baselined into the record.
 */
describe('getDepletionFraction — FAO-56 Chapter 8 p adjustment', () => {
  it('returns the Table 22 value unchanged at the reference 5 mm/day', () => {
    for (const crop of CROP_NAMES) {
      expect(getDepletionFraction(crop, 5)).toBeCloseTo(ROOT_ZONE_PROPERTIES[crop].p, 10);
    }
  });

  it('tightens the trigger as demand rises and relaxes it as demand falls', () => {
    // The safety-critical direction: a hotter day must irrigate SOONER (smaller
    // p), because roots cannot keep pace with transpiration. Getting this
    // backwards would starve the crop in exactly the weather that stresses it.
    for (const crop of CROP_NAMES) {
      const hot = getDepletionFraction(crop, 8);
      const ref = getDepletionFraction(crop, 5);
      const cool = getDepletionFraction(crop, 2);
      expect(hot).toBeLessThan(ref);
      expect(cool).toBeGreaterThan(ref);
    }
  });

  it('matches the published formula exactly across the demand range', () => {
    for (const crop of CROP_NAMES) {
      for (const etc of [0, 1, 2.5, 4, 5, 6, 7.5, 10, 14]) {
        const expected = Math.min(
          0.8,
          Math.max(0.1, ROOT_ZONE_PROPERTIES[crop].p + 0.04 * (5 - etc)),
        );
        expect(getDepletionFraction(crop, etc)).toBeCloseTo(expected, 10);
      }
    }
  });

  it('never leaves the [0.1, 0.8] clip, even at absurd demand', () => {
    for (const crop of CROP_NAMES) {
      for (const etc of [0, 0.001, 50, 1000]) {
        const p = getDepletionFraction(crop, etc);
        expect(p).toBeGreaterThanOrEqual(0.1);
        expect(p).toBeLessThanOrEqual(0.8);
      }
    }
  });

  it('falls back to the table value rather than inventing one on bad input', () => {
    // NaN reaches here when ETo is unavailable upstream. Propagating it would
    // make RAW NaN, and every `dr < raw` comparison false — the engine would
    // silently never irrigate.
    for (const etc of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      expect(getDepletionFraction('Wheat', etc)).toBe(ROOT_ZONE_PROPERTIES.Wheat.p);
    }
  });
});

describe('regionalKnowledge', () => {
  it('seasonal guidance for every crop in every season', () => {
    const lines = CROP_NAMES.flatMap((crop) =>
      (
        [
          ['Kharif', '2026-06-15T08:30:00+05:30'],
          ['Rabi', '2026-01-15T08:30:00+05:30'],
          ['Zaid', '2026-04-15T08:30:00+05:30'],
        ] as const
      ).map(([label, now]) => {
        const g = getSeasonalGuidance(crop, now);
        return `${crop}/${label} -> season=${g.season} main=${g.cropMainSeason} inMain=${g.inMainSeason}`;
      }),
    );
    expect(lines.join('\n')).toMatchSnapshot();
  });
});
