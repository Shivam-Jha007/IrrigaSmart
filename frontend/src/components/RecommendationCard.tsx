import type { Recommendation } from '../types';
import { formatLiters, formatMm, statusColor } from './format';

/**
 * RecommendationCard — the most important component (docs/05_UI_UX_Spec.md).
 *
 * Purely presentational: it displays a Recommendation produced by the decision
 * engine and performs no calculations itself. Always shows status, recommended
 * time, estimated water, confidence, and explanation.
 */

interface Props {
  recommendation: Recommendation;
  /** Optional note shown under the card (e.g. cached-weather warning). */
  note?: string | undefined;
}

const CONFIDENCE_HELP: Record<Recommendation['confidence'], string> = {
  High: 'Based on fresh weather data.',
  Medium: 'Based on slightly older weather data.',
  Low: 'Limited or missing weather data — treat as a rough guide.',
};

export function RecommendationCard({ recommendation, note }: Props) {
  const { status, recommendedTime, estimatedWaterAmount, confidence, explanation } = recommendation;
  const color = statusColor(status);
  const irrigating = status === 'Irrigate Today';

  return (
    <section className="rec-card" style={{ borderTopColor: color }} aria-label="Today's recommendation">
      <div className="rec-card__status" style={{ color }}>
        <span className="rec-card__dot" style={{ backgroundColor: color }} aria-hidden />
        {status}
      </div>

      {irrigating && (
        <div className="rec-card__facts">
          <div className="rec-card__fact">
            <span className="rec-card__fact-label">Best time</span>
            <span className="rec-card__fact-value">{recommendedTime ?? '—'}</span>
          </div>
          <div className="rec-card__fact">
            <span className="rec-card__fact-label">Water depth</span>
            <span className="rec-card__fact-value">{formatMm(estimatedWaterAmount.depthMm)}</span>
          </div>
          <div className="rec-card__fact">
            <span className="rec-card__fact-label">Total volume</span>
            <span className="rec-card__fact-value">{formatLiters(estimatedWaterAmount.volumeLiters)}</span>
          </div>
        </div>
      )}

      <p className="rec-card__explanation">{explanation}</p>

      <div className="rec-card__confidence">
        <span className={`rec-card__confidence-badge rec-card__confidence-badge--${confidence.toLowerCase()}`}>
          {confidence} confidence
        </span>
        <span className="rec-card__confidence-help">{CONFIDENCE_HELP[confidence]}</span>
      </div>

      {note && <p className="rec-card__note">{note}</p>}
    </section>
  );
}
