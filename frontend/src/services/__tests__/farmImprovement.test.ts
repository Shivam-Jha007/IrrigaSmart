import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '../../types';
import type {
  CropName,
  DiseaseRiskLevel,
  IrrigationMethod,
  MeasuredSoilProfile,
  RecommendationStatus,
  SoilLayer,
  SoilType,
  WaterRetentionCategory,
} from '../../types';
import type { FarmProfile } from '../../app/appTypes';
import { translate, type TranslateFn } from '../../i18n';
import { buildFarmContext, type FarmContext } from '../farmContext';
import { ORIGIN, sourced, type Sourced } from '../provenance';
import type { PhSuitability } from '../cropPhKnowledge';
import type { DiseaseId } from '../diseaseKnowledge';
import {
  detectFarmIssues,
  resolveIssueVars,
  type FarmIssue,
  type FarmIssueId,
} from '../farmImprovement';
import { makeCrop, makeFarm, makeSoil } from './fixtures';

/**
 * The prioritised farm improvement plan (PRD §15).
 *
 * WHAT IS BEING GUARDED
 * Two things, and the second matters more than the first. One: each detector
 * fires exactly when its data supports it. Two: the list stays SHORT and stays
 * ORDERED — §15's whole point is a plan rather than a warning dump, and the way
 * that fails is not a wrong severity but nine items on every farm.
 *
 * SILENCE IS THE MOST IMPORTANT ASSERTION HERE
 * So the near-miss cases are tested as carefully as the firing ones: an empty
 * context must produce zero issues, not nine "unknown" ones, and every detector
 * is checked in isolation to prove it does not fire on a farm it has nothing to
 * say about.
 *
 * THE CONTEXTS ARE HAND-BUILT, AND THEY STAY REACHABLE
 * Each fixture below patches the all-`UNKNOWN` context that `buildFarmContext`
 * returns for an unknown farm, which keeps a detector's inputs visible in the
 * test that exercises it. The discipline that comes with that: no fixture may
 * describe a state `buildFarmContext` could not produce. Where a `textureClass`
 * is known a profile exists, so `ph` or `organicCarbonPct` is set alongside it;
 * where a water basis is known a recommendation exists. The last block closes
 * the loop by driving the real projection from a real `FarmProfile`, so the
 * detectors are proven against genuine app state and not only against fixtures.
 *
 * `farmContext.test.ts` owns the provenance contract on the projection itself;
 * this file assumes it and tests only what the detectors do with it.
 */

const FETCHED_AT = '2026-08-09T12:00:00+05:30';
const GENERATED_AT = '2026-06-15T08:30:00+05:30';

// --- Sourced constructors, one per real origin ---
//
// Explicit type arguments at the call sites below, because `user('Loamy')`
// infers `Sourced<string | null>` and the context fields are enum-typed.

/** The farmer's own answer. */
function user<T>(value: T): Sourced<T | null> {
  return sourced<T | null>(value, 'USER_PROVIDED', ORIGIN.farmer);
}

/** An ISRIC SoilGrids prediction for the 250 m cell. */
function soilMap<T>(value: T): Sourced<T | null> {
  return sourced<T | null>(value, 'REGIONAL_ESTIMATE', ORIGIN.soilGrids, FETCHED_AT);
}

/** A ~90 m elevation-model figure. */
function dem<T>(value: T): Sourced<T | null> {
  return sourced<T | null>(value, 'REGIONAL_ESTIMATE', ORIGIN.demSlope, FETCHED_AT);
}

/** Decision-engine output. */
function engine<T>(value: T): Sourced<T | null> {
  return sourced<T | null>(value, 'CALCULATED', ORIGIN.engine, GENERATED_AT);
}

/** The Knowledge Base six-row soil-hydraulics table. */
function table<T>(value: T): Sourced<T | null> {
  return sourced<T | null>(value, 'REGIONAL_ESTIMATE', ORIGIN.soilTable);
}

