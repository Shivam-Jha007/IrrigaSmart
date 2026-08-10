import type { CropName } from '../types';

/**
 * Crop disease knowledge base (docs/10_Knowledge_Base.md §10;
 * docs/12_Product_Roadmap_v2.md Version 1.3 Feature 9).
 *
 * Agronomic FACTS only — which weather-driven diseases matter for each supported
 * crop and the conditions under which they infect. It contains no scoring logic
 * and no tunable knobs: those live in diseaseRisk.ts and decisionParameters.ts
 * respectively. This mirrors how knowledgeBase.ts owns Kc while
 * decisionParameters.ts owns the multipliers applied to it.
 *
 * Values are transcribed from docs/10 §10.4 and must reference an authoritative
 * source before being changed (Knowledge Base Principle 7 — Scientific
 * Integrity).
 *
 * IMPORTANT — the bands are approximations, not measurements. Published
 * infection models use hourly leaf-wetness and air temperature; the app holds
 * only daily aggregates. `maxTempMinC`/`maxTempMaxC` are therefore bands on the
 * DAILY MAXIMUM temperature and sit above the published optimum, and
 * `meanHumidityMin` is a DAILY MEAN threshold sitting below the published
 * instantaneous one. The substitution rule and its deliberate bias towards
 * warning early are documented in docs/10 §10.3.
 *
 * This module deliberately contains no fungicide, pesticide, chemical name,
 * dose, or spray interval, and no future version may add one (docs/10 §10.2).
 * The app cannot see the crop, so treatment belongs to an extension officer.
 */

/** Stable identifier for a disease, used as an i18n key suffix. */
export type DiseaseId =
  | 'riceBlast'
  | 'riceBacterialLeafBlight'
  | 'wheatStripeRust'
  | 'wheatLeafRust'
  | 'maizeTurcicumLeafBlight'
  | 'maizeCommonRust'
  | 'cottonAlternariaLeafSpot'
  | 'cottonBacterialBlight'
  | 'sugarcaneRedRot'
  | 'sugarcaneRust'
  | 'soybeanRust'
  | 'soybeanAnthracnose'
  | 'groundnutLateLeafSpot'
  | 'groundnutRust'
  | 'lateBlight'
  | 'earlyBlight'
  | 'onionPurpleBlotch'
  | 'onionDownyMildew';

/**
 * The weather window in which a disease can infect (docs/10 §10.4).
 *
 * Both conditions must hold on the same day: a temperature inside the band AND
 * surface wetness. Neither alone is sufficient (docs/10 §10.1).
 */
export interface DiseaseProfile {
  id: DiseaseId;
  /** Lower bound of the daily-maximum temperature band, °C inclusive. */
  maxTempMinC: number;
  /** Upper bound of the daily-maximum temperature band, °C inclusive. */
  maxTempMaxC: number;
  /** Daily-mean relative humidity at/above which the day counts as wet, %. */
  meanHumidityMin: number;
}

/**
 * Diseases per crop, in declaration order.
 *
 * Order is significant: docs/11 §12d breaks equal scores by declaration order so
 * the reported disease is deterministic. Each crop lists its economically
 * significant weather-driven diseases in Indian conditions, warmer-band disease
 * first where the bands differ.
 */
export const CROP_DISEASES: Record<CropName, readonly DiseaseProfile[]> = {
  Rice: [
    { id: 'riceBlast', maxTempMinC: 25, maxTempMaxC: 33, meanHumidityMin: 80 },
    { id: 'riceBacterialLeafBlight', maxTempMinC: 28, maxTempMaxC: 38, meanHumidityMin: 75 },
  ],
  Wheat: [
    { id: 'wheatStripeRust', maxTempMinC: 12, maxTempMaxC: 24, meanHumidityMin: 75 },
    { id: 'wheatLeafRust', maxTempMinC: 18, maxTempMaxC: 30, meanHumidityMin: 70 },
  ],
  Maize: [
    { id: 'maizeTurcicumLeafBlight', maxTempMinC: 22, maxTempMaxC: 32, meanHumidityMin: 80 },
    { id: 'maizeCommonRust', maxTempMinC: 20, maxTempMaxC: 30, meanHumidityMin: 80 },
  ],
  Cotton: [
    { id: 'cottonAlternariaLeafSpot', maxTempMinC: 28, maxTempMaxC: 36, meanHumidityMin: 75 },
    { id: 'cottonBacterialBlight', maxTempMinC: 32, maxTempMaxC: 40, meanHumidityMin: 75 },
  ],
  Sugarcane: [
    { id: 'sugarcaneRedRot', maxTempMinC: 28, maxTempMaxC: 36, meanHumidityMin: 75 },
    { id: 'sugarcaneRust', maxTempMinC: 24, maxTempMaxC: 32, meanHumidityMin: 80 },
  ],
  Soybean: [
    { id: 'soybeanRust', maxTempMinC: 22, maxTempMaxC: 30, meanHumidityMin: 80 },
    { id: 'soybeanAnthracnose', maxTempMinC: 28, maxTempMaxC: 35, meanHumidityMin: 80 },
  ],
  Groundnut: [
    { id: 'groundnutLateLeafSpot', maxTempMinC: 27, maxTempMaxC: 35, meanHumidityMin: 80 },
    { id: 'groundnutRust', maxTempMinC: 24, maxTempMaxC: 34, meanHumidityMin: 75 },
  ],
  Tomato: [
    { id: 'lateBlight', maxTempMinC: 16, maxTempMaxC: 26, meanHumidityMin: 80 },
    { id: 'earlyBlight', maxTempMinC: 26, maxTempMaxC: 34, meanHumidityMin: 75 },
  ],
  Potato: [
    { id: 'lateBlight', maxTempMinC: 16, maxTempMaxC: 26, meanHumidityMin: 80 },
    { id: 'earlyBlight', maxTempMinC: 26, maxTempMaxC: 34, meanHumidityMin: 75 },
  ],
  Onion: [
    { id: 'onionPurpleBlotch', maxTempMinC: 25, maxTempMaxC: 34, meanHumidityMin: 75 },
    { id: 'onionDownyMildew', maxTempMinC: 14, maxTempMaxC: 24, meanHumidityMin: 80 },
  ],
};
