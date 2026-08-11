import { describe, expect, it } from 'vitest';
import type { MeasuredSoilProfile, SoilLayer } from '../../types';
import { SOIL_TYPES } from '../../types';
import { SOIL_HYDRAULIC_PROPERTIES } from '../knowledgeBase';
import { rootZoneWater, sameCoordinate, textureDisagreement } from '../soilProfile';

/**
 * Root-zone weighting (item 1).
 *
 * These are assertions, not snapshots. The whole point of the module is that a
 * farm's own measured θ replaces a generic table value, and a snapshot would
 * happily record a weighting bug as the new truth. Every expectation below is
 * derived by hand from the layer geometry.
 */

/** A layer with everything but the fields under test filled in plausibly. */
function layer(topCm: number, bottomCm: number, thetaFC: number, thetaPWP: number): SoilLayer {
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
