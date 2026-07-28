import type { IDBPDatabase, IndexNames, StoreNames } from 'idb';
import { getDb, type IrrigaSmartDB } from './db';

/**
 * Generic CRUD repository for id-keyed entity stores
 * (docs/06_Development_Roadmap.md Phase 2: Repository layer).
 *
 * Every core entity is keyed by a string `id`, so a single generic factory
 * provides consistent create/read/update/delete access without duplicating
 * logic per entity (docs/07_Engineering_Rules.md: prefer composition over
 * duplication). Stores with a different shape (settings singleton, weather
 * cache) have their own dedicated modules.
 */

/** Store names whose value is an object with a string `id` primary key. */
export type EntityStoreName = Extract<
  StoreNames<IrrigaSmartDB>,
  | 'farmers'
  | 'farms'
  | 'crops'
  | 'soils'
  | 'recommendations'
  | 'history'
  | 'notifications'
  | 'waterLedger'
>;

type EntityValue<Name extends EntityStoreName> = IrrigaSmartDB[Name]['value'];

export interface Repository<Name extends EntityStoreName> {
  /** Insert or replace an entity. */
  save(entity: EntityValue<Name>): Promise<void>;
  /** Retrieve a single entity by id, or undefined if absent. */
  getById(id: string): Promise<EntityValue<Name> | undefined>;
  /** Retrieve all entities in the store. */
  getAll(): Promise<EntityValue<Name>[]>;
  /** Retrieve all entities whose index value matches. */
  getAllByIndex(
    index: IndexNames<IrrigaSmartDB, Name>,
    value: string,
  ): Promise<EntityValue<Name>[]>;
  /** Delete an entity by id. No-op if it does not exist. */
  remove(id: string): Promise<void>;
  /** Delete every entity in the store. */
  clear(): Promise<void>;
}

export function createRepository<Name extends EntityStoreName>(
  storeName: Name,
): Repository<Name> {
  // idb's precise generic overloads are relaxed to the concrete store here;
  // the exposed Repository surface keeps callers fully typed.
  type Db = IDBPDatabase<IrrigaSmartDB>;

  return {
    async save(entity) {
      const db: Db = await getDb();
      await db.put(storeName, entity);
    },

    async getById(id) {
      const db: Db = await getDb();
      return db.get(storeName, id);
    },

    async getAll() {
      const db: Db = await getDb();
      return db.getAll(storeName);
    },

    async getAllByIndex(index, value) {
      const db: Db = await getDb();
      // Wrap in a key range so the query type resolves for the generic store;
      // a bare string does not narrow against idb's per-index query type.
      return db.getAllFromIndex(storeName, index, IDBKeyRange.only(value));
    },

    async remove(id) {
      const db: Db = await getDb();
      await db.delete(storeName, id);
    },

    async clear() {
      const db: Db = await getDb();
      await db.clear(storeName);
    },
  };
}
