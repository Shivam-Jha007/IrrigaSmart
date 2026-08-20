import { useEffect, useMemo, useState } from 'react';
import type { AppStore } from '../app/useAppStore';
import type { CropName } from '../types';
import { CROP_NAMES } from '../types';
import { cropLabelKey } from '../i18n';
import {
  classifySoilFertility,
  CROP_PH_RANGE,
  fertilizerCoversCrop,
  fertilizerVarietiesFor,
  fertilizerZonesFor,
  getFertilizerRecommendation,
  phSuitability,
  topsoilPh,
  type FertilityLevel,
  type FertilizerSoilZone,
} from '../services';
import { FertilizerAdviceCard } from '../components/FertilizerAdviceCard';

/**
 * Fertilizer recommendation page (new feature, alongside Today/Farms/History/
 * Settings).
 *
 * VISUAL-FIRST, TEXT-SECOND
 * Rewritten from a dropdown form to a tap-the-picture flow: every choice is a
 * grid of icon buttons rather than a `<select>`, because a farmer who cannot
 * read comfortably can still recognise a picture of a hill, a coast, or their
 * own crop. Every button still carries its text label underneath — icons
 * support reading, they do not replace it, since an icon alone (what does a
 * generic "soil" icon mean?) is often more ambiguous than the word next to it.
 * Paragraphs of explanation are gone from the main flow; anything that needs
 * more than a sentence lives behind the result card's "More information"
 * disclosure (see FertilizerAdviceCard), not inline here.
 *
 * NUMBERS IN, RECOMMENDATION OUT
 * The fertility step now has two modes. A farmer with an actual Soil Health
 * Card or lab report types the three numbers on it (N, P, K in kg/ha) and the
 * page classifies them into the Low/Medium/High band the dosing table needs —
 * see `classifySoilFertility`. A farmer without a soil test still has the old
 * three-button Low/Medium/High tap, unchanged. Both paths produce the exact
 * same `FertilityLevel`, so the lookup and the result card do not need to know
 * which one was used.
 *
 * Still presentational only: all agronomic data and all classification logic
 * live in services/fertilizerKnowledge.ts (docs/07_Engineering_Rules.md).
 */

const FERTILITY_LEVELS: readonly FertilityLevel[] = ['Low', 'Medium', 'High'];

/** Pictogram per crop, so the grid can be recognised without being read. */
const CROP_ICON: Record<CropName, string> = {
  Rice: '🌾',
  Wheat: '🍞',
  Maize: '🌽',
  Cotton: '🧵',
  Sugarcane: '🎋',
  Soybean: '🫘',
  Groundnut: '🥜',
  Tomato: '🍅',
  Potato: '🥔',
  Onion: '🧅',
};

/** Pictogram per soil zone. */
const ZONE_ICON: Record<FertilizerSoilZone, string> = {
  Hill: '⛰️',
  Terai: '🌳',
  GangeticAlluvium: '🌊',
  VindhyaAlluviumRedLateritic: '🏞️',
  Coastal: '🏖️',
};

/** Pictogram per fertility level, reused on both the simple picker and the badge. */
const FERTILITY_ICON: Record<FertilityLevel, string> = {
  Low: '🔴',
  Medium: '🟡',
  High: '🟢',
};

/** Same traffic-light icons the Dashboard's PhSuitabilityCard uses (item: pH-based crop suitability). */
const PH_ICON: Record<'suitable' | 'slightly-outside' | 'significant-issue', string> = {
  suitable: '🟢',
  'slightly-outside': '🟡',
  'significant-issue': '🔴',
};

/** Pictogram per season/variety, keyed "Crop:varietyId" since the same id (e.g. "default") means different things per crop. */
const VARIETY_ICON: Record<string, string> = {
  'Rice:kharif': '🌧️',
  'Rice:boro': '☀️',
  'Potato:default': '🥔',
  'Potato:hybrid': '🌱',
};

interface Props {
  store: AppStore;
}

