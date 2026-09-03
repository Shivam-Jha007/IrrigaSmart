import type { CropName } from '../types';

/**
 * Crop salinity tolerance (V2.2) — the missing half of the water-quality story.
 *
 * WHERE THE NUMBERS COME FROM
 * FAO Irrigation and Drainage Paper 29 rev. 1 ("Water Quality for
 * Agriculture", Ayers & Westcot, 1985), Table 1: Maas & Hoffman (1977)
 * piecewise-linear tolerance — yield begins to decline past a threshold ECe
 * and falls ~a fixed % per dS/m beyond it. These figures are the same source
 * family the Knowledge Base's other tables hold themselves to (docs/10
 * scientific-integrity principle): published, region-agnostic, and stated per
 * crop rather than as one blanket threshold.
 *
 * WHY THE ENGINE NEEDS THEM
 * The leaching requirement LR = ECw / (5·ECe_threshold − ECw) (FAO-29 eq. 9,
 * steady-state convention) is a function of the CROP's tolerance as much as
 * the water's salinity: onion tolerates little (threshold 1.3 dS/m) and needs
 * aggressive leaching, cotton tolerates a lot (7.7) and needs almost none
 * until the water itself is poor. A single fixed threshold — the mistake this
 * module exists to prevent — would over-water tolerant crops and under-protect
 * sensitive ones.
 *
 * THE MODEL IS DELIBERATELY CONSERVATIVE
 * Only the THRESHOLD is used: LR is computed against the yield-decline onset,
 * not the 50%-yield point, so the extra water protects full yield rather than
 * accepting FAO-29's 100%-potential-maximisation framing versus its 90%
 * variant. The 90% convention (5·ECe − ECw) is what FAO-29 itself prints; see
 * `leachingRequirement` for why this module follows the printed form and what
 * that means.
 */

/** Maas-Hoffman piecewise parameters per crop: threshold and slope. */
export interface SalinityTolerance {
  /** ECe at which yield decline begins, dS/m (saturation extract). */
  thresholdDsm: number;
  /** Yield loss per dS/m above the threshold, % (for context; the engine uses the threshold). */
  slopePctPerDsm: number;
}

/** FAO-29 Table 1 (Maas & Hoffman 1977), threshold ECe and slope per crop. */
export const CROP_SALINITY_TOLERANCE: Record<CropName, SalinityTolerance> = {
  Rice: { thresholdDsm: 3.0, slopePctPerDsm: 12 },
  Wheat: { thresholdDsm: 6.0, slopePctPerDsm: 7.1 },
  Maize: { thresholdDsm: 1.7, slopePctPerDsm: 12 },
  Cotton: { thresholdDsm: 7.7, slopePctPerDsm: 5.2 },
  Sugarcane: { thresholdDsm: 1.7, slopePctPerDsm: 5.9 },
  Soybean: { thresholdDsm: 5.0, slopePctPerDsm: 20 },
  Groundnut: { thresholdDsm: 3.2, slopePctPerDsm: 29 },
  Tomato: { thresholdDsm: 2.5, slopePctPerDsm: 9.9 },
  Potato: { thresholdDsm: 1.7, slopePctPerDsm: 12 },
  Onion: { thresholdDsm: 1.3, slopePctPerDsm: 16 },
};

/**
 * Leaching requirement (FAO-29 eq. 9): the share of applied water that must
 * pass the root zone to keep salts in check, LR = ECw / (5·ECe − ECw).
 *
 * Returns 0 when the water is fresh enough that the crop's own uptake
 * leaves no salt to manage (ECw ≤ ~0.15·ECe_threshold covers essentially
 * every rainfed-quality water). Undefined-when the denominator goes
 * non-positive — water so saline the crop cannot be protected by leaching at
 * all (ECw ≥ half the crop's 5·threshold); the caller surfaces that as a
 * water-quality warning rather than an infinite depth.
 */
export function leachingRequirement(ecwDsm: number, crop: CropName): number | null {
  const denominator = 5 * CROP_SALINITY_TOLERANCE[crop].thresholdDsm - ecwDsm;
  if (denominator <= 0) return null;
  const lr = ecwDsm / denominator;
  if (lr <= 0) return 0;
  // The cut-off at 0.9: FAO-29 practice treats LR beyond this as "this crop
  // is not suited to this water" rather than "apply ten times the water".
  if (lr > 0.9) return null;
  return lr;
}
