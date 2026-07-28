import type { CropName, Season } from '../types';

/**
 * Regional agricultural knowledge (docs/10_Knowledge_Base.md §9;
 * docs/12_Product_Roadmap_v2.md Feature 8).
 *
 * The dataset is bundled with the app rather than fetched — the most
 * offline-first form of a "locally cached dataset" (roadmap requirement:
 * "The system shall continue operating offline using locally cached datasets
 * whenever possible"). It contains no decision logic; the engine reads the
 * seasonal ETo factor through decisionParameters.ts (docs/11 §9) and the UI
 * reads calendar/guidance facts for display.
 */

/** Month ranges for the Indian cropping seasons (docs/10 §9.1). */
export function getSeasonForMonth(month: number): Season {
  if (month >= 6 && month <= 9) return 'Kharif';
  if (month >= 3 && month <= 5) return 'Zaid';
  return 'Rabi';
}

/** Season for an ISO timestamp or YYYY-MM-DD date, in local time. */
export function getSeasonForDate(isoOrDate: string): Season {
  return getSeasonForMonth(new Date(isoOrDate).getMonth() + 1);
}

/** Typical Indian sowing/harvest windows per crop (docs/10 §9.2). */
export interface CropCalendarEntry {
  /** First and last typical sowing month (1–12). */
  sowingMonths: readonly [number, number];
  /** First and last typical harvest month (1–12). */
  harvestMonths: readonly [number, number];
  /** The season this crop is mainly grown in. */
  mainSeason: Season;
}

export const CROP_CALENDAR: Record<CropName, CropCalendarEntry> = {
  Rice: { sowingMonths: [6, 7], harvestMonths: [10, 12], mainSeason: 'Kharif' },
  Wheat: { sowingMonths: [11, 12], harvestMonths: [3, 4], mainSeason: 'Rabi' },
  Maize: { sowingMonths: [6, 7], harvestMonths: [9, 10], mainSeason: 'Kharif' },
  Cotton: { sowingMonths: [4, 5], harvestMonths: [10, 1], mainSeason: 'Kharif' },
  Sugarcane: { sowingMonths: [2, 3], harvestMonths: [12, 3], mainSeason: 'Zaid' },
  Soybean: { sowingMonths: [6, 7], harvestMonths: [9, 10], mainSeason: 'Kharif' },
  Groundnut: { sowingMonths: [6, 7], harvestMonths: [10, 11], mainSeason: 'Kharif' },
  Tomato: { sowingMonths: [10, 12], harvestMonths: [1, 4], mainSeason: 'Rabi' },
  Potato: { sowingMonths: [10, 11], harvestMonths: [1, 3], mainSeason: 'Rabi' },
  Onion: { sowingMonths: [10, 11], harvestMonths: [3, 4], mainSeason: 'Rabi' },
};

/** Seasonal guidance for the dashboard card (docs/10 §9.3). */
export interface SeasonalGuidance {
  season: Season;
  cropMainSeason: Season;
  /** True when the crop is currently in its main growing season. */
  inMainSeason: boolean;
  sowingMonths: readonly [number, number];
  harvestMonths: readonly [number, number];
}

/** Resolve the seasonal guidance for a crop at a given time. */
export function getSeasonalGuidance(crop: CropName, now: string): SeasonalGuidance {
  const season = getSeasonForDate(now);
  const calendar = CROP_CALENDAR[crop];
  return {
    season,
    cropMainSeason: calendar.mainSeason,
    inMainSeason: calendar.mainSeason === season,
    sowingMonths: calendar.sowingMonths,
    harvestMonths: calendar.harvestMonths,
  };
}
