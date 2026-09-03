import { useState } from 'react';
import {
  AREA_UNITS,
  CROP_NAMES,
  GROWTH_STAGES,
  IRRIGATION_METHODS,
  SOIL_TYPES,
} from '../types';
import type { SoilType } from '../types';
import type { FarmDraft, FarmProfile } from '../app/appTypes';
import {
  detectCurrentPosition,
  fetchLocationInfo,
  GeolocationError,
  searchPlaces,
  type LocationSearchHit,
} from '../services';
import type { TranslateFn } from '../i18n';
import {
  areaUnitLabelKey,
  cropLabelKey,
  methodLabelKey,
  soilLabelKey,
  stageLabelKey,
} from '../i18n';

/**
 * Parse the optional lab-test boxes into the draft's quality payloads.
 * A box is contributed only when non-empty AND finite AND non-negative —
 * half-typed or cleared fields are simply absent, matching how the types
 * model "this figure was not on the report". Returns nothing at all when no
 * box produced a value, so the draft carries no empty reading objects.
 */
function buildQualityTests(
  values: FormValues,
): { qualityTests?: FarmDraft['qualityTests']; waterTests?: FarmDraft['waterTests'] } {
  const parsed = (raw: string): number | undefined => {
    if (raw.trim() === '') return undefined;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const ece = parsed(values.ece);
  const esp = parsed(values.esp);
  const ecw = parsed(values.ecw);
  const sar = parsed(values.sar);
  const boron = parsed(values.boron);
  const bicarbonate = parsed(values.bicarbonate);
  const waterPh = parsed(values.waterPh);
  const recordedAt = new Date().toISOString();
  const qualityTests =
    ece === undefined && esp === undefined ? undefined : { recordedAt, ...(ece !== undefined ? { eceDsm: ece } : {}), ...(esp !== undefined ? { espPct: esp } : {}) };
  const waterTests =
    ecw === undefined && sar === undefined && boron === undefined && bicarbonate === undefined && waterPh === undefined
      ? undefined
      : {
          recordedAt,
          ...(ecw !== undefined ? { ecwDsm: ecw } : {}),
          ...(sar !== undefined ? { sar } : {}),
          ...(boron !== undefined ? { boronMgl: boron } : {}),
          ...(bicarbonate !== undefined ? { bicarbonateMeql: bicarbonate } : {}),
          ...(waterPh !== undefined ? { ph: waterPh } : {}),
        };
  return { ...(qualityTests ? { qualityTests } : {}), ...(waterTests ? { waterTests } : {}) };
}

/**
 * FarmForm — create or edit a farm (docs/05_UI_UX_Spec.md Farm Management).
 *
 * Captures only farmer-provided inputs; agronomic/soil attributes are derived
 * from the Knowledge Base by the store. Growth stage is a required farmer input
 * (docs/11_Decision_Logic.md §10).
 *
 * "Use my location" (docs/12_Product_Roadmap_v2.md Feature 1) fills coordinates
 * from the device GPS, then resolves place names and a soil suggestion via the
 * backend. The suggested soil is never applied automatically — the farmer must
 * confirm it (roadmap requirement).
 *
 * Numeric fields (latitude, longitude, area) are held as strings while editing
 * so farmers can freely type decimals and signs (a controlled number input
 * re-parses each keystroke and makes values like "23.6" or "-1.5" awkward to
 * enter). They are parsed and validated on save.
 */

interface Props {
  initial?: FarmProfile | undefined;
  onSave(draft: FarmDraft): Promise<void>;
  onCancel(): void;
  t: TranslateFn;
}

/** Editing shape: numeric fields are strings so typing decimals/signs is easy. */
interface FormValues {
  id?: string;
  name: string;
  latitude: string;
  longitude: string;
  locationLabel: string;
  area: string;
  areaUnit: FarmDraft['areaUnit'];
  cropName: FarmDraft['cropName'];
  growthStage: FarmDraft['growthStage'];
  soilType: FarmDraft['soilType'];
  irrigationMethod: FarmDraft['irrigationMethod'];
  // Optional lab tests (V2.2), as strings while editing like the other
  // numerics. Empty string = field absent on the report.
  ece: string;
  esp: string;
  ecw: string;
  sar: string;
  boron: string;
  bicarbonate: string;
  waterPh: string;
}

function toFormValues(profile?: FarmProfile): FormValues {
  if (!profile) {
    return {
      name: '',
      latitude: '',
      longitude: '',
      locationLabel: '',
      area: '1',
      areaUnit: 'Acre',
      cropName: 'Rice',
      growthStage: 'Mid Season',
      soilType: 'Clay',
      irrigationMethod: 'Drip',
      ece: '',
      esp: '',
      ecw: '',
      sar: '',
      boron: '',
      bicarbonate: '',
      waterPh: '',
    };
  }
  const { farm, crop, soil } = profile;
  const quality = soil.qualityReading;
  const water = farm.waterQuality;
  const num = (value: number | undefined): string =>
    value === undefined ? '' : String(value);
  return {
    id: farm.id,
    name: farm.name,
    latitude: String(farm.location.latitude),
    longitude: String(farm.location.longitude),
    locationLabel: farm.location.label ?? '',
    area: String(farm.area),
    areaUnit: farm.areaUnit,
    cropName: crop.name,
    growthStage: crop.growthStage,
    soilType: soil.name,
    irrigationMethod: farm.irrigationMethod,
    ece: num(quality?.eceDsm),
    esp: num(quality?.espPct),
    ecw: num(water?.ecwDsm),
    sar: num(water?.sar),
    boron: num(water?.boronMgl),
    bicarbonate: num(water?.bicarbonateMeql),
    waterPh: num(water?.ph),
  };
}

export function FarmForm({ initial, onSave, onCancel, t }: Props) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [soilSuggestion, setSoilSuggestion] = useState<SoilType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  // Open by default only when editing a farm that already carries tests —
  // a farmer adding a farm sees the simple form; a farmer who once entered
  // lab values sees them the moment they reopen the form.
  const hasStoredTests = Boolean(
    initial && (initial.soil.qualityReading || initial.farm.waterQuality),
  );
  const [testsOpen, setTestsOpen] = useState(hasStoredTests);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  /** Fill coordinates, then resolve place label + soil suggestion. */
  async function applyCoordinates(latitude: number, longitude: number, fallbackLabel?: string) {
    set('latitude', latitude.toFixed(5));
    set('longitude', longitude.toFixed(5));
    try {
      const info = await fetchLocationInfo(latitude, longitude);
      if (info.label) set('locationLabel', info.label);
      else if (fallbackLabel) set('locationLabel', fallbackLabel);
      if (info.suggestedSoilType) setSoilSuggestion(info.suggestedSoilType);
    } catch {
      // Coordinates are the essential part and were already filled; only the
      // place-name/soil lookup failed.
      if (fallbackLabel) set('locationLabel', fallbackLabel);
      setLocationError(t('form.locationError.lookupFailed'));
    }
  }

  async function handleUseMyLocation() {
    setLocating(true);
    setLocationError(null);
    setSoilSuggestion(null);
    try {
      const coords = await detectCurrentPosition();
      await applyCoordinates(coords.latitude, coords.longitude);
    } catch (err) {
      if (err instanceof GeolocationError) {
        if (err.code === 'UNSUPPORTED') setLocationError(t('form.locationError.unsupported'));
        else if (err.code === 'PERMISSION_DENIED') setLocationError(t('form.locationError.denied'));
        else setLocationError(t('form.locationError.unavailable'));
      } else {
        setLocationError(t('form.locationError.unavailable'));
      }
    } finally {
      setLocating(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim() || searching) return;
    setSearching(true);
    setLocationError(null);
    setSearchResults(null);
    try {
      const results = await searchPlaces(searchQuery);
      setSearchResults(results);
    } catch {
      setLocationError(t('form.searchFailed'));
    } finally {
      setSearching(false);
    }
  }

  async function handlePickResult(hit: LocationSearchHit) {
    setSearchResults(null);
    setSearchQuery('');
    setSoilSuggestion(null);
    await applyCoordinates(hit.latitude, hit.longitude, hit.label);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.name.trim()) {
      setError(t('form.error.name'));
      return;
    }

    if (values.latitude.trim() === '' || values.longitude.trim() === '') {
      setError(t('form.error.location'));
      return;
    }
    const latitude = Number(values.latitude);
    const longitude = Number(values.longitude);
    const area = Number(values.area);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError(t('form.error.coords'));
      return;
    }
    if (!Number.isFinite(area) || area <= 0) {
      setError(t('form.error.area'));
      return;
    }

    const { qualityTests, waterTests } = buildQualityTests(values);
    const draft: FarmDraft = {
      ...(values.id ? { id: values.id } : {}),
      name: values.name.trim(),
      latitude,
      longitude,
      locationLabel: values.locationLabel,
      area,
      areaUnit: values.areaUnit,
      cropName: values.cropName,
      growthStage: values.growthStage,
      soilType: values.soilType,
      irrigationMethod: values.irrigationMethod,
      ...(qualityTests ? { qualityTests } : {}),
      ...(waterTests ? { waterTests } : {}),
    };

    setSaving(true);
    try {
      await onSave(draft);
    } catch {
      setError(t('form.error.save'));
      setSaving(false);
    }
  }

  return (
    <form className="farm-form" onSubmit={handleSubmit}>
      <h2 className="page__title">{initial ? t('form.titleEdit') : t('form.titleAdd')}</h2>

      <label className="field">
        <span className="field__label">{t('form.name')}</span>
        <input
          className="field__input"
          type="text"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder={t('form.namePlaceholder')}
        />
      </label>

      <div className="location-tools">
        <button
          type="button"
          className="btn btn--ghost btn--block"
          onClick={() => void handleUseMyLocation()}
          disabled={locating}
        >
          {locating ? t('form.locating') : `📍 ${t('form.useMyLocation')}`}
        </button>

        <div className="location-search">
          <input
            className="field__input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSearch();
              }
            }}
            placeholder={t('form.searchPlaceholder')}
            aria-label={t('form.searchPlaceholder')}
          />
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void handleSearch()}
            disabled={searching || !searchQuery.trim()}
          >
            {searching ? t('form.searching') : t('form.search')}
          </button>
        </div>

        {searchResults && searchResults.length === 0 && (
          <p className="location-tools__hint">{t('form.searchNone')}</p>
        )}
        {searchResults && searchResults.length > 0 && (
          <ul className="location-results">
            {searchResults.map((hit) => (
              <li key={`${hit.latitude},${hit.longitude}`}>
                <button type="button" className="location-results__item" onClick={() => void handlePickResult(hit)}>
                  {hit.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        {locationError && <p className="form-error">{locationError}</p>}
      </div>

      <label className="field">
        <span className="field__label">{t('form.locationName')}</span>
        <input
          className="field__input"
          type="text"
          value={values.locationLabel}
          onChange={(e) => set('locationLabel', e.target.value)}
          placeholder={t('form.locationPlaceholder')}
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field__label">{t('form.latitude')}</span>
          <input
            className="field__input"
            type="text"
            inputMode="decimal"
            value={values.latitude}
            onChange={(e) => set('latitude', e.target.value)}
            placeholder="e.g. 23.6"
          />
        </label>
        <label className="field">
          <span className="field__label">{t('form.longitude')}</span>
          <input
            className="field__input"
            type="text"
            inputMode="decimal"
            value={values.longitude}
            onChange={(e) => set('longitude', e.target.value)}
            placeholder="e.g. 87.7"
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span className="field__label">{t('form.fieldSize')}</span>
          <input
            className="field__input"
            type="text"
            inputMode="decimal"
            value={values.area}
            onChange={(e) => set('area', e.target.value)}
            placeholder="e.g. 2"
          />
        </label>
        <label className="field">
          <span className="field__label">{t('form.unit')}</span>
          <select
            className="field__input"
            value={values.areaUnit}
            onChange={(e) => set('areaUnit', e.target.value as FormValues['areaUnit'])}
          >
            {AREA_UNITS.map((u) => (
              <option key={u} value={u}>
                {t(areaUnitLabelKey(u))}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="field__label">{t('form.crop')}</span>
        <select
          className="field__input"
          value={values.cropName}
          onChange={(e) => set('cropName', e.target.value as FormValues['cropName'])}
        >
          {CROP_NAMES.map((c) => (
            <option key={c} value={c}>
              {t(cropLabelKey(c))}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field__label">{t('form.growthStage')}</span>
        <select
          className="field__input"
          value={values.growthStage}
          onChange={(e) => set('growthStage', e.target.value as FormValues['growthStage'])}
        >
          {GROWTH_STAGES.map((s) => (
            <option key={s} value={s}>
              {t(stageLabelKey(s))}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field__label">{t('form.soilType')}</span>
        <select
          className="field__input"
          value={values.soilType}
          onChange={(e) => set('soilType', e.target.value as FormValues['soilType'])}
        >
          {SOIL_TYPES.map((s) => (
            <option key={s} value={s}>
              {t(soilLabelKey(s))}
            </option>
          ))}
        </select>
      </label>

      {soilSuggestion && soilSuggestion !== values.soilType && (
        <div className="soil-suggestion" role="status">
          <p>{t('form.soilSuggestion', { soil: t(soilLabelKey(soilSuggestion)) })}</p>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              set('soilType', soilSuggestion);
              setSoilSuggestion(null);
            }}
          >
            {t('form.applySuggestion', { soil: t(soilLabelKey(soilSuggestion)) })}
          </button>
        </div>
      )}

      <label className="field">
        <span className="field__label">{t('form.irrigationMethod')}</span>
        <select
          className="field__input"
          value={values.irrigationMethod}
          onChange={(e) => set('irrigationMethod', e.target.value as FormValues['irrigationMethod'])}
        >
          {IRRIGATION_METHODS.map((m) => (
            <option key={m} value={m}>
              {t(methodLabelKey(m))}
            </option>
          ))}
        </select>
      </label>

      {/* Optional lab tests (V2.2). Collapsed by default on a new farm so the
          required path stays short; open when editing a farm that carries
          values. Every box is optional and independent — a report may carry
          only ECw, or only boron, and the rest stay absent rather than zero. */}
      <div className="farm-form__tests">
        <button
          type="button"
          className="btn btn--ghost btn--block"
          aria-expanded={testsOpen}
          onClick={() => setTestsOpen((open) => !open)}
        >
          {testsOpen ? '▾' : '▸'} {t('form.testsToggle')}
        </button>
        {testsOpen && (
          <>
            <p className="farm-form__tests-hint">{t('form.testsHint')}</p>
            <h3 className="farm-form__tests-title">{t('form.testsSoilTitle')}</h3>
            <div className="field-row">
              <label className="field">
                <span className="field__label">{t('form.ece')}</span>
                <input
                  className="field__input"
                  type="text"
                  inputMode="decimal"
                  value={values.ece}
                  onChange={(e) => set('ece', e.target.value)}
                  placeholder="e.g. 2.4"
                />
              </label>
              <label className="field">
                <span className="field__label">{t('form.esp')}</span>
                <input
                  className="field__input"
                  type="text"
                  inputMode="decimal"
                  value={values.esp}
                  onChange={(e) => set('esp', e.target.value)}
                  placeholder="e.g. 6"
                />
              </label>
            </div>
            <h3 className="farm-form__tests-title">{t('form.testsWaterTitle')}</h3>
            <div className="field-row">
              <label className="field">
                <span className="field__label">{t('form.ecw')}</span>
                <input
                  className="field__input"
                  type="text"
                  inputMode="decimal"
                  value={values.ecw}
                  onChange={(e) => set('ecw', e.target.value)}
                  placeholder="e.g. 0.9"
                />
              </label>
              <label className="field">
                <span className="field__label">{t('form.sar')}</span>
                <input
                  className="field__input"
                  type="text"
                  inputMode="decimal"
                  value={values.sar}
                  onChange={(e) => set('sar', e.target.value)}
                  placeholder="e.g. 4"
                />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span className="field__label">{t('form.boron')}</span>
                <input
                  className="field__input"
                  type="text"
                  inputMode="decimal"
                  value={values.boron}
                  onChange={(e) => set('boron', e.target.value)}
                  placeholder="e.g. 0.5"
                />
              </label>
              <label className="field">
                <span className="field__label">{t('form.bicarbonate')}</span>
                <input
                  className="field__input"
                  type="text"
                  inputMode="decimal"
                  value={values.bicarbonate}
                  onChange={(e) => set('bicarbonate', e.target.value)}
                  placeholder="e.g. 2"
                />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span className="field__label">{t('form.waterPh')}</span>
                <input
                  className="field__input"
                  type="text"
                  inputMode="decimal"
                  value={values.waterPh}
                  onChange={(e) => set('waterPh', e.target.value)}
                  placeholder="e.g. 7.2"
                />
              </label>
            </div>
          </>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="farm-form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={saving}>
          {t('form.cancel')}
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? t('form.saving') : t('form.save')}
        </button>
      </div>
    </form>
  );
}
