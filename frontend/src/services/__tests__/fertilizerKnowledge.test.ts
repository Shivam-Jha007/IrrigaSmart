import { describe, expect, it } from 'vitest';
import { CROP_NAMES } from '../../types';
import {
  classifyNutrient,
  classifySoilFertility,
  FERTILIZER_COVERED_CROPS,
  fertilizerCoversCrop,
  fertilizerVarietiesFor,
  fertilizerZonesFor,
  getFertilizerRecommendation,
} from '../fertilizerKnowledge';

/**
 * Fertilizer recommendation lookup (new feature).
 *
 * Assertions, not snapshots — every number below is checked by hand against
 * the transcribed booklet cell it came from, the same testing discipline
 * diseaseVision.test.ts and slopeAdjustment.test.ts use for their own source
 * material. A snapshot would only ever record whatever the module currently
 * returns, including a future transcription slip; these tests exist so a
 * changed number has to be justified against the source booklet.
 */

describe('fertilizerCoversCrop', () => {
  it('covers exactly Rice, Wheat, Maize, Cotton, Potato and Groundnut', () => {
    expect([...FERTILIZER_COVERED_CROPS].sort()).toEqual(
      ['Cotton', 'Groundnut', 'Maize', 'Potato', 'Rice', 'Wheat'].sort(),
    );
  });

  it('reports no coverage for Sugarcane, Soybean, Tomato and Onion', () => {
    const uncovered = CROP_NAMES.filter((crop) => !fertilizerCoversCrop(crop));
    expect(uncovered.sort()).toEqual(['Onion', 'Soybean', 'Sugarcane', 'Tomato'].sort());
  });
});

describe('fertilizerVarietiesFor', () => {
  it('gives Rice exactly two varieties: Kharif and Boro', () => {
    const varieties = fertilizerVarietiesFor('Rice');
    expect(varieties.map((v) => v.varietyId).sort()).toEqual(['boro', 'kharif']);
  });

  it('gives Potato exactly two varieties: traditional and hybrid', () => {
    const varieties = fertilizerVarietiesFor('Potato');
    expect(varieties.map((v) => v.varietyId).sort()).toEqual(['default', 'hybrid']);
  });

  it('gives Wheat, Maize, Cotton and Groundnut exactly one variety each', () => {
    for (const crop of ['Wheat', 'Maize', 'Cotton', 'Groundnut'] as const) {
      const varieties = fertilizerVarietiesFor(crop);
      expect(varieties, crop).toHaveLength(1);
      expect(varieties[0]?.varietyId, crop).toBe('default');
    }
  });

  it('returns an empty list for an uncovered crop rather than throwing', () => {
    expect(fertilizerVarietiesFor('Tomato')).toEqual([]);
    expect(fertilizerVarietiesFor('Onion')).toEqual([]);
  });
});

