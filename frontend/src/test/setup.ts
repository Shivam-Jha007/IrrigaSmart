/**
 * Test setup — guards the assumptions the golden snapshots depend on.
 *
 * vitest.config.ts pins TZ to Asia/Kolkata. If that ever stops taking effect,
 * every date-derived value in the snapshots (calendar day, season, irrigation
 * window) shifts silently and the regression net starts reporting failures that
 * have nothing to do with the code. Failing loudly here instead makes the cause
 * obvious.
 */

const OFFSET_MINUTES_IST = -330; // UTC+05:30, as getTimezoneOffset reports it.

const actual = new Date('2026-06-15T00:00:00Z').getTimezoneOffset();
if (actual !== OFFSET_MINUTES_IST) {
  throw new Error(
    `Tests expect TZ=Asia/Kolkata (offset ${OFFSET_MINUTES_IST}) but got offset ${actual}. ` +
      'Golden snapshots are timezone-dependent — check test.env.TZ in vitest.config.ts.',
  );
}
