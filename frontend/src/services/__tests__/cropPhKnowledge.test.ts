import { describe, expect, it } from 'vitest';
import { CROP_NAMES } from '../../types';
import { CROP_PH_RANGE, phSuitability, TOLERANCE_MARGIN_PH } from '../cropPhKnowledge';

/**
 * Crop pH suitability (item: pH-based crop suitability).
 *
 * Assertions against hand-computed boundaries, not snapshots — the same
 * discipline as fertilizerKnowledge.test.ts, since the whole point of this
 * module is that a boundary shift has to be a deliberate, reviewable change.
 */

describe('CROP_PH_RANGE', () => {
  it('covers every supported crop with a valid, cited range', () => {
    for (const crop of CROP_NAMES) {
      const range = CROP_PH_RANGE[crop];
      expect(range, crop).toBeDefined();
      expect(range.min, crop).toBeLessThan(range.max);
      expect(range.min, crop).toBeGreaterThan(0);
      expect(range.max, crop).toBeLessThan(14);
      expect(range.source.length, crop).toBeGreaterThan(0);
    }
  });
});

describe('phSuitability — inside the optimal band', () => {
  it('reports suitable at the exact boundaries and the midpoint', () => {
    const { min, max } = CROP_PH_RANGE.Rice; // 5.5-6.5
    expect(phSuitability('Rice', min)).toBe('suitable');
    expect(phSuitability('Rice', max)).toBe('suitable');
    expect(phSuitability('Rice', (min + max) / 2)).toBe('suitable');
  });

  it('reports suitable for every crop at its own midpoint', () => {
    for (const crop of CROP_NAMES) {
      const { min, max } = CROP_PH_RANGE[crop];
      expect(phSuitability(crop, (min + max) / 2), crop).toBe('suitable');
    }
  });
});

describe('phSuitability — slightly outside the band', () => {
  it('reports slightly-outside just past the low edge, within the margin', () => {
    const { min } = CROP_PH_RANGE.Wheat; // 6.0-7.0
    expect(phSuitability('Wheat', min - 0.1)).toBe('slightly-outside');
    expect(phSuitability('Wheat', min - TOLERANCE_MARGIN_PH)).toBe('slightly-outside');
  });

  it('reports slightly-outside just past the high edge, within the margin', () => {
    const { max } = CROP_PH_RANGE.Wheat;
    expect(phSuitability('Wheat', max + 0.1)).toBe('slightly-outside');
    expect(phSuitability('Wheat', max + TOLERANCE_MARGIN_PH)).toBe('slightly-outside');
  });
});

describe('phSuitability — significant issue beyond the margin', () => {
  it('reports significant-issue just past the margin on the low side', () => {
    const { min } = CROP_PH_RANGE.Potato; // 5.0-6.5
    expect(phSuitability('Potato', min - TOLERANCE_MARGIN_PH - 0.01)).toBe('significant-issue');
  });

  it('reports significant-issue just past the margin on the high side', () => {
    const { max } = CROP_PH_RANGE.Potato;
    expect(phSuitability('Potato', max + TOLERANCE_MARGIN_PH + 0.01)).toBe('significant-issue');
  });

  it('reports significant-issue for an extreme reading on either end', () => {
    expect(phSuitability('Rice', 3.5)).toBe('significant-issue');
    expect(phSuitability('Rice', 9.5)).toBe('significant-issue');
  });
});

describe('phSuitability — margin is symmetric and shared across crops', () => {
  it('classifies the same relative distance from the band the same way for every crop', () => {
    for (const crop of CROP_NAMES) {
      const { min, max } = CROP_PH_RANGE[crop];
      // Exactly at the margin on both sides.
      expect(phSuitability(crop, min - TOLERANCE_MARGIN_PH), crop).toBe('slightly-outside');
      expect(phSuitability(crop, max + TOLERANCE_MARGIN_PH), crop).toBe('slightly-outside');
      // Just beyond the margin on both sides.
      expect(phSuitability(crop, min - TOLERANCE_MARGIN_PH - 0.05), crop).toBe('significant-issue');
      expect(phSuitability(crop, max + TOLERANCE_MARGIN_PH + 0.05), crop).toBe('significant-issue');
    }
  });
});
