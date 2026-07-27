/**
 * AppNotification — a scheduled reminder (docs/12_Product_Roadmap_v2.md
 * Feature 7 — Smart Notifications).
 *
 * Notifications are scheduled from recommendation timing (irrigation reminder
 * at the recommended time, rainfall warning ahead of a rainy plan day) and
 * stored locally, so they survive reloads and work fully offline. Text is NOT
 * stored — it is rendered in the farmer's current language from `kind` +
 * `context` at display/fire time.
 */
export const NOTIFICATION_KINDS = ['irrigation-reminder', 'rainfall-warning'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface AppNotification {
  id: string;
  farmId: string;
  kind: NotificationKind;
  /** ISO-8601 timestamp when the notification becomes due. */
  dueAt: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 delivery timestamp, or null while undelivered. */
  deliveredAt: string | null;
  /** Structured values used to render the localized title/body. */
  context: {
    farmName: string;
    /** Irrigation reminder: planned volume in litres. */
    volumeLiters?: number;
    /** Rainfall warning: expected effective rain in mm. */
    rainMm?: number;
    /** Rainfall warning: plan offset of the rainy day (1 = tomorrow). */
    dayOffset?: number;
  };
}
