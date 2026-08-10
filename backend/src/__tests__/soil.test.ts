import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  parseSoilGrids,
  saxtonRawls,
  usdaTextureClass,
  validateMeasured,
} from '../soil.js';

/** Shape of the capture, so the mutated copies below stay type-checked. */
interface Capture {
  properties: {
    layers: Array<{
      name: string;
      unit_measure: { d_factor?: number };
      depths: Array<{ label: string; values: { mean: number } }>;
    }>;
  };
}

/**
 * Read from disk rather than `import`: the backend compiles as NodeNext ESM,
 * where a JSON import needs an import attribute, and leaving the capture as a
 * plain .json file keeps it diff-able against a fresh `curl`.
 */
const fixture = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('./fixtures/soilgrids.birbhum.json', import.meta.url)),
    'utf8',
  ),
) as Capture;

/**
 * Validation suite for the measured-soil path.
 *
 * The fixture is a REAL ISRIC SoilGrids v2.0 response, captured on 2026-08-09
 * for the reference farm coordinate, trimmed to the fields the parser reads.
 * Anyone can reproduce it:
 *
 *   curl "https://rest.isric.org/soilgrids/v2.0/properties/query?lon=87.685&lat=23.677\
 *   &property=clay&property=sand&property=silt&property=wv0033&property=wv1500\
 *   &property=bdod&property=soc&depth=0-5cm&depth=5-15cm&depth=15-30cm&depth=30-60cm&value=mean"
 *
 * Using a real capture rather than a hand-written object is deliberate: the two
 * unit bugs this code has to avoid (a per-property `d_factor` that is 100 for
 * bulk density but 10 for everything else, and a water content that needs
 * dividing by 100 AFTER the d_factor) are only visible against genuine values.
 */

describe('parseSoilGrids — units and shape', () => {
  const layers = parseSoilGrids(fixture);

  it('returns every requested depth, shallowest first', () => {
    expect(layers.map((l) => `${l.topCm}-${l.bottomCm}`)).toEqual([
      '0-5',
      '5-15',
      '15-30',
      '30-60',
    ]);
  });

  it('converts texture from g/kg to percentages that sum to 100', () => {
    for (const l of layers) {
      const sum = l.clayPct + l.sandPct + l.siltPct;
      expect(sum, `${l.topCm}-${l.bottomCm}cm sums to ${sum}`).toBeGreaterThan(95);
      expect(sum).toBeLessThan(105);
    }
    // Topsoil, straight from the capture: clay 283, sand 284, silt 433 g/kg.
    expect(layers[0]!.clayPct).toBeCloseTo(28.3, 6);
    expect(layers[0]!.sandPct).toBeCloseTo(28.4, 6);
    expect(layers[0]!.siltPct).toBeCloseTo(43.3, 6);
  });

  it('converts water contents to m³/m³, not to percent', () => {
    // The trap: wv0033 = 332 with d_factor 10 gives 33.2 %vol, and the water
    // balance needs 0.332 m³/m³. Missing the second division over-states every
    // soil's stored water by 100×, which would silently stop all irrigation.
    for (const l of layers) {
      expect(l.thetaFC).toBeGreaterThan(0.05);
      expect(l.thetaFC).toBeLessThan(0.7);
      expect(l.thetaPWP).toBeGreaterThan(0.01);
      expect(l.thetaPWP).toBeLessThan(l.thetaFC);
    }
    expect(layers[0]!.thetaFC).toBeCloseTo(0.332, 6);
  });

  it('applies the per-property d_factor rather than a single constant', () => {
    // bdod carries d_factor 100 (cg/cm³ → kg/dm³) while every other property
    // here carries 10. Hardcoding 10 yields ~13 kg/dm³ — denser than iron.
    for (const l of layers) {
      expect(l.bulkDensity).toBeGreaterThan(0.8);
      expect(l.bulkDensity).toBeLessThan(2.0);
    }
    expect(layers[0]!.bulkDensity).toBeCloseTo(1.31, 6);
  });

  it('converts organic carbon from g/kg to percent', () => {
    // 1% = 10 g/kg. A topsoil SOC of 1.8% is ordinary; 18% would not be.
    expect(layers[0]!.organicCarbonPct).toBeGreaterThan(0.2);
    expect(layers[0]!.organicCarbonPct).toBeLessThan(5);
  });

  it('drops a layer that is missing any required property', () => {
    const holed = {
      properties: {
        layers: fixture.properties.layers.map((l) =>
          l.name === 'wv0033'
            ? { ...l, depths: l.depths.filter((d) => d.label !== '5-15cm') }
            : l,
        ),
      },
    };
    // Skipped, not defaulted: a fabricated field capacity would be
    // indistinguishable from a measured one downstream.
    expect(parseSoilGrids(holed).map((l) => l.topCm)).toEqual([0, 15, 30]);
  });

  it('treats a missing d_factor as missing data', () => {
    const noFactor = {
      properties: {
        layers: fixture.properties.layers.map((l) =>
          l.name === 'clay' ? { ...l, unit_measure: {} } : l,
        ),
      },
    };
    expect(parseSoilGrids(noFactor)).toEqual([]);
  });

  it('returns nothing for an empty or foreign response', () => {
    expect(parseSoilGrids({})).toEqual([]);
    expect(parseSoilGrids({ properties: {} })).toEqual([]);
    expect(parseSoilGrids({ properties: { layers: [] } })).toEqual([]);
  });
});