/**
 * A real reading of this field. Nothing in the app produces one today — this is
 * the future soil-test import, and it is here because the pH detector's
 * confidence is only allowed to reach `High` for a value labelled this way.
 */
function soilTest<T>(value: T): Sourced<T | null> {
  return sourced<T | null>(value, 'MEASURED', 'a Soil Health Card test of this field', FETCHED_AT);
}

/** A crop's optimum pH band, as `CROP_PH_RANGE` publishes it. */
function extensionRange(value: number): Sourced<number | null> {
  return sourced<number | null>(value, 'REGIONAL_ESTIMATE', 'extension guidance');
}

// --- Contexts ---

function emptyContext(): FarmContext {
  return buildFarmContext({
    profile: undefined,
    view: null,
    weather: null,
    today: null,
    waterProgress: null,
  });
}

function contextWith(patch: (c: FarmContext) => void): FarmContext {
  const context = emptyContext();
  patch(context);
  return context;
}

function ids(fc: FarmContext): FarmIssueId[] {
  return detectFarmIssues(fc).map((issue) => issue.id);
}

function issueById(fc: FarmContext, id: FarmIssueId): FarmIssue {
  const found = detectFarmIssues(fc).find((issue) => issue.id === id);
  if (!found) throw new Error(`expected a ${id} issue`);
  return found;
}

/**
 * One context per detector, each producing exactly that detector's issue.
 *
 * Typed as a total `Record` on purpose: adding a `FarmIssueId` without adding
 * the context that fires it is a compile error here, so a new detector cannot
 * arrive untested. Functions rather than values so no test can mutate another's
 * fixture.
 */
const FIRING: Record<FarmIssueId, () => FarmContext> = {
  // Rice likes 5.5-6.5; 4.8 is 0.7 below, past TOLERANCE_MARGIN_PH.
  'ph-mismatch': () =>
    contextWith((c) => {
      c.crop.name = user<CropName>('Rice');
      c.soil.ph = soilMap(4.8);
      c.soil.phSuitability = engine<PhSuitability>('significant-issue');
      c.soil.phOptimalMin = extensionRange(5.5);
      c.soil.phOptimalMax = extensionRange(6.5);
    }),
  'texture-disagreement': () =>
    contextWith((c) => {
      c.soil.type = user<SoilType>('Loamy');
      c.soil.textureClass = soilMap('clay loam');
      c.soil.textureDisagreement = soilMap('clay loam');
    }),
  'soil-profile-missing': () =>
    contextWith((c) => {
      c.soil.type = user<SoilType>('Sandy Loam');
    }),
  'soil-water-from-table': () =>
    contextWith((c) => {
      c.soil.type = user<SoilType>('Clay Loam');
      // A profile exists — this is the "it did not reach the roots" case.
      c.soil.ph = soilMap(6.4);
      c.water.soilWaterBasis = table<'soilgrids' | 'table'>('table');
    }),
  'surface-method-on-slope': () =>
    contextWith((c) => {
      c.farm.slopePercent = dem(4.2);
      c.farm.irrigationMethod = user<IrrigationMethod>('Flood');
    }),
  'low-retention-surface-method': () =>
    contextWith((c) => {
      c.soil.type = user<SoilType>('Sandy');
      c.soil.waterRetention = user<WaterRetentionCategory>('Low');
      c.soil.ph = soilMap(6.2);
      c.farm.irrigationMethod = user<IrrigationMethod>('Furrow');
    }),
  'disease-pressure': () =>
    contextWith((c) => {
      c.disease.level = engine<DiseaseRiskLevel>('High');
      c.disease.disease = engine<DiseaseId>('riceBlast');
      c.disease.confidence = engine<'High' | 'Medium' | 'Low'>('High');
    }),
  'stale-advice': () =>
    contextWith((c) => {
      c.irrigation.status = engine<RecommendationStatus>('Irrigate Today');
      c.irrigation.weatherMissing = true;
    }),
  // The booklet covers six crops; Onion is one of the four it does not.
  'fertilizer-table-missing': () =>
    contextWith((c) => {
      c.crop.name = user<CropName>('Onion');
    }),
};

