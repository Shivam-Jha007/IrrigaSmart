import { describe, expect, it } from 'vitest';
import type { MeasuredSoilProfile, SoilLayer } from '../../types';
import { SOIL_TYPES } from '../../types';
import { SOIL_HYDRAULIC_PROPERTIES } from '../knowledgeBase';
import {
  profileCarriesEveryReadProperty,
  rootZoneWater,
  sameCoordinate,
  textureDisagreement,
  topsoilPh,
} from '../soilProfile';

/**
 * Root-zone weighting (item 1).
 *
 * These are assertions, not snapshots. The whole point of the module is that a
 * farm's own measured θ replaces a generic table value, and a snapshot would
 * happily record a weighting bug as the new truth. Every expectation below is
 * derived by hand from the layer geometry.
 */

/** A layer with everything but the fields under test filled in plausibly. */
function layer(
  topCm: number,
  bottomCm: number,
  thetaFC: number,
  thetaPWP: number,
  phH2O: number | null = 6.4,
): SoilLayer {
  return {
    topCm,
    bottomCm,
    clayPct: 28.3,
    sandPct: 28.4,
    siltPct: 43.3,
    thetaFC,
    thetaPWP,
    thetaFCSource: 'soilgrids',
    thetaPWPSource: 'saxton-rawls',
    bulkDensity: 1.31,
    organicCarbonPct: 1.82,
    phH2O,
  };
}

function profile(layers: SoilLayer[], usdaTextureClass: string | null = 'clay loam'): MeasuredSoilProfile {
  return {
    layers,
    usdaTextureClass,
    provider: 'isric-soilgrids-v2',
    fetchedAt: '2026-08-09T12:00:00+05:30',
    latitude: 23.677,
    longitude: 87.685,
  };
}

/**
 * A layer as a build that predates one of these properties actually stored it:
 * the key is ABSENT, not null, and IndexedDB hands it back as `undefined`.
 *
 * The cast is the point rather than a shortcut. `SoilLayer` describes what the
 * app writes today and cannot express a record written by an older schema, so
 * the type system offers no protection against these — which is exactly why the
 * runtime guards in `topsoilPh` and `profileCarriesEveryReadProperty` exist and
 * have to be tested against the real shape.
 */
function legacyLayer(
  topCm: number,
  bottomCm: number,
  drop: 'phH2O' | 'organicCarbonPct',
): SoilLayer {
  const partial: Partial<SoilLayer> = { ...layer(topCm, bottomCm, 0.33, 0.18, 6.4) };
  delete partial[drop];
  return partial as SoilLayer;
}

/** The real reference-farm profile, as the backend returns it. */
const REFERENCE = profile([
  layer(0, 5, 0.332, 0.184),
  layer(5, 15, 0.336, 0.186),
  layer(15, 30, 0.34, 0.19),
  layer(30, 60, 0.352, 0.198),
]);

