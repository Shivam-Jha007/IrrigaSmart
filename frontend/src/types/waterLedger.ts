/**
 * WaterLedgerEntry — one record per farm per calendar day tracking advised
 * water, water the farmer actually applied, and water the advice saved.
 *
 * This is the store behind the water checklist: it answers "how much is to be
 * done, how much is already done, and how much have I saved so far".
 *
 * Two properties matter:
 *
 * - The id is derived from farmId + date, so re-generating a recommendation
 *   several times in one day updates the same row instead of adding another.
 *   Savings therefore can never be double-counted.
 * - The ledger is NEVER pruned. Recommendation history is age-limited
 *   (decisionParameters.HISTORY_RETENTION_DAYS), but the lifetime savings total
 *   has to survive that cleanup, and one small row per day per farm stays tiny.
 */
export interface WaterLedgerEntry {
  /** `${farmId}:${date}` — deterministic, so a day's row is written once. */
  id: string;
  farmId: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** Litres advised for the day; 0 when no irrigation was advised. */
  targetLiters: number;
  /** Estimated run time advised for the day, in minutes. */
  targetMinutes: number;
  /** Litres the farmer recorded as actually applied. */
  appliedLiters: number;
  /** Minutes the farmer recorded as actually run. */
  appliedMinutes: number;
  /**
   * Litres the day's advice would save versus the baseline practice if the plan
   * is followed in full (Recommendation.waterSavings.todayLiters).
   */
  advisedSavingLiters: number;
  /**
   * Litres actually credited as saved for the day. Equal to
   * `advisedSavingLiters` on a day that needed no irrigation, and scaled by how
   * much of the advised run the farmer logged on a day that did — so the
   * lifetime total reflects what was done, not what was merely suggested.
   */
  savedLiters: number;
  /** ISO-8601 timestamp of the last write. */
  updatedAt: string;
}
