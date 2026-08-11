import type { WaterBalanceState } from '../services';
import type { TranslateFn } from '../i18n';

/**
 * SoilMoistureCard — root-zone water balance visualization on the dashboard
 * (docs/12_Product_Roadmap_v2.md Version 1.6 Feature 10).
 *
 * Shows the farmer how much water the soil is currently holding relative to
 * field capacity (TAW) and the stress threshold (RAW), making the abstract
 * depletion number concrete (Decision Logic §4b). When the balance is
 * unavailable (offline without a daily series, or first run after V1.6
 * upgrade), the card says so rather than implying the soil is fine.
 *
 * Purely presentational: it renders the balance produced by the decision
 * engine and holds no agronomic logic of its own
 * (docs/09_AI_Implementation_Guide.md: UI components contain no business logic).
 */

interface Props {
  balance: WaterBalanceState | null;
  t: TranslateFn;
}

export function SoilMoistureCard({ balance, t }: Props) {
  // No daily series — the engine fell back to V1.2 single-day requirement and
  // has no persistent depletion to show. Say so rather than implying the root
  // zone is at field capacity.
  if (!balance) {
    return (
      <section className="moisture" aria-label={t('moisture.title')}>
        <h3 className="moisture__title">{t('moisture.title')}</h3>
        <p className="moisture__unavailable">{t('moisture.unavailable')}</p>
      </section>
    );
  }

  const { depletionMm, rawMm, tawMm, rootDepthM } = balance;

  // Available water is what remains: TAW − Dr. Expressed as a fraction for the
  // gauge and as absolute depth for the technical readout.
  const availableMm = tawMm - depletionMm;
  const availableFraction = tawMm > 0 ? availableMm / tawMm : 0;
  // Stress begins once Dr reaches RAW, i.e. once available water falls to
  // TAW − RAW. The marker sits at that point on the same left-to-right scale.
  const stressFraction = tawMm > 0 ? (tawMm - rawMm) / tawMm : 0;

  // Gauge status: when depletion exceeds RAW, the crop is under stress.
  const isStressed = depletionMm >= rawMm;
  const gaugeClass = isStressed ? 'moisture__gauge--stress' : 'moisture__gauge--ok';

  return (
    <section className="moisture" aria-label={t('moisture.title')}>
      <h3 className="moisture__title">{t('moisture.title')}</h3>

      {/* Visual gauge: available water as a percentage of TAW */}
      <div className={`moisture__gauge ${gaugeClass}`}>
        <div
          className="moisture__gauge-fill"
          style={{ width: `${Math.round(availableFraction * 100)}%` }}
          aria-hidden="true"
        />
        <div
          className="moisture__gauge-marker"
          style={{ left: `${Math.round(stressFraction * 100)}%` }}
          aria-hidden="true"
        />
      </div>

      <p className="moisture__status">
        {isStressed ? t('moisture.statusStress') : t('moisture.statusOk')}
      </p>

      <dl className="moisture__stats">
        <div className="moisture__stat">
          <dt>{t('moisture.available')}</dt>
          <dd>{availableMm.toFixed(1)} mm</dd>
        </div>
        <div className="moisture__stat">
          <dt>{t('moisture.depletion')}</dt>
          <dd>{depletionMm.toFixed(1)} mm</dd>
        </div>
        <div className="moisture__stat">
          <dt>{t('moisture.capacity')}</dt>
          <dd>{tawMm.toFixed(1)} mm</dd>
        </div>
        <div className="moisture__stat">
          <dt>{t('moisture.rootDepth')}</dt>
          <dd>{rootDepthM.toFixed(2)} m</dd>
        </div>
      </dl>

      <p className="moisture__help">{t('moisture.help')}</p>
    </section>
  );
}
