import type { Farmer, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../storage';

/**
 * First-run defaults. A single implicit farmer profile is created on first
 * launch since the MVP has no authentication (docs/06_Development_Roadmap.md
 * Deferred Features). The name is editable from Settings/Profile.
 */
export const DEFAULT_FARMER: Farmer = {
  id: 'farmer-local',
  name: 'Farmer',
  preferredLanguage: 'en',
  createdDate: '1970-01-01T00:00:00.000Z',
};

/** Settings used before the persisted record has loaded. */
export const SETTINGS_FALLBACK: Settings = DEFAULT_SETTINGS;
