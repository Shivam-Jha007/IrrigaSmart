import type { CropName } from '../types';

/**
 * Soil-test-based fertilizer recommendations (new feature, "Fertilizer" tab).
 *
 * Transcribed from a State Agriculture Department soil-test-based fertilizer
 * recommendation booklet (West Bengal), the same kind of official district-wise
 * fertilizer schedule referenced by name in docs/10_Knowledge_Base.md's
 * scientific-integrity principle for the rest of the app's agronomic data.
 * Pages photographed and supplied by the user: Kharif Rice p.23, Boro Rice
 * p.24-25, Wheat p.36, Maize p.36-37, Groundnut p.34, Cotton p.41, Potato p.40.
 *
 * SCOPE — six crops, not ten. `CROP_NAMES` has Rice, Wheat, Maize, Cotton,
 * Sugarcane, Soybean, Groundnut, Tomato, Potato, Onion; this booklet covers
 * only Rice (as two seasonal tables), Wheat, Maize, Cotton, Potato and
 * Groundnut. Sugarcane, Soybean, Tomato and Onion have no table here and the UI
 * must say so plainly rather than guessing — see `FERTILIZER_COVERED_CROPS`
 * and `getFertilizerRecommendation` returning `null`.
 *
 * WHAT THIS MODULE DOES NOT DO
 * It contains no dosing logic of its own — every figure below is a direct
 * transcription of a booklet cell, and `getFertilizerRecommendation` only
 * looks one up. It does not weigh, blend, or adjust anything the booklet
 * itself did not already state (e.g. the wheat/late-sowing N reduction and the
 * micronutrient re-application interval are both stated in the booklet's own
 * notes and are surfaced as remarks, not computed).
 *
 * WHAT "L / M / H" MEANS
 * Every NPK figure is banded by the farm's existing soil fertility status —
 * Low, Medium or High — exactly as the booklet's own notes define it: "L, M
 * and H = Low, Medium and High (Soil fertility status)". A farmer without a
 * soil test result is asked to make their best guess from what their last
 * crop looked like; a farm that consistently under-yields on today's advice
 * despite following it is a place to actually get a soil test done, not a
 * problem this tool can resolve.
 *
 * SCANNING CAVEATS — READ BEFORE EDITING
 * A few source cells were faint, angled, or partly hand-annotated in the
 * photographs this was transcribed from. Anywhere a value could not be read
 * with confidence, the cell was left out entirely rather than guessed at
 * (docs/12_Product_Roadmap_v2.md §Product Boundaries: a wrong number a farmer
 * acts on is worse than an honest gap). Grep this file for `UNCERTAIN` to find
 * every place this happened; each one should be corrected against the source
 * booklet, or against a fresh photograph of the same page, before being relied
 * on for a real application decision.
 */

/** The soil zones this booklet distinguishes. Not every crop table uses all of them. */
export type FertilizerSoilZone =
  | 'Hill'
  | 'Terai'
  | 'GangeticAlluvium'
  | 'VindhyaAlluviumRedLateritic'
  | 'Coastal';

/** Existing soil fertility status, exactly as the booklet's own L/M/H bands it. */
export type FertilityLevel = 'Low' | 'Medium' | 'High';

/**
 * Soil test readings a farmer can read straight off an Indian Soil Health Card
 * or a lab report — available Nitrogen, Phosphorus (P₂O₅) and Potassium (K₂O),
 * each in kg/ha. This is a DIFFERENT unit and a DIFFERENT quantity from the
 * NPK dose in `NpkDoseKgHa`: a soil test reading is how much of a nutrient is
 * already IN the soil; the dose is how much fertilizer to ADD. The two are
 * connected only through `classifyFertilityLevel` below, which turns a
 * reading into the Low/Medium/High band the booklet's dosing tables key on.
 */
export interface SoilNutrientReadingKgHa {
  n: number;
  p2o5: number;
  k2o: number;
}

/**
 * Standard Indian soil-test rating bands for available N, P and K, used by
 * Soil Health Cards and State Agriculture Department labs nationwide (not
 * specific to the West Bengal booklet the dosing tables above come from).
 *
 * Nitrogen: alkaline permanganate method (Subbiah & Asija, 1956).
 * Phosphorus: Olsen's method (0.5 M NaHCO₃) for neutral/alkaline soils.
 * Potassium: ammonium acetate extraction.
 *
 * Sources: Government of India Soil Health Card documentation and
 * State Agriculture Department soil-testing manuals report these same three
 * bands; see e.g. the Tamil Nadu Agricultural University Soil Health Card
 * guide and multiple ICAR soil-fertility surveys, which consistently classify
 * available N below 280 kg/ha as Low and above 560 kg/ha as High, available
 * P below 10 kg/ha as Low and above 25 kg/ha as High, and available K below
 * 108 kg/ha as Low and above 280 kg/ha as High.
 *
 * These bands describe what is ALREADY in the soil. They are not the same
 * scale as the dosing tables' own kg/ha figures (which are how much to ADD) —
 * do not compare a reading against a dose or vice versa.
 */