describe('reconciliation against Saxton & Rawls', () => {
  const layers = parseSoilGrids(fixture);

  it('keeps SoilGrids field capacity, which agrees with the prediction', () => {
    // Measured at this coordinate: FC agrees to within 0.5-5.1% at every depth.
    for (const l of layers) {
      expect(l.thetaFCSource, `${l.topCm}-${l.bottomCm}cm`).toBe('soilgrids');
    }
  });

  it('substitutes the predicted wilting point, which does not', () => {
    // SoilGrids wv1500 runs 17-32% BELOW Saxton-Rawls at every depth here — a
    // systematic offset, not pixel noise. Low PWP inflates available water and
    // makes the engine wait too long, so the prediction wins.
    const substituted = layers.filter((l) => l.thetaPWPSource === 'saxton-rawls');
    expect(substituted.length).toBeGreaterThan(0);
    for (const l of substituted) {
      expect(l.thetaPWP).toBeGreaterThan(0.05);
      expect(l.thetaPWP).toBeLessThan(l.thetaFC);
    }
  });

  it('leaves a usable available water capacity after reconciliation', () => {
    // The point of the whole exercise: TAW = 1000 × (θFC − θPWP) × Zr must stay
    // positive and agronomically sane for a clay loam.
    for (const l of layers) {
      const awc = l.thetaFC - l.thetaPWP;
      expect(awc, `${l.topCm}-${l.bottomCm}cm AWC ${awc}`).toBeGreaterThan(0.05);
      expect(awc).toBeLessThan(0.30);
    }
    expect(validateMeasured(layers)).toEqual({ ok: true, reason: null });
  });

  it('keeps a measurement that errs on the safe side', () => {
    // Not symmetric by design. A HIGH wilting point under-states available water
    // and irrigates early — wasteful but safe — so the local measurement is kept
    // even when it disagrees with the prediction by more than the tolerance.
    const inflatedPwp = {
      properties: {
        layers: fixture.properties.layers.map((l) =>
          l.name === 'wv1500'
            ? { ...l, depths: l.depths.map((d) => ({ ...d, values: { mean: 250 } })) }
            : l,
        ),
      },
    };
    const parsed = parseSoilGrids(inflatedPwp);
    expect(parsed[0]!.thetaPWPSource).toBe('soilgrids');
    expect(parsed[0]!.thetaPWP).toBeCloseTo(0.25, 6);
  });

  it('rejects a physically impossible measurement in either direction', () => {
    const absurd = {
      properties: {
        layers: fixture.properties.layers.map((l) =>
          l.name === 'wv0033'
            ? { ...l, depths: l.depths.map((d) => ({ ...d, values: { mean: 9000 } })) }
            : l,
        ),
      },
    };
    // 9000 → 900 %vol → 9.0 m³/m³, which is outside THETA_MAX.
    const parsed = parseSoilGrids(absurd);
    for (const l of parsed) expect(l.thetaFCSource).toBe('saxton-rawls');
    expect(validateMeasured(parsed).ok).toBe(true);
  });
});