export function FertilizerPage({ store }: Props) {
  const { profiles, t } = store;

  const defaultProfile = profiles[0];
  const defaultCrop =
    defaultProfile && fertilizerCoversCrop(defaultProfile.crop.name) ? defaultProfile.crop.name : undefined;
  // A prior reading for this farm's soil, if the farmer has entered one
  // before — prefilled so a returning farmer sees their own numbers again
  // rather than three blank boxes, now that the reading actually persists.
  const priorReading = defaultProfile?.soil.nutrientReading;

  const [crop, setCrop] = useState<CropName | ''>(defaultCrop ?? '');
  const [varietyId, setVarietyId] = useState<string>('');
  const [zone, setZone] = useState<FertilizerSoilZone | ''>('');
  const [fertilityMode, setFertilityMode] = useState<'simple' | 'numbers'>(
    priorReading ? 'numbers' : 'simple',
  );
  const [fertility, setFertility] = useState<FertilityLevel>('Medium');
  const [nInput, setNInput] = useState(priorReading ? String(priorReading.n) : '');
  const [pInput, setPInput] = useState(priorReading ? String(priorReading.p2o5) : '');
  const [kInput, setKInput] = useState(priorReading ? String(priorReading.k2o) : '');

  const varieties = useMemo(() => (crop ? fertilizerVarietiesFor(crop) : []), [crop]);
  const zones = useMemo(
    () => (crop && varietyId ? fertilizerZonesFor(crop, varietyId) : []),
    [crop, varietyId],
  );

  // Keep the variety selector valid as the crop changes: default to the first
  // variety the new crop actually has, rather than leaving a stale id from the
  // previous crop selected against a table that does not recognise it.
  useEffect(() => {
    if (varieties.length === 0) {
      setVarietyId('');
      return;
    }
    if (!varieties.some((v) => v.varietyId === varietyId)) {
      setVarietyId(varieties[0]!.varietyId);
    }
  }, [varieties, varietyId]);

  // Same reasoning for the zone selector against the variety's own zone list.
  useEffect(() => {
    if (zones.length === 0) {
      setZone('');
      return;
    }
    if (!zones.includes(zone as FertilizerSoilZone)) {
      setZone(zones[0]!);
    }
  }, [zones, zone]);

  // Soil-test numbers, parsed. All three must be present and valid to classify
  // — a partial reading would silently drop a nutrient from the worst-of-three
  // rule and could report a fertility level better than the soil actually is.
  const parsedN = Number(nInput);
  const parsedP = Number(pInput);
  const parsedK = Number(kInput);
  const hasCompleteReading =
    nInput.trim() !== '' &&
    pInput.trim() !== '' &&
    kInput.trim() !== '' &&
    Number.isFinite(parsedN) &&
    Number.isFinite(parsedP) &&
    Number.isFinite(parsedK) &&
    parsedN >= 0 &&
    parsedP >= 0 &&
    parsedK >= 0;
  const classifiedFertility = hasCompleteReading
    ? classifySoilFertility({ n: parsedN, p2o5: parsedP, k2o: parsedK })
    : null;

  const effectiveFertility = fertilityMode === 'numbers' ? classifiedFertility : fertility;

  // Persisting the reading (item: fertility data integration). Explicit tap
  // rather than auto-save on every keystroke, for two reasons: a farmer still
  // typing "18" toward "180" must not write "18" to storage as their reading,
  // and an explicit action gives a place to show confirmation, which a silent
  // background write cannot. "Already saved" is derived — not its own piece of
  // state — from comparing the stored reading against what is in the boxes
  // right now, so editing a saved number immediately and correctly un-confirms
  // it without an effect to keep two facts in sync.
  const alreadySaved =
    hasCompleteReading &&
    priorReading !== undefined &&
    priorReading.n === parsedN &&
    priorReading.p2o5 === parsedP &&
    priorReading.k2o === parsedK;

  const saveReading = () => {
    if (!hasCompleteReading || !defaultProfile) return;
    void store.saveNutrientReading(defaultProfile.farm.id, {
      n: parsedN,
      p2o5: parsedP,
      k2o: parsedK,
      recordedAt: new Date().toISOString(),
    });
  };

  const recommendation =
    crop && varietyId && zone && effectiveFertility
      ? getFertilizerRecommendation(crop, varietyId, zone)
      : null;

  // The farm's own pH reading (item: fertility data integration) — the same
  // figure and the same `topsoilPh`/`phSuitability` calls the Dashboard's
  // PhSuitabilityCard uses, so a farmer who has already seen that card is not
  // shown a second, differently-derived number here for the same soil. Uses
  // `crop`, not `defaultProfile.crop.name`: a farmer choosing a DIFFERENT crop
  // than the one saved on their farm sees that crop's own optimal range against
  // the same soil, since pH suitability depends on which crop is being asked
  // about, not on which crop the farm record happens to say.
  const measuredPh = defaultProfile ? topsoilPh(defaultProfile.soil.measured) : null;
  const phInfo =
    measuredPh !== null && crop
      ? { ph: measuredPh, level: phSuitability(crop, measuredPh), range: CROP_PH_RANGE[crop] }
      : null;

  const cameFromFarm =
    defaultProfile && crop === defaultProfile.crop.name && fertilizerCoversCrop(defaultProfile.crop.name);

  return (
    <div className="page">
      <h2 className="page__title">🧪 {t('fert.title')}</h2>

      {cameFromFarm && (
        <p className="fert-prefill-note">
          {t('fert.prefillFromFarm', { farm: defaultProfile.farm.name })}
        </p>
      )}

      <p className="fert-step-label">{t('fert.stepCrop')}</p>
      <div className="fert-icon-grid">
        {CROP_NAMES.map((name) => {
          const covered = fertilizerCoversCrop(name);
          return (
            <button
              key={name}
              type="button"
              className={`fert-icon-btn${crop === name ? ' fert-icon-btn--active' : ''}${
                covered ? '' : ' fert-icon-btn--muted'
              }`}
              onClick={() => setCrop(name)}
              aria-pressed={crop === name}
            >
              <span className="fert-icon-btn__icon" aria-hidden="true">
                {CROP_ICON[name]}
              </span>
              <span className="fert-icon-btn__label">{t(cropLabelKey(name))}</span>
            </button>
          );
        })}
      </div>

      {crop && !fertilizerCoversCrop(crop) && (
        <p className="empty-state">{t('fert.cropNotCovered', { crop: t(cropLabelKey(crop)) })}</p>
      )}

      {crop && phInfo && (
        <p className={`fert-ph-note fert-ph-note--${phInfo.level}`}>
          <span aria-hidden="true">{PH_ICON[phInfo.level]}</span>{' '}
          {t('fert.phFromFarm', {
            ph: phInfo.ph.toFixed(1),
            min: phInfo.range.min.toFixed(1),
            max: phInfo.range.max.toFixed(1),
            verdict: t(`ph.level.${phInfo.level}`),
          })}
        </p>
      )}

      {crop && fertilizerCoversCrop(crop) && (
        <>
          {varieties.length > 1 && (
            <>
              <p className="fert-step-label">{t('fert.stepVariety')}</p>
              <div className="fert-icon-grid">
                {varieties.map((v) => (
                  <button
                    key={v.varietyId}
                    type="button"
                    className={`fert-icon-btn${varietyId === v.varietyId ? ' fert-icon-btn--active' : ''}`}
                    onClick={() => setVarietyId(v.varietyId)}
                    aria-pressed={varietyId === v.varietyId}
                  >
                    <span className="fert-icon-btn__icon" aria-hidden="true">
                      {VARIETY_ICON[`${crop}:${v.varietyId}`] ?? '📋'}
                    </span>
                    <span className="fert-icon-btn__label">{v.variety}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <p className="fert-step-label">{t('fert.stepZone')}</p>
          <div className="fert-icon-grid">
            {zones.map((z) => (
              <button
                key={z}
                type="button"
                className={`fert-icon-btn${zone === z ? ' fert-icon-btn--active' : ''}`}
                onClick={() => setZone(z)}
                aria-pressed={zone === z}
              >
                <span className="fert-icon-btn__icon" aria-hidden="true">
                  {ZONE_ICON[z]}
                </span>
                <span className="fert-icon-btn__label">{t(`fert.zone.${z}`)}</span>
              </button>
            ))}
          </div>

          <p className="fert-step-label">{t('fert.stepFertility')}</p>
          <div className="fert-mode-toggle">
            <button
              type="button"
              className={`fert-mode-btn${fertilityMode === 'numbers' ? ' fert-mode-btn--active' : ''}`}
              onClick={() => setFertilityMode('numbers')}
              aria-pressed={fertilityMode === 'numbers'}
            >
              <span aria-hidden="true">🧪</span> {t('fert.fertilityModeNumbers')}
            </button>
            <button
              type="button"
              className={`fert-mode-btn${fertilityMode === 'simple' ? ' fert-mode-btn--active' : ''}`}
              onClick={() => setFertilityMode('simple')}
              aria-pressed={fertilityMode === 'simple'}
            >
              <span aria-hidden="true">🤷</span> {t('fert.fertilityModeSimple')}
            </button>
          </div>

          {fertilityMode === 'numbers' ? (
            <div className="fert-npk-inputs">
              <label className="field fert-npk-input">
                <span className="field__label">
                  <span aria-hidden="true">🌿</span> {t('fert.npkN')}
                </span>
                <input
                  className="field__input"
                  type="text"
                  inputMode="decimal"
                  placeholder={t('fert.kgHaPlaceholder')}
                  value={nInput}
                  onChange={(e) => setNInput(e.target.value)}
                />
              </label>
              <label className="field fert-npk-input">
                <span className="field__label">
                  <span aria-hidden="true">🌸</span> {t('fert.npkP')}
                </span>
                <input
                  className="field__input"
                  type="text"
                  inputMode="decimal"
                  placeholder={t('fert.kgHaPlaceholder')}
                  value={pInput}
                  onChange={(e) => setPInput(e.target.value)}
                />
              </label>
              <label className="field fert-npk-input">
                <span className="field__label">
                  <span aria-hidden="true">🍎</span> {t('fert.npkK')}
                </span>
                <input
                  className="field__input"
                  type="text"
                  inputMode="decimal"
                  placeholder={t('fert.kgHaPlaceholder')}
                  value={kInput}
                  onChange={(e) => setKInput(e.target.value)}
                />
              </label>
              <p className="field__hint">{t('fert.npkInputHint')}</p>
              {!hasCompleteReading && (nInput || pInput || kInput) && (
                <p className="field__hint">{t('fert.npkIncomplete')}</p>
              )}
              {classifiedFertility && (
                <p className="fert-classified-badge">
                  <span aria-hidden="true">{FERTILITY_ICON[classifiedFertility]}</span>{' '}
                  {t('fert.classifiedAs', { level: t(`fert.fertility.${classifiedFertility}`) })}
                </p>
              )}
              {hasCompleteReading && defaultProfile && (
                <button
                  type="button"
                  className="btn btn--ghost btn--block fert-save-reading"
                  onClick={saveReading}
                  disabled={alreadySaved}
                >
                  {alreadySaved ? `✓ ${t('fert.readingSaved')}` : t('fert.saveReading')}
                </button>
              )}
            </div>
          ) : (
            <div className="fert-icon-grid fert-icon-grid--3">
              {FERTILITY_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`fert-icon-btn${fertility === level ? ' fert-icon-btn--active' : ''}`}
                  onClick={() => setFertility(level)}
                  aria-pressed={fertility === level}
                >
                  <span className="fert-icon-btn__icon" aria-hidden="true">
                    {FERTILITY_ICON[level]}
                  </span>
                  <span className="fert-icon-btn__label">{t(`fert.fertility.${level}`)}</span>
                </button>
              ))}
            </div>
          )}

          {recommendation && effectiveFertility ? (
            <FertilizerAdviceCard recommendation={recommendation} fertility={effectiveFertility} t={t} />
          ) : !zone ? (
            <p className="empty-state">{t('fert.selectPrompt')}</p>
          ) : !recommendation ? (
            // Reachable only if the zone selector momentarily holds a value the
            // table does not have (e.g. mid-update while switching variety).
            <p className="empty-state">{t('fert.noZoneEntry', { zone: t(`fert.zone.${zone}`) })}</p>
          ) : (
            // Zone resolved fine; only the numeric soil-test reading is missing.
            <p className="empty-state">{t('fert.npkIncomplete')}</p>
          )}
        </>
      )}

      {!crop && <p className="empty-state">{t('fert.noCropSelected')}</p>}
    </div>
  );
}
