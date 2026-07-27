import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type {
  Crop,
  Farm,
  Farmer,
  HistoryRecord,
  Recommendation,
  Settings,
  Soil,
  WeatherData,
} from '../types';

/**
 * IndexedDB schema for IrrigaSmart (docs/04_System_Interfaces.md Interface 2).
 *
 * This module owns the database definition and is the single entry point that
 * opens the connection. All persistence flows through repositories built on top
 * of this — the UI never opens or touches the database directly
 * (docs/07_Engineering_Rules.md: Storage Rules).
 */

export const DB_NAME = 'irrigasmart';
export const DB_VERSION = 1;

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
}

let dbPromise: Promise<IDBPDatabase<IrrigaSmartDB>> | null = null;

/**
 * Open (or reuse) the singleton database connection. The connection is created
 * lazily on first use and cached for the lifetime of the page.
 */
export function getDb(): Promise<IDBPDatabase<IrrigaSmartDB>> {
  if (!dbPromise) {
    dbPromise = openDB<IrrigaSmartDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
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
      },
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