const ALL_IDS = Object.keys(FIRING) as FarmIssueId[];

// --- Silence ---

describe('detectFarmIssues — silence when there is nothing to say', () => {
  it('says nothing at all about a farm the app knows nothing about', () => {
    expect(detectFarmIssues(emptyContext())).toEqual([]);
  });

  it('fires each detector on its own evidence and nothing else on it', () => {
    for (const id of ALL_IDS) {
      expect(ids(FIRING[id]()), id).toEqual([id]);
    }
  });
});

// --- SOIL ---

describe('ph-mismatch', () => {
  it('reports a reading past the tolerance margin as important', () => {
    const issue = issueById(FIRING['ph-mismatch'](), 'ph-mismatch');
    expect(issue.category).toBe('SOIL');
    expect(issue.severity).toBe('HIGH');
    // Capped by what it rests on: a 250 m map prediction, not a soil test.
    expect(issue.confidence).toBe('Medium');
    expect(issue.vars).toEqual({ ph: '4.8', min: '5.5', max: '6.5' });
    expect(issue.labelVars).toEqual({ crop: 'enum.crop.Rice' });
  });

  it('drops to Low confidence when the reading is only slightly outside', () => {
    // 5.2 is within TOLERANCE_MARGIN_PH of Rice's 5.5, so a small map error
    // flips the verdict either way and the item must not sound certain.
    const fc = contextWith((c) => {
      c.crop.name = user<CropName>('Rice');
      c.soil.ph = soilMap(5.2);
      c.soil.phSuitability = engine<PhSuitability>('slightly-outside');
      c.soil.phOptimalMin = extensionRange(5.5);
      c.soil.phOptimalMax = extensionRange(6.5);
    });
    const issue = issueById(fc, 'ph-mismatch');
    expect(issue.severity).toBe('MEDIUM');
    expect(issue.confidence).toBe('Low');
  });

  it('reaches High confidence only for a measurement of this field', () => {
    const fc = contextWith((c) => {
      c.crop.name = user<CropName>('Rice');
      c.soil.ph = soilTest(4.8);
      c.soil.phSuitability = engine<PhSuitability>('significant-issue');
      c.soil.phOptimalMin = extensionRange(5.5);
      c.soil.phOptimalMax = extensionRange(6.5);
    });
    expect(issueById(fc, 'ph-mismatch').confidence).toBe('High');
  });

  it('stays silent when the pH suits the crop', () => {
    const fc = contextWith((c) => {
      c.crop.name = user<CropName>('Rice');
      c.soil.ph = soilMap(6.1);
      c.soil.phSuitability = engine<PhSuitability>('suitable');
      c.soil.phOptimalMin = extensionRange(5.5);
      c.soil.phOptimalMax = extensionRange(6.5);
    });
    expect(ids(fc)).toEqual([]);
  });

  it('stays silent when there is a verdict but no reading behind it', () => {
    // `buildFarmContext` cannot produce this today — a verdict implies a value.
    // The guard is here so a future projection that publishes one without the
    // other cannot put a pH sentence in front of a farmer with no pH in it.
    const fc = contextWith((c) => {
      c.crop.name = user<CropName>('Rice');
      c.soil.phSuitability = engine<PhSuitability>('significant-issue');
      c.soil.phOptimalMin = extensionRange(5.5);
      c.soil.phOptimalMax = extensionRange(6.5);
    });
    expect(ids(fc)).toEqual([]);
  });
});

describe('texture-disagreement', () => {
  it("names both readings and leaves the farmer's answer in charge", () => {
    const issue = issueById(FIRING['texture-disagreement'](), 'texture-disagreement');
    expect(issue.category).toBe('SOIL');
    expect(issue.severity).toBe('LOW');
    expect(issue.confidence).toBe('Low');
    expect(issue.labelVars).toEqual({
      yours: 'enum.soil.Loamy',
      theirs: 'enum.soil.Clay Loam',
    });
  });

  it('stays silent when the map class maps to no soil type this app knows', () => {
    // A class outside USDA_TO_SOIL_TYPE cannot be named in the farmer's
    // language, and "the map disagrees but we cannot say with what" is not
    // something anyone can act on.
    const fc = contextWith((c) => {
      c.soil.type = user<SoilType>('Loamy');
      c.soil.textureClass = soilMap('gravelly material');
      c.soil.textureDisagreement = soilMap('gravelly material');
    });
    expect(ids(fc)).toEqual([]);
  });
});

