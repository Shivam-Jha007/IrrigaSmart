/**
 * DepletionState — persisted root-zone depletion per farm (V1.6).
 *
 * The root-zone water balance (Decision Logic §4b) models the soil as a bucket
 * of finite capacity. Depletion `Dr` is the millimetres of water the root zone
 * is short of field capacity, updated each day by crop demand (ETc), effective
 * rainfall (Pe), and actual applied irrigation. This state is persisted so the
 * balance carries across days rather than being recomputed from a rolling
 * weather window.
 *
 * One record per farm, updated when a recommendation is generated or irrigation
 * is logged. The `validAsOfDate` is the last date for which `depletionMm` is
 * known; when generating today's recommendation, the engine rolls it forward
 * day by day to today using the daily weather series.
 */
export interface DepletionState {
  /** Farm ID this depletion state applies to. */
  farmId: string;
  /**
   * Root-zone depletion in millimetres. Zero means field capacity; TAW means
   * the permanent wilting point. The engine clamps it to [0, TAW].
   */
  depletionMm: number;
  /**
   * The calendar date (YYYY-MM-DD) this depletion value is valid for. When
   * generating a recommendation for a later date, the engine rolls this forward
   * using the daily series.
   */
  validAsOfDate: string;
  /** ISO-8601 timestamp of the last write. */
  updatedAt: string;
}
