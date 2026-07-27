import { useState } from 'react';
import {
  AREA_UNITS,
  CROP_NAMES,
  GROWTH_STAGES,
  IRRIGATION_METHODS,
  SOIL_TYPES,
} from '../types';
import type { FarmDraft, FarmProfile } from '../app/appTypes';

/**
 * FarmForm — create or edit a farm (docs/05_UI_UX_Spec.md Farm Management).
 *
 * Captures only farmer-provided inputs; agronomic/soil attributes are derived
 * from the Knowledge Base by the store. Growth stage is a required farmer input
 * (docs/11_Decision_Logic.md §10).
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

export function FarmForm({ initial, onSave, onCancel }: Props) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.name.trim()) {
      setError('Please enter a farm name.');
      return;
    }

    if (values.latitude.trim() === '' || values.longitude.trim() === '') {
      setError('Please enter the farm location (latitude and longitude).');
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
      setError('Please enter a valid location (latitude -90 to 90, longitude -180 to 180).');
      return;
    }
    if (!Number.isFinite(area) || area <= 0) {
      setError('Field size must be a number greater than zero.');
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
      setError('Could not save the farm. Please try again.');
      setSaving(false);
    }
  }

  return (
    <form className="farm-form" onSubmit={handleSubmit}>
      <h2 className="page__title">{initial ? 'Edit farm' : 'Add farm'}</h2>

      <label className="field">
        <span className="field__label">Farm name</span>
        <input
          className="field__input"
          type="text"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. North field"
        />
      </label>

      <label className="field">
        <span className="field__label">Location name</span>
        <input
          className="field__input"
          type="text"
          value={values.locationLabel}
          onChange={(e) => set('locationLabel', e.target.value)}
          placeholder="e.g. Bolpur"
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field__label">Latitude</span>
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
          <span className="field__label">Longitude</span>
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
          <span className="field__label">Field size</span>
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
          <span className="field__label">Unit</span>
          <select
            className="field__input"
            value={values.areaUnit}
            onChange={(e) => set('areaUnit', e.target.value as FormValues['areaUnit'])}
          >
            {AREA_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="field__label">Crop</span>
        <select
          className="field__input"
          value={values.cropName}
          onChange={(e) => set('cropName', e.target.value as FormValues['cropName'])}
        >
          {CROP_NAMES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field__label">Growth stage</span>
        <select
          className="field__input"
          value={values.growthStage}
          onChange={(e) => set('growthStage', e.target.value as FormValues['growthStage'])}
        >
          {GROWTH_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field__label">Soil type</span>
        <select
          className="field__input"
          value={values.soilType}
          onChange={(e) => set('soilType', e.target.value as FormValues['soilType'])}
        >
          {SOIL_TYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field__label">Irrigation method</span>
        <select
          className="field__input"
          value={values.irrigationMethod}
          onChange={(e) => set('irrigationMethod', e.target.value as FormValues['irrigationMethod'])}
        >
          {IRRIGATION_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="farm-form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save farm'}
        </button>
      </div>
    </form>
  );
}
