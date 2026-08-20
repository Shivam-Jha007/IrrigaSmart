import { describe, expect, it } from 'vitest';
import type { MeasuredSoilProfile, SoilLayer, WeatherData } from '../../types';
import type { FarmProfile, RecommendationView, WaterProgress } from '../../app/appTypes';
import { buildFarmContext, isKnown, type FarmContext } from '../farmContext';
import { buildAssistantContext } from '../assistantContext';
import { PROVENANCE_LABELS, type Provenance, type Sourced } from '../provenance';
import { makeCrop, makeFarm, makeSoil, makeWeather } from './fixtures';

/**
 * The canonical §6 farm picture, and the provenance contract on it.
 *
 * ASSERTIONS, NOT SNAPSHOTS. The point of this module is that every uncertain
 * value carries an honest source label, and a snapshot would happily record
 * "pH: MEASURED" as the new truth — which is the exact bug PRD §7 exists to
 * prevent. Every expectation here is stated outright.
 *
 * The last block is a byte-stability proof for the `buildAssistantContext`
 * refactor: that function used to read `FarmProfile`/`RecommendationView`
 * directly and now projects from `FarmContext`. Nothing a farmer sees may change
 * as a result, so the expected objects below are written out in full rather than
 * derived from the code under test.
 */

function layer(topCm: number, bottomCm: number, phH2O: number | null, organicCarbonPct = 1.8): SoilLayer {
  return {
    topCm,
    bottomCm,
    clayPct: 28.3,
    sandPct: 28.4,
    siltPct: 43.3,
    thetaFC: 0.336,
    thetaPWP: 0.186,
    thetaFCSource: 'soilgrids',
    thetaPWPSource: 'saxton-rawls',
    bulkDensity: 1.31,
    organicCarbonPct,
    phH2O,
  };
}

const FETCHED_AT = '2026-08-09T12:00:00+05:30';

function soilProfileFixture(
  layers: SoilLayer[] = [layer(0, 5, 6.2), layer(5, 15, 6.4), layer(15, 30, 6.6)],
  usdaTextureClass: string | null = 'clay loam',
): MeasuredSoilProfile {
  return {
    layers,
    usdaTextureClass,
    provider: 'isric-soilgrids-v2',
    fetchedAt: FETCHED_AT,
    latitude: 23.677,
    longitude: 87.685,
  };
}

/** A Loamy farm growing Rice — Rice's optimum is 5.5-6.5. */
function makeProfile(soil = makeSoil('Loamy')): FarmProfile {
  return { farm: makeFarm(), crop: makeCrop('Rice', 'Mid Season'), soil };
}

const GENERATED_AT = '2026-06-15T08:30:00+05:30';

function makeView(overrides: Partial<RecommendationView> = {}): RecommendationView {
  return {
    recommendation: {
      id: 'rec-1',
      farmId: 'farm-1',
      status: 'Irrigate Today',
      recommendedTime: '06:00',
      irrigationWindow: { start: '06:00', end: '07:12', nextDay: false, reason: 'morning-default' },
      estimatedWaterAmount: { depthMm: 8.4, volumeLiters: 33_993, durationMinutes: 72 },
      explanation: 'The root zone is dry and no rain is expected.',
      confidence: 'High',
      generatedTime: GENERATED_AT,
    },
    fromCache: false,
    weatherMissing: false,
    plan: {
      days: [
        {
          date: '2026-06-15',
          offsetDays: 0,
          rainfallMm: 0,
          demandMm: 6.2,
          action: 'Irrigate Today',
          confidence: 'High',
        },
        {
          date: '2026-06-16',
          offsetDays: 1,
          rainfallMm: 0,
          demandMm: 6.1,
          action: 'Monitor Tomorrow',
          confidence: 'High',
        },
      ],
      recommendedIrrigationDate: '2026-06-15',
      nextRainCoveredDate: null,
    },
    diseaseRisk: {
      crop: 'Rice',
      disease: 'riceBlast',
      level: 'Moderate',
      score: 2.5,
      observedRun: 2,
      forecastRun: 1,
      overcastDays: 1,
      trigger: null,
      confidence: 'High',
    },
    waterBalance: {
      tawMm: 90.12,
      rawMm: 45.06,
      depletionMm: 48.37,
      rootDepthM: 0.6,
      carryDepletionMm: 12.4,
      carryValidAsOfDate: '2026-06-14',
      thetaSource: 'measured',
      thetaCoverage: 1,
    },
    ...overrides,
  };
}

