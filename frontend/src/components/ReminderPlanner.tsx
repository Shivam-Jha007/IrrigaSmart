import { useState } from 'react';
import type { AppNotification } from '../types';
import type { TranslateFn } from '../i18n';
import { formatTime } from './format';

/**
 * ReminderPlanner — farmer-chosen irrigation reminder times
 * (docs/12_Product_Roadmap_v2.md Feature 7 custom timings). Shown on the
 * dashboard when irrigation is advised today. Lists pending reminders (auto
 * and custom) and lets the farmer add their own times or remove any.
 * Scheduling is fully local, so reminders work identically offline and online.
 */

interface Props {
  reminders: AppNotification[];
  onAdd(time: string): Promise<'ok' | 'past'>;
  onRemove(notificationId: string): Promise<void>;
  t: TranslateFn;
}

const KIND_ICON: Record<AppNotification['kind'], string> = {
  'irrigation-reminder': '💧',
  'rainfall-warning': '🌧️',
};

export function ReminderPlanner({ reminders, onAdd, onRemove, t }: Props) {
  const [time, setTime] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!time || busy) return;
    setBusy(true);
    setError(false);
    const result = await onAdd(time);
    if (result === 'past') setError(true);
    else setTime('');
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
                {t(reminder.source === 'custom' ? 'reminder.custom' : 'reminder.auto')}
              </span>
              <button
                type="button"
                className="reminder-planner__remove"
                aria-label={t('reminder.remove')}
                onClick={() => void onRemove(reminder.id)}
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
            setError(false);
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

      {error && <p className="form-error">{t('reminder.pastError')}</p>}
      <p className="reminder-planner__note">{t('reminder.note')}</p>
    </section>
  );
}
