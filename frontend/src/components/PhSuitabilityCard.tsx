import type { Crop, Soil } from '../types';
import type { SoilFetchStatus } from '../app/appTypes';
import { CROP_PH_RANGE, phSuitability, topsoilPh, type PhSuitability } from '../services';
import {
  cropLabelKey,
  provenanceLabelKey,
  type TranslateFn,
  type TranslationKey,
} from '../i18n';

/**
 * PhSuitabilityCard — soil-pH-vs-crop traffic light (item: pH-based crop
 * suitability).
 *
 * Purely presentational: it reads the farm's stored SoilGrids profile (if any),
 * asks `topsoilPh`/`phSuitability` for the verdict, and renders it — no
 * agronomic logic of its own (docs/09_AI_Implementation_Guide.md).
 *
 * THE READING IS AN AREA ESTIMATE AND THIS CARD SAYS SO (PRD §7, §28 Guardrail
 * 1). It used to render a bare "Soil pH: 6.4", and its unavailable state said
 * "no MEASURED soil pH is available" — which together told the farmer that the
 * number, when present, was a test of their field. It is not: it is an ISRIC
 * SoilGrids v2.0 prediction for the 250 m cell the farm sits in. A farmer who
 * believes it is a lab result may skip the Soil Health Card test that would
 * have given them the truth, and may lime a field on the strength of a number
 * that describes their neighbours' land as much as their own. So the reading now
 * carries the `REGIONAL_ESTIMATE` chip and one plain sentence naming what it is
 * and what would replace it.
 *
 * ONLY SHOWS WHEN THERE IS SOMETHING TO SAY. A farm with no stored profile
 * (created offline, or before the pH property existed) has nothing to compare
 * against; showing a badge anyway would either fabricate a reading or bury a
 * "we don't know" message under a card that looks like every other verdict
 * card on the dashboard. The unavailable state says so plainly and points at
 * why, mirroring `DiseaseRiskCard`'s own "cannot assess" state.
 *
 * THREE LEVELS, ONE VISUAL LANGUAGE. 🟢/🟡/🔴 mirrors the badge colours already
 * used for disease risk and recommendation confidence elsewhere on the
 * dashboard (`disease__badge--*`, `rec-card__confidence-badge--*`), so a
 * farmer who has learned "red means look at this" from either of those reads
 * this card the same way without new vocabulary.
 *
 * AND THE EMPTY STATE SAYS WHICH EMPTY IT IS. One "unavailable" line covered
 * three different situations — the soil map is still being read, the backend
 * could not be reached, and this coordinate genuinely has no pH figure — and the
 * first of those is the common one, because the profile is fetched in the
 * background and the query takes tens of seconds. A farmer looking at a card
 * that says "not available" during a fetch that is about to succeed reasonably
 * concludes the pH feature is broken. `fetchStatus` is what lets the card say
 * "reading" instead, and it is state, not stored data: see `SoilFetchStatus`.
 */

interface Props {
  crop: Crop;
  soil: Soil;
  /**
   * Where this farm's measured-profile fetch has got to, or null when there is
   * nothing outstanding. Only consulted when there is no pH to show.
   */
  fetchStatus: SoilFetchStatus | null;
  t: TranslateFn;
}

/** CSS modifier for a suitability level, e.g. "slightly-outside". */
function levelModifier(level: PhSuitability): string {
  return level;
}

/** Traffic-light icon per suitability level — the visual half of the badge. */
const PH_ICON: Record<PhSuitability, string> = {
  suitable: '🟢',
  'slightly-outside': '🟡',
  'significant-issue': '🔴',
};

/**
 * What the empty state says, per fetch status.
 *
 * `noData` maps to the same line as no status at all, and deliberately: both
 * mean the app asked and got nothing usable back, which retrying will not
 * change. `pending` and `unreachable` are the two that are NOT settled, and
 * telling a farmer "not available" in either case is what made this card look
 * broken.
 */
const EMPTY_KEY: Record<SoilFetchStatus, TranslationKey> = {
  pending: 'ph.pending',
  unreachable: 'ph.unreachable',
  noData: 'ph.unavailable',
};

export function PhSuitabilityCard({ crop, soil, fetchStatus, t }: Props) {
  const ph = topsoilPh(soil.measured);
  const cropLabel = t(cropLabelKey(crop.name));

  if (ph === null) {
    // A fetch in flight is announced politely rather than assertively: a screen
    // reader should not interrupt for it, but should read it if the farmer moves
    // here — which is what `aria-live="polite"` on the message alone gives.
    return (
      <section className="ph-suitability" aria-label={t('ph.title')}>
        <h3 className="ph-suitability__title">{t('ph.title')}</h3>
        <p className="ph-suitability__unavailable" aria-live="polite">
          {t(fetchStatus ? EMPTY_KEY[fetchStatus] : 'ph.unavailable')}
        </p>
      </section>
    );
  }

  const level = phSuitability(crop.name, ph);
  const { min, max } = CROP_PH_RANGE[crop.name];

  return (
    <section className="ph-suitability" aria-label={t('ph.title')}>
      <div className="ph-suitability__head">
        <h3 className="ph-suitability__title">{t('ph.title')}</h3>
        <span className={`ph-suitability__badge ph-suitability__badge--${levelModifier(level)}`}>
          <span aria-hidden="true">{PH_ICON[level]}</span> {t(`ph.level.${level}`)}
        </span>
      </div>

      <p className="ph-suitability__value">
        {t('ph.reading', { ph: ph.toFixed(1) })}{' '}
        <span className="provenance-chip">{t(provenanceLabelKey('REGIONAL_ESTIMATE'))}</span>
      </p>
      <p className="ph-suitability__range">
        {t('ph.optimalRange', { crop: cropLabel, min: min.toFixed(1), max: max.toFixed(1) })}
      </p>

      <p className="ph-suitability__help">{t(`ph.help.${level}`)}</p>
      {/* Last, not first: the verdict is what the farmer came for, and the
          caveat is what stops them acting on it as if it were a lab result. */}
      <p className="ph-suitability__source">{t('ph.source')}</p>
    </section>
  );
}