describe('rootZoneWater — thickness weighting', () => {
  it('weights by how much of the root zone each layer occupies', () => {
    // Zr 0.30 m: 5/30 of layer 1, 10/30 of layer 2, 15/30 of layer 3, none of 4.
    const { thetaFC, thetaPWP, source, coverage } = rootZoneWater('Clay Loam', REFERENCE, 0.3);
    const expectedFC = (0.332 * 5 + 0.336 * 10 + 0.34 * 15) / 30;
    const expectedPWP = (0.184 * 5 + 0.186 * 10 + 0.19 * 15) / 30;
    expect(thetaFC).toBeCloseTo(expectedFC, 10);
    expect(thetaPWP).toBeCloseTo(expectedPWP, 10);
    expect(source).toBe('measured');
    expect(coverage).toBeCloseTo(1, 10);
  });

  it('differs from a plain mean, which over-weights the thin topsoil', () => {
    // The bug this module exists to avoid: averaging the four intervals equally
    // gives the 5 cm topsoil the same say as the 30 cm layer below it. With a
    // profile that varies with depth the two answers must not coincide.
    const weighted = rootZoneWater('Clay Loam', REFERENCE, 0.6).thetaFC;
    const plainMean = REFERENCE.layers.reduce((s, l) => s + l.thetaFC, 0) / REFERENCE.layers.length;
    expect(weighted).not.toBeCloseTo(plainMean, 4);
    // Deeper layers hold more water here and occupy most of the zone, so the
    // honest weighting must sit above the naive mean.
    expect(weighted).toBeGreaterThan(plainMean);
  });

  it('ignores layers entirely below the root zone', () => {
    // A 0.1 m root zone cannot see the 30-60 cm layer at all. Adding an absurd
    // deep layer must not move the answer by even a rounding step.
    const shallow = rootZoneWater('Clay Loam', REFERENCE, 0.1);
    const withAbsurdSubsoil = rootZoneWater(
      'Clay Loam',
      profile([...REFERENCE.layers, layer(60, 200, 0.7, 0.02)]),
      0.1,
    );
    expect(withAbsurdSubsoil.thetaFC).toBeCloseTo(shallow.thetaFC, 10);
  });

  it('reports partial coverage when the root zone runs past the measurement', () => {
    // Sugarcane at 1.2 m against a profile measured to 60 cm: half covered.
    const { coverage } = rootZoneWater('Clay Loam', REFERENCE, 1.2);
    expect(coverage).toBeCloseTo(0.5, 10);
  });
});

describe('rootZoneWater — when the table must win', () => {
  const table = SOIL_HYDRAULIC_PROPERTIES['Clay Loam'];

  it('falls back for a farm with no measured profile', () => {
    // Every pre-V1.7 farm, and every farm created offline. This is the path that
    // keeps the six-row table load-bearing rather than dead code (item 18).
    const r = rootZoneWater('Clay Loam', undefined, 0.6);
    expect(r).toEqual({ thetaFC: table.thetaFC, thetaPWP: table.thetaPWP, source: 'table', coverage: 0 });
  });

  it('falls back for an empty layer list', () => {
    expect(rootZoneWater('Clay Loam', profile([]), 0.6).source).toBe('table');
  });

  it('refuses to extrapolate 60 cm of measurement across a 1.5 m root zone', () => {
    // 0.4 coverage: most of the root zone would be a guess about the subsoil
    // wearing a measurement's label. The table is the honest answer.
    const r = rootZoneWater('Clay Loam', REFERENCE, 1.5);
    expect(r.source).toBe('table');
    expect(r.coverage).toBeCloseTo(0.4, 10);
    expect(r.thetaFC).toBe(table.thetaFC);
  });

  it('falls back rather than returning a negative available water capacity', () => {
    // θPWP above θFC cannot happen downstream of the backend's validation, but
    // this is the last gate before the number becomes irrigation advice: a
    // negative AWC makes TAW negative and every figure the farmer sees nonsense.
    const inverted = profile([layer(0, 60, 0.2, 0.35)]);
    expect(rootZoneWater('Clay Loam', inverted, 0.5).source).toBe('table');
  });

  it('falls back on a physically impossible θ that slipped through', () => {
    expect(rootZoneWater('Clay Loam', profile([layer(0, 60, 5, 0.1)]), 0.5).source).toBe('table');
    expect(rootZoneWater('Clay Loam', profile([layer(0, 60, 0.4, 0)]), 0.5).source).toBe('table');
  });

  it('falls back on a root depth that is not a positive number', () => {
    for (const zr of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(rootZoneWater('Clay Loam', REFERENCE, zr).source).toBe('table');
    }
  });

  it('returns the right table row for every soil type', () => {
    for (const name of SOIL_TYPES) {
      const r = rootZoneWater(name, undefined, 0.6);
      expect(r.thetaFC).toBe(SOIL_HYDRAULIC_PROPERTIES[name].thetaFC);
      expect(r.thetaPWP).toBe(SOIL_HYDRAULIC_PROPERTIES[name].thetaPWP);
    }
  });
});