describe('getFertilizerRecommendation — Rice', () => {
  it('gives Kharif rice the Terai NPK band exactly as transcribed', () => {
    const rec = getFertilizerRecommendation('Rice', 'kharif', 'Terai');
    expect(rec).not.toBeNull();
    expect(rec?.zone.npk?.Low).toEqual({ n: 60, p2o5: 30, k2o: 30 });
    expect(rec?.zone.npk?.Medium).toEqual({ n: 50, p2o5: 25, k2o: 25 });
    expect(rec?.zone.npk?.High).toEqual({ n: 40, p2o5: 20, k2o: 20 });
  });

  it('gives Boro rice a much higher N rate than Kharif rice, as the booklet does', () => {
    // Boro is dry-season and fully irrigated; Kharif is monsoon-fed. The
    // booklet's own Boro figures are more than double Kharif's at every band —
    // this is the single most load-bearing cross-check in this file, because a
    // season mix-up here would under- or over-dose N by a factor of two.
    const kharif = getFertilizerRecommendation('Rice', 'kharif', 'GangeticAlluvium');
    const boro = getFertilizerRecommendation('Rice', 'boro', 'GangeticAlluvium');
    expect(kharif?.zone.npk?.Medium?.n).toBe(50);
    expect(boro?.zone.npk?.Medium?.n).toBe(130);
    expect(boro?.zone.npk?.Medium?.n).toBeGreaterThan((kharif?.zone.npk?.Medium?.n ?? 0) * 2);
  });

  it('has no NPK entry for the Hill zone in either rice table', () => {
    // The booklet leaves Hill blank for rice; a recommendation must say so via
    // an absent npk field, not a fabricated zero dose.
    expect(getFertilizerRecommendation('Rice', 'kharif', 'Hill')?.zone.npk).toBeUndefined();
    expect(getFertilizerRecommendation('Rice', 'boro', 'Hill')?.zone.npk).toBeUndefined();
  });

  it('carries the season-specific split-application note, not a generic one', () => {
    const kharif = getFertilizerRecommendation('Rice', 'kharif', 'Terai');
    const boro = getFertilizerRecommendation('Rice', 'boro', 'Terai');
    expect(kharif?.tableNote).toMatch(/panicle initiation/);
    expect(boro?.tableNote).toMatch(/¾ K as basal/);
    expect(kharif?.tableNote).not.toBe(boro?.tableNote);
  });
});

describe('getFertilizerRecommendation — Potato', () => {
  it('gives the hybrid (TPS) variety a lighter dose than the traditional tuber crop', () => {
    // The booklet's whole point in splitting these two rows: hybrid potato
    // from true potato seed needs less fertilizer than tuber-grown potato.
    const traditional = getFertilizerRecommendation('Potato', 'default', 'GangeticAlluvium');
    const hybrid = getFertilizerRecommendation('Potato', 'hybrid', 'GangeticAlluvium');
    expect(traditional?.zone.npk?.Medium).toEqual({ n: 200, p2o5: 150, k2o: 150 });
    expect(hybrid?.zone.npk?.Medium).toEqual({ n: 150, p2o5: 150, k2o: 125 });
    expect(hybrid?.zone.npk?.Medium?.n).toBeLessThan(traditional?.zone.npk?.Medium?.n ?? 0);
  });

  it('keeps the Coastal gypsum ameliorant identical across both potato varieties', () => {
    // Hybrid Potato reuses every field from the traditional table except NPK —
    // the soil amendment is a property of the coastal soil, not the variety.
    const traditional = getFertilizerRecommendation('Potato', 'default', 'Coastal');
    const hybrid = getFertilizerRecommendation('Potato', 'hybrid', 'Coastal');
    expect(hybrid?.zone.soilAmeliorant).toBe(traditional?.zone.soilAmeliorant);
    expect(hybrid?.zone.soilAmeliorant).toMatch(/Gypsum/);
  });
});

