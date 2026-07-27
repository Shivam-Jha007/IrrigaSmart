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
    };
  }
  const { farm, crop, soil } = profile;
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
  };
}

export function FarmForm({ initial, onSave, onCancel, t }: Props) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [soilSuggestion, setSoilSuggestion] = useState<SoilType | null>(null);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleUseMyLocation() {
    setLocating(true);
    setLocationError(null);
    setSoilSuggestion(null);
    try {
      const coords = await detectCurrentPosition();
      set('latitude', coords.latitude.toFixed(5));
      set('longitude', coords.longitude.toFixed(5));
      try {
        const info = await fetchLocationInfo(coords.latitude, coords.longitude);
        if (info.label) set('locationLabel', info.label);
        if (info.suggestedSoilType) setSoilSuggestion(info.suggestedSoilType);
      } catch {
        // Coordinates are the essential part and were already filled; only the
        // place-name/soil lookup failed.
        setLocationError(t('form.locationError.lookupFailed'));
      }
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
