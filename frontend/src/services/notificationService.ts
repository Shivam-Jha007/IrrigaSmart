import type { AppNotification, Farm, Language, Recommendation } from '../types';
import type { IrrigationPlan } from './decisionEngine';
import { localeFor, type TranslateFn } from '../i18n';
import { formatLiters, formatWeekdayIso } from '../components/format';

/**
 * Notification service (docs/12_Product_Roadmap_v2.md Feature 7 — Smart
 * Notifications).
 *
 * Notifications are scheduled from recommendation timing: an irrigation
 * reminder fires at the recommended irrigation time, and a rainfall warning
 * fires ahead of a rainy plan day. Everything is local — no push server —
 * which keeps the feature fully offline-first (roadmap Architectural
 * Principles). Browser Notification delivery happens while the app is open;
 * the due-check in the app store re-arms on every launch and interval, so a
 * reminder due while the app was closed is delivered on next open.
 *
 * Text is never stored: records carry structured context and are rendered in
 * the farmer's current language at display time.
 */

/** Effective rain (mm) in a single plan day that triggers a rainfall warning. */
export const RAIN_WARNING_MM = 10;
/** Rainfall warnings look at plan offsets 1..N (N days ahead). */
export const RAIN_WARNING_WINDOW_DAYS = 2;

export interface NotificationInput {
  farm: Farm;
  recommendation: Recommendation;
  plan: IrrigationPlan | null;
  /** ISO-8601 current time, injected for determinism. */
  now: string;
  newId(prefix: string): string;
}

/** The next occurrence of "HH:MM" (local) strictly after `now`, as ISO. */
function nextOccurrence(time: string, now: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const candidate = new Date(now);
  candidate.setHours(hours ?? 6, minutes ?? 0, 0, 0);
  if (candidate.getTime() <= new Date(now).getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate.toISOString();
}

/** 06:00 local on a YYYY-MM-DD date, as ISO. */
function morningOf(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  d.setHours(6, 0, 0, 0);
  return d.toISOString();
}

/**
 * Build the notifications implied by a fresh recommendation + plan.
 * Pure: returns records to persist; callers handle dedupe and storage.
 */
export function planNotifications(input: NotificationInput): AppNotification[] {
  const { farm, recommendation, plan, now, newId } = input;
  const notifications: AppNotification[] = [];

  if (recommendation.status === 'Irrigate Today' && recommendation.recommendedTime) {
    notifications.push({
      id: newId('notif'),
      farmId: farm.id,
      kind: 'irrigation-reminder',
      source: 'auto',
      dueAt: nextOccurrence(recommendation.recommendedTime, now),
      createdAt: now,
      deliveredAt: null,
      context: {
        farmName: farm.name,
        volumeLiters: recommendation.estimatedWaterAmount.volumeLiters,
      },
    });
  }

  if (plan) {
    for (const day of plan.days) {
      if (day.offsetDays < 1 || day.offsetDays > RAIN_WARNING_WINDOW_DAYS) continue;
      if (day.rainfallMm < RAIN_WARNING_MM) continue;
      notifications.push({
        id: newId('notif'),
        farmId: farm.id,
        kind: 'rainfall-warning',
        source: 'auto',
        dueAt: morningOf(day.date),
        createdAt: now,
        deliveredAt: null,
        context: {
          farmName: farm.name,
          rainMm: day.rainfallMm,
          dayOffset: day.offsetDays,
        },
      });
    }
  }

  return notifications;
}

/**
 * Build a farmer-chosen irrigation reminder for today at "HH:MM" (Feature 7
 * custom timings). Returns 'past' when the time has already passed today.
 */
export function buildCustomReminder(
  farm: Farm,
  time: string,
  volumeLiters: number | undefined,
  now: string,
  id: string,
): AppNotification | 'past' {
  const dueAt = new Date(now);
  const [hours, minutes] = time.split(':').map(Number);
  dueAt.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  if (dueAt.getTime() <= new Date(now).getTime()) {
    return 'past';
  }
  return {
    id,
    farmId: farm.id,
    kind: 'irrigation-reminder',
    source: 'custom',
    dueAt: dueAt.toISOString(),
    createdAt: now,
    deliveredAt: null,
    context: {
      farmName: farm.name,
      ...(volumeLiters !== undefined ? { volumeLiters } : {}),
    },
  };
}

/** Undelivered notifications whose due time has passed, oldest first. */
export function dueNotifications(notifications: AppNotification[], now: string): AppNotification[] {
  const nowMs = new Date(now).getTime();
  return notifications
    .filter((n) => n.deliveredAt === null && new Date(n.dueAt).getTime() <= nowMs)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

/** True when two ISO timestamps fall on the same local calendar day. */
export function isSameLocalDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/**
 * Fire a browser Notification when the platform and permission allow it.
 * Returns true when the notification was shown.
 */
export function fireBrowserNotification(title: string, body: string): boolean {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }
  new Notification(title, { body });
  return true;
}

/** Localized title + body for a notification, built at display/fire time. */
export function notificationText(
  notification: AppNotification,
  t: TranslateFn,
  language: Language,
): { title: string; body: string } {
  const { context } = notification;
  if (notification.kind === 'irrigation-reminder') {
    return {
      title: t('notif.reminderTitle'),
      body: t('notif.reminderBody', {
        farm: context.farmName,
        volume: context.volumeLiters !== undefined ? formatLiters(context.volumeLiters) : '—',
      }),
    };
  }
  const day =
    context.dayOffset === 1
      ? t('plan.tomorrow').toLowerCase()
      : formatWeekdayIso(notification.dueAt, localeFor(language)).toLowerCase();
  return {
    title: t('notif.rainTitle'),
    body: t('notif.rainBody', {
      farm: context.farmName,
      mm: (context.rainMm ?? 0).toFixed(1),
      day,
    }),
  };
}