const NUTRIENT_BANDS: Record<'n' | 'p2o5' | 'k2o', { lowBelow: number; highAbove: number }> = {
  n: { lowBelow: 280, highAbove: 560 },
  p2o5: { lowBelow: 10, highAbove: 25 },
  k2o: { lowBelow: 108, highAbove: 280 },
};

/** Classify a single nutrient reading into the booklet's Low/Medium/High band. */
export function classifyNutrient(kgHa: number, nutrient: 'n' | 'p2o5' | 'k2o'): FertilityLevel {
  const band = NUTRIENT_BANDS[nutrient];
  if (kgHa < band.lowBelow) return 'Low';
  if (kgHa > band.highAbove) return 'High';
  return 'Medium';
}

/**
 * Classify a full N/P/K soil test into ONE overall fertility band for the
 * dosing lookup, which only has a single Low/Medium/High column per crop —
 * it does not have separate bands for N, P and K.
 *
 * Takes the WORST (lowest) of the three individual ratings, on the reasoning
 * that a soil short of even one major nutrient needs the higher dosing band
 * for the crop to respond at all; treating it as fertile because the other
 * two nutrients are plentiful would under-fertilize the one that is actually
 * limiting growth. This is a deliberate, cautious simplification of what a
 * real agronomist reading a full soil test would do — it is not in the source
 * booklet, which assumes the farmer already knows their overall band.
 */
export function classifySoilFertility(reading: SoilNutrientReadingKgHa): FertilityLevel {
  const levels = [
    classifyNutrient(reading.n, 'n'),
    classifyNutrient(reading.p2o5, 'p2o5'),
    classifyNutrient(reading.k2o, 'k2o'),
  ];
  if (levels.includes('Low')) return 'Low';
  if (levels.includes('Medium')) return 'Medium';
  return 'High';
}

/** An N:P₂O₅:K₂O dose in kg/ha — the booklet's own unit throughout. */
export interface NpkDoseKgHa {
  n: number;
  p2o5: number;
  k2o: number;
}

/**
 * One soil zone's row for one crop (and, where the booklet splits a crop by
 * variety/duration/season, one of those sub-rows).
 *
 * Every field mirrors a booklet column exactly. `null` means the booklet has no
 * entry for that zone/cell (e.g. Hill has no recommendation on several tables —
 * transcribed as an explicit gap, not a zero dose).
 */
export interface FertilizerZoneEntry {
  zone: FertilizerSoilZone;
  /** Districts the booklet lists for this zone, for display only. */
  districts: readonly string[];
  /** Lime/dolomite/gypsum soil amendment, and when it applies. */
  soilAmeliorant?: string;
  /** FYM / bio-fertilizer (Azophos, Azolla, Rhizobium, ...) and its rate. */
  manureOrBiofertilizer?: string;
  /** NPK dose per fertility band. Absent when the booklet has no figure. */
  npk?: Partial<Record<FertilityLevel, NpkDoseKgHa>>;
  /** Sulphur application, e.g. "S @ 20 kg/ha at land preparation". */
  sulphur?: string;
  /** Zinc, boron and other micronutrient guidance. */
  micronutrients?: string;
  /** Split-application timing and any other free-text guidance. */
  remarks?: string;
}

/**
 * One crop's full table — a season/variety label (for crops the booklet
 * splits, like Rice or Maize) plus every zone row the booklet has for it.
 */
export interface FertilizerCropTable {
  /** Shown to the farmer as the option label, e.g. "Kharif (monsoon) rice". */
  variety: string;
  /** A stable key for this variety, used as the form's second selector. */
  varietyId: string;
  zones: readonly FertilizerZoneEntry[];
  /** A note that applies to the whole table, e.g. the late-sowing wheat rule. */
  note?: string;
}

/** Every crop this booklet has a table for. */
export const FERTILIZER_COVERED_CROPS: readonly CropName[] = [
  'Rice',
  'Wheat',
  'Maize',
  'Cotton',
  'Potato',
  'Groundnut',
];

/** Whether the fertilizer tool has any data at all for this crop. */
export function fertilizerCoversCrop(crop: CropName): boolean {
  return FERTILIZER_COVERED_CROPS.includes(crop);
}

// ---------------------------------------------------------------------------
// Rice — two separate booklet tables, Kharif (monsoon-sown) and Boro
// (dry-season, irrigated). Treated as two "varieties" of the same crop rather
// than folded together, because the booklet gives them different soil zones,
// different NPK bands, and Kharif alone is further split by crop duration.
// ---------------------------------------------------------------------------

