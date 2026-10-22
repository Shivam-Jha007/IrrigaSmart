import { useState } from 'react';
import type { Language, SoilSensorReading } from '../types';
import type { WaterBalanceState } from '../services';
import type { TranslateFn } from '../i18n';
import { SpeakButton } from './SpeakButton';

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
 * V2.3 adds two things on top of the gauge:
 *  - DAYS OF WATER LEFT: the same sentence the briefing speaks, shown under
 *    the gauge. Farmers reason in days, not percent of TAW.
 *  - THE SENSOR ANCHOR: a farmer with a soil moisture meter (or any reading
 *    in volumetric %) can enter it here; the engine re-anchors its whole
 *    water model to that reading. This is what closes the balance's loop —
 *    the model stops being a forecast-only account and starts correcting
 *    itself from the field. The card only collects and forwards the number;
 *    the anchoring math lives in the engine (docs/07: no business logic in
 *    the UI).
 */

interface Props {
  balance: WaterBalanceState | null;
  /** Pre-built spoken line (V2.3), from the shared fragment builders. */
  speech?: string | null;
  /** The days-of-water sentence, shared with the briefing so shown = spoken. */
  daysNote?: string | null;
  /** UI language for speech synthesis. */
  language?: Language;
  /** The farm's latest sensor reading, when one has been saved. */
  sensorReading?: SoilSensorReading | null;
  /** Saves a fresh reading and re-runs the engine. Absent hides the input. */
  onSensorReading?: ((moisturePct: number) => Promise<void>) | undefined;
  t: TranslateFn;
}

export function SoilMoistureCard({
  balance,
  speech,
  daysNote,
  language,
  sensorReading,
  onSensorReading,
  t,
}: Props) {
  const [sensorOpen, setSensorOpen] = useState(false);
  const [pctInput, setPctInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const parsedPct = Number(pctInput);
  const pctValid = pctInput.trim() !== '' && Number.isFinite(parsedPct) && parsedPct > 0 && parsedPct <= 100;

  const saveReading = async (): Promise<void> => {
    if (!pctValid || !onSensorReading || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      await onSensorReading(parsedPct);
      setSaved(true);
      setPctInput('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="moisture" aria-label={t('moisture.title')}>
      <div className="moisture__head">
        <h3 className="moisture__title">{t('moisture.title')}</h3>
        {speech && language && (
          <SpeakButton
            text={speech}
            language={language}
            speakId="moisture-card"
            label={t('assistant.readAloud')}
            t={t}
          />
        )}
      </div>

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

      {/* The gauge's translation into farmer time (V2.3). Same sentence the
          briefing speaks — one builder, both surfaces. */}
      {daysNote && <p className="moisture__days">{daysNote}</p>}

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

      {/* The sensor anchor input (V2.3). Collapsed behind one button: the
          gauge is for everyone, the meter is for the farmer who owns one. */}
      {onSensorReading && (
        <div className="moisture__sensor">
          <button
            type="button"
            className="moisture__sensor-toggle"
            aria-expanded={sensorOpen}
            onClick={() => setSensorOpen((open) => !open)}
          >
            {sensorOpen ? '▾' : '▸'} {t('moisture.sensorToggle')}
          </button>
          {sensorOpen && (
            <div className="moisture__sensor-body">
              <p className="moisture__sensor-hint">{t('moisture.sensorHint')}</p>
              {sensorReading?.moisturePct !== undefined && (
                <p className="moisture__sensor-last">
                  {t('moisture.sensorLast', {
                    pct: Math.round(sensorReading.moisturePct),
                  })}
                </p>
              )}
              <div className="moisture__sensor-row">
                <input
                  className="moisture__sensor-input"
                  type="text"
                  inputMode="decimal"
                  value={pctInput}
                  onChange={(e) => {
                    setPctInput(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="e.g. 28"
                  aria-label={t('moisture.sensorAria')}
                />
                <span className="moisture__sensor-unit">%</span>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={!pctValid || saving}
                  onClick={() => void saveReading()}
                >
                  {saving ? t('moisture.sensorSaving') : t('moisture.sensorSave')}
                </button>
              </div>
              {saved && (
                <p className="moisture__sensor-saved" role="status">
                  {t('moisture.sensorSaved')}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
