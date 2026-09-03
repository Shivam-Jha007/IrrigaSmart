import { describe, expect, it } from 'vitest';
import { CROP_SALINITY_TOLERANCE, leachingRequirement } from '../waterQuality';

/**
 * FAO-29 salinity tolerance and the leaching requirement (V2.2).
 *
 * The numbers are transcriptions, so the tests pin them against values
 * recomputed from the published FAO-29 Table 1 itself — spot-checked per
 * decade of tolerance, plus the two crops that bracket the app's range
 * (onion 1.3, cotton 7.7). The leaching formula is pinned by hand-arithmetic
 * from the FAO-29 equation: LR = ECw / (5·ECe_threshold − ECw).
 */

describe('CROP_SALINITY_TOLERANCE — FAO-29 Table 1 transcription', () => {
  it('brackets the app: onion is the most sensitive, cotton the most tolerant', () => {
    const thresholds = Object.values(CROP_SALINITY_TOLERANCE).map((t) => t.thresholdDsm);
    expect(Math.min(...thresholds)).toBe(CROP_SALINITY_TOLERANCE.Onion.thresholdDsm);
    expect(Math.max(...thresholds)).toBe(CROP_SALINITY_TOLERANCE.Cotton.thresholdDsm);
  });

  it('carries every crop in the app', () => {
    expect(Object.keys(CROP_SALINITY_TOLERANCE).length).toBe(10);
  });
});

describe('leachingRequirement — FAO-29 eq. 9', () => {
  it('is zero only when there is no salt to leach at all', () => {
    // ECw 0 = distilled-quality water: the formula's numerator is 0. Any
    // real water carries SOME salt and therefore SOME (tiny) requirement.
    expect(leachingRequirement(0, 'Cotton')).toBe(0);
    expect(leachingRequirement(0, 'Onion')).toBe(0);
    // Rain-quality water on tolerant cotton is a real but negligible figure.
    expect(leachingRequirement(0.02, 'Cotton')!).toBeLessThan(0.001);
  });

  it('matches hand-arithmetic for a mid-range case', () => {
    // Rice: 5·3.0 − 0.6 = 14.4; LR = 0.6/14.4 = 0.04166…
    expect(leachingRequirement(0.6, 'Rice')).toBeCloseTo(0.04166, 4);
  });

  it('demands more from a sensitive crop than a tolerant one for the same water', () => {
    // The whole reason the table is per-crop rather than one blanket number.
    const onion = leachingRequirement(1.0, 'Onion')!;
    const cotton = leachingRequirement(1.0, 'Cotton')!;
    expect(onion).toBeGreaterThan(cotton);
    // Onion: 1/(6.5−1) ≈ 0.18; Cotton: 1/(38.5−1) ≈ 0.027.
    expect(onion).toBeCloseTo(0.1818, 3);
    expect(cotton).toBeCloseTo(0.0267, 3);
  });

  it('returns null when the water is beyond the formula entirely', () => {
    // Onion threshold 1.3: 5·1.3 = 6.5, so ECw ≥ 3.25 makes the denominator
    // ≤ 0 — FAO-29's own unusable boundary for this crop.
    expect(leachingRequirement(3.3, 'Onion')).toBeNull();
    // Cotton threshold 7.7: the boundary is 5·7.7/2 = 19.25 dS/m — sea-water
    // territory, which is the point of the check.
    expect(leachingRequirement(20, 'Cotton')).toBeNull();
  });

  it('also returns null just inside the formula, where the answer is absurd', () => {
    // LR > 0.9 means applying more than ten times the crop's own need to wash
    // salt — the honest answer is "wrong water for this crop", not a depth.
    // Onion: ECw 3.0 → LR = 3.0/(6.5−3.0) ≈ 0.857 (still usable)…
    expect(leachingRequirement(3.0, 'Onion')).toBeCloseTo(0.857, 2);
    // …ECw 3.2 → LR = 3.2/3.3 ≈ 0.97 (past the cut-off).
    expect(leachingRequirement(3.2, 'Onion')).toBeNull();
  });
});
