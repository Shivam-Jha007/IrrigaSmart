import type { WaterProgress } from '../app/appTypes';
import type { WaterSavings } from '../types';
import type { TranslateFn } from '../i18n';
import { formatLiters } from './format';

/**
 * WaterChecklist — how much water today needs, how much has been given, and how
 * much the advice has saved (docs/11_Decision_Logic.md §6).
 *
 * Purely presentational: every figure comes from the water ledger via the app
 * store, and the component performs no irrigation arithmetic of its own beyond
 * display rounding (docs/07_Engineering_Rules.md: business logic never lives in
 * the UI).
 *
 * Logging is expressed in MINUTES rather than litres because minutes are what a
 * farmer actually observes — a pump ran for half an hour. Litres are derived
 * from the method's delivery rate in the store.
 */

interface Props {
  progress: WaterProgress;
  /** Savings breakdown from today's recommendation, when available. */
  savings?: WaterSavings | undefined;
  onLog(minutes: number): Promise<void>;
  onReset(): Promise<void>;
  t: TranslateFn;
}

/** Increment offered alongside "mark done", for partial runs. */
const PART_MINUTES = 15;

export function WaterChecklist({ progress, savings, onLog, onReset, t }: Props) {
  const { targetLiters, targetMinutes, appliedLiters, appliedMinutes } = progress;
  const nothingToDo = targetMinutes <= 0 && targetLiters <= 0;
  const remainingLiters = Math.max(0, targetLiters - appliedLiters);
  const remainingMinutes = Math.max(0, targetMinutes - appliedMinutes);
  const percent = targetLiters > 0 ? Math.min(100, Math.round((appliedLiters / targetLiters) * 100)) : 0;
  const complete = !nothingToDo && remainingLiters === 0;
  const logged = appliedMinutes > 0;

  return (
    <section className="water-checklist" aria-label={t('water.title')}>
      <h3 className="water-checklist__title">
        <span aria-hidden>🪣</span> {t('water.title')}
      </h3>

      {nothingToDo ? (
        <p className="water-checklist__empty">{t('water.nothingToday')}</p>
      ) : (
        <>
          <div
            className="water-checklist__bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={t('water.progressLabel', { percent })}
          >
            <div className="water-checklist__bar-fill" style={{ width: `${percent}%` }} />
            <span className="water-checklist__bar-text">{percent}%</span>
          </div>

          <ul className="water-checklist__rows">
            <li className="water-checklist__row">
              <span aria-hidden>🎯</span>
              <span className="water-checklist__label">{t('water.target')}</span>
              <span className="water-checklist__value">
                {formatLiters(targetLiters)}
                {targetMinutes > 0 && ` · ${t('rec.minutes', { n: targetMinutes })}`}
              </span>
            </li>
            <li className="water-checklist__row water-checklist__row--done">
              <span aria-hidden>✅</span>
              <span className="water-checklist__label">{t('water.done')}</span>
              <span className="water-checklist__value">
                {formatLiters(appliedLiters)}
                {appliedMinutes > 0 && ` · ${t('rec.minutes', { n: appliedMinutes })}`}
              </span>
            </li>
            {!complete && (
              <li className="water-checklist__row water-checklist__row--todo">
                <span aria-hidden>⏳</span>
                <span className="water-checklist__label">{t('water.remaining')}</span>
                <span className="water-checklist__value">
                  {formatLiters(remainingLiters)}
                  {remainingMinutes > 0 && ` · ${t('rec.minutes', { n: remainingMinutes })}`}
                </span>
              </li>
            )}
          </ul>

          {complete && <p className="water-checklist__complete">✅ {t('water.complete')}</p>}

          <div className="water-checklist__actions">
            {!complete && (
              <>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => void onLog(remainingMinutes > 0 ? remainingMinutes : PART_MINUTES)}
                >
                  {t('water.logFull')}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => void onLog(PART_MINUTES)}
                >
                  {t('water.logPart', { n: PART_MINUTES })}
                </button>
              </>
            )}
            {logged && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => void onReset()}
              >
                {t('water.undo')}
              </button>
            )}
          </div>
        </>
      )}

      <div className="water-checklist__savings">
        <div className="water-savings-tile">
          <span className="water-savings-tile__label">{t('water.savedToday')}</span>
          <span className="water-savings-tile__value">
            {formatLiters(progress.savedTodayLiters)}
          </span>
        </div>
        <div className="water-savings-tile water-savings-tile--total">
          <span className="water-savings-tile__label">{t('water.savedTotal')}</span>
          <span className="water-savings-tile__value">
            {formatLiters(progress.savedLifetimeLiters)}
          </span>
          {progress.daysTracked > 0 && (
            <span className="water-savings-tile__meta">
              {progress.daysTracked === 1
                ? t('water.savedDay')
                : t('water.savedDays', { days: progress.daysTracked })}
            </span>
          )}
        </div>
      </div>

      {savings && (savings.fromRainfallLiters > 0 || savings.fromMethodLiters > 0) && (
        <ul className="water-checklist__attribution">
          {savings.fromRainfallLiters > 0 && (
            <li>
              <span aria-hidden>🌧️</span> {formatLiters(savings.fromRainfallLiters)}{' '}
              {t('water.savedFromRain')}
            </li>
          )}
          {savings.fromMethodLiters > 0 && (
            <li>
              <span aria-hidden>🚿</span> {formatLiters(savings.fromMethodLiters)}{' '}
              {t('water.savedFromMethod')}
            </li>
          )}
        </ul>
      )}

      <p className="water-checklist__note">{t('water.savedNote')}</p>
    </section>
  );
}
