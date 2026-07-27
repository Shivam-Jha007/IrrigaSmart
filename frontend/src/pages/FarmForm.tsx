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
 */

interface Props {
  initial?: FarmProfile | undefined;
  onSave(draft: FarmDraft): Promise<void>;
  onCancel(): void;
}

function toDraft(profile?: FarmProfile): FarmDraft {
  if (!profile) {
    return {
      name: '',
      latitude: 0,
      longitude: 0,
      locationLabel: '',
      area: 1,
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
    latitude: farm.location.latitude,
    longitude: farm.location.longitude,
    locationLabel: farm.location.label ?? '',
    area: farm.area,
    areaUnit: farm.areaUnit,
    cropName: crop.name,
    growthStage: crop.growthStage,
    soilType: soil.name,
    irrigationMethod: farm.irrigationMethod,
  };
}

export function FarmForm({ initial, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<FarmDraft>(() => toDraft(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FarmDraft>(key: K, value: FarmDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!draft.name.trim()) {
      setError('Please enter a farm name.');
      return;
    }
    if (!(draft.area > 0)) {
      setError('Field size must be greater than zero.');
      return;
    }
    if (
      draft.latitude < -90 ||
      draft.latitude > 90 ||
      draft.longitude < -180 ||
      draft.longitude > 180
    ) {
      setError('Please enter a valid location (latitude/longitude).');
      return;
    }
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
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. North field"
        />
      </label>

      <label className="field">
        <span className="field__label">Location name</span>
        <input
          className="field__input"
          type="text"
          value={draft.locationLabel}
          onChange={(e) => set('locationLabel', e.target.value)}
          placeholder="e.g. Bolpur"
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field__label">Latitude</span>
          <input
            className="field__input"
            type="number"
            step="0.0001"
            value={draft.latitude}
            onChange={(e) => set('latitude', Number(e.target.value))}
          />
        </label>
        <label className="field">
          <span className="field__label">Longitude</span>
          <input
            className="field__input"
            type="number"
            step="0.0001"
            value={draft.longitude}
            onChange={(e) => set('longitude', Number(e.target.value))}
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span className="field__label">Field size</span>
          <input
            className="field__input"
            type="number"
            step="0.1"
            min="0"
            value={draft.area}
            onChange={(e) => set('area', Number(e.target.value))}
          />
        </label>
        <label className="field">
          <span className="field__label">Unit</span>
          <select
            className="field__input"
            value={draft.areaUnit}
            onChange={(e) => set('areaUnit', e.target.value as FarmDraft['areaUnit'])}
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
          value={draft.cropName}
          onChange={(e) => set('cropName', e.target.value as FarmDraft['cropName'])}
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
          value={draft.growthStage}
          onChange={(e) => set('growthStage', e.target.value as FarmDraft['growthStage'])}
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
          value={draft.soilType}
          onChange={(e) => set('soilType', e.target.value as FarmDraft['soilType'])}
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
          value={draft.irrigationMethod}
          onChange={(e) => set('irrigationMethod', e.target.value as FarmDraft['irrigationMethod'])}
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