const PROGRESS: WaterProgress = {
  date: '2026-06-15',
  targetLiters: 33_993,
  targetMinutes: 72,
  appliedLiters: 12_000,
  appliedMinutes: 25,
  savedTodayLiters: 8_421.6,
  savedLifetimeLiters: 104_882.3,
  daysTracked: 14,
};

/** Every `Sourced` field in the object, flattened, with a path for failure messages. */
function everyField(fc: FarmContext): Array<[string, Sourced<unknown>]> {
  const out: Array<[string, Sourced<unknown>]> = [];
  for (const [section, body] of Object.entries(fc)) {
    for (const [key, field] of Object.entries(body as Record<string, unknown>)) {
      // `fromCache` / `weatherMissing` are plain booleans about the fetch, not
      // facts about the farm, so they carry no provenance by design.
      if (field !== null && typeof field === 'object' && 'provenance' in field) {
        out.push([`${section}.${key}`, field as Sourced<unknown>]);
      }
    }
  }
  return out;
}

const EMPTY = {
  profile: undefined,
  view: null,
  weather: null,
  today: null,
  waterProgress: null,
} as const;

describe('buildFarmContext — structure and the closed provenance vocabulary', () => {
  it('returns all ten PRD §6 sections even with no inputs at all', () => {
    const fc = buildFarmContext(EMPTY);
    expect(Object.keys(fc)).toEqual([
      'farm',
      'crop',
      'soil',
      'weather',
      'irrigation',
      'water',
      'disease',
      'fertility',
      'history',
      'impact',
    ]);
  });

  it('labels every field with one of the seven allowed labels', () => {
    const full = buildFarmContext({
      profile: makeProfile(makeSoil('Loamy')),
      view: makeView(),
      weather: makeWeather(),
      today: null,
      waterProgress: PROGRESS,
    });
    for (const fc of [buildFarmContext(EMPTY), full]) {
      for (const [path, field] of everyField(fc)) {
        expect(PROVENANCE_LABELS, `${path} used a label outside the §7 vocabulary`).toContain(
          field.provenance satisfies Provenance,
        );
      }
    }
  });

  it('records a reason on every UNKNOWN field, so a gap is never a bare null', () => {
    for (const [path, field] of everyField(buildFarmContext(EMPTY))) {
      if (field.provenance !== 'UNKNOWN') continue;
      expect(field.value, `${path} is UNKNOWN but carries a value`).toBeNull();
      expect(typeof field.origin, `${path} is UNKNOWN with no reason recorded`).toBe('string');
      expect((field.origin ?? '').length).toBeGreaterThan(0);
    }
  });

  it('reports every field as unknown when the app holds nothing', () => {
    for (const [path, field] of everyField(buildFarmContext(EMPTY))) {
      expect(field.provenance, `${path} claimed to know something`).toBe('UNKNOWN');
      expect(isKnown(field), path).toBe(false);
    }
  });
});

