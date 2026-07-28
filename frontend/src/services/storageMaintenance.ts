import type { AppNotification, HistoryRecord } from '../types';
import { DAY_MS, localDayString } from './dateUtils';
import { HISTORY_RETENTION_DAYS, REMINDER_RETENTION_DAYS } from './decisionParameters';

/**
 * Automatic local-storage cleanup.
 *
 * Pure functions that decide what to delete; the app store performs the
 * deletions (docs/07_Engineering_Rules.md: business logic never lives in the
 * UI, persistence never happens outside storage/).
 *
 * Nothing pruned here is irreplaceable: recommendation history is a review log,
 * and delivered reminders have already been shown. Lifetime water totals live
 * in the water ledger, which is deliberately never pruned.
 */

/**
 * History records to delete, applying two rules.
 *
 * 1. Anything older than the retention window goes.
 * 2. Within the window, only the newest record per farm per local calendar day
 *    survives.
 *
 * Rule 2 exists because the dashboard regenerates a recommendation on every
 * visit and on every farm switch, each of which appended a history record.
 * A farmer checking the app five times in a day previously got five near
 * identical entries, which made History unreadable and inflated any total
 * derived from it.
 *
 * The day bucket is keyed by farm as well as date: a farmer with two fields
 * gets one entry per field per day, not one entry between them.
 */
export function historyToPrune(
  records: HistoryRecord[],
  now: string,
  retentionDays: number = HISTORY_RETENTION_DAYS,
): HistoryRecord[] {
  const cutoff = new Date(now).getTime() - retentionDays * DAY_MS;
  const remove: HistoryRecord[] = [];
  const newestPerDay = new Map<string, HistoryRecord>();

  for (const record of records) {
    if (new Date(record.generatedDate).getTime() < cutoff) {
      remove.push(record);
      continue;
    }
    const day = `${record.farmId}:${localDayString(record.generatedDate)}`;
    const kept = newestPerDay.get(day);
    if (!kept) {
      newestPerDay.set(day, record);
    } else if (record.generatedDate > kept.generatedDate) {
      newestPerDay.set(day, record);
      remove.push(kept);
    } else {
      remove.push(record);
    }
  }

  return remove;
}

/**
 * Delivered reminders to delete. Undelivered ones are always kept, however old
 * the schedule — a reminder that never fired is still owed to the farmer.
 */
export function remindersToPrune(
  notifications: AppNotification[],
  now: string,
  retentionDays: number = REMINDER_RETENTION_DAYS,
): AppNotification[] {
  const cutoff = new Date(now).getTime() - retentionDays * DAY_MS;
  return notifications.filter(
    (n) => n.deliveredAt !== null && new Date(n.deliveredAt).getTime() < cutoff,
  );
}

/**
 * Recommendation ids no longer referenced by any surviving history record.
 * Called after history pruning so the recommendations store cannot leak rows.
 */
export function orphanedRecommendationIds(
  recommendationIds: string[],
  survivingHistory: HistoryRecord[],
): string[] {
  const referenced = new Set(survivingHistory.map((h) => h.recommendationId));
  return recommendationIds.filter((id) => !referenced.has(id));
}
