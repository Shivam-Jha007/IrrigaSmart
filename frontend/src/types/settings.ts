import type { Language, UnitSystem } from './enums';

/**
 * Settings — user preferences (docs/03_Data_Models.md).
 *
 * Settings are independent from business logic. Notification preference is
 * modelled for forward compatibility but notifications are future scope
 * (docs/06_Development_Roadmap.md Deferred Features).
 */
export interface Settings {
  preferredLanguage: Language;
  /** Reserved for future notification features; defaults to false in the MVP. */
  notificationsEnabled: boolean;
  /** Reserved for future cloud sync; defaults to false in the MVP. */
  offlineSyncEnabled: boolean;
  units: UnitSystem;
}