describe('getFertilizerRecommendation — Wheat, Maize, Cotton, Groundnut', () => {
  it('gives wheat a higher Hill & Terai dose than the other-soils dose', () => {
    const terai = getFertilizerRecommendation('Wheat', 'default', 'Terai');
    const alluvium = getFertilizerRecommendation('Wheat', 'default', 'GangeticAlluvium');
    expect(terai?.zone.npk?.Low).toEqual({ n: 160, p2o5: 80, k2o: 80 });
    expect(alluvium?.zone.npk?.Low).toEqual({ n: 140, p2o5: 70, k2o: 70 });
  });

  it('gives cotton a higher hybrid dose than the traditional dose, same zone', () => {
    const terai = getFertilizerRecommendation('Cotton', 'default', 'Terai');
    const gangetic = getFertilizerRecommendation('Cotton', 'default', 'GangeticAlluvium');
    // Terai carries the "Traditional" cotton band, Gangetic Alluvium the
    // "Hybrid" band, per the source table's own column grouping.
    expect(terai?.zone.npk?.Low).toEqual({ n: 100, p2o5: 50, k2o: 50 });
    expect(gangetic?.zone.npk?.Low).toEqual({ n: 120, p2o5: 60, k2o: 60 });
  });

  it('never lets K2O exceed N for groundnut, unlike every cereal table', () => {
    // Groundnut is a legume and fixes its own nitrogen; the booklet's own
    // figures give it far less N relative to K than any cereal in this file.
    // A transcription that accidentally copied a cereal's ratio here would
    // still produce plausible-looking numbers, which is exactly the failure
    // mode this assertion exists to catch.
    const rec = getFertilizerRecommendation('Groundnut', 'default', 'Terai');
    expect(rec?.zone.npk?.Low?.n).toBeLessThan(rec?.zone.npk?.Low?.k2o ?? 0);
  });

  it('gives every one-variety crop exactly one micronutrient or ameliorant line for Terai', () => {
    for (const crop of ['Wheat', 'Maize', 'Cotton', 'Groundnut'] as const) {
      const rec = getFertilizerRecommendation(crop, 'default', 'Terai');
      expect(rec, crop).not.toBeNull();
      expect(
        Boolean(rec?.zone.soilAmeliorant) || Boolean(rec?.zone.micronutrients),
        crop,
      ).toBe(true);
    }
  });
});

describe('fertilizerZonesFor', () => {
  it('lists every zone the booklet gives Kharif rice, in table order', () => {
    expect(fertilizerZonesFor('Rice', 'kharif')).toEqual([
      'Hill',
      'Terai',
      'GangeticAlluvium',
      'VindhyaAlluviumRedLateritic',
      'Coastal',
    ]);
  });

  it('returns an empty list for an unknown variety id', () => {
    expect(fertilizerZonesFor('Rice', 'not-a-real-variety')).toEqual([]);
  });
});

describe('getFertilizerRecommendation — absent cases return null, not a guess', () => {
  it('returns null for a crop with no table at all', () => {
    expect(getFertilizerRecommendation('Tomato', 'default', 'Terai')).toBeNull();
    expect(getFertilizerRecommendation('Onion', 'default', 'Terai')).toBeNull();
    expect(getFertilizerRecommendation('Sugarcane', 'default', 'Terai')).toBeNull();
    expect(getFertilizerRecommendation('Soybean', 'default', 'Terai')).toBeNull();
  });

  it('returns null for a variety id the crop does not have', () => {
    expect(getFertilizerRecommendation('Wheat', 'kharif', 'Terai')).toBeNull();
    expect(getFertilizerRecommendation('Rice', 'default', 'Terai')).toBeNull();
  });

  it('resolves the Hill zone (Darjeeling) with no NPK figure, rather than null or a fabricated dose', () => {
    // The booklet lists Darjeeling under Hill for every crop table here but
    // gives it no NPK figures — the zone row exists (so the district list is
    // still worth showing), it simply carries no dose. That is a real,
    // resolvable zone with an absent `npk`, distinct from a zone the table
    // never mentions at all (which getFertilizerRecommendation returns null
    // for, asserted above for a wrong variety/crop).
    const zones = fertilizerZonesFor('Wheat', 'default');
    expect(zones).toContain('Hill');
    const rec = getFertilizerRecommendation('Wheat', 'default', 'Hill');
    expect(rec).not.toBeNull();
    expect(rec?.zone.npk).toBeUndefined();
  });

  it('returns null for a zone id that plainly does not exist', () => {
    expect(
      getFertilizerRecommendation('Wheat', 'default', 'NotARealZone' as never),
    ).toBeNull();
  });
});

