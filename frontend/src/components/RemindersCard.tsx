import type { AppNotification, Language } from '../types';
import { notificationText } from '../services';
import type { TranslateFn } from '../i18n';
import { formatTime } from './format';

/**
 * RemindersCard — today's delivered reminders on the dashboard
 * (docs/12_Product_Roadmap_v2.md Feature 7). Purely presentational: the app
 * store schedules and delivers notifications; this lists what fired today.
 */

interface Props {
  reminders: AppNotification[];
  language: Language;
  t: TranslateFn;
}

const KIND_ICON: Record<AppNotification['kind'], string> = {
  'irrigation-reminder': '💧',
  'rainfall-warning': '🌧️',
};

export function RemindersCard({ reminders, language, t }: Props) {
  if (reminders.length === 0) return null;

  return (
    <section className="reminders" aria-label={t('notif.title')}>
      <h3 className="reminders__title">{t('notif.title')}</h3>
      <ul className="reminders__list">
        {reminders.map((reminder) => {
          const { title, body } = notificationText(reminder, t, language);
          return (
            <li key={reminder.id} className="reminders__item">
              <span className="reminders__icon" aria-hidden>
                {KIND_ICON[reminder.kind]}
              </span>
              <div className="reminders__text">
                <p className="reminders__item-title">
                  {title} · {formatTime(reminder.dueAt)}
                </p>
                <p className="reminders__body">{body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
