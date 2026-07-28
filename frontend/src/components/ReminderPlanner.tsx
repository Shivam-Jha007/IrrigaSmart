import { useState } from 'react';
import type { AppNotification } from '../types';
import type { TranslateFn } from '../i18n';
import { formatTime } from './format';

/**
 * ReminderPlanner — farmer-chosen irrigation reminder times
 * (docs/12_Product_Roadmap_v2.md Feature 7 custom timings). Lists pending
 * reminders (auto and custom) and lets the farmer add their own times or
 * remove any. Scheduling is fully local, so reminders work identically offline
 * and online.
 */

interface Props {
  reminders: AppNotification[];
  onAdd(time: string): Promise<'today' | 'tomorrow' | 'error'>;
  onRemove(notificationId: string): Promise<void>;
  t: TranslateFn;
}

const KIND_ICON: Record<AppNotification['kind'], string> = {
  'irrigation-reminder': '💧',
  'rainfall-warning': '🌧️',
};

/** True when an ISO due time falls on today's local calendar day. */
function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export function ReminderPlanner({ reminders, onAdd, onRemove, t }: Props) {
  const [time, setTime] = useState('');
  const [outcome, setOutcome] = useState<'tomorrow' | 'error' | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!time || busy) return;
    setBusy(true);
    setOutcome(null);
    const result = await onAdd(time);
    if (result === 'error') {
      setOutcome('error');
    } else {
      setOutcome(result === 'tomorrow' ? 'tomorrow' : null);
      setTime('');
    }
    setBusy(false);
  }

  return (
    <section className="reminder-planner" aria-label={t('reminder.title')}>
      <h3 className="reminder-planner__title">{t('reminder.title')}</h3>

      {reminders.length > 0 && (
        <ul className="reminder-planner__list">
          {reminders.map((reminder) => (
            <li key={reminder.id} className="reminder-planner__item">
              <span aria-hidden>{KIND_ICON[reminder.kind]}</span>
              <span className="reminder-planner__time">{formatTime(reminder.dueAt)}</span>
              <span className="reminder-planner__source">
                {isToday(reminder.dueAt)
                  ? t(reminder.source === 'custom' ? 'reminder.custom' : 'reminder.auto')
                  : t('reminder.tomorrowTag')}
              </span>
              <button
                type="button"
                className="reminder-planner__remove"
                aria-label={t('reminder.remove')}
                onClick={() => {
                  // Drop the "set for tomorrow" note: it described a reminder
                  // that may be the one just removed.
                  setOutcome(null);
                  void onRemove(reminder.id);
                }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="reminder-planner__add">
        <input
          className="field__input"
          type="time"
          value={time}
          onChange={(e) => {
            setTime(e.target.value);
            setOutcome(null);
          }}
          aria-label={t('reminder.timeLabel')}
        />
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => void handleAdd()}
          disabled={!time || busy}
        >
          {t('reminder.add')}
        </button>
      </div>

      {outcome === 'error' && <p className="form-error">{t('reminder.addError')}</p>}
      {outcome === 'tomorrow' && (
        <p className="reminder-planner__hint">{t('reminder.setForTomorrow')}</p>
      )}
      <p className="reminder-planner__note">{t('reminder.note')}</p>
    </section>
  );
}
