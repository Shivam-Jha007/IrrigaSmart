import type { IrrigationMethod, WaterSavings } from '../types';
import { METHOD_EFFICIENCY, SAVINGS_BASELINE_METHOD } from './decisionParameters';

/**
 * Water savings (docs/11_Decision_Logic.md §6).
 *
 * Deterministic and pure, like the rest of the engine.
 *
 * The comparison is deliberately made PER DAY OF CROP DEMAND rather than per
 * irrigation event. Both the baseline habit and the advised schedule ultimately
 * have to meet the same crop demand, so comparing them day by day isolates the
 * only two things IrrigaSmart actually changes:
 *
 *   1. rainfall is credited against demand instead of ignored, and
 *   2. water is applied through the farm's own method rather than by flooding.
 *
 * That framing matters for honesty. Counting a whole baseline irrigation as
 * "saved" every time the app says "Monitor Tomorrow" would inflate the total,
 * because a skipped day's deficit simply carries into the next one and gets
 * irrigated then. Attributing savings to efficiency and rain credit avoids that
 * double-count entirely, and holds regardless of how often either schedule
 * waters.
 */

export interface SavingsInput {
  /** Weather-adjusted crop water demand for the day in mm (ETc_adj). */
  demandMm: number;
  /** Effective rainfall for the day in mm (Pe). */
  effectiveRainMm: number;
  /** The farm's irrigation method. */
  method: IrrigationMethod;
  /** Farm area in square metres. */
  areaM2: number;
}

export function computeWaterSavings(input: SavingsInput): WaterSavings {
  const { demandMm, effectiveRainMm, method, areaM2 } = input;

  const baselineEfficiency = METHOD_EFFICIENCY[SAVINGS_BASELINE_METHOD];
  const farmEfficiency = METHOD_EFFICIENCY[method];

  // Baseline habit: flood irrigation sized to the full crop demand, giving no
  // credit for rain that already fell.
  const baselineDepth = demandMm / baselineEfficiency;
  // What the advised schedule applies for the same demand.
  const scheduledDepth = Math.max(0, demandMm - effectiveRainMm) / farmEfficiency;

  // Attribution. Rain can only offset demand it actually covers, hence the cap.
  const fromRainfallDepth = Math.min(effectiveRainMm, demandMm) / farmEfficiency;
  const fromMethodDepth = demandMm * (1 / baselineEfficiency - 1 / farmEfficiency);

  return {
    todayLiters: Math.max(0, Math.round((baselineDepth - scheduledDepth) * areaM2)),
    fromRainfallLiters: Math.max(0, Math.round(fromRainfallDepth * areaM2)),
    fromMethodLiters: Math.max(0, Math.round(fromMethodDepth * areaM2)),
    baselineLiters: Math.round(baselineDepth * areaM2),
  };
}

/**
 * Litres to credit as actually saved for a day.
 *
 * A day that needed no irrigation earns the full advised saving: the rain did
 * the work and there was nothing for the farmer to do. A day that did need
 * irrigation earns the saving in proportion to how much of the advised run was
 * logged, so the lifetime total describes water the farmer really saved rather
 * than advice they were merely shown.
 */
export function creditedSaving(
  advisedSavingLiters: number,
  targetLiters: number,
  appliedLiters: number,
): number {
  if (advisedSavingLiters <= 0) return 0;
  if (targetLiters <= 0) return advisedSavingLiters;
  const ratio = Math.min(1, Math.max(0, appliedLiters / targetLiters));
  return Math.round(advisedSavingLiters * ratio);
}
