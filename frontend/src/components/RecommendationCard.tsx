import type {
  CropName,
  GrowthStage,
  IrrigationMethod,
  Recommendation,
  RecommendationFactor,
  SoilType,
} from '../types';
import {
  confidenceBadgeKey,
  confidenceHelpKey,
  cropLabelKey,
  factorInfluenceKey,
  factorNameKey,
  methodLabelKey,
  soilLabelKey,
  stageLabelKey,
  statusLabelKey,
  type TranslateFn,
} from '../i18n';
import { formatLiters, formatMm, statusColor } from './format';

/**
 * RecommendationCard — the most important component (docs/05_UI_UX_Spec.md).
 *
 * Purely presentational: it displays a Recommendation produced by the decision
 * engine and performs no calculations itself. Always shows status, recommended
 * time, estimated water, confidence, and explanation, plus the decision
 * factors with their relative influence (docs/12_Product_Roadmap_v2.md
 * Feature 4). All static text is localized via `t` (roadmap Feature 2); the
 * stored status/explanation values remain in the language they were generated
 * in.
 */

interface Props {
  recommendation: Recommendation;
  /** Optional note shown under the card (e.g. cached-weather warning). */
  note?: string | undefined;
  t: TranslateFn;
}

const INFLUENCE_ARROW: Record<RecommendationFactor['influence'], string> = {
  increases: '▲',
  decreases: '▼',
  neutral: '●',
};

/** Enum-valued factors are stored as enum member names; translate them. */
function factorValueDisplay(factor: RecommendationFactor, t: TranslateFn): string {
  switch (factor.name) {
    case 'crop':
      return t(cropLabelKey(factor.value as CropName));
    case 'growthStage':
      return t(stageLabelKey(factor.value as GrowthStage));
    case 'soil':
      return t(soilLabelKey(factor.value as SoilType));
    case 'irrigationMethod':
      return t(methodLabelKey(factor.value as IrrigationMethod));
    default:
      return factor.value;
  }
}

export function RecommendationCard({ recommendation, note, t }: Props) {
  const { status, recommendedTime, estimatedWaterAmount, confidence, explanation, factors } = recommendation;
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

      {factors && factors.length > 0 && (
        <div className="rec-card__factors">
          <h3 className="rec-card__factors-title">{t('factors.title')}</h3>
          <ul className="factor-list">
            {factors.map((factor) => (
              <li key={factor.name} className="factor-item">
                <span
                  className={`factor-item__arrow factor-item__arrow--${factor.influence} factor-item__arrow--${factor.strength}`}
                  aria-hidden
                >
                  {INFLUENCE_ARROW[factor.influence]}
                </span>
                <span className="factor-item__name">{t(factorNameKey(factor.name))}</span>
                <span className="factor-item__value">{factorValueDisplay(factor, t)}</span>
                <span className="factor-item__influence">{t(factorInfluenceKey(factor.influence))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
