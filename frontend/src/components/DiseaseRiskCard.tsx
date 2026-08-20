import type { Crop, DiseaseRiskLevel, Language } from '../types';
import { creditLineFor, weatherReferenceImagesFor, type DiseaseRiskAssessment } from '../services';
import {
  confidenceBadgeKey,
  cropLabelKey,
  diseaseLevelKey,
  diseaseNameKey,
  diseaseWhatKey,
  diseaseWhereKey,
  localeFor,
  type TranslateFn,
} from '../i18n';
import { formatDayMonth } from './format';

/**
 * DiseaseRiskCard — weather-based disease risk on the dashboard
 * (docs/12_Product_Roadmap_v2.md Version 1.3 Feature 9).
 *
 * Purely presentational: it renders the assessment produced by
 * services/diseaseRisk and holds no agronomic logic of its own
 * (docs/09_AI_Implementation_Guide.md: UI components contain no business logic).
 *
 * Three distinct states, deliberately kept apart so the farmer can tell them
 * apart (docs/11 §12e):
 *   - `risk === null`        → daily weather unavailable, cannot assess
 *   - `risk.level === 'None'` → assessed, and conditions do not favour disease
 *   - otherwise              → conditions favour a named disease
 *
 * It names no chemical, states no dose, and never claims a disease is present —
 * only that the weather favours it, with what to look for and a pointer to the
 * local extension officer (docs/11 §12f, docs/10 §10.2).
 */

interface Props {
  risk: DiseaseRiskAssessment | null;
  crop: Crop;
  language: Language;
  t: TranslateFn;
}

/** CSS modifier for a risk level, e.g. "high". */
function levelModifier(level: DiseaseRiskLevel): string {
  return level.toLowerCase();
}

export function DiseaseRiskCard({ risk, crop, language, t }: Props) {
  const cropLabel = t(cropLabelKey(crop.name));

  // No daily series — say so rather than implying the crop is safe.
  if (!risk) {
    return (
      <section className="disease" aria-label={t('disease.title')}>
        <h3 className="disease__title">{t('disease.title')}</h3>
        <p className="disease__none">{t('disease.unavailable')}</p>
      </section>
    );
  }

  if (risk.level === 'None') {
    return (
      <section className="disease" aria-label={t('disease.title')}>
        <div className="disease__head">
          <h3 className="disease__title">{t('disease.title')}</h3>
          <span className="disease__badge disease__badge--none">
            {t(diseaseLevelKey(risk.level))}
          </span>
        </div>
        <p className="disease__none">{t('disease.none', { crop: cropLabel })}</p>
      </section>
    );
  }

  const locale = localeFor(language);
  const diseaseName = t(diseaseNameKey(risk.disease));
  const referenceImages = weatherReferenceImagesFor(crop.name, risk.disease);

  return (
    <section className="disease" aria-label={t('disease.title')}>
      <div className="disease__head">
        <h3 className="disease__title">{t('disease.title')}</h3>
        <span className={`disease__badge disease__badge--${levelModifier(risk.level)}`}>
          {t(diseaseLevelKey(risk.level))}
        </span>
      </div>

      <p className="disease__headline">{t('disease.headline', { disease: diseaseName })}</p>

      {risk.observedRun > 0 && (
        <p className="disease__run">
          {risk.observedRun === 1
            ? t('disease.observedOne')
            : t('disease.observed', { days: risk.observedRun })}
        </p>
      )}
      {risk.forecastRun > 0 && (
        <p className="disease__run">
          {risk.forecastRun === 1
            ? t('disease.forecastOne')
            : t('disease.forecast', { days: risk.forecastRun })}
        </p>
      )}

      {/*
        Named only when dull weather covers most of the spell. A single overcast
        day inside a five-day run did not meaningfully prolong leaf wetness, and
        saying so would credit the sky for a warning the humidity earned.
      */}
      {risk.overcastDays * 2 >= risk.observedRun + risk.forecastRun &&
        risk.overcastDays > 0 && <p className="disease__run">{t('disease.overcast')}</p>}

      {risk.trigger && (
        <p className="disease__trigger">
          {t('disease.trigger', {
            date: formatDayMonth(risk.trigger.date, locale),
            temp: `${Math.round(risk.trigger.temperatureMax)}°C`,
            humidity: `${Math.round(risk.trigger.humidityMean)}%`,
            rain: `${risk.trigger.precipitationSum.toFixed(1)} mm`,
          })}
        </p>
      )}

      <h4 className="disease__subtitle">{t('disease.inspectTitle')}</h4>
      <p className="disease__inspect">
        {t('disease.inspect', {
          where: t(diseaseWhereKey(risk.disease)),
          what: t(diseaseWhatKey(risk.disease)),
        })}
      </p>

      {/* One or two, not "two or nothing". Some diseases have exactly one
          freely licensed, correctly identified photograph behind them, and the
          old `=== 2` gate silently hid the whole block for those — the farmer
          got no picture at all for a disease the app had a good picture of. */}
      {referenceImages.length > 0 && (
        <div className="disease__references">
          <p className="disease__references-title">{t('vision.referenceTitle')}</p>
          <p className="disease__references-note">{t('vision.referenceNote')}</p>
          <div className="disease__reference-grid">
            {referenceImages.map((image, index) => (
              <img
                key={image.src}
                className="disease__reference-image"
                src={image.src}
                alt={t('vision.referenceAlt', {
                  name: diseaseName,
                  number: index + 1,
                })}
                loading="lazy"
              />
            ))}
          </div>
          {referenceImages.length === 1 && (
            <p className="disease__references-note">{t('vision.referenceSingle')}</p>
          )}
          {/* Derived from the images on screen, not a fixed string. The fixed
              string used to name USDA and two licences over photographs from
              five sources under five licences — see the header of
              services/diseaseReference.ts. */}
          <p className="disease__reference-credit">
            {t('vision.referenceCredit', { credits: creditLineFor(referenceImages) })}
          </p>
        </div>
      )}

      <p className="disease__tip">{t('disease.tipDry')}</p>
      <p className="disease__advice">{t('disease.advice')}</p>

      <span
        className={`disease__confidence rec-card__confidence-badge rec-card__confidence-badge--${risk.confidence.toLowerCase()}`}
      >
        {t(confidenceBadgeKey(risk.confidence))}
      </span>
    </section>
  );
}
