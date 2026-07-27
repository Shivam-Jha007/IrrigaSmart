/**
 * IrrigationSchedule — planned irrigation activities.
 *
 * FUTURE / not implemented in the MVP (docs/03_Data_Models.md, docs/11_Decision_Logic.md §10).
 * The MVP generates one on-demand recommendation per farm per day and does not
 * produce or persist schedules. This type exists for forward compatibility only
 * and is intentionally not wired into any MVP flow.
 */
export interface IrrigationSchedule {
  id: string;
  farmId: string;
  /** ISO-8601 date (YYYY-MM-DD). */
  date: string;
  /** Time of day, e.g. "06:00". */
  time: string;
  /** Planned application depth in millimetres. */
  plannedWaterAmountMm: number;
  status: 'Planned' | 'Completed' | 'Skipped';
}
