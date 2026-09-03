import type { Crop, Farm, Farmer, Recommendation, Settings, Soil, SoilQualityReading, WaterQualityReading } from '../types';
import type { DiseaseRiskAssessment, IrrigationPlan, WaterBalanceState } from '../services';

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
  /** Optional soil lab tests (V2.2). Absent = none entered; cleared = remove. */
  qualityTests?: SoilQualityReading;
  /** Optional irrigation-water lab tests (V2.2). Absent = none entered. */
  waterTests?: WaterQualityReading;
}

export interface AppData {
  farmer: Farmer | null;
  profiles: FarmProfile[];
  settings: Settings;
}

/**
 * Where a farm's measured soil profile has got to, for the cards that would
 * otherwise have to render a bare "unavailable".
 *
 * The profile is fetched in the background and can take tens of seconds, so
 * "not here yet" and "will never be here" look identical on screen unless the
 * store says which. It reported neither before, which is why the pH card
 * appeared broken rather than pending: `pending` and `unreachable` were both
 * indistinguishable from `noData`.
 *
 * Deliberately NOT persisted. It is a fact about the last attempt, not about the
 * soil, and a stored copy would still be claiming an outage long after the
 * provider recovered.
 */
export type SoilFetchStatus =
  /** A background fetch is in flight for this soil record. */
  | 'pending'
  /** The backend could not be reached; nothing is known, and this will retry. */
  | 'unreachable'
  /** The provider answered and has no usable profile for this coordinate. */
  | 'noData';

/** Recommendation plus the weather it was based on, for display. */
export interface RecommendationView {
  recommendation: Recommendation;
  fromCache: boolean;
  /** True when no weather (live or cached) was available. */
  weatherMissing: boolean;
  /** Multi-day irrigation plan (roadmap Feature 5), or null without daily data. */
  plan: IrrigationPlan | null;
  /**
   * Weather-based disease risk (roadmap Version 1.3 Feature 9), or null when no
   * daily series was available to assess. Advisory only — it is derived from the
   * same weather but never influences `recommendation` (docs/11 §12).
   */
  diseaseRisk: DiseaseRiskAssessment | null;
  /**
   * Root-zone water balance behind this advice (Decision Logic §4b), or null
   * when the engine had no daily series and fell back to the single-day
   * requirement.
   */
  waterBalance: WaterBalanceState | null;
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

/**
 * Today's irrigation checklist plus lifetime savings, read from the water
 * ledger. Answers "how much is to be done, how much is already done, and how
 * much water have I saved".
 */
export interface WaterProgress {
  /** Local calendar date this progress refers to (YYYY-MM-DD). */
  date: string;
  /** Litres advised today; 0 when no irrigation is advised. */
  targetLiters: number;
  /** Advised run time today in minutes; 0 when no irrigation is advised. */
  targetMinutes: number;
  appliedLiters: number;
  appliedMinutes: number;
  /** Litres credited as saved today (see services/waterSavings.creditedSaving). */
  savedTodayLiters: number;
  /** Litres credited as saved across every day in the ledger. */
  savedLifetimeLiters: number;
  /** How many days the ledger has recorded for this farm. */
  daysTracked: number;
}
