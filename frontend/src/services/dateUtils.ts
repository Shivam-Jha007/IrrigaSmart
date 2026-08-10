/**
 * Date helpers shared by the services layer.
 *
 * Kept separate from the UI formatters in components/format.ts: these produce
 * stable, locale-independent keys used for storage and engine logic, never
 * display strings.
 */

/** Local calendar date (YYYY-MM-DD) for an ISO-8601 timestamp. */
export function localDayString(iso: string): string {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Milliseconds in one day, for age comparisons. */
export const DAY_MS = 86_400_000;

/**
 * The calendar date (YYYY-MM-DD) immediately before the given one.
 *
 * Built from the date parts rather than by subtracting DAY_MS so that days
 * which are not 24 hours long (DST transitions) still step back exactly one
 * calendar day.
 */
export function previousDayString(day: string): string {
  const parts = day.split('-').map(Number);
  const d = new Date(parts[0] ?? 1970, (parts[1] ?? 1) - 1, (parts[2] ?? 1) - 1);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dd}`;
}