describe('buildFarmContext — Guardrail 1: no estimate is ever a measurement', () => {
  const fc = buildFarmContext({
    profile: makeProfile(soilWithProfile()),
    view: makeView(),
    weather: makeWeather(),
    today: null,
    waterProgress: PROGRESS,
  });

  it('never labels anything MEASURED — the app has no field measurement to offer', () => {
    // The label exists for a future soil-test import. Nothing today may claim it,
    // and this test is what stops a later contributor from quietly doing so.
    const measured = everyField(fc)
      .filter(([, field]) => field.provenance === 'MEASURED')
      .map(([path]) => path);
    expect(measured).toEqual([]);
  });

  it('labels the soil map pH a REGIONAL_ESTIMATE with the 250 m map named', () => {
    expect(fc.soil.ph.provenance).toBe('REGIONAL_ESTIMATE');
    // Thickness-weighted over 0-15 cm: (6.2 × 5 + 6.4 × 10) / 15.
    expect(fc.soil.ph.value).toBeCloseTo((6.2 * 5 + 6.4 * 10) / 15, 10);
    expect(fc.soil.ph.origin).toContain('250 m');
    expect(fc.soil.ph.origin).toContain('not a test of this field');
    expect(fc.soil.ph.asOf).toBe(FETCHED_AT);
  });

  it('labels the soil-water basis a REGIONAL_ESTIMATE even when thetaSource is "measured"', () => {
    // `thetaSource: 'measured'` means "from SoilGrids rather than from the
    // six-row table". Both are estimates; calling this one MEASURED would put
    // the original bug back one layer down, inside the assistant's prompt.
    expect(fc.water.soilWaterBasis.value).toBe('soilgrids');
    expect(fc.water.soilWaterBasis.provenance).toBe('REGIONAL_ESTIMATE');
    expect(fc.water.soilWaterBasis.origin).toContain('not a test of this field');
  });

  it('labels the table fallback a REGIONAL_ESTIMATE too, pointing at the generic table', () => {
    const balance = { ...makeView().waterBalance!, thetaSource: 'table' as const, thetaCoverage: 0 };
    const tableFc = buildFarmContext({
      profile: makeProfile(),
      view: makeView({ waterBalance: balance }),
      weather: makeWeather(),
      today: null,
      waterProgress: null,
    });
    expect(tableFc.water.soilWaterBasis.value).toBe('table');
    expect(tableFc.water.soilWaterBasis.provenance).toBe('REGIONAL_ESTIMATE');
    expect(tableFc.water.soilWaterBasis.origin).toContain('generic table');
  });

  it("keeps the farmer's own answers USER_PROVIDED, outranking any prediction", () => {
    expect(fc.soil.type.provenance).toBe('USER_PROVIDED');
    expect(fc.crop.name.provenance).toBe('USER_PROVIDED');
    expect(fc.farm.irrigationMethod.provenance).toBe('USER_PROVIDED');
  });

  it('labels engine output CALCULATED and weather FORECAST', () => {
    expect(fc.irrigation.status.provenance).toBe('CALCULATED');
    expect(fc.water.totalAvailableMm.provenance).toBe('CALCULATED');
    expect(fc.disease.level.provenance).toBe('CALCULATED');
    expect(fc.weather.temperatureC.provenance).toBe('FORECAST');
  });

  it('keeps water quality, fertility and energy UNKNOWN with the gap named', () => {
    expect(fc.water.qualityEc.provenance).toBe('UNKNOWN');
    expect(fc.water.qualityEc.origin).toContain('§22');
    expect(fc.fertility.nitrogen.provenance).toBe('UNKNOWN');
    expect(fc.impact.energySavedKwh.provenance).toBe('UNKNOWN');
    expect(fc.impact.energySavedKwh.origin).toContain('pump');
  });
});

describe('buildFarmContext — fertility, once a reading has been entered', () => {
  const reading = { n: 240, p2o5: 8, k2o: 150, recordedAt: '2026-07-01T09:00:00+05:30' };

  it('reads N, P and K as USER_PROVIDED — the farmer supplied the numbers', () => {
    const fc = buildFarmContext({
      ...EMPTY,
      profile: makeProfile({ ...makeSoil('Loamy'), nutrientReading: reading }),
    });
    expect(fc.fertility.nitrogen.value).toBe(240);
    expect(fc.fertility.nitrogen.provenance).toBe('USER_PROVIDED');
    expect(fc.fertility.phosphorus.value).toBe(8);
    expect(fc.fertility.potassium.value).toBe(150);
    expect(fc.fertility.recordedAt.value).toBe('2026-07-01T09:00:00+05:30');
  });

  it('classifies the band as CALCULATED — the app supplied the verdict', () => {
    const fc = buildFarmContext({
      ...EMPTY,
      profile: makeProfile({ ...makeSoil('Loamy'), nutrientReading: reading }),
    });
    // P (8) is below the Low threshold (10), so worst-of-three is Low even
    // though N and K individually read Medium/High.
    expect(fc.fertility.band.value).toBe('Low');
    expect(fc.fertility.band.provenance).toBe('CALCULATED');
  });

  it('stays UNKNOWN, with the same reason as before, when no reading has been entered', () => {
    const fc = buildFarmContext({ ...EMPTY, profile: makeProfile(makeSoil('Loamy')) });
    expect(isKnown(fc.fertility.nitrogen)).toBe(false);
    expect(fc.fertility.nitrogen.origin).toContain('no soil nutrient reading');
    expect(isKnown(fc.fertility.band)).toBe(false);
  });
});