describe('saxtonRawls', () => {
  it('orders the retentions correctly and stays physical', () => {
    for (const [sand, clay] of [
      [0.9, 0.05],
      [0.6, 0.15],
      [0.4, 0.25],
      [0.2, 0.45],
    ] as const) {
      const { thetaFC, thetaPWP } = saxtonRawls(sand, clay, 1.5);
      expect(thetaFC).toBeGreaterThan(thetaPWP);
      expect(thetaPWP).toBeGreaterThan(0);
      expect(thetaFC).toBeLessThan(0.7);
    }
  });

  it('predicts more water held in clay than in sand', () => {
    const sandy = saxtonRawls(0.9, 0.05, 1);
    const clayey = saxtonRawls(0.2, 0.45, 1);
    expect(clayey.thetaFC).toBeGreaterThan(sandy.thetaFC);
    expect(clayey.thetaPWP).toBeGreaterThan(sandy.thetaPWP);
  });

  it('lands near the Knowledge Base table for a textbook loam', () => {
    // Table Loamy: θFC 0.27, θPWP 0.117. A ~40/40/20 loam should land nearby, or
    // one of the two sources is misunderstood.
    const { thetaFC, thetaPWP } = saxtonRawls(0.4, 0.2, 2);
    expect(Math.abs(thetaFC - 0.27)).toBeLessThan(0.06);
    expect(Math.abs(thetaPWP - 0.117)).toBeLessThan(0.06);
  });
});

describe('usdaTextureClass', () => {
  it('classifies the reference farm as the triangle does', () => {
    // sand 28.4 / silt 43.3 / clay 28.3 → clay loam by the USDA triangle.
    expect(usdaTextureClass(28.4, 43.3, 28.3)).toBe('clay loam');
  });

  it('classifies the corners and canonical mid-points', () => {
    expect(usdaTextureClass(95, 3, 2)).toBe('sand');
    expect(usdaTextureClass(82, 10, 8)).toBe('loamy sand');
    expect(usdaTextureClass(65, 25, 10)).toBe('sandy loam');
    expect(usdaTextureClass(40, 40, 20)).toBe('loam');
    expect(usdaTextureClass(20, 65, 15)).toBe('silt loam');
    expect(usdaTextureClass(8, 87, 5)).toBe('silt');
    expect(usdaTextureClass(60, 10, 30)).toBe('sandy clay loam');
    expect(usdaTextureClass(10, 55, 35)).toBe('silty clay loam');
    expect(usdaTextureClass(55, 5, 40)).toBe('sandy clay');
    expect(usdaTextureClass(5, 45, 50)).toBe('silty clay');
    expect(usdaTextureClass(20, 20, 60)).toBe('clay');
  });

  it('rejects inputs that cannot be a texture', () => {
    expect(usdaTextureClass(50, 50, 50)).toBeNull(); // sums to 150
    expect(usdaTextureClass(-1, 50, 51)).toBeNull();
    expect(usdaTextureClass(Number.NaN, 40, 40)).toBeNull();
    expect(usdaTextureClass(10, 10, 10)).toBeNull(); // sums to 30
  });
});
