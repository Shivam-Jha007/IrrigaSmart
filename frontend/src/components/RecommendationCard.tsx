import type { Recommendation } from '../types';
import {
  confidenceBadgeKey,
  confidenceHelpKey,
  statusLabelKey,
  type TranslateFn,
} from '../i18n';
import { formatLiters, formatMm, statusColor } from './format';

/**
 * RecommendationCard — the most important component (docs/05_UI_UX_Spec.md).
 *
 * Purely presentational: it displays a Recommendation produced by the decision
 * engine and performs no calculations itself. Always shows status, recommended
 * time, estimated water, confidence, and explanation. All static text is
 * localized via `t` (roadmap Feature 2); the stored status/explanation values
 * remain in the language they were generated in.
 */

interface Props {
  recommendation: Recommendation;
  /** Optional note shown under the card (e.g. cached-weather warning). */
  note?: string | undefined;
  t: TranslateFn;
}

export function RecommendationCard({ recommendation, note, t }: Props) {
  const { status, recommendedTime, estimatedWaterAmount, confidence, explanation } = recommendation;
  const color = statusColor(status);
  const irrigating = status === 'Irrigate Today';

  return (
    <section className="rec-card" style={{ borderTopColor: color }} aria-label={t('rec.ariaLabel')}>
      <div className="rec-card__status" style={{ color }}>
        <span className="rec-card__dot" style={{ backgroundColor: color }} aria-hidden />
        {t(statusLabelKey(status))}
      </div>

      {irrigating && (
        <div className="rec-card__facts">
          <div className="rec-card__fact">
            <span className="rec-card__fact-label">{t('rec.bestTime')}</span>
            <span className="rec-card__fact-value">{recommendedTime ?? '—'}</span>
          </div>
          <div className="rec-card__fact">
            <span className="rec-card__fact-label">{t('rec.waterDepth')}</span>
            <span className="rec-card__fact-value">{formatMm(estimatedWaterAmount.depthMm)}</span>
          </div>
          <div className="rec-card__fact">
            <span className="rec-card__fact-label">{t('rec.totalVolume')}</span>
            <span className="rec-card__fact-value">{formatLiters(estimatedWaterAmount.volumeLiters)}</span>
          </div>
        </div>
      )}

      <p className="rec-card__explanation">{explanation}</p>

      <div className="rec-card__confidence">
        <span className={`rec-card__confidence-badge rec-card__confidence-badge--${confidence.toLowerCase()}`}>
          {t(confidenceBadgeKey(confidence))}
        </span>
        <span className="rec-card__confidence-help">{t(confidenceHelpKey(confidence))}</span>
      </div>

      {note && <p className="rec-card__note">{note}</p>}
    </section>
  );
}