describe('rootZoneWater — the measurement actually changes the answer', () => {
  it('separates two farms the table calls identical', () => {
    // The reason item 1 exists. Both farmers answered "Clay Loam"; one sits on
    // the clay end, one on the silt end. Before V1.7 they received identical
    // advice from identical table values.
    // Clay holds more total water but grips much of it past wilting point, so
    // its AWC is the SMALLER of the two — the silt end releases more.
    const clayEnd = rootZoneWater('Clay Loam', profile([layer(0, 60, 0.4, 0.25)]), 0.5);
    const siltEnd = rootZoneWater('Clay Loam', profile([layer(0, 60, 0.34, 0.12)]), 0.5);
    expect(clayEnd.source).toBe('measured');
    expect(siltEnd.source).toBe('measured');
    const clayAwc = clayEnd.thetaFC - clayEnd.thetaPWP;
    const siltAwc = siltEnd.thetaFC - siltEnd.thetaPWP;
    // TAW is linear in AWC, so this is the ratio their TAW differs by.
    expect(siltAwc / clayAwc).toBeGreaterThan(1.4);
  });
});

describe('textureDisagreement', () => {
  it('stays quiet when the measurement agrees with the farmer', () => {
    expect(textureDisagreement('Clay Loam', REFERENCE)).toBeNull();
  });

  it('stays quiet when a different USDA class maps to the same supported name', () => {
    // "silty clay loam" and "clay loam" both map to Clay Loam. Reporting that as
    // a disagreement would be noise: the farmer's answer and the measurement do
    // not actually conflict at the app's granularity.
    expect(textureDisagreement('Clay Loam', profile([], 'silty clay loam'))).toBeNull();
  });

  it('reports a genuine disagreement without overriding the farmer', () => {
    // Advisory only — the farmer has stood in the field and a 250 m grid cell
    // has not. The function returns text to show, never a replacement value.
    expect(textureDisagreement('Sandy', REFERENCE)).toBe('clay loam');
  });

  it('stays quiet with no profile or no classified texture', () => {
    expect(textureDisagreement('Sandy', undefined)).toBeNull();
    expect(textureDisagreement('Sandy', profile([], null))).toBeNull();
  });
});

