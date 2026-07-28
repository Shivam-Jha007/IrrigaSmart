import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type {
  AppNotification,
  Crop,
  DailyWeather,
  Farm,
  Farmer,
  HistoryRecord,
  Recommendation,
  Settings,
  Soil,
  WaterLedgerEntry,
  WeatherData,
} from '../types';

/**
 * IndexedDB schema for IrrigaSmart (docs/04_System_Interfaces.md Interface 2).
 *
 * This module owns the database definition and is the single entry point that
 * opens the connection. All persistence flows through repositories built on top
 * of this — the UI never opens or touches the database directly
 * (docs/07_Engineering_Rules.md: Storage Rules).
 *
 * Migrations: v1 → MVP stores; v2 → + notifications store (roadmap Feature 7);
 * v3 → + waterLedger store (per-day advised/applied/saved water tracking).
 */

export const DB_NAME = 'irrigasmart';
export const DB_VERSION = 3;

/** Key for the single application settings record. */
export const SETTINGS_KEY = 'app';

/**
 * A cached weather entry is stored per farm, keyed by farmId. WeatherData itself
 * has no id, so the cache key is stored out-of-line alongside the payload.
 */
export interface WeatherCacheEntry {
  farmId: string;
  weather: WeatherData;
  /** ISO-8601 timestamp of when this entry was written to the cache. */
  cachedAt: string;
  /**
   * Daily series fetched alongside the weather (roadmap Feature 5). Optional:
   * entries written before V1.2 do not have it, in which case multi-day
   * planning is skipped until the next live fetch.
   */
  daily?: DailyWeather[];
}

export interface IrrigaSmartDB extends DBSchema {
  farmers: {
    key: string;
    value: Farmer;
  };
  farms: {
    key: string;
    value: Farm;
    indexes: { byFarmer: string };
  };
  crops: {
    key: string;
    value: Crop;
  };
  soils: {
    key: string;
    value: Soil;
  };
  recommendations: {
    key: string;
    value: Recommendation;
    indexes: { byFarm: string };
  };
  history: {
    key: string;
    value: HistoryRecord;
    indexes: { byFarm: string; byDate: string };
  };
  weatherCache: {
    key: string;
    value: WeatherCacheEntry;
  };
  settings: {
    key: string;
    value: Settings;
  };
  notifications: {
    key: string;
    value: AppNotification;
    indexes: { byFarm: string };
  };
  waterLedger: {
    key: string;
    value: WaterLedgerEntry;
    indexes: { byFarm: string };
  };
}

let dbPromise: Promise<IDBPDatabase<IrrigaSmartDB>> | null = null;

/** Error thrown when a DB upgrade is blocked by another tab holding an older version. */
export class DbBlockedError extends Error {
  constructor() {
    super('Database upgrade is blocked by another open IrrigaSmart tab');
    this.name = 'DbBlockedError';
  }
}

/**
 * Open (or reuse) the singleton database connection. The connection is created
 * lazily on first use and cached for the lifetime of the page.
 *
 * Multi-tab safety: this connection closes itself when another tab requests a
 * version change (so upgrades are never blocked by us). If OUR upgrade is
 * blocked by another tab holding an older version, the open hangs silently —
 * so a guard rejects with DbBlockedError after a few seconds, letting callers
 * show actionable feedback instead of an infinite "Loading…". If the other
 * tab closes in time, the open completes normally.
 */
export function getDb(): Promise<IDBPDatabase<IrrigaSmartDB>> {
  if (!dbPromise) {
    let blockedByOtherTab = false;
    const open = openDB<IrrigaSmartDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('farmers', { keyPath: 'id' });

          const farms = db.createObjectStore('farms', { keyPath: 'id' });
          farms.createIndex('byFarmer', 'farmerId');

          db.createObjectStore('crops', { keyPath: 'id' });
          db.createObjectStore('soils', { keyPath: 'id' });

          const recommendations = db.createObjectStore('recommendations', { keyPath: 'id' });
          recommendations.createIndex('byFarm', 'farmId');

          const history = db.createObjectStore('history', { keyPath: 'id' });
          history.createIndex('byFarm', 'farmId');
          history.createIndex('byDate', 'generatedDate');

          // Weather cache is keyed explicitly by farmId (out-of-line key).
          db.createObjectStore('weatherCache', { keyPath: 'farmId' });

          // Settings is a singleton keyed by a constant.
          db.createObjectStore('settings');
        }

        if (oldVersion < 2) {
          // V2.0 — Smart Notifications (roadmap Feature 7).
          const notifications = db.createObjectStore('notifications', { keyPath: 'id' });
          notifications.createIndex('byFarm', 'farmId');
        }

        if (oldVersion < 3) {
          // Per-day water tracking: advised vs applied vs saved.
          const ledger = db.createObjectStore('waterLedger', { keyPath: 'id' });
          ledger.createIndex('byFarm', 'farmId');
        }
      },
      blocked() {
        blockedByOtherTab = true;
      },
    }).then((db) => {
      // If another tab needs to upgrade, release our connection so it can.
      db.addEventListener('versionchange', () => {
        db.close();
        dbPromise = null;
      });
      return db;
    });

    const blockedGuard = new Promise<never>((_resolve, reject) => {
      setTimeout(() => {
        if (blockedByOtherTab) reject(new DbBlockedError());
      }, 4000);
    });

    dbPromise = Promise.race([open, blockedGuard]);
    // A failed open (blocked, VersionError) must not poison the singleton —
    // the next call retries from scratch.
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

/**
 * Close and forget the cached connection. Intended for tests and error recovery;
 * not part of normal application flow.
 */
export async function closeDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}
