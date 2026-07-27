import { useState } from 'react';
import type { AppStore } from '../app/useAppStore';
import type { Language, UnitSystem } from '../types';
import { LANGUAGES, UNIT_SYSTEMS } from '../types';

/**
 * Settings page — personalize the app (docs/05_UI_UX_Spec.md Settings):
 * language, units, offline and notification preferences. Language switching is
 * live (docs/12_Product_Roadmap_v2.md Feature 2); notifications and cloud sync
 * remain future scope and shown disabled (docs/06_Development_Roadmap.md
 * Deferred Features).
 */

interface Props {
  store: AppStore;
  /** Re-open the welcome/learning flow (roadmap Feature 6.5). */
  onShowOnboarding(): void;
}

export function SettingsPage({ store, onShowOnboarding }: Props) {
  const { settings, farmer, t } = store;
  const [name, setName] = useState(farmer?.name ?? '');
  const [savedNote, setSavedNote] = useState<string | null>(null);

  function flash(message: string) {
    setSavedNote(message);
    window.setTimeout(() => setSavedNote(null), 2000);
  }

  async function saveName() {
    if (!farmer || !name.trim()) return;
    await store.updateFarmer({ ...farmer, name: name.trim() });
    flash(t('settings.saved'));
  }

  async function toggleNotifications(enabled: boolean) {
    if (!enabled) {
      await store.updateSettings({ ...settings, notificationsEnabled: false });
      return;
    }
    const result = await store.enableNotifications();
    if (result === 'denied') flash(t('settings.notifDenied'));
    if (result === 'unsupported') flash(t('settings.notifUnsupported'));
  }

  return (
    <div className="page">
      <h2 className="page__title">{t('settings.title')}</h2>

      <section className="settings-group">
        <h3 className="settings-group__title">{t('settings.profile')}</h3>
        <label className="field">
          <span className="field__label">{t('settings.yourName')}</span>
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
        <h3 className="settings-group__title">{t('settings.preferences')}</h3>
        <label className="field">
          <span className="field__label">{t('settings.language')}</span>
          <select
            className="field__input"
            value={settings.preferredLanguage}
            onChange={(e) =>
              void store.updateSettings({ ...settings, preferredLanguage: e.target.value as Language })
            }
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {t(`lang.${l}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">{t('settings.units')}</span>
          <select
            className="field__input"
            value={settings.units}
            onChange={(e) =>
              void store.updateSettings({ ...settings, units: e.target.value as UnitSystem })
            }
          >
            {UNIT_SYSTEMS.map((u) => (
              <option key={u} value={u}>
                {u === 'metric' ? t('settings.unitsMetric') : u}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="settings-group">
        <h3 className="settings-group__title">{t('settings.preferences')}</h3>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={(e) => void toggleNotifications(e.target.checked)}
          />
          <span>{t('settings.notifications')}</span>
        </label>
      </section>

      <section className="settings-group">
        <h3 className="settings-group__title">{t('settings.comingSoon')}</h3>
        <label className="toggle toggle--disabled">
          <input type="checkbox" checked={settings.offlineSyncEnabled} disabled readOnly />
          <span>{t('settings.cloudSync')}</span>
        </label>
      </section>

      <section className="settings-group">
        <button type="button" className="btn btn--ghost btn--block" onClick={onShowOnboarding}>
          {t('settings.about')}
        </button>
      </section>

      {savedNote && <p className="settings-note">{savedNote}</p>}
    </div>
  );
}