describe('soil-profile-missing and soil-water-from-table', () => {
  it('states a fact about storage at full confidence', () => {
    const issue = issueById(FIRING['soil-profile-missing'](), 'soil-profile-missing');
    expect(issue.category).toBe('SOIL');
    expect(issue.severity).toBe('LOW');
    expect(issue.confidence).toBe('High');
    expect(issue.labelVars).toEqual({ soil: 'enum.soil.Sandy Loam' });
  });

  it('says nothing about missing soil data on a farm that has no soil type', () => {
    // No soil type means no farm, not a farm without soil data.
    const fc = contextWith((c) => {
      c.water.soilWaterBasis = table<'soilgrids' | 'table'>('table');
    });
    expect(ids(fc)).toEqual([]);
  });

  it('tells the farmer once, not twice, whichever the reason is', () => {
    // No profile at all: the missing-profile message, and only that one.
    const noProfile = contextWith((c) => {
      c.soil.type = user<SoilType>('Clay Loam');
      c.water.soilWaterBasis = table<'soilgrids' | 'table'>('table');
    });
    expect(ids(noProfile)).toEqual(['soil-profile-missing']);

    // A profile that did not reach the root zone: the other message, alone.
    const shallowProfile = contextWith((c) => {
      c.soil.type = user<SoilType>('Clay Loam');
      c.soil.ph = soilMap(6.4);
      c.water.soilWaterBasis = table<'soilgrids' | 'table'>('table');
    });
    expect(ids(shallowProfile)).toEqual(['soil-water-from-table']);
  });

  it('says nothing when the water balance used the soil map after all', () => {
    const fc = contextWith((c) => {
      c.soil.type = user<SoilType>('Clay Loam');
      c.soil.ph = soilMap(6.4);
      c.water.soilWaterBasis = soilMap<'soilgrids' | 'table'>('soilgrids');
    });
    expect(ids(fc)).toEqual([]);
  });
});

// --- IRRIGATION ---

describe('surface-method-on-slope', () => {
  it('raises a coarse-map advisory at Low confidence', () => {
    const issue = issueById(FIRING['surface-method-on-slope'](), 'surface-method-on-slope');
    expect(issue.category).toBe('IRRIGATION');
    expect(issue.severity).toBe('MEDIUM');
    // The same ~90 m DEM is recorded as fabricating ~3% on flat ground.
    expect(issue.confidence).toBe('Low');
    expect(issue.vars).toEqual({ slope: '4.2' });
    expect(issue.labelVars).toEqual({ method: 'enum.method.Flood' });
  });

  it('stays silent below the warning threshold and for pressurised methods', () => {
    const gentle = contextWith((c) => {
      c.farm.slopePercent = dem(1.5);
      c.farm.irrigationMethod = user<IrrigationMethod>('Flood');
    });
    expect(ids(gentle)).toEqual([]);

    const drip = contextWith((c) => {
      c.farm.slopePercent = dem(4.2);
      c.farm.irrigationMethod = user<IrrigationMethod>('Drip');
    });
    expect(ids(drip)).toEqual([]);
  });

  it('stays silent on a farm with no elevation data', () => {
    const fc = contextWith((c) => {
      c.farm.irrigationMethod = user<IrrigationMethod>('Flood');
    });
    expect(ids(fc)).toEqual([]);
  });
});

