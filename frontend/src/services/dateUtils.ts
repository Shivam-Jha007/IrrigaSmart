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