describe('buildFarmContext — it copies, it does not compute', () => {
  it('carries engine figures through unrounded', () => {
    const fc = buildFarmContext({
      profile: makeProfile(),
      view: makeView(),
      weather: makeWeather(),
      today: null,
      waterProgress: PROGRESS,
    });
    // Rounding is the assistant/UI boundary's job and must happen exactly once.
    expect(fc.water.depletionMm.value).toBe(48.37);
    expect(fc.water.totalAvailableMm.value).toBe(90.12);
    expect(fc.impact.savedTodayLiters.value).toBe(8_421.6);
  });

  it('prefers the daily series for today’s rain, since that is what the engine used', () => {
    const today = {
      date: '2026-06-15',
      precipitationSum: 4.25,
      temperatureMax: 34,
      humidityMean: 62,
      windSpeedMax: 2.5,
    };
    const withDaily = buildFarmContext({
      ...EMPTY,
      weather: makeWeather({ rainfallForecast: 25 }),
      today,
    });
    expect(withDaily.weather.rainfallTodayMm.value).toBe(4.25);
    expect(withDaily.weather.rainfallTodayMm.asOf).toBe('2026-06-15');

    const withoutDaily = buildFarmContext({ ...EMPTY, weather: makeWeather({ rainfallForecast: 25 }) });
    expect(withoutDaily.weather.rainfallTodayMm.value).toBe(25);
  });

  it('withholds the disease name on a None day rather than naming one anyway', () => {
    const none = makeView({
      diseaseRisk: { ...makeView().diseaseRisk!, level: 'None', score: 0, observedRun: 0 },
    });
    const fc = buildFarmContext({ ...EMPTY, profile: makeProfile(), view: none });
    expect(fc.disease.level.value).toBe('None');
    expect(isKnown(fc.disease.disease)).toBe(false);
    expect(fc.disease.disease.origin).toContain('does not currently favour');
  });

  it('reports a pH suitability verdict only when there is a pH to judge', () => {
    const withPh = buildFarmContext({ ...EMPTY, profile: makeProfile(soilWithProfile()) });
    // Rice optimum 5.5-6.5; the weighted topsoil pH is 6.33.
    expect(withPh.soil.phSuitability.value).toBe('suitable');
    expect(withPh.soil.phOptimalMin.value).toBe(5.5);
    expect(withPh.soil.phOptimalMax.value).toBe(6.5);

    const noProfile = buildFarmContext({ ...EMPTY, profile: makeProfile() });
    expect(isKnown(noProfile.soil.phSuitability)).toBe(false);
    expect(noProfile.soil.phSuitability.origin).toContain('no soil map profile');
  });

  it('raises a texture disagreement only when the map maps to a different soil type', () => {
    // 'clay loam' maps to Clay Loam, so on a Loamy farm it disagrees.
    const disagrees = buildFarmContext({ ...EMPTY, profile: makeProfile(soilWithProfile('Loamy')) });
    expect(disagrees.soil.textureDisagreement.value).toBe('clay loam');

    const agrees = buildFarmContext({ ...EMPTY, profile: makeProfile(soilWithProfile('Clay Loam')) });
    expect(isKnown(agrees.soil.textureDisagreement)).toBe(false);
    expect(agrees.soil.textureDisagreement.origin).toContain('agrees');
  });

  it('weights topsoil organic carbon over 0-15 cm', () => {
    const layers = [layer(0, 5, 6.2, 2.4), layer(5, 15, 6.4, 1.2), layer(15, 30, 6.6, 0.6)];
    const fc = buildFarmContext({
      ...EMPTY,
      profile: makeProfile({ ...makeSoil('Loamy'), measured: soilProfileFixture(layers) }),
    });
    expect(fc.soil.organicCarbonPct.value).toBeCloseTo((2.4 * 5 + 1.2 * 10) / 15, 10);
    expect(fc.soil.organicCarbonPct.provenance).toBe('REGIONAL_ESTIMATE');
  });

  it('treats an empty place name as no place name', () => {
    const blank = makeProfile();
    blank.farm = makeFarm({ location: { latitude: 23.677, longitude: 87.685, label: '' } });
    expect(isKnown(buildFarmContext({ ...EMPTY, profile: blank }).farm.locationLabel)).toBe(false);
  });
});

function soilWithProfile(name: Parameters<typeof makeSoil>[0] = 'Loamy') {
  return { ...makeSoil(name), measured: soilProfileFixture() };
}

/**
 * The refactor guard.
 *
 * `buildAssistantContext` is now a projection of `FarmContext`. These objects
 * are the exact output it produced before that change — written out by hand, not
 * generated — so that a drift in provenance plumbing cannot silently alter what
 * the Copilot is told or what the farmer is answered.
 */