describe('low-retention-surface-method', () => {
  it("rests on the farmer's own two answers and says Medium, not High", () => {
    const issue = issueById(
      FIRING['low-retention-surface-method'](),
      'low-retention-surface-method',
    );
    expect(issue.category).toBe('IRRIGATION');
    expect(issue.severity).toBe('MEDIUM');
    // Both inputs are USER_PROVIDED; the conclusion drawn from them is general
    // extension guidance rather than a figure this app computed for this field.
    expect(issue.confidence).toBe('Medium');
    expect(issue.labelVars).toEqual({
      soil: 'enum.soil.Sandy',
      method: 'enum.method.Furrow',
    });
  });

  it('stays silent on a soil that holds water and on a pressurised method', () => {
    const holdsWater = contextWith((c) => {
      c.soil.type = user<SoilType>('Clay Loam');
      c.soil.waterRetention = user<WaterRetentionCategory>('Moderate');
      c.soil.ph = soilMap(6.2);
      c.farm.irrigationMethod = user<IrrigationMethod>('Furrow');
    });
    expect(ids(holdsWater)).toEqual([]);

    const sprinkler = contextWith((c) => {
      c.soil.type = user<SoilType>('Sandy');
      c.soil.waterRetention = user<WaterRetentionCategory>('Low');
      c.soil.ph = soilMap(6.2);
      c.farm.irrigationMethod = user<IrrigationMethod>('Sprinkler');
    });
    expect(ids(sprinkler)).toEqual([]);
  });
});

// --- DISEASE ---

describe('disease-pressure', () => {
  it('is important at High risk and carries the engine own confidence', () => {
    const issue = issueById(FIRING['disease-pressure'](), 'disease-pressure');
    expect(issue.category).toBe('DISEASE');
    expect(issue.severity).toBe('HIGH');
    expect(issue.confidence).toBe('High');
    expect(issue.labelVars).toEqual({ disease: 'disease.name.riceBlast' });
  });

  it('is worth checking at Moderate risk', () => {
    const fc = contextWith((c) => {
      c.disease.level = engine<DiseaseRiskLevel>('Moderate');
      c.disease.disease = engine<DiseaseId>('riceBlast');
      c.disease.confidence = engine<'High' | 'Medium' | 'Low'>('Medium');
    });
    const issue = issueById(fc, 'disease-pressure');
    expect(issue.severity).toBe('MEDIUM');
    expect(issue.confidence).toBe('Medium');
  });

  it('falls back to Medium when the assessment published no confidence', () => {
    const fc = contextWith((c) => {
      c.disease.level = engine<DiseaseRiskLevel>('High');
      c.disease.disease = engine<DiseaseId>('riceBlast');
    });
    expect(issueById(fc, 'disease-pressure').confidence).toBe('Medium');
  });

  it('stays silent below Moderate risk', () => {
    for (const level of ['None', 'Low'] as const) {
      const fc = contextWith((c) => {
        c.disease.level = engine<DiseaseRiskLevel>(level);
        c.disease.disease = engine<DiseaseId>('riceBlast');
      });
      expect(ids(fc), level).toEqual([]);
    }
  });

  it('stays silent when the risk is raised but no disease is named', () => {
    // An unnamed "something is likely" is not something a farmer can look for.
    const fc = contextWith((c) => {
      c.disease.level = engine<DiseaseRiskLevel>('High');
    });
    expect(ids(fc)).toEqual([]);
  });
});

// --- CLIMATE and CROP ---

