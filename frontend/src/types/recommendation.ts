import type { ConfidenceLevel, RecommendationStatus } from './enums';

/**
 * Estimated water to apply (docs/11_Decision_Logic.md §6).
 *
 * Both depth and volume are returned by the engine; the UI decides which to
 * emphasize. For non-irrigation outcomes every value is 0 for the day.
 */
export interface EstimatedWaterAmount {
  /** Gross application depth in millimetres. */
  depthMm: number;
  /** Total volume in litres for the farm's area. */
  volumeLiters: number;
  /**
   * Estimated run time in minutes to apply `depthMm` at the irrigation
   * method's application rate. Optional for backward compatibility with
   * records stored before run-time estimation existed.
   */
  durationMinutes?: number;
  /** Estimated delivery across the whole field in litres per minute. */
  flowLitersPerMinute?: number;
}

/**
 * Why the engine picked this irrigation window (docs/11_Decision_Logic.md §7).
 * Presentation-level: the reason explains the chosen time to the farmer and
 * never changes the outcome.
 */
export type TimingReason =
  | 'morning-default'
  | 'hot-season'
  | 'hot-day'
  | 'windy'
  | 'cool-season'
  | 'long-run'
  | 'later-today'
  | 'evening-slot';

/**
 * The advised irrigation window (docs/11_Decision_Logic.md §7).
 *
 * A window rather than a single time, because the farmer needs to know how long
 * the run takes as well as when to open the valve.
 */
export interface IrrigationWindow {
  /** Local start time, "HH:MM". */
  start: string;
  /** Local end time, "HH:MM" — the start plus the estimated run time. */
  end: string;
  /** True when the window falls on the next calendar day. */
  nextDay: boolean;
  reason: TimingReason;
}

/**
 * Water saved by following the advised schedule (docs/11_Decision_Logic.md §6).
 *
 * Measured against the baseline practice in decisionParameters.ts: untimed
 * flood irrigation sized to the full crop demand with no credit for rain that
 * already fell. `todayLiters` is exactly `fromRainfallLiters +
 * fromMethodLiters`, so the split is a faithful attribution, not an estimate.
 */
export interface WaterSavings {
  /** Litres the advised schedule avoids today versus the baseline practice. */
  todayLiters: number;
  /** Part of `todayLiters` that comes from crediting effective rainfall. */
  fromRainfallLiters: number;
  /** Part of `todayLiters` that comes from the farm's application efficiency. */
  fromMethodLiters: number;
  /** Litres the baseline practice would have applied today. */
  baselineLiters: number;
}

/**
 * A decision factor shown with every recommendation
 * (docs/12_Product_Roadmap_v2.md Feature 4 — Recommendation Factors).
 *
 * `value` is a locale-neutral display string: either an enum member name
 * (translated by the UI via the i18n enum mappers) or a formatted number
 * (e.g. "34°C", "2.0 mm"). Enum-valued factors use these domains:
 * crop → CropName, growthStage → GrowthStage, soil → SoilType,
 * irrigationMethod → IrrigationMethod.
 */
export type FactorName =
  | 'crop'
  | 'growthStage'
  | 'temperature'
  | 'rainfall'
  | 'humidity'
  | 'wind'
  | 'soil'
  | 'irrigationMethod';

/** Direction in which the factor pushes the irrigation need/amount. */
export type FactorInfluence = 'increases' | 'decreases' | 'neutral';

/** Relative magnitude of the factor's influence. */
export type FactorStrength = 'strong' | 'moderate' | 'weak';

export interface RecommendationFactor {
  name: FactorName;
  influence: FactorInfluence;
  strength: FactorStrength;
  value: string;
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
   * Recommended start time of day (e.g. "06:00"), or null when irrigation is
   * not advised today (docs/11_Decision_Logic.md §7). Mirrors
   * `irrigationWindow.start`; kept as its own field for records stored before
   * windows existed.
   */
  recommendedTime: string | null;
  /**
   * Full advised window with run length and the reason for the timing, or null
   * when irrigation is not advised today. Optional for backward compatibility
   * with records stored before run-time estimation existed.
   */
  irrigationWindow?: IrrigationWindow | null;
  estimatedWaterAmount: EstimatedWaterAmount;
  /**
   * Water this day's advice saves versus the baseline practice. Optional for
   * backward compatibility with records stored before savings were computed.
   */
  waterSavings?: WaterSavings;
  /** Human-readable, farmer-facing explanation (Decision Engine Stage 6). */
  explanation: string;
  confidence: ConfidenceLevel;
  /** ISO-8601 timestamp of when the recommendation was generated. */
  generatedTime: string;
  /**
   * Decision factors with their relative influence (roadmap Feature 4).
   * Optional for backward compatibility with records stored before V1.2.
   */
  factors?: RecommendationFactor[];
}
