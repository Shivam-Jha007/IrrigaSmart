import type { IrrigationPlan, IrrigationPlanDay } from '../services';
import type { Language } from '../types';
import { confidenceBadgeKey, localeFor, planActionKey, type TranslateFn } from '../i18n';
import { formatWeekday, statusColor } from './format';

/**
 * PlanOutlook — multi-day irrigation plan (docs/12_Product_Roadmap_v2.md
 * Feature 5). Purely presentational: renders the IrrigationPlan produced by
 * the decision engine — per-day action, expected rain, confidence — plus a
 * planning note naming the recommended irrigation day and the next day rain
 * may cover needs.
 */

interface Props {
  plan: IrrigationPlan;
  language: Language;
  t: TranslateFn;
}

/** Row label: Today / Tomorrow / weekday in the farmer's language. */
function dayLabel(day: IrrigationPlanDay, language: Language, t: TranslateFn): string {
  if (day.offsetDays === 0) return t('plan.today');
  if (day.offsetDays === 1) return t('plan.tomorrow');
  return formatWeekday(day.date, localeFor(language));
}

/** Day name as used inside planning notes (lowercase for English grammar). */
function noteDay(date: string, days: IrrigationPlanDay[], language: Language, t: TranslateFn): string {
  const day = days.find((d) => d.date === date);
  if (!day) return formatWeekday(date, localeFor(language));
  return dayLabel(day, language, t).toLowerCase();
}

export function PlanOutlook({ plan, language, t }: Props) {
  return (
    <section className="plan" aria-label={t('plan.title')}>
      <h3 className="plan__title">{t('plan.title')}</h3>

      {plan.recommendedIrrigationDate ? (
        <p className="plan__note">
          {t('plan.note.irrigate', { day: noteDay(plan.recommendedIrrigationDate, plan.days, language, t) })}
        </p>
      ) : (
        <p className="plan__note">{t('plan.note.none')}</p>
      )}
      {plan.nextRainCoveredDate && (
        <p className="plan__note plan__note--rain">
          {t('plan.note.rain', { day: noteDay(plan.nextRainCoveredDate, plan.days, language, t) })}
        </p>
      )}

      <ul className="plan__days">
        {plan.days.map((day) => (
          <li key={day.date} className="plan-day">
            <span className="plan-day__label">{dayLabel(day, language, t)}</span>
            <span className="plan-day__action" style={{ color: statusColor(day.action) }}>
              {t(planActionKey(day.action))}
            </span>
            <span className="plan-day__rain">{t('plan.rain', { mm: day.rainfallMm.toFixed(1) })}</span>
            <span
              className={`plan-day__confidence rec-card__confidence-badge rec-card__confidence-badge--${day.confidence.toLowerCase()}`}
            >
              {t(confidenceBadgeKey(day.confidence))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