describe('stale-advice', () => {
  it('is worth checking when the advice was built with no weather at all', () => {
    const issue = issueById(FIRING['stale-advice'](), 'stale-advice');
    expect(issue.category).toBe('CLIMATE');
    expect(issue.severity).toBe('MEDIUM');
    expect(issue.confidence).toBe('High');
    expect(issue.titleKey).toBe('improve.weatherData.titleMissing');
  });

  it('is minor when the advice used saved weather', () => {
    const fc = contextWith((c) => {
      c.irrigation.status = engine<RecommendationStatus>('Monitor Tomorrow');
      c.irrigation.fromCache = true;
    });
    const issue = issueById(fc, 'stale-advice');
    expect(issue.severity).toBe('LOW');
    expect(issue.titleKey).toBe('improve.weatherData.titleCached');
  });

  it('reports the worse of the two when both are true', () => {
    const fc = contextWith((c) => {
      c.irrigation.status = engine<RecommendationStatus>('Irrigate Today');
      c.irrigation.fromCache = true;
      c.irrigation.weatherMissing = true;
    });
    expect(issueById(fc, 'stale-advice').titleKey).toBe('improve.weatherData.titleMissing');
  });

  it('stays silent on fresh advice, and on a farm with no advice to qualify', () => {
    const fresh = contextWith((c) => {
      c.irrigation.status = engine<RecommendationStatus>('Irrigate Today');
    });
    expect(ids(fresh)).toEqual([]);

    // A failed fetch with no recommendation behind it describes nothing.
    const noAdvice = contextWith((c) => {
      c.irrigation.weatherMissing = true;
    });
    expect(ids(noAdvice)).toEqual([]);
  });
});

describe('fertilizer-table-missing', () => {
  it('names the gap rather than leaving the farmer at an empty page', () => {
    const issue = issueById(FIRING['fertilizer-table-missing'](), 'fertilizer-table-missing');
    expect(issue.category).toBe('CROP');
    expect(issue.severity).toBe('LOW');
    expect(issue.confidence).toBe('High');
    expect(issue.labelVars).toEqual({ crop: 'enum.crop.Onion' });
  });

  it('fires for exactly the four crops the booklet does not cover', () => {
    const uncovered: readonly CropName[] = ['Sugarcane', 'Soybean', 'Tomato', 'Onion'];
    const covered: readonly CropName[] = ['Rice', 'Wheat', 'Maize', 'Cotton', 'Potato', 'Groundnut'];

    for (const crop of uncovered) {
      expect(ids(contextWith((c) => (c.crop.name = user<CropName>(crop)))), crop).toEqual([
        'fertilizer-table-missing',
      ]);
    }
    for (const crop of covered) {
      expect(ids(contextWith((c) => (c.crop.name = user<CropName>(crop)))), crop).toEqual([]);
    }
  });
});

// --- Ranking ---

describe('ranking', () => {
  it('puts severity first', () => {
    const fc = contextWith((c) => {
      c.crop.name = user<CropName>('Tomato'); // LOW: no fertilizer table
      c.disease.level = engine<DiseaseRiskLevel>('High'); // HIGH
      c.disease.disease = engine<DiseaseId>('lateBlight');
      c.disease.confidence = engine<'High' | 'Medium' | 'Low'>('High');
    });
    expect(ids(fc)).toEqual(['disease-pressure', 'fertilizer-table-missing']);
  });

  it('breaks a severity tie on confidence, ahead of detector order', () => {
    // Three MEDIUM issues whose confidences run High, Medium, Low — and whose
    // declaration order is the exact reverse. If the result comes back in
    // declaration order, confidence is not being applied.
    const fc = contextWith((c) => {
      c.farm.slopePercent = dem(4.2); // MEDIUM / Low   (declared 5th)
      c.farm.irrigationMethod = user<IrrigationMethod>('Flood');
      c.soil.type = user<SoilType>('Sandy'); // MEDIUM / Medium (declared 6th)
      c.soil.waterRetention = user<WaterRetentionCategory>('Low');
      c.soil.ph = soilMap(6.2);
      c.irrigation.status = engine<RecommendationStatus>('Irrigate Today');
      c.irrigation.weatherMissing = true; // MEDIUM / High  (declared 8th)
    });
    expect(ids(fc)).toEqual([
      'stale-advice',
      'low-retention-surface-method',
      'surface-method-on-slope',
    ]);
  });

  it('falls back to a fixed detector order when severity and confidence tie', () => {
    // Both LOW/High. soil-profile-missing is declared third and
    // fertilizer-table-missing ninth, so the list must not reshuffle between
    // renders — a farmer acting on "the first item" needs it to stay put.
    const fc = contextWith((c) => {
      c.soil.type = user<SoilType>('Loamy');
      c.crop.name = user<CropName>('Onion');
    });
    expect(ids(fc)).toEqual(['soil-profile-missing', 'fertilizer-table-missing']);
  });

  it('is stable across repeated calls on the same context', () => {
    const fc = contextWith((c) => {
      c.soil.type = user<SoilType>('Sandy');
      c.soil.waterRetention = user<WaterRetentionCategory>('Low');
      c.soil.ph = soilMap(6.2);
      c.farm.irrigationMethod = user<IrrigationMethod>('Furrow');
      c.crop.name = user<CropName>('Onion');
      c.irrigation.status = engine<RecommendationStatus>('Irrigate Today');
      c.irrigation.fromCache = true;
    });
    expect(ids(fc)).toEqual(ids(fc));
  });
});

