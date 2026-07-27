import { useState } from 'react';
import type { AppStore } from '../app/useAppStore';
import { LANGUAGES, UNIT_SYSTEMS } from '../types';

/**
 * Settings page — personalize the app (docs/05_UI_UX_Spec.md Settings):
 * language, units, offline and notification preferences. Notifications and
 * cloud sync are future scope and shown disabled (docs/06_Development_Roadmap.md
 * Deferred Features).
 */

interface Props {
  store: AppStore;
}

export function SettingsPage({ store }: Props) {
  const { settings, farmer } = store;
  const [name, setName] = useState(farmer?.name ?? '');
  const [savedNote, setSavedNote] = useState<string | null>(null);

  function flash(message: string) {
    setSavedNote(message);
    window.setTimeout(() => setSavedNote(null), 2000);
  }

  async function saveName() {
    if (!farmer || !name.trim()) return;
    await store.updateFarmer({ ...farmer, name: name.trim() });
    flash('Profile saved.');
  }

  return (
    <div className="page">
      <h2 className="page__title">Settings</h2>

      <section className="settings-group">
        <h3 className="settings-group__title">Profile</h3>
        <label className="field">
          <span className="field__label">Your name</span>
          <input
            className="field__input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void saveName()}
          />
        </label>
      </section>

      <section className="settings-group">
        <h3 className="settings-group__title">Preferences</h3>
        <label className="field">
          <span className="field__label">Language</span>
          <select
            className="field__input"
            value={settings.preferredLanguage}
            onChange={(e) =>
              void store.updateSettings({ ...settings, preferredLanguage: e.target.value as 'en' })
            }
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l === 'en' ? 'English' : l}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Units</span>
          <select
            className="field__input"
            value={settings.units}
            onChange={(e) =>
              void store.updateSettings({ ...settings, units: e.target.value as 'metric' })
            }
          >
            {UNIT_SYSTEMS.map((u) => (
              <option key={u} value={u}>
                {u === 'metric' ? 'Metric (°C, mm, litres)' : u}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="settings-group">
        <h3 className="settings-group__title">Coming soon</h3>
        <label className="toggle toggle--disabled">
          <input type="checkbox" checked={settings.notificationsEnabled} disabled readOnly />
          <span>Notifications (future release)</span>
        </label>
        <label className="toggle toggle--disabled">
          <input type="checkbox" checked={settings.offlineSyncEnabled} disabled readOnly />
          <span>Cloud sync (future release)</span>
        </label>
      </section>

      {savedNote && <p className="settings-note">{savedNote}</p>}
    </div>
  );
}