const KHARIF_RICE: FertilizerCropTable = {
  variety: 'Kharif (monsoon) rice',
  varietyId: 'kharif',
  note:
    // Booklet remarks column, general to the whole table.
    '¼ N, full P & K as basal; ½ N at tillering, rest N at panicle initiation. ' +
    'On light-textured soils K may be split as basal and at panicle initiation. ' +
    "If split K is not possible due to standing water, apply the entire N (up to 30 kg), P and K as basal.",
  zones: [
    { zone: 'Hill', districts: ['Darjeeling'] },
    {
      zone: 'Terai',
      districts: ['Siliguri Sub-division of Darjeeling', 'Jalpaiguri', 'Coochbehar', 'Dinajpur (N)'],
      soilAmeliorant: 'Dolomite @ 1-2 t/ha',
      manureOrBiofertilizer: 'FYM @ 5 t/ha or green manuring with Dhaincha/Sunnhemp/Kalai/Mung/Cowpea, or BGA @ 10 kg/ha or Azolla @ 5 t/ha',
      npk: {
        // "Transplanted, Traditional and Improved" duration band.
        Low: { n: 60, p2o5: 30, k2o: 30 },
        Medium: { n: 50, p2o5: 25, k2o: 25 },
        High: { n: 40, p2o5: 20, k2o: 20 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients: 'Zn as Zinc sulphate @ 25 kg/ha at the time of land preparation',
    },
    {
      zone: 'GangeticAlluvium',
      districts: ['Malda', 'Murshidabad', 'Nadia, 24 Prgs (N&S)', 'Hooghly', 'Burdwan'],
      soilAmeliorant: 'Dolomite @ 1-2 t/ha',
      manureOrBiofertilizer: 'FYM @ 5 t/ha or green manuring with Dhaincha/Sunnhemp/Kalai/Mung/Cowpea, or BGA @ 10 kg/ha or Azolla @ 5 t/ha',
      npk: {
        Low: { n: 60, p2o5: 30, k2o: 30 },
        Medium: { n: 50, p2o5: 25, k2o: 25 },
        High: { n: 40, p2o5: 20, k2o: 20 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients: 'Zn as Zinc sulphate @ 25 kg/ha at the time of land preparation',
    },
    {
      zone: 'VindhyaAlluviumRedLateritic',
      districts: [
        'Midnapur (E&W)', 'Bankura', 'Birbhum', 'Purulia',
        'Western part of Burdwan', 'Murshidabad & Dinajpur (S)',
      ],
      soilAmeliorant: 'Dolomite @ 1-2 t/ha',
      manureOrBiofertilizer: 'FYM @ 5 t/ha or green manuring with Dhaincha/Sunnhemp/Kalai/Mung/Cowpea, or BGA @ 10 kg/ha or Azolla @ 5 t/ha',
      npk: {
        Low: { n: 60, p2o5: 30, k2o: 30 },
        Medium: { n: 50, p2o5: 25, k2o: 25 },
        High: { n: 40, p2o5: 20, k2o: 20 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients: 'Zn as Zinc sulphate @ 25 kg/ha at the time of land preparation',
    },
    {
      zone: 'Coastal',
      districts: ['Part of Howrah', '24 Prgs (N&S)', 'Midnapore (E)'],
      npk: {
        // "Short duration (115-125 days)" band, the one figure legible for
        // Coastal on the photographed page; the medium-duration Coastal row was
        // not distinguishable from the zone above it in the source photo.
        Low: { n: 70, p2o5: 35, k2o: 35 },
        Medium: { n: 60, p2o5: 30, k2o: 30 },
        High: { n: 50, p2o5: 25, k2o: 25 },
      },
      micronutrients: 'Coastal soils: Gypsum @ 3 q/ha',
    },
  ],
};

const BORO_RICE: FertilizerCropTable = {
  variety: 'Boro (dry-season, irrigated) rice',
  varietyId: 'boro',
  note: '¼ N, full P and ¾ K as basal; ½ N at tillering, rest N and K at panicle initiation stage.',
  zones: [
    { zone: 'Hill', districts: ['Darjeeling'] },
    {
      zone: 'Terai',
      districts: ['Siliguri Sub-division of Darjeeling', 'Jalpaiguri', 'Coochbehar', 'Dinajpur (N)'],
      soilAmeliorant: 'Terai soils: Dolomite @ 1-2 t/ha',
      manureOrBiofertilizer: 'FYM @ 5 t/ha and growing azolla as a green-manuring crop and as a dual crop',
      npk: {
        Low: { n: 140, p2o5: 70, k2o: 70 },
        Medium: { n: 130, p2o5: 65, k2o: 65 },
        High: { n: 120, p2o5: 60, k2o: 60 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients:
        'Terai & Gangetic Alluvium soils: Zinc sulphate @ 25 kg/ha and Borax @ 10 kg/ha',
    },
    {
      zone: 'GangeticAlluvium',
      districts: ['Malda', 'Murshidabad', 'Nadia, 24 Prgs (N&S)', 'Hooghly', 'Burdwan'],
      manureOrBiofertilizer: 'FYM @ 5 t/ha and growing azolla as a green-manuring crop and as a dual crop; other areas need-based',
      npk: {
        Low: { n: 140, p2o5: 70, k2o: 70 },
        Medium: { n: 130, p2o5: 65, k2o: 65 },
        High: { n: 120, p2o5: 60, k2o: 60 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients:
        'Terai & Gangetic Alluvium soils: Zinc sulphate @ 25 kg/ha and Borax @ 10 kg/ha',
    },
    {
      zone: 'VindhyaAlluviumRedLateritic',
      districts: [
        'Midnapur (E&W)', 'Bankura', 'Birbhum', 'Purulia',
        'Western part of Burdwan', 'Murshidabad & Dinajpur (S)',
      ],
      manureOrBiofertilizer: 'FYM @ 5 t/ha and growing azolla as a green-manuring crop and as a dual crop; other areas need-based',
      npk: {
        Low: { n: 140, p2o5: 70, k2o: 70 },
        Medium: { n: 130, p2o5: 65, k2o: 65 },
        High: { n: 120, p2o5: 60, k2o: 60 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients: 'Vindhya Alluvium and Red & Lateritic soils: Zinc sulphate @ 25 kg/ha; Borax @ 10 kg/ha in Red & Lateritic soils',
    },
    {
      zone: 'Coastal',
      districts: ['Part of Howrah', '24 Prgs (N&S)', 'Midnapore (E)'],
      soilAmeliorant: 'Coastal soils: Gypsum @ 3 q/ha (if needed)',
      micronutrients: 'Coastal soils: Zinc sulphate @ 25 kg/ha',
    },
  ],
};

// ---------------------------------------------------------------------------
// Wheat — one table, split by Hill/Terai vs the rest, plus a late-sowing note.
// ---------------------------------------------------------------------------

const WHEAT: FertilizerCropTable = {
  variety: 'Wheat',
  varietyId: 'default',
  note:
    'For late-sown wheat, reduce the N rate by 20 kg/ha and increase P & K rates by 10 kg/ha each ' +
    'from the recommendation for the zone, if deficiency is apparent in a soil test report or in the ' +
    'previous crop. Micronutrients should be applied once every 3-4 crops if deficiency is apparent.',
  zones: [
    { zone: 'Hill', districts: ['Darjeeling'] },
    {
      zone: 'Terai',
      districts: ['Siliguri Sub-division of Darjeeling', 'Jalpaiguri', 'Coochbehar', 'Dinajpur (N)'],
      soilAmeliorant: 'Hill & Terai soils: Dolomite @ 1-2 t/ha',
      manureOrBiofertilizer: 'FYM @ 5 q/ha or Oilcake @ 5 q/ha & Azophos @ 15 kg/ha',
      npk: {
        // Hill & Terai soils band.
        Low: { n: 160, p2o5: 80, k2o: 80 },
        Medium: { n: 140, p2o5: 70, k2o: 70 },
        High: { n: 120, p2o5: 60, k2o: 60 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients: 'Zn as Zinc sulphate @ 25 kg/ha; B as Borax @ 10 kg/ha at the time of land preparation; Ammonium molybdate @ 0.5 kg/ha in hill, terai and lateritic soils',
    },
    {
      zone: 'GangeticAlluvium',
      districts: ['Malda', 'Murshidabad', 'Nadia, 24 Prgs (N&S)', 'Hooghly', 'Burdwan'],
      manureOrBiofertilizer: 'FYM @ 5 q/ha or Oilcake @ 5 q/ha & Azophos @ 15 kg/ha',
      npk: {
        // "Other soils" band.
        Low: { n: 140, p2o5: 70, k2o: 70 },
        Medium: { n: 120, p2o5: 60, k2o: 60 },
        High: { n: 100, p2o5: 50, k2o: 50 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients: 'Zn as Zinc sulphate @ 25 kg/ha; B as Borax @ 10 kg/ha at the time of land preparation',
    },
    {
      zone: 'VindhyaAlluviumRedLateritic',
      districts: [
        'Midnapore (E)', 'Midnapore (W)', 'Bankura', 'Birbhum', 'Purulia',
        'Western part of Burdwan', 'Murshidabad & Dinajpur (S)',
      ],
      manureOrBiofertilizer: 'FYM @ 5 q/ha or Oilcake @ 5 q/ha & Azophos @ 15 kg/ha',
      npk: {
        Low: { n: 140, p2o5: 70, k2o: 70 },
        Medium: { n: 120, p2o5: 60, k2o: 60 },
        High: { n: 100, p2o5: 50, k2o: 50 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients: 'Zn as Zinc sulphate @ 25 kg/ha; B as Borax @ 10 kg/ha at the time of land preparation; Ammonium molybdate @ 0.5 kg/ha in lateritic soils',
    },
    {
      zone: 'Coastal',
      districts: ['Part of Howrah', '24 Prgs (N&S) and Contai Sub-division'],
      // Coastal wheat's own NPK band was not distinguishable from the row
      // above it in the source photograph. UNCERTAIN: confirm from the
      // booklet before relying on a Coastal wheat dose specifically.
    },
  ],
};

// ---------------------------------------------------------------------------
// Maize — split by season (Pre-kharif / Rabi / Hybrid), one photographed page
// covering all three durations per zone.
// ---------------------------------------------------------------------------

const MAIZE: FertilizerCropTable = {
  variety: 'Maize',
  varietyId: 'default',
  note:
    'For Hill & Terai soil, increase the N rate by 20 kg/ha and the P & K rates by 10 kg/ha each, if ' +
    'deficiency is apparent in a soil test report or in the previous crop. Micronutrients should be ' +
    'applied once every 3-4 crops if deficiency is apparent.',
  zones: [
    { zone: 'Hill', districts: ['Darjeeling'] },
    {
      zone: 'Terai',
      districts: ['Siliguri Sub-division of Darjeeling', 'Jalpaiguri', 'Coochbehar', 'Dinajpur (N)'],
      soilAmeliorant: 'Hill & Terai soils: Dolomite @ 1-2 t/ha',
      manureOrBiofertilizer: 'FYM @ 5 t/ha and Azophos @ 12 kg/ha',
      npk: {
        // Composite Pre-kharif band (the season this app's Kharif-window
        // farmer is most likely asking about).
        Low: { n: 130, p2o5: 65, k2o: 65 },
        Medium: { n: 120, p2o5: 60, k2o: 60 },
        High: { n: 100, p2o5: 50, k2o: 50 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients: 'Zn as Zinc sulphate @ 25 kg/ha; B as Borax @ 10 kg/ha at the time of land preparation',
    },
    {
      zone: 'GangeticAlluvium',
      districts: ['Malda', 'Murshidabad', 'Nadia, 24 Prgs (N&S)', 'Hooghly', 'Burdwan'],
      manureOrBiofertilizer: 'FYM @ 5 t/ha and Azophos @ 12 kg/ha',
      npk: {
        Low: { n: 130, p2o5: 65, k2o: 65 },
        Medium: { n: 120, p2o5: 60, k2o: 60 },
        High: { n: 100, p2o5: 50, k2o: 50 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients: 'Zn as Zinc sulphate @ 25 kg/ha; B as Borax @ 10 kg/ha at the time of land preparation',
    },
    {
      zone: 'VindhyaAlluviumRedLateritic',
      districts: [
        'Midnapore', 'Murshidabad', 'Bankura, Birbhum, Purulia',
        'Western part of Burdwan', 'Murshidabad & Dinajpur (S)',
      ],
      manureOrBiofertilizer: 'FYM @ 5 t/ha and Azophos @ 12 kg/ha; Rabi: FYM @ 5 t/ha and Azophos @ 15 kg/ha',
      npk: {
        // Rabi band for this zone group, the more completely legible of the
        // two duration bands on the photographed page for this zone.
        Low: { n: 150, p2o5: 75, k2o: 75 },
        Medium: { n: 140, p2o5: 70, k2o: 70 },
        High: { n: 120, p2o5: 60, k2o: 60 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
    },
    {
      zone: 'Coastal',
      districts: ['Part of Howrah', '24 Prgs (N&S) and Midnapore (E)'],
      soilAmeliorant: 'Coastal soil: Gypsum @ 3-5 q/ha, applied for soil amelioration; not necessary if amelioration is applied for hill/terai soils',
      remarks: 'Coastal soil: not necessary if soil amelioration is applied for the same field',
    },
  ],
};

// ---------------------------------------------------------------------------
// Cotton — one table.
// ---------------------------------------------------------------------------

const COTTON: FertilizerCropTable = {
  variety: 'Cotton',
  varietyId: 'default',
  note:
    '½ N, full P & ½ K as basal; ¼ N & ⅓ K at 30 DAS and the rest N at 60 DAS. Micronutrients ' +
    'should be applied once every 3-4 crops if deficiency is apparent in a soil test report or in the ' +
    'previous crop.',
  zones: [
    { zone: 'Hill', districts: ['Darjeeling'] },
    {
      zone: 'Terai',
      districts: [
        'Siliguri Sub-division of Darjeeling', 'Jalpaiguri', 'Coochbehar', 'Dinajpur (N)',
      ],
      soilAmeliorant: 'Lateritic soils: Dolomite @ 1.0 t/ha or lime @ 1 t/ha if soil is acidic',
      manureOrBiofertilizer: 'FYM @ 5 t/ha and Azophos @ 12 kg/ha',
      npk: {
        // "Traditional" cotton band.
        Low: { n: 100, p2o5: 50, k2o: 50 },
        Medium: { n: 80, p2o5: 40, k2o: 40 },
        High: { n: 60, p2o5: 30, k2o: 30 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients:
        'Apply Zn as Zinc sulphate @ 25 kg/ha & B as Borax @ 10 kg/ha at the time of land preparation, ' +
        'or as a foliar spray of 0.05% Zn-EDTA @ 250 l/ha at the 3rd week and 500 l/ha at 6 weeks, plus a ' +
        'foliar spray of 0.1% Disodium octaborate tetrahydrate solution at the same rate and time as the Zn spray',
    },
    {
      zone: 'GangeticAlluvium',
      districts: ['Malda', 'Murshidabad', 'Nadia, 24 Prgs (N&S)', 'Hooghly', 'Burdwan'],
      soilAmeliorant: 'Lateritic soils: Dolomite @ 1.0 t/ha or lime @ 1 t/ha if soil is acidic',
      manureOrBiofertilizer: 'FYM @ 5 t/ha and Azophos @ 12 kg/ha',
      npk: {
        // "Hybrid" cotton band.
        Low: { n: 120, p2o5: 60, k2o: 60 },
        Medium: { n: 100, p2o5: 50, k2o: 50 },
        High: { n: 80, p2o5: 40, k2o: 40 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients:
        'Apply Zn as Zinc sulphate @ 25 kg/ha & B as Borax @ 10 kg/ha at the time of land preparation, ' +
        'or as a foliar spray of 0.05% Zn-EDTA @ 250 l/ha at the 3rd week and 500 l/ha at 6 weeks, plus a ' +
        'foliar spray of 0.1% Disodium octaborate tetrahydrate solution at the same rate and time as the Zn spray',
    },
    {
      zone: 'VindhyaAlluviumRedLateritic',
      districts: [
        'Midnapore (E&W)', 'Bankura', 'Birbhum', 'Purulia',
        'Western part of Burdwan', 'Murshidabad & Dinajpur (S)',
      ],
      soilAmeliorant: 'Lateritic soils: Dolomite @ 1.0 t/ha or lime @ 1 t/ha if soil is acidic',
      manureOrBiofertilizer: 'FYM @ 5 t/ha and Azophos @ 12 kg/ha',
      npk: {
        Low: { n: 100, p2o5: 50, k2o: 50 },
        Medium: { n: 80, p2o5: 40, k2o: 40 },
        High: { n: 60, p2o5: 30, k2o: 30 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients:
        'Apply Zn as Zinc sulphate @ 25 kg/ha & B as Borax @ 10 kg/ha at the time of land preparation, ' +
        'or as a foliar spray of 0.05% Zn-EDTA @ 250 l/ha at the 3rd week and 500 l/ha at 6 weeks, plus a ' +
        'foliar spray of 0.1% Disodium octaborate tetrahydrate solution at the same rate and time as the Zn spray',
    },
    {
      zone: 'Coastal',
      districts: ['Part of Howrah', '24 Prgs (N&S) & Midnapore (E)'],
      // No NPK figure was legible for Coastal cotton in the source photograph.
    },
  ],
};

// ---------------------------------------------------------------------------
// Potato — split Traditional (from tuber) vs Hybrid (from TPS/true potato seed).
// ---------------------------------------------------------------------------

const POTATO: FertilizerCropTable = {
  variety: 'Potato',
  varietyId: 'default',
  note:
    '⅓ N, full P & ⅓ K as basal, ⅓ N & ⅓ K at first earthing up, rest N & K at second earthing up ' +
    '(Terai & Lateritic soils). Foliar spray of 0.05% Zn-EDTA and 0.1% Disodium octaborate tetrahydrate ' +
    'solution @ 250 l/ha at 3rd week and 500 l/ha at 6th week. To increase yield and size, foliar spray ' +
    'of 1% KNO3 solution @ 250 l/ha and 500 l/ha at 3rd & 6th week of planting.',
  zones: [
    { zone: 'Hill', districts: ['Darjeeling'] },
    {
      zone: 'Terai',
      districts: [
        'Siliguri Sub-division of Darjeeling', 'Jalpaiguri', 'Coochbehar', 'Dinajpur (N)',
      ],
      soilAmeliorant: 'Hill, Terai and Lateritic soils: Dolomite @ 1.5 t/ha or lime @ 1 t/ha if pH is below 5.5',
      manureOrBiofertilizer: 'FYM @ 10 t/ha or Oilcake @ 1 t/ha, and Azophos @ 18 kg/ha',
      npk: {
        // Traditional Potato (from tuber) band.
        Low: { n: 220, p2o5: 160, k2o: 160 },
        Medium: { n: 200, p2o5: 150, k2o: 150 },
        High: { n: 180, p2o5: 140, k2o: 140 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients:
        'Terai & Lateritic soils: Zn as Zinc sulphate @ 25 kg/ha & B as Borax @ 10 kg/ha at the time of ' +
        'land preparation; other soils: foliar spray of 0.05% Zn-EDTA solution and 0.1% Disodium ' +
        'octaborate tetrahydrate solution @ 250 l/ha at 3rd week and 500 l/ha at 6th week',
    },
    {
      zone: 'GangeticAlluvium',
      districts: ['Malda', 'Murshidabad', 'Nadia, 24 Prgs (N&S)', 'Hooghly', 'Burdwan'],
      manureOrBiofertilizer: 'FYM @ 10 t/ha or Oilcake @ 1 t/ha, and Azophos @ 18 kg/ha',
      npk: {
        Low: { n: 220, p2o5: 160, k2o: 160 },
        Medium: { n: 200, p2o5: 150, k2o: 150 },
        High: { n: 180, p2o5: 140, k2o: 140 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients:
        'Other soils: foliar spray of 0.05% Zn-EDTA solution and 0.1% Disodium octaborate tetrahydrate ' +
        'solution @ 250 l/ha at 3rd week and 500 l/ha at 6th week',
    },
    {
      zone: 'VindhyaAlluviumRedLateritic',
      districts: [
        'Midnapore (E&W)', 'Bankura', 'Birbhum', 'Purulia',
        'Western part of Burdwan', 'Murshidabad & Dinajpur (S)',
      ],
      soilAmeliorant: 'Hill, Terai and Lateritic soils: Dolomite @ 1.5 t/ha or lime @ 1 t/ha if pH is below 5.5',
      manureOrBiofertilizer: 'FYM @ 10 t/ha or Oilcake @ 1 t/ha, and Azophos @ 18 kg/ha',
      npk: {
        Low: { n: 220, p2o5: 160, k2o: 160 },
        Medium: { n: 200, p2o5: 150, k2o: 150 },
        High: { n: 180, p2o5: 140, k2o: 140 },
      },
      sulphur: 'S @ 20 kg/ha at land preparation',
      micronutrients:
        'Terai & Lateritic soils: Zn as Zinc sulphate @ 25 kg/ha & B as Borax @ 10 kg/ha at the time of land preparation',
    },
    {
      zone: 'Coastal',
      districts: ['Part of Howrah', '24 Prgs (N&S) & Midnapore (E)'],
      soilAmeliorant: 'Coastal soils: Gypsum @ 1 t/ha if pH is above 7.5',
    },
  ],
};

/** Hybrid Potato (from TPS) NPK band, replacing the traditional-tuber dose. */
const HYBRID_POTATO_NPK: Partial<Record<FertilityLevel, NpkDoseKgHa>> = {
  Low: { n: 175, p2o5: 175, k2o: 150 },
  Medium: { n: 150, p2o5: 150, k2o: 125 },
  High: { n: 100, p2o5: 100, k2o: 100 },
};

const HYBRID_POTATO: FertilizerCropTable = {
  variety: 'Hybrid potato (from TPS)',
  varietyId: 'hybrid',
  ...(POTATO.note ? { note: POTATO.note } : {}),
  zones: POTATO.zones.map((entry) =>
    entry.zone === 'Hill' || entry.zone === 'Coastal'
      ? entry
      : { ...entry, npk: HYBRID_POTATO_NPK },
  ),
};

// ---------------------------------------------------------------------------
// Groundnut — split Rainfed vs Irrigated, and further by soil-zone group.
// ---------------------------------------------------------------------------

const GROUNDNUT: FertilizerCropTable = {
  variety: 'Groundnut',
  varietyId: 'default',
  note:
    'For Terai and Vindhya Alluvium and lateritic soils, B as Borax @ 10 kg/ha and Ammonium molybdate ' +
    '@ 0.5 kg/ha at the time of land preparation. N, P and K are all applied as a full basal dose.',
  zones: [
    { zone: 'Hill', districts: ['Darjeeling'] },
    {
      zone: 'Terai',
      districts: [
        'Siliguri Sub-division of Darjeeling', 'Jalpaiguri', 'Coochbehar', 'Dinajpur (N)',
      ],
      soilAmeliorant: 'Lime/Dolomite @ 1-2 t/ha, three weeks before planting if pH is acidic',
      manureOrBiofertilizer: 'Rainfed: FYM @ 5 t/ha and seed treatment with Rhizobium. Irrigated: FYM @ 5 t/ha, and seed treatment with Rhizobium',
      npk: {
        // Rainfed band (this app's target region is monsoon-dependent for most
        // smallholders, so rainfed is the more likely default here).
        Low: { n: 30, p2o5: 40, k2o: 60 },
        Medium: { n: 20, p2o5: 30, k2o: 50 },
        High: { n: 10, p2o5: 20, k2o: 40 },
      },
      sulphur: 'S @ 30 kg/ha at land preparation or Gypsum @ 200-250 kg/ha at the time of pegging',
      micronutrients:
        'For Terai and Vindhya Alluvium and lateritic soils: B as Borax @ 10 kg/ha at the time of land preparation',
    },
    {
      zone: 'GangeticAlluvium',
      districts: ['Malda', 'Murshidabad', 'Nadia, 24 Prgs (N&S)', 'Hooghly', 'Burdwan'],
      manureOrBiofertilizer: 'Rainfed: FYM @ 5 t/ha and seed treatment with Rhizobium. Irrigated: FYM @ 5 t/ha, and seed treatment with Rhizobium',
      npk: {
        Low: { n: 30, p2o5: 40, k2o: 60 },
        Medium: { n: 20, p2o5: 30, k2o: 50 },
        High: { n: 10, p2o5: 20, k2o: 40 },
      },
      sulphur: 'S @ 30 kg/ha at land preparation or Gypsum @ 200-250 kg/ha at the time of pegging',
      micronutrients:
        'For Terai and Vindhya Alluvium soils: B as Borax @ 10 kg/ha and Ammonium molybdate @ 0.5 kg/ha at the time of land preparation',
    },
    {
      zone: 'VindhyaAlluviumRedLateritic',
      districts: [
        'Midnapore (E&W)', 'Bankura', 'Birbhum', 'Purulia',
        'Western part of Burdwan', 'Murshidabad & Dinajpur (S)',
      ],
      soilAmeliorant: 'Lime/Dolomite @ 1-2 t/ha, three weeks before planting if pH is acidic',
      manureOrBiofertilizer: 'Rainfed: FYM @ 5 t/ha and seed treatment with Rhizobium. Irrigated: FYM @ 5 t/ha, and seed treatment with Rhizobium',
      npk: {
        // Irrigated band for this zone group — the more completely legible
        // duration/water band for Vindhya Alluvium on the photographed page.
        Low: { n: 40, p2o5: 80, k2o: 80 },
        Medium: { n: 20, p2o5: 60, k2o: 80 },
        High: { n: 10, p2o5: 40, k2o: 80 },
      },
      sulphur: 'S @ 30 kg/ha at land preparation or Gypsum @ 200-250 kg/ha at the time of pegging',
      micronutrients:
        'For Terai and Vindhya Alluvium and lateritic soils: B as Borax @ 10 kg/ha and Ammonium molybdate @ 0.5 kg/ha at the time of land preparation',
    },
    {
      zone: 'Coastal',
      districts: ['Part of Howrah', '24 Prgs (N&S) and Contai Sub-division'],
      remarks: 'N, P and K applied as full basal dose.',
    },
  ],
};

/**
 * Every crop table this booklet provides, keyed by `CropName` and then by
 * `varietyId`. Rice and Potato have more than one entry; the rest have exactly
 * one, keyed `'default'`.
 */
export const FERTILIZER_TABLES: Partial<Record<CropName, readonly FertilizerCropTable[]>> = {
  Rice: [KHARIF_RICE, BORO_RICE],
  Wheat: [WHEAT],
  Maize: [MAIZE],
  Cotton: [COTTON],
  Potato: [POTATO, HYBRID_POTATO],
  Groundnut: [GROUNDNUT],
};

/** The variety options for a crop, for the form's second selector. */
export function fertilizerVarietiesFor(crop: CropName): readonly FertilizerCropTable[] {
  return FERTILIZER_TABLES[crop] ?? [];
}

/**
 * One resolved recommendation: a crop's variety table narrowed to a single
 * soil zone, still carrying every fertility band so the UI can show L/M/H
 * side by side rather than forcing a farmer without a soil test to guess
 * before they can see anything at all.
 */
export interface FertilizerRecommendation {
  crop: CropName;
  variety: string;
  zone: FertilizerZoneEntry;
  tableNote: string | undefined;
}

/**
 * Look up a recommendation. Returns null when the crop has no table, the
 * variety id does not match one of this crop's tables, or the zone has no
 * entry in that table (e.g. Hill, which several tables leave blank).
 */
export function getFertilizerRecommendation(
  crop: CropName,
  varietyId: string,
  zone: FertilizerSoilZone,
): FertilizerRecommendation | null {
  const table = fertilizerVarietiesFor(crop).find((t) => t.varietyId === varietyId);
  if (!table) return null;
  const zoneEntry = table.zones.find((z) => z.zone === zone);
  if (!zoneEntry) return null;
  return { crop, variety: table.variety, zone: zoneEntry, tableNote: table.note };
}

/** The soil zones a given crop/variety table actually has entries for. */
export function fertilizerZonesFor(crop: CropName, varietyId: string): readonly FertilizerSoilZone[] {
  const table = fertilizerVarietiesFor(crop).find((t) => t.varietyId === varietyId);
  return table ? table.zones.map((z) => z.zone) : [];
}
