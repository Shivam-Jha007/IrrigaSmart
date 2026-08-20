import type { CropName } from '../types';

/**
 * Crop soil-pH suitability (Knowledge Base extension, item: pH-based crop
 * suitability).
 *
 * WHY THIS EXISTS
 * A farmer picking a crop for a plot they already know the soil pH of (from a
 * Soil Health Card, a lab report, or the app's own measured SoilGrids profile
 * — see `topsoilPh` in soilProfile.ts) has a real, answerable question: is
 * this soil actually suited to this crop? Nutrient availability, root growth
 * and microbial activity all move with pH, so a crop planted well outside its
 * tolerant range under-performs regardless of how correct the irrigation
 * schedule is. This module answers that question with a plain traffic light
 * rather than a number the farmer has to interpret themselves.
 *
 * WHERE THE RANGES COME FROM
 * Each crop's SUITABLE band is the commonly cited agronomic optimum from
 * university extension and USDA/land-grant sources (not a single study), cited
 * per crop below. These are deliberately the WIDELY-TAUGHT ranges rather than
 * a single trial's result, since extension guidance is written to be safe
 * across ordinary field variation — the same standard `fertilizerKnowledge.ts`
 * holds itself to for its dosing tables.
 *
 * WHY THREE BANDS, NOT TWO
 * A binary in/out-of-range verdict throws away useful information: a soil at
 * pH 6.9 against a 5.5-6.5 optimum for rice is a minor, correctable mismatch;
 * a soil at pH 8.5 is a different problem entirely (amendment, not just
 * fertilizer choice). `TOLERANCE_MARGIN_PH` below sets how far past the
 * optimum a reading may sit before it stops being a minor mismatch, and it is
 * a single shared margin — deliberately not tuned per crop — because there is
 * no crop-specific literature on the WIDTH of the marginal zone, only on the
 * optimum itself; inventing ten different margins would dress a guess up as a
 * fact.
 */

/** A crop's agronomically optimal soil pH band (pH units, pH in water). */
export interface CropPhRange {
  min: number;
  max: number;
  /** Where the range comes from, for the UI and for future audits. */
  source: string;
}

/**
 * Optimal soil pH (H2O) by crop. Every value is the range most consistently
 * repeated across university extension and USDA guidance; where sources
 * disagreed by more than the marginal band, the more conservative (narrower,
 * more commonly cited) figure was kept.
 */
export const CROP_PH_RANGE: Record<CropName, CropPhRange> = {
  // Lowland/paddy rice tolerates and is normally grown on mildly acidic soils.
  // Source: multiple agronomy reviews of paddy rice systems consistently cite
  // 5.5-6.5 as the optimal range for nutrient availability under submergence.
  Rice: { min: 5.5, max: 6.5, source: 'Paddy rice agronomy reviews (optimal range 5.5-6.5)' },
  // Source: Michigan State University Extension, "Wheat Fertility and
  // Fertilization" — wheat grows best at pH 6.0-7.0; below 6.0 risks Mg
  // deficiency and reduced P availability.
  Wheat: { min: 6.0, max: 7.0, source: 'Michigan State University Extension (wheat, pH 6.0-7.0)' },
  // Source: Mississippi State University Extension / Bayer Crop Science —
  // corn/maize nutrient availability is optimal at pH 6.0-7.0; USDA-cited
  // general range extends to 5.8 at the low end.
  Maize: { min: 5.8, max: 7.0, source: 'Mississippi State University Extension; Bayer Crop Science (maize, pH 5.8-7.0)' },
  // Source: Yara / ICL Growing Solutions agronomy guides — cotton grows best
  // at pH 5.8-7.0, optimum near 6.5; yield loss below pH 5.5 (sandy/silt loam)
  // or 5.2 (clay loam).
  Cotton: { min: 5.8, max: 7.0, source: 'Yara / ICL Growing Solutions agronomy guides (cotton, pH 5.8-7.0)' },
  // Source: LSU AgCenter / ICL Growing Solutions — sugarcane nutrient
  // efficiency is optimal at a slightly acidic to neutral pH of 6.0-7.0.
  Sugarcane: { min: 6.0, max: 7.0, source: 'LSU AgCenter; ICL Growing Solutions (sugarcane, pH 6.0-7.0)' },
  // Source: Michigan State University Extension — soybean performs well at
  // pH 6.0-7.0, with 6.3-6.5 as the narrower ideal for nitrogen fixation.
  Soybean: { min: 6.0, max: 7.0, source: 'Michigan State University Extension (soybean, pH 6.0-7.0)' },
  // Source: North Carolina State University Extension Peanut Notes — the
  // widely cited optimum for groundnut/peanut is pH 5.8-6.5.
  Groundnut: { min: 5.8, max: 6.5, source: 'NC State University Extension Peanut Notes (groundnut, pH 5.8-6.5)' },
  // Source: University of Georgia / Penn State Extension — tomato nutrient
  // uptake is optimal at pH 6.0-6.8.
  Tomato: { min: 6.0, max: 6.8, source: 'University of Georgia; Penn State Extension (tomato, pH 6.0-6.8)' },
  // Source: University of Minnesota Extension; UMaine Cooperative Extension —
  // potato is grown on the acidic side of most field crops, optimum pH
  // 5.0-6.5, partly to suppress common scab.
  Potato: { min: 5.0, max: 6.5, source: 'University of Minnesota; UMaine Cooperative Extension (potato, pH 5.0-6.5)' },
  // Source: North Carolina State University Extension; Ohio State University
  // Extension — onion is sensitive to acid soils, optimum pH 6.0-6.8.
  Onion: { min: 6.0, max: 6.8, source: 'NC State University Extension; Ohio State University Extension (onion, pH 6.0-6.8)' },
};

/**
 * How far past a crop's optimal band a reading may sit before it stops being
 * a minor, correctable mismatch and becomes a significant issue (pH units).
 *
 * Shared across every crop rather than tuned individually — see module intro
 * for why. 0.5 pH units is roughly the width of one step on a typical Soil
 * Health Card colour scale, which keeps "slightly outside" meaning what it
 * says: a nudge, not a different soil problem.
 */
export const TOLERANCE_MARGIN_PH = 0.5;

export type PhSuitability = 'suitable' | 'slightly-outside' | 'significant-issue';

/**
 * Classify a measured soil pH against a crop's optimal range.
 *
 * `suitable` — inside the cited optimal band.
 * `slightly-outside` — within `TOLERANCE_MARGIN_PH` of the band; a correctable
 *   nudge (a modest lime or sulphur application), not a soil unsuited to the
 *   crop.
 * `significant-issue` — beyond that margin; the mismatch is large enough that
 *   nutrient availability or root growth is likely constrained regardless of
 *   fertilizer or irrigation, and amendment (not just dosing) is the relevant
 *   next step (docs/07_Engineering_Rules.md: this module states the mismatch,
 *   it does not prescribe the amendment — that remains for the extension
 *   officer, per the same product boundary as fertilizerKnowledge.ts).
 */
export function phSuitability(crop: CropName, ph: number): PhSuitability {
  const { min, max } = CROP_PH_RANGE[crop];
  if (ph >= min && ph <= max) return 'suitable';
  const distance = ph < min ? min - ph : ph - max;
  return distance <= TOLERANCE_MARGIN_PH ? 'slightly-outside' : 'significant-issue';
}
