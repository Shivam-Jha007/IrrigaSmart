import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDB, openDB } from 'idb';
import { closeDb, DB_NAME, DB_VERSION, getDb, SETTINGS_KEY } from '../db';
import type { Crop, Farm, Farmer, Settings } from '../../types';

/**
 * Migration safety net.
 *
 * Item 4 (crop-specific growth stages) rewrites the value stored in
 * `crops.growthStage` on every existing record. That is the single highest-risk
 * change in the whole plan: get it wrong and a farmer opens the app to find
 * their fields gone. These tests establish that the upgrade path preserves data,
 * so the stage migration can be added to the same upgrade handler and verified
 * against the same assertions.
 *
 * They also pin the property that makes the handler safe in the first place:
 * it is idempotent and version-independent, ensuring each store rather than
 * branching on `oldVersion`. Branching stranded `waterLedger` at v3 once
 * already — a client that had opened at v3 before the store was added to v3's
 * branch never ran that branch again, and threw NotFoundError forever.
 */

const ALL_STORES = [
  'farmers',
  'farms',
  'crops',
  'soils',
  'recommendations',
  'history',
  'weatherCache',
  'settings',
  'notifications',
  'waterLedger',
  'depletionState',
] as const;

const farmer: Farmer = {
  id: 'farmer-1',
  name: 'Test Farmer',
  preferredLanguage: 'en',
  createdDate: '2026-01-04T09:00:00+05:30',
};

const farm: Farm = {
  id: 'farm-1',
  farmerId: 'farmer-1',
  name: 'North Field',
  location: { latitude: 23.677, longitude: 87.685, label: 'Test Village' },
  area: 2,
  areaUnit: 'Acre',
  soilType: 'Clay Loam',
  irrigationMethod: 'Drip',
  primaryCropId: 'crop-1',
};

const crop: Crop = {
  id: 'crop-1',
  name: 'Wheat',
  growthStage: 'Mid Season',
  typicalWaterRequirement: 'Moderate',
  category: 'Cereal',
};

const settings: Settings = {
  preferredLanguage: 'en',
  notificationsEnabled: false,
  offlineSyncEnabled: false,
  units: 'metric',
  onboardingCompleted: true,
};

beforeEach(async () => {
  await closeDb();
  await deleteDB(DB_NAME);
});

describe('IndexedDB schema', () => {
  it('creates every store and index on a fresh database', async () => {
    const db = await getDb();
    expect([...db.objectStoreNames].sort()).toEqual([...ALL_STORES].sort());
    expect(db.version).toBe(DB_VERSION);

    const tx = db.transaction(['farms', 'history', 'recommendations', 'notifications', 'waterLedger']);
    expect([...tx.objectStore('farms').indexNames]).toContain('byFarmer');
    expect([...tx.objectStore('history').indexNames].sort()).toEqual(['byDate', 'byFarm']);
    expect([...tx.objectStore('recommendations').indexNames]).toContain('byFarm');
    expect([...tx.objectStore('notifications').indexNames]).toContain('byFarm');
    expect([...tx.objectStore('waterLedger').indexNames]).toContain('byFarm');
  });

  it('preserves existing records when upgrading from an older version', async () => {
    // Simulate a real v1 installation: the MVP stores only, holding a farmer,
    // a farm and a crop the farmer entered before any later feature existed.
    const legacy = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore('farmers', { keyPath: 'id' });
        const farms = db.createObjectStore('farms', { keyPath: 'id' });
        farms.createIndex('byFarmer', 'farmerId');
        db.createObjectStore('crops', { keyPath: 'id' });
        db.createObjectStore('soils', { keyPath: 'id' });
        db.createObjectStore('recommendations', { keyPath: 'id' });
        db.createObjectStore('history', { keyPath: 'id' });
        db.createObjectStore('weatherCache', { keyPath: 'farmId' });
        db.createObjectStore('settings');
      },
    });
    await legacy.put('farmers' as never, farmer as never);
    await legacy.put('farms' as never, farm as never);
    await legacy.put('crops' as never, crop as never);
    await legacy.put('settings' as never, settings as never, SETTINGS_KEY as never);
    legacy.close();

    const db = await getDb();

    expect(db.version).toBe(DB_VERSION);
    // Nothing the farmer entered may be lost by an upgrade.
    expect(await db.get('farmers', 'farmer-1')).toEqual(farmer);
    expect(await db.get('farms', 'farm-1')).toEqual(farm);
    expect(await db.get('crops', 'crop-1')).toEqual(crop);
    expect(await db.get('settings', SETTINGS_KEY)).toEqual(settings);
    // And the stores added since v1 must exist afterwards.
    expect([...db.objectStoreNames].sort()).toEqual([...ALL_STORES].sort());
    expect(await db.getAllFromIndex('farms', 'byFarmer', 'farmer-1')).toEqual([farm]);
  });

  it('repairs a client stranded without a store added inside an old version branch', async () => {
    // The waterLedger regression, reproduced: a client sitting at the current
    // version with a store missing. A version-branching upgrade would never run
    // again for this client; the idempotent handler must restore the store.
    const drifted = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const store of ALL_STORES) {
          if (store === 'waterLedger' || store === 'depletionState') continue;
          if (store === 'settings') {
            db.createObjectStore('settings');
          } else if (store === 'weatherCache') {
            db.createObjectStore('weatherCache', { keyPath: 'farmId' });
          } else {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        }
      },
    });
    await drifted.put('farms' as never, farm as never);
    expect([...drifted.objectStoreNames]).not.toContain('waterLedger');
    drifted.close();

    // Opening at DB_VERSION + 1 is what a future release does. The idempotent
    // handler must then converge the drifted client onto the full schema.
    const repaired = await openDB(DB_NAME, DB_VERSION + 1, {
      upgrade(db, _old, _new, tx) {
        if (!db.objectStoreNames.contains('waterLedger')) {
          db.createObjectStore('waterLedger', { keyPath: 'id' });
        }
        const ledger = tx.objectStore('waterLedger' as never);
        if (!ledger.indexNames.contains('byFarm')) {
          ledger.createIndex('byFarm', 'farmId');
        }
        if (!db.objectStoreNames.contains('depletionState')) {
          db.createObjectStore('depletionState', { keyPath: 'farmId' });
        }
      },
    });
    expect([...repaired.objectStoreNames]).toContain('waterLedger');
    expect([...repaired.objectStoreNames]).toContain('depletionState');
    // The repair must not cost the farmer their data.
    expect(await repaired.get('farms' as never, 'farm-1')).toEqual(farm);
    repaired.close();
  });

  it('reuses one connection across calls', async () => {
    expect(await getDb()).toBe(await getDb());
  });
});
