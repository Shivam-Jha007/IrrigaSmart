import type {
  CropName,
  FactorStrength,
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
  factorStrengthKey,
  methodLabelKey,
  soilLabelKey,
  stageLabelKey,
  statusLabelKey,
  timingReasonKey,
  type TranslateFn,
} from '../i18n';
import { formatLiters, formatMm, statusColor } from './format';

/**
 * RecommendationCard — the most important component (docs/05_UI_UX_Spec.md).
 *
 * Purely presentational: it displays a Recommendation produced by the decision
 * engine and performs no calculations itself. Shows status, the irrigation
 * window and run time, estimated water, confidence, explanation, and the
 * decision factors (docs/12_Product_Roadmap_v2.md Feature 4).
 *
 * The factor list is built for a farmer who may not read fluently. Each factor
 * carries a pictogram, an up/down arrow, and one to three stars for how much it
 * moved today's decision; strongest first, so the reason for the advice is
 * legible at a glance without reading a word. All static text is localized via
 * `t` (roadmap Feature 2); stored status/explanation values remain in the
 * language they were generated in.
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

/** Pictogram per factor, so the list can be read without reading. */
const FACTOR_ICON: Record<RecommendationFactor['name'], string> = {
  crop: '🌾',
  growthStage: '🌱',
  temperature: '🌡️',
  rainfall: '🌧️',
  humidity: '💦',
  wind: '🍃',
  soil: '🟤',
  irrigationMethod: '🚿',
};

/** Stars shown per strength — the visual weight of a factor. */
const STRENGTH_STARS: Record<FactorStrength, number> = {
  strong: 3,
  moderate: 2,
  weak: 1,
};

const MAX_STARS = 3;

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

/**
 * Strongest influence first, and within equal strength the factors that
 * actually pushed the decision ahead of the neutral ones. A farmer reading only
 * the first two rows should still see the real reason.
 */
function byImpact(a: RecommendationFactor, b: RecommendationFactor): number {
  const starDiff = STRENGTH_STARS[b.strength] - STRENGTH_STARS[a.strength];
  if (starDiff !== 0) return starDiff;
  const weight = (f: RecommendationFactor) => (f.influence === 'neutral' ? 0 : 1);
  return weight(b) - weight(a);
}

export function RecommendationCard({ recommendation, note, t }: Props) {
  const {
    status,
    recommendedTime,
    irrigationWindow,
    estimatedWaterAmount,
    confidence,
    explanation,
    factors,
  } = recommendation;
  const color = statusColor(status);
  const irrigating = status === 'Irrigate Today';
  const ranked = factors ? [...factors].sort(byImpact) : [];

  // Older stored recommendations have no window; fall back to the plain time.
  const windowText = irrigationWindow
    ? t(irrigationWindow.nextDay ? 'rec.windowTomorrow' : 'rec.windowValue', {
        start: irrigationWindow.start,
        end: irrigationWindow.end,
      })
    : (recommendedTime ?? '—');

  return (
    <section className="rec-card" style={{ borderTopColor: color }} aria-label={t('rec.ariaLabel')}>
      <div className="rec-card__status" style={{ color }}>
        <span className="rec-card__dot" style={{ backgroundColor: color }} aria-hidden />
        {t(statusLabelKey(status))}
      </div>

      {irrigating && (
        <>
          <div className="rec-card__facts">
            <div className="rec-card__fact">
              <span className="rec-card__fact-label">{t('rec.window')}</span>
              <span className="rec-card__fact-value">{windowText}</span>
            </div>
            {estimatedWaterAmount.durationMinutes ? (
              <div className="rec-card__fact">
                <span className="rec-card__fact-label">{t('rec.duration')}</span>
                <span className="rec-card__fact-value">
                  {t('rec.minutes', { n: estimatedWaterAmount.durationMinutes })}
                </span>
              </div>
            ) : null}
            <div className="rec-card__fact">
              <span className="rec-card__fact-label">{t('rec.totalVolume')}</span>
              <span className="rec-card__fact-value">
                {formatLiters(estimatedWaterAmount.volumeLiters)}
              </span>
            </div>
            <div className="rec-card__fact">
              <span className="rec-card__fact-label">{t('rec.waterDepth')}</span>
              <span className="rec-card__fact-value">{formatMm(estimatedWaterAmount.depthMm)}</span>
            </div>
            {estimatedWaterAmount.flowLitersPerMinute ? (
              <div className="rec-card__fact">
                <span className="rec-card__fact-label">{t('rec.flow')}</span>
                <span className="rec-card__fact-value">
                  {t('rec.litersPerMin', { n: estimatedWaterAmount.flowLitersPerMinute })}
                </span>
              </div>
            ) : null}
          </div>
          {irrigationWindow && (
            <p className="rec-card__timing-why">
              <span aria-hidden>🕰️</span> {t(timingReasonKey(irrigationWindow.reason))}
            </p>
          )}
        </>
      )}

      <p className="rec-card__explanation">{explanation}</p>

      {ranked.length > 0 && (
        <div className="rec-card__factors">
          <h3 className="rec-card__factors-title">{t('factors.title')}</h3>
          <p className="rec-card__factors-legend">{t('factors.legend')}</p>
          <ul className="factor-list">
            {ranked.map((factor) => {
              const stars = STRENGTH_STARS[factor.strength];
              return (
                <li key={factor.name} className={`factor-item factor-item--${factor.influence}`}>
                  <span className="factor-item__icon" aria-hidden>
                    {FACTOR_ICON[factor.name]}
                  </span>
                  <span className="factor-item__text">
                    <span className="factor-item__name">{t(factorNameKey(factor.name))}</span>
                    <span className="factor-item__value">{factorValueDisplay(factor, t)}</span>
                  </span>
                  <span
                    className={`factor-item__stars factor-item__stars--${factor.influence}`}
                    title={t('factors.starsLabel', {
                      stars,
                      strength: t(factorStrengthKey(factor.strength)),
                    })}
                    aria-label={t('factors.starsLabel', {
                      stars,
                      strength: t(factorStrengthKey(factor.strength)),
                    })}
                  >
                    {'★'.repeat(stars)}
                    <span className="factor-item__stars-empty">
                      {'★'.repeat(MAX_STARS - stars)}
                    </span>
                  </span>
                  <span
                    className={`factor-item__arrow factor-item__arrow--${factor.influence}`}
                    aria-hidden
                  >
                    {INFLUENCE_ARROW[factor.influence]}
                  </span>
                  <span className="factor-item__influence">
                    {t(factorInfluenceKey(factor.influence))}
                  </span>
                </li>
              );
            })}
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
