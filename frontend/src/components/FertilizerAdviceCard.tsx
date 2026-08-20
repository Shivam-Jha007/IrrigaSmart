import type { TranslateFn } from '../i18n';
import type { FertilityLevel, FertilizerRecommendation } from '../services';

/**
 * FertilizerAdviceCard — renders one resolved fertilizer recommendation.
 *
 * VISUAL-FIRST. The three NPK numbers are the one thing a farmer needs at a
 * glance, so they lead the card as large icon-labelled figures — no
 * paragraph to read first. Everything else the booklet says (soil amendment,
 * manure, sulphur, micronutrients, timing) is real information a farmer may
 * act on, so it is kept, not deleted, but tucked behind a single
 * "More information" `<details>` disclosure rather than shown as a wall of
 * text by default. The disclaimer stays outside the disclosure and always
 * visible, because a product-boundary line is not something to hide behind a
 * tap (mirrors `.disease__advice`'s own treatment).
 *
 * Purely presentational, holding no lookup or dosing logic of its own
 * (docs/09_AI_Implementation_Guide.md). Every figure shown here is a direct
 * transcription of the source schedule for one soil zone; nothing is
 * computed, scaled, or blended.
 */

interface Props {
  recommendation: FertilizerRecommendation;
  fertility: FertilityLevel;
  t: TranslateFn;
}

export function FertilizerAdviceCard({ recommendation, fertility, t }: Props) {
  const { zone, tableNote } = recommendation;
  const dose = zone.npk?.[fertility];

  const detailRows: Array<{ icon: string; titleKey: Parameters<TranslateFn>[0]; text: string }> = [
    ...(zone.soilAmeliorant
      ? [{ icon: '🪨', titleKey: 'fert.ameliorantTitle' as const, text: zone.soilAmeliorant }]
      : []),
    ...(zone.manureOrBiofertilizer
      ? [{ icon: '🐄', titleKey: 'fert.manureTitle' as const, text: zone.manureOrBiofertilizer }]
      : []),
    ...(zone.sulphur ? [{ icon: '🟡', titleKey: 'fert.sulphurTitle' as const, text: zone.sulphur }] : []),
    ...(zone.micronutrients
      ? [{ icon: '💧', titleKey: 'fert.micronutrientsTitle' as const, text: zone.micronutrients }]
      : []),
    ...(zone.remarks ? [{ icon: '⏱️', titleKey: 'fert.remarksTitle' as const, text: zone.remarks }] : []),
    ...(tableNote ? [{ icon: '📝', titleKey: 'fert.tableNoteTitle' as const, text: tableNote }] : []),
  ];

  return (
    <section className="fert-card" aria-label={t('fert.title')}>
      <div className="fert-card__npk">
        {dose ? (
          <div className="fert-card__npk-grid">
            <div className="fert-card__npk-item">
              <span className="fert-card__npk-icon" aria-hidden="true">
                🌿
              </span>
              <span className="fert-card__npk-value">{dose.n}</span>
              <span className="fert-card__npk-label">{t('fert.npkN')}</span>
              <span className="fert-card__npk-unit">{t('fert.kgHaShort')}</span>
            </div>
            <div className="fert-card__npk-item">
              <span className="fert-card__npk-icon" aria-hidden="true">
                🌸
              </span>
              <span className="fert-card__npk-value">{dose.p2o5}</span>
              <span className="fert-card__npk-label">{t('fert.npkP')}</span>
              <span className="fert-card__npk-unit">{t('fert.kgHaShort')}</span>
            </div>
            <div className="fert-card__npk-item">
              <span className="fert-card__npk-icon" aria-hidden="true">
                🍎
              </span>
              <span className="fert-card__npk-value">{dose.k2o}</span>
              <span className="fert-card__npk-label">{t('fert.npkK')}</span>
              <span className="fert-card__npk-unit">{t('fert.kgHaShort')}</span>
            </div>
          </div>
        ) : (
          <p className="fert-card__empty">
            <span aria-hidden="true">❓</span> {t('fert.noNpk')}
          </p>
        )}
      </div>

      {detailRows.length > 0 && (
        <details className="fert-card__details">
          <summary className="fert-card__details-summary">{t('fert.moreInfo')}</summary>
          <div className="fert-card__details-body">
            {zone.districts.length > 0 && (
              <p className="fert-card__districts">
                <strong>{t('fert.districts')}:</strong> {zone.districts.join(', ')}
              </p>
            )}
            {detailRows.map((row) => (
              <div className="fert-card__row" key={row.titleKey}>
                <h4 className="fert-card__row-title">
                  <span aria-hidden="true">{row.icon}</span> {t(row.titleKey)}
                </h4>
                <p className="fert-card__row-text">{row.text}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      <p className="fert-card__disclaimer">
        <span aria-hidden="true">⚠️</span> {t('fert.disclaimer')}
      </p>
      <p className="fert-card__credit">{t('fert.sourceCredit')}</p>
    </section>
  );
}
