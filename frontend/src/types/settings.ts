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
  /**
   * True once the farmer has seen the welcome/learning flow
   * (docs/12_Product_Roadmap_v2.md Feature 6.5). Optional because records
   * stored before V1.2 do not have it — they are treated as not yet onboarded.
   */
  onboardingCompleted?: boolean;
}
