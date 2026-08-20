import type { FarmTerrain, IrrigationMethod } from '../types';
import { clamp, SLOPE } from './decisionParameters';

/**
 * Slope adjustments to the water balance and to irrigation advice
 * (V1.7 item 10; docs/11_Decision_Logic.md §3, §6).
 *
 * Slope changes two physical things the engine otherwise assumes away:
 *
 *   1. Rain that lands on a slope partly runs off before it infiltrates, so the
 *      effective rainfall credited to the root zone is lower than on the level
 *      ground `RAIN_EFF_FACTOR` was tabulated for. Crediting rain that ran away
 *      makes the engine wait too long, which is the direction that costs yield.
 *
 *   2. Water applied faster than the soil takes it in runs off too, and slope
 *      lowers that intake rate. The fix is not less water — the crop needs what
 *      it needs — but a longer, gentler run.
 *
 * EVERY FUNCTION HERE IS THE IDENTITY WHEN TERRAIN IS ABSENT OR GENTLE.
 * `terrain` is optional on `Farm`: every farm created before V1.7, and every
 * farm created while the elevation provider was unreachable, has none. Those
 * farms must produce byte-identical numbers to before this module existed
 * (item 0), so each function returns exactly 1 for `undefined`, for a
 * non-finite slope, and for any slope inside the deadband — and the golden
 * snapshots hold that.
 *
 * WHY THE THRESHOLDS ARE SO CONSERVATIVE
 * The slope figure comes from a ~90 m DEM sampled over a 300 m cross. The
 * backend module records two measured limits: it fabricates ~3% on provably
 * flat ground, and it reads ~5.7% on a hillside whose true grade is past 30%.
 * So this module may sharpen advice on ground that is probably sloped, and may
 * never reassure anyone that ground is level. Both effects are floored for the
 * same reason: an over-read slope must not be able to drive the numbers far.
 */

/** Slope in percent above the deadband, or 0 when there is nothing to act on. */
function effectiveSlope(terrain: FarmTerrain | undefined): number {
  if (!terrain) return 0;
  const slope = terrain.slopePercent;
  // A NaN would propagate through every multiplier below and silently turn the
  // whole water balance into NaN, which reads downstream as "never irrigate".
  if (typeof slope !== 'number' || !Number.isFinite(slope) || slope <= 0) return 0;
  return Math.max(0, slope - SLOPE.DEADBAND_PERCENT);
}

/**
 * Multiplier on effective rainfall for a farm's slope, in (0, 1].
 *
 * Applies on top of the soil's `RAIN_EFF_FACTOR` rather than replacing it: the
 * soil decides how much of the rain that reaches the ground infiltrates, and
 * the slope decides how much reaches it at all. They are independent questions
 * and multiplying them keeps either one adjustable without disturbing the other.
 */
export function runoffFactor(terrain: FarmTerrain | undefined): number {
  const excess = effectiveSlope(terrain);
  if (excess === 0) return 1;
  return clamp(1 - excess * SLOPE.RUNOFF_PER_PERCENT, SLOPE.RUNOFF_FLOOR, 1);
}

/**
 * Multiplier on the method's application rate for a farm's slope, in (0, 1].
 *
 * A rate multiplier below 1 lengthens the advised run for the same depth. The
 * DEPTH is deliberately untouched: the crop's requirement does not change
 * because the field is tilted, and inflating it would over-water a farm on the
 * strength of a DEM reading.
 */
export function intakeFactor(terrain: FarmTerrain | undefined): number {
  const excess = effectiveSlope(terrain);
  if (excess === 0) return 1;
  return clamp(1 - excess * SLOPE.INTAKE_PER_PERCENT, SLOPE.INTAKE_FLOOR, 1);
}

/** Methods that move water across the surface and so are exposed to slope. */
const SURFACE_METHODS: readonly IrrigationMethod[] = ['Flood', 'Furrow'];

/** Whether a method moves water across the surface, where slope acts on it. */
export function isSurfaceMethod(method: IrrigationMethod | null): boolean {
  return method !== null && SURFACE_METHODS.includes(method);
}

/**
 * The surface-irrigation advisory, decided from the two values it needs.
 *
 * Split out from `warnsSurfaceMethod` so the improvement engine can ask the same
 * question of a `FarmContext` — whose slope is a `Sourced<number | null>` and not
 * a `FarmTerrain` — without either copying the threshold or faking a terrain
 * record. One threshold, one predicate, two callers.
 */
export function surfaceMethodWarned(
  slopePercent: number | null | undefined,
  method: IrrigationMethod | null,
): boolean {
  if (!isSurfaceMethod(method)) return false;
  if (typeof slopePercent !== 'number' || !Number.isFinite(slopePercent)) return false;
  // Note this uses the warning threshold, not the deadband: the advisory is a
  // sentence of advice with no cost if it is wrong, so it is worth showing on
  // ground the runoff maths deliberately declines to act on.
  return slopePercent > SLOPE.METHOD_WARNING_PERCENT;
}

/**
 * Whether to show the surface-irrigation advisory for this farm.
 *
 * ADVISORY ONLY. Nothing downstream reads this to change a number: the
 * farmer's recorded method stays exactly as they set it, and the depth,
 * duration and savings are all computed from that method regardless. A farmer
 * who floods a terraced field knows something the DEM does not.
 */
export function warnsSurfaceMethod(
  terrain: FarmTerrain | undefined,
  method: IrrigationMethod,
): boolean {
  return surfaceMethodWarned(terrain?.slopePercent, method);
}