describe('classifyNutrient — a single soil-test reading against the standard bands', () => {
  it('classifies nitrogen using the 280/560 kg/ha bands', () => {
    expect(classifyNutrient(279, 'n')).toBe('Low');
    expect(classifyNutrient(280, 'n')).toBe('Medium'); // boundary is inclusive of Medium
    expect(classifyNutrient(400, 'n')).toBe('Medium');
    expect(classifyNutrient(560, 'n')).toBe('Medium'); // boundary is inclusive of Medium
    expect(classifyNutrient(561, 'n')).toBe('High');
  });

  it('classifies phosphorus using the 10/25 kg/ha bands', () => {
    expect(classifyNutrient(9.9, 'p2o5')).toBe('Low');
    expect(classifyNutrient(10, 'p2o5')).toBe('Medium');
    expect(classifyNutrient(25, 'p2o5')).toBe('Medium');
    expect(classifyNutrient(25.1, 'p2o5')).toBe('High');
  });

  it('classifies potassium using the 108/280 kg/ha bands', () => {
    expect(classifyNutrient(107, 'k2o')).toBe('Low');
    expect(classifyNutrient(108, 'k2o')).toBe('Medium');
    expect(classifyNutrient(280, 'k2o')).toBe('Medium');
    expect(classifyNutrient(281, 'k2o')).toBe('High');
  });

  it('treats a reading of exactly zero as Low, not a crash or NaN', () => {
    expect(classifyNutrient(0, 'n')).toBe('Low');
    expect(classifyNutrient(0, 'p2o5')).toBe('Low');
    expect(classifyNutrient(0, 'k2o')).toBe('Low');
  });
});

describe('classifySoilFertility — the worst-of-three rule', () => {
  it('reports High only when all three nutrients are High', () => {
    expect(classifySoilFertility({ n: 600, p2o5: 30, k2o: 300 })).toBe('High');
  });

  it('reports Low when just one nutrient is Low, even if the other two are High', () => {
    // This is the load-bearing behaviour: a soil plentiful in P and K but short
    // of N must not be reported as fertile, because N would still limit the
    // crop regardless of how much P and K are available.
    expect(classifySoilFertility({ n: 200, p2o5: 30, k2o: 300 })).toBe('Low');
    expect(classifySoilFertility({ n: 600, p2o5: 5, k2o: 300 })).toBe('Low');
    expect(classifySoilFertility({ n: 600, p2o5: 30, k2o: 50 })).toBe('Low');
  });

  it('reports Medium when no nutrient is Low but at least one is Medium', () => {
    expect(classifySoilFertility({ n: 400, p2o5: 30, k2o: 300 })).toBe('Medium');
  });

  it('agrees with getFertilizerRecommendation NPK bands via the same FertilityLevel type', () => {
    // A farmer's soil-test reading should resolve to a level that plugs
    // straight into an existing zone's npk record without a second mapping
    // step — this is the whole point of sharing the FertilityLevel type.
    const level = classifySoilFertility({ n: 250, p2o5: 30, k2o: 300 });
    const rec = getFertilizerRecommendation('Rice', 'kharif', 'Terai');
    expect(rec?.zone.npk?.[level]).toBeDefined();
  });
});

describe('the product boundary — no chemical or dosing language beyond NPK/micronutrients', () => {
  // Mirrors diseaseVision.test.ts's own forbidden-word check. This module is
  // about a published fertilizer/soil-amendment schedule, not pest or disease
  // treatment, so pesticide/fungicide language should never appear in it.
  const FORBIDDEN = ['fungicide', 'pesticide', 'insecticide'];

  it('names no pesticide/fungicide/insecticide anywhere in the transcribed tables', () => {
    for (const crop of FERTILIZER_COVERED_CROPS) {
      for (const table of fertilizerVarietiesFor(crop)) {
        for (const zone of table.zones) {
          const text = [
            zone.soilAmeliorant,
            zone.manureOrBiofertilizer,
            zone.sulphur,
            zone.micronutrients,
            zone.remarks,
            table.note,
          ]
            .filter((value): value is string => Boolean(value))
            .join(' ')
            .toLowerCase();
          for (const word of FORBIDDEN) {
            expect(text, `${crop}/${table.varietyId}/${zone.zone}`).not.toContain(word);
          }
        }
      }
    }
  });
});
