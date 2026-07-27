import type { Settings } from '../types';
import { getDb, SETTINGS_KEY } from './db';

/**
 * Settings store (docs/03_Data_Models.md Settings).
 *
 * Settings is a single application-wide record, so it does not use the id-keyed
 * generic repository. It is stored under a constant key.
 */

/** Default settings for a fresh install: English, metric, no future features. */
export const DEFAULT_SETTINGS: Settings = {
  preferredLanguage: 'en',
  notificationsEnabled: false,
  offlineSyncEnabled: false,
  units: 'metric',
};

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const stored = await db.get('settings', SETTINGS_KEY);
  return stored ?? DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await getDb();
  await db.put('settings', settings, SETTINGS_KEY);
}
