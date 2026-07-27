import type { ConfidenceLevel, RecommendationStatus } from './enums';

/**
 * Estimated water to apply (docs/11_Decision_Logic.md §6).
 *
 * Both representations are returned by the engine; the UI decides which to
 * emphasize. For non-irrigation outcomes both values are 0 for the day.
 */
export interface EstimatedWaterAmount {
  /** Gross application depth in millimetres. */
  depthMm: number;
  /** Total volume in litres for the farm's area. */
  volumeLiters: number;
}

/**
 * Recommendation — the structured output of the Decision Engine
 * (docs/02_Decision_Engine.md, docs/03_Data_Models.md).
 *
 * The UI is responsible only for displaying this object; it performs no
 * irrigation calculations.
 */
export interface Recommendation {
  id: string;
  farmId: string;
  status: RecommendationStatus;
  /**
   * Recommended time of day (e.g. "06:00"), or null when irrigation is not
   * advised today (docs/11_Decision_Logic.md §7).
   */
  recommendedTime: string | null;
  estimatedWaterAmount: EstimatedWaterAmount;
  /** Human-readable, farmer-facing explanation (Decision Engine Stage 6). */
  explanation: string;
  confidence: ConfidenceLevel;
  /** ISO-8601 timestamp of when the recommendation was generated. */
  generatedTime: string;
}