describe('buildAssistantContext — unchanged by the FarmContext refactor', () => {
  /** Identity translator: keeps the assertion about shape, not about wording. */
  const t = ((key: string) => key) as Parameters<typeof buildAssistantContext>[0]['t'];

  it('produces exactly the same fields for a fully-populated farm', () => {
    const context = buildAssistantContext({
      profile: makeProfile(soilWithProfile()),
      view: makeView(),
      weather: makeWeather(),
      today: null,
      waterProgress: PROGRESS,
      language: 'en',
      t,
    });

    expect(context).toEqual({
      language: 'en',
      farmName: 'Test Field',
      locationLabel: 'Test Village',
      cropName: 'enum.crop.Rice',
      growthStage: 'enum.stage.Mid Season',
      soilType: 'enum.soil.Loamy',
      irrigationMethod: 'enum.method.Drip',
      areaLabel: '1 Acre',
      status: 'enum.status.Irrigate Today',
      explanation: 'The root zone is dry and no rain is expected.',
      confidence: 'rec.confidenceBadge.high',
      depthMm: 8.4,
      volumeLiters: 33_993,
      durationMinutes: 72,
      windowStart: '06:00',
      windowEnd: '07:12',
      depletionMm: 48.4,
      readilyAvailableMm: 45.1,
      totalAvailableMm: 90.1,
      diseaseRiskLevel: 'Moderate',
      diseaseName: 'disease.name.riceBlast',
      tomorrowStatus: 'enum.status.Monitor Tomorrow',
      temperatureC: 32,
      humidityPercent: 60,
      rainfallForecastMm: 0,
      savedTodayLiters: 8_422,
      savedLifetimeLiters: 104_882,

      // Soil chemistry with its provenance attached (PRD §7, §28 Guardrail 1).
      // The labels are asserted as literals on purpose: `soilPhProvenance` must
      // read REGIONAL_ESTIMATE and never MEASURED, because the figure is an
      // ISRIC SoilGrids prediction for the 250 m cell this farm sits in. The day
      // that literal changes to MEASURED without a real soil test behind it is
      // the day the app starts telling farmers their neighbours' pH is their own.
      soilTypeProvenance: 'USER_PROVIDED',
      soilPh: 6.3,
      soilPhProvenance: 'REGIONAL_ESTIMATE',
      soilPhOrigin:
        'a 250 m soil map prediction (ISRIC SoilGrids v2.0), not a test of this field',
      phSuitability: 'ph.level.suitable',
      phOptimalMin: 5.5,
      phOptimalMax: 6.5,
      soilTextureClass: 'clay loam',
      soilTextureProvenance: 'REGIONAL_ESTIMATE',
      organicCarbonPct: 1.8,
      weatherProvenance: 'FORECAST',
      // Not MEASURED either, and that is the point: there is no moisture sensor
      // in this field. The depletion figure is a water balance on top of
      // map-derived holding capacity (see FarmContextWater).
      soilMoistureProvenance: 'REGIONAL_ESTIMATE',

      // The improvement plan's top titles (PRD §15), added by Phase 3 — the one
      // field this guard gained rather than kept. Two detectors fire on this
      // fixture and no more: the weather favours rice blast (MEDIUM), and the
      // soil map reads 'clay loam' against the farmer's 'Loamy' (LOW). Order is
      // the assertion — severity ranks disease above texture, and a farmer with
      // time for one thing must be told the same first thing as the Copilot.
      topIssues: ['improve.disease.title', 'improve.texture.title'],
    });
  });

  it('omits every absent field rather than defaulting it', () => {
    expect(
      buildAssistantContext({ ...EMPTY, language: 'bn', t }),
    ).toEqual({ language: 'bn' });
  });

  it('omits the run time and window on advice that has neither', () => {
    const view = makeView();
    const bare = {
      ...view,
      recommendation: {
        ...view.recommendation,
        irrigationWindow: null,
        estimatedWaterAmount: { depthMm: 0, volumeLiters: 0 },
      },
      plan: null,
      diseaseRisk: null,
      waterBalance: null,
    };
    const context = buildAssistantContext({ ...EMPTY, view: bare, language: 'en', t });
    expect(context).toEqual({
      language: 'en',
      status: 'enum.status.Irrigate Today',
      explanation: 'The root zone is dry and no rain is expected.',
      confidence: 'rec.confidenceBadge.high',
      depthMm: 0,
      volumeLiters: 0,
    });
  });

  it('rounds slope and weather exactly as before', () => {
    const profile = makeProfile();
    profile.farm = makeFarm({
      terrain: {
        slopePercent: 3.46,
        aspect: 'SE',
        aspectDegrees: 135,
        elevationM: 58.2,
        sampleSpacingM: 150,
        confidence: 'approximate',
        provider: 'test-dem',
        fetchedAt: FETCHED_AT,
        latitude: 23.677,
        longitude: 87.685,
      },
    });
    const weather: WeatherData = makeWeather({ temperature: 31.6, humidity: 59.4 });
    const context = buildAssistantContext({
      ...EMPTY,
      profile,
      weather,
      language: 'en',
      t,
    });
    expect(context.slopePercent).toBe(3.5);
    expect(context.temperatureC).toBe(32);
    expect(context.humidityPercent).toBe(59);
  });
});
