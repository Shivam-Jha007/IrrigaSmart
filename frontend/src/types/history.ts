/**
 * HistoryRecord — a stored reference to a previous recommendation
 * (docs/03_Data_Models.md).
 *
 * History enables users to review previous irrigation advice, ordered
 * chronologically (docs/05_UI_UX_Spec.md History Screen).
 */
export interface HistoryRecord {
  id: string;
  farmId: string;
  recommendationId: string;
  /** ISO-8601 timestamp; used for chronological ordering. */
  generatedDate: string;
  /**
   * Whether the farmer actually irrigated. Future scope — not captured in the
   * MVP (docs/03_Data_Models.md).
   */
  actualIrrigationPerformed?: boolean;
}
