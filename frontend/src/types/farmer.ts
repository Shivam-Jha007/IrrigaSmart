import type { Language } from './enums';

/**
 * Farmer — the primary user of the application (docs/03_Data_Models.md).
 *
 * A farmer may own one or more farms. Identifiers are opaque strings and dates
 * are ISO-8601 strings so entities serialize cleanly to IndexedDB/JSON in later
 * phases.
 */
export interface Farmer {
  id: string;
  name: string;
  preferredLanguage: Language;
  /** Optional per Data Models; phone-based features are future scope. */
  phoneNumber?: string;
  /** ISO-8601 timestamp. */
  createdDate: string;
}