// --- Display ---

describe('resolveIssueVars', () => {
  const en: TranslateFn = (key, vars) => translate('en', key, vars);

  it('translates enum values and passes plain values through untouched', () => {
    const vars = resolveIssueVars(issueById(FIRING['ph-mismatch'](), 'ph-mismatch'), en);
    expect(vars).toEqual({ crop: 'Rice', ph: '4.8', min: '5.5', max: '6.5' });
  });

  it('translates the enum values into the language it is given', () => {
    const hi: TranslateFn = (key, vars) => translate('hi', key, vars);
    const issue = issueById(FIRING['texture-disagreement'](), 'texture-disagreement');
    expect(resolveIssueVars(issue, hi)).toEqual({ yours: 'दोमट', theirs: 'चिकनी दोमट' });
  });

  it('returns an empty bag for an issue with nothing to interpolate', () => {
    expect(resolveIssueVars(issueById(FIRING['stale-advice'](), 'stale-advice'), en)).toEqual({});
  });
});

describe('every sentence this module can produce', () => {
  /**
   * The permanent product boundary (docs/12_Product_Roadmap_v2.md), as the
   * backend enforces it on model output (`FORBIDDEN_TERMS` in
   * backend/src/assistant.ts). Duplicated rather than imported because that is a
   * separate workspace; the point is that the improvement plan lives inside the
   * same boundary as the Copilot it feeds.
   *
   * Latin-script names only, which is what these strings would contain if the
   * boundary were breached — the translations transliterate nothing here.
   */
  const FORBIDDEN = [
    'captan',
    'myclobutanil',
    'mancozeb',
    'chlorothalonil',
    'streptomycin',
    'carbendazim',
    'tebuconazole',
    'propiconazole',
    'azoxystrobin',
    'copper oxychloride',
    'bordeaux mixture',
    'fungicide',
    'pesticide',
    'insecticide',
  ];

  const everyIssue = ALL_IDS.map((id) => issueById(FIRING[id](), id));

  it('covers all nine detectors', () => {
    expect(everyIssue).toHaveLength(9);
    expect(new Set(everyIssue.map((issue) => issue.id)).size).toBe(9);
  });

  it('is fully interpolated in all five languages', () => {
    for (const language of LANGUAGES) {
      const t: TranslateFn = (key, vars) => translate(language, key, vars);
      for (const issue of everyIssue) {
        const vars = resolveIssueVars(issue, t);
        const keys = [issue.titleKey, issue.explanationKey, ...issue.actionKeys];
        for (const key of keys) {
          const text = t(key, vars);
          // A `{` left behind means a detector's var name and the string's
          // placeholder disagree — the one bug this key-plus-bag design invites.
          expect(text, `${language}: ${key}`).not.toContain('{');
          // translate() echoes the key when a language table lacks it.
          expect(text, `${language}: ${key}`).not.toBe(key);
          expect(text.trim(), `${language}: ${key}`).not.toBe('');
        }
      }
    }
  });

  it('names no product and offers at least one thing to do', () => {
    for (const language of LANGUAGES) {
      const t: TranslateFn = (key, vars) => translate(language, key, vars);
      for (const issue of everyIssue) {
        expect(issue.actionKeys.length, issue.id).toBeGreaterThan(0);
        const vars = resolveIssueVars(issue, t);
        const text = [issue.titleKey, issue.explanationKey, ...issue.actionKeys]
          .map((key) => t(key, vars))
          .join(' ')
          .toLowerCase();
        for (const term of FORBIDDEN) {
          expect(text, `${language}: ${issue.id}: ${term}`).not.toContain(term);
        }
      }
    }
  });
});

