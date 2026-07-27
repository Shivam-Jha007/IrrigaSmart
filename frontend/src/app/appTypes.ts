import type { Crop, Farm, Farmer, Recommendation, Settings, Soil } from '../types';

/**
 * A farm together with its resolved crop and soil — the complete profile the
 * decision engine needs (docs/02_Decision_Engine.md Stage 1).
 */
export interface FarmProfile {
  farm: Farm;
  crop: Crop;
  soil: Soil;
}

/** Draft used by the farm form when creating or editing a farm. */
export interface FarmDraft {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  locationLabel: string;
  area: number;
  areaUnit: Farm['areaUnit'];
  cropName: Crop['name'];
  growthStage: Crop['growthStage'];
  soilType: Soil['name'];
  irrigationMethod: Farm['irrigationMethod'];
}

export interface AppData {
  farmer: Farmer | null;
  profiles: FarmProfile[];
  settings: Settings;
}

/** Recommendation plus the weather it was based on, for display. */
export interface RecommendationView {
  recommendation: Recommendation;
  fromCache: boolean;
  /** True when no weather (live or cached) was available. */
  weatherMissing: boolean;
}

/**
 * Per-farm overview shown on the enhanced dashboard
 * (docs/12_Product_Roadmap_v2.md Feature 3). Uses already-stored data only —
 * loading summaries must never trigger network calls.
 */
export interface FarmSummary {
  farmId: string;
  /** Newest stored recommendation for the farm, if any. */
  latestRecommendation: Recommendation | null;
  /** ISO timestamp of the last cached weather write, if any. */
  weatherCachedAt: string | null;
}