describe('topsoilPh', () => {
  it('weights the two topsoil layers by how much of 0-15cm they occupy', () => {
    // REFERENCE: 0-5cm pH 6.4, 5-15cm pH 6.4 (fixture's real values) — use a
    // profile where the two layers actually differ to prove the weighting.
    const differing = profile([layer(0, 5, 0.33, 0.18, 6.0), layer(5, 15, 0.34, 0.19, 6.8)]);
    // 5 cm at pH 6.0, 10 cm at pH 6.8, entirely within the 0-15cm topsoil.
    const expected = (6.0 * 5 + 6.8 * 10) / 15;
    expect(topsoilPh(differing)).toBeCloseTo(expected, 10);
  });

  it('ignores layers entirely below the topsoil', () => {
    const withSubsoil = profile([
      layer(0, 5, 0.33, 0.18, 6.2),
      layer(5, 15, 0.34, 0.19, 6.2),
      layer(15, 30, 0.34, 0.19, 8.5),
      layer(30, 60, 0.35, 0.2, 9.0),
    ]);
    expect(topsoilPh(withSubsoil)).toBeCloseTo(6.2, 10);
  });

  it('skips a layer with a missing reading rather than fabricating one', () => {
    // 0-5cm has no pH value; only the 5-15cm layer contributes, and the
    // average must not be dragged toward some default for the missing part.
    const partial = profile([layer(0, 5, 0.33, 0.18, null), layer(5, 15, 0.34, 0.19, 7.0)]);
    expect(topsoilPh(partial)).toBeCloseTo(7.0, 10);
  });

  it('returns null when no profile exists', () => {
    expect(topsoilPh(undefined)).toBeNull();
  });

  it('returns null when every layer is missing a reading', () => {
    const noPh = profile([layer(0, 5, 0.33, 0.18, null), layer(5, 15, 0.34, 0.19, null)]);
    expect(topsoilPh(noPh)).toBeNull();
  });

  it('returns null for an empty layer list', () => {
    expect(topsoilPh(profile([]))).toBeNull();
  });

  it('keeps a sibling reading when a legacy layer has no pH key at all', () => {
    // The regression this guard exists for. A profile stored before `phH2O` was
    // requested has no such key, so `undefined === null` is false, the layer is
    // not skipped, `undefined * cm` is NaN, and the whole topsoil mean becomes
    // NaN — one legacy layer silently blanking the pH card for a farm that has a
    // perfectly good reading at the other depth.
    const mixed = profile([legacyLayer(0, 5, 'phH2O'), layer(5, 15, 0.34, 0.19, 7.0)]);
    expect(topsoilPh(mixed)).toBeCloseTo(7.0, 10);
  });

  it('returns null when every topsoil layer predates the pH property', () => {
    const allLegacy = profile([legacyLayer(0, 5, 'phH2O'), legacyLayer(5, 15, 'phH2O')]);
    expect(topsoilPh(allLegacy)).toBeNull();
  });
});

/**
 * Whether a stored profile is complete for TODAY's readers.
 *
 * This is the predicate that decides whether an existing farm's profile is
 * refetched in the background, so both mistakes it could make are expensive:
 * saying "incomplete" when the data is fine means refetching every profile on
 * every load, and saying "complete" when a key is missing leaves that farm's
 * card blank forever with nothing visibly wrong.
 */
describe('profileCarriesEveryReadProperty', () => {
  it('accepts a profile written by the current schema', () => {
    expect(profileCarriesEveryReadProperty(REFERENCE)).toBe(true);
  });

  it('accepts a null pH, which is an answer and not an omission', () => {
    // "The provider had no usable value at this depth" is a real result from a
    // current fetch. Refetching would return the same null, so treating it as
    // incomplete would mean querying SoilGrids again on every single load.
    const withNulls = profile([layer(0, 5, 0.33, 0.18, null), layer(5, 15, 0.34, 0.19, null)]);
    expect(profileCarriesEveryReadProperty(withNulls)).toBe(true);
  });

  it('rejects a profile stored before the pH property existed', () => {
    expect(
      profileCarriesEveryReadProperty(
        profile([legacyLayer(0, 5, 'phH2O'), layer(5, 15, 0.34, 0.19, 6.4)]),
      ),
    ).toBe(false);
  });

  it('rejects a profile stored before organic carbon existed', () => {
    expect(
      profileCarriesEveryReadProperty(profile([legacyLayer(0, 5, 'organicCarbonPct')])),
    ).toBe(false);
  });

  it('rejects an empty layer list', () => {
    // Nothing to read a property from is not "complete"; a stored empty profile
    // should be refetched rather than kept forever.
    expect(profileCarriesEveryReadProperty(profile([]))).toBe(false);
  });
});

describe('sameCoordinate', () => {
  it('accepts GPS jitter and rejects a different grid cell', () => {
    expect(sameCoordinate(REFERENCE, 23.677, 87.685)).toBe(true);
    expect(sameCoordinate(REFERENCE, 23.6775, 87.6855)).toBe(true);
    // ~1 km away: a different 250 m cell, possibly a different soil, so the
    // stored profile must not be reused for it.
    expect(sameCoordinate(REFERENCE, 23.687, 87.685)).toBe(false);
    expect(sameCoordinate(REFERENCE, 23.677, 87.695)).toBe(false);
  });
});