// --- Through the real projection ---

function layer(topCm: number, bottomCm: number, phH2O: number): SoilLayer {
  return {
    topCm,
    bottomCm,
    clayPct: 31.2,
    sandPct: 27.4,
    siltPct: 41.4,
    thetaFC: 0.341,
    thetaPWP: 0.192,
    thetaFCSource: 'soilgrids',
    thetaPWPSource: 'saxton-rawls',
    bulkDensity: 1.29,
    organicCarbonPct: 1.6,
    phH2O,
  };
}

/** An acidic 250 m cell whose texture also disagrees with the farmer's answer. */
function acidicClayLoamProfile(): MeasuredSoilProfile {
  return {
    layers: [layer(0, 5, 4.9), layer(5, 15, 4.9), layer(15, 30, 5.1)],
    usdaTextureClass: 'clay loam',
    provider: 'isric-soilgrids-v2',
    fetchedAt: FETCHED_AT,
    latitude: 23.677,
    longitude: 87.685,
  };
}

describe('detectFarmIssues on a real farm profile', () => {
  it('reads a genuine projection and ranks the three tiers correctly', () => {
    // Onion on a field the soil map calls acidic clay loam, recorded as Loamy.
    // Three detectors have what they need and no more: the pH sits 1.1 below
    // Onion's band (HIGH), the booklet has no Onion schedule (LOW/High), and
    // the map reads the texture differently (LOW/Low). No recommendation is
    // generated here, so nothing about irrigation, water or weather fires.
    const profile: FarmProfile = {
      farm: makeFarm(),
      crop: makeCrop('Onion', 'Mid Season'),
      soil: { ...makeSoil('Loamy'), measured: acidicClayLoamProfile() },
    };
    const fc = buildFarmContext({
      profile,
      view: null,
      weather: null,
      today: null,
      waterProgress: null,
    });

    expect(ids(fc)).toEqual([
      'ph-mismatch',
      'fertilizer-table-missing',
      'texture-disagreement',
    ]);

    const ph = issueById(fc, 'ph-mismatch');
    expect(ph.severity).toBe('HIGH');
    // The projection labels this pH REGIONAL_ESTIMATE, so High is unreachable.
    expect(ph.confidence).toBe('Medium');
    expect(ph.vars).toEqual({ ph: '4.9', min: '6.0', max: '6.8' });

    const en: TranslateFn = (key, vars) => translate('en', key, vars);
    const sentence = en(ph.explanationKey, resolveIssueVars(ph, en));
    expect(sentence).toContain('4.9');
    expect(sentence).toContain('Onion');
    // Guardrail 1, in the farmer's own sentence: an estimate, not a test.
    expect(sentence).toContain('not a test of your field');
  });

  it('stays silent about the same farm once its soil data is complete', () => {
    // A Loamy farm whose map cell agrees, with a pH that suits Rice, growing a
    // crop the booklet covers: the plan is empty, and an empty plan is the
    // outcome the list is aiming at rather than a failure to find something.
    const profile: FarmProfile = {
      farm: makeFarm(),
      crop: makeCrop('Rice', 'Mid Season'),
      soil: {
        ...makeSoil('Loamy'),
        measured: {
          ...acidicClayLoamProfile(),
          layers: [layer(0, 5, 6.2), layer(5, 15, 6.2), layer(15, 30, 6.3)],
          usdaTextureClass: 'loam',
        },
      },
    };
    const fc = buildFarmContext({
      profile,
      view: null,
      weather: null,
      today: null,
      waterProgress: null,
    });
    expect(detectFarmIssues(fc)).toEqual([]);
  });
});
