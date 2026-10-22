import { getDb, type TtsCacheEntry } from './db';

/**
 * TTS audio cache store (V2.4 speech upgrade).
 *
 * Cloud-synthesised MP3s are cached in IndexedDB so the same sentence is
 * synthesised (and paid for) once and replayed from the device ever after —
 * including with no network, which is what makes the hybrid safe to demo:
 * prefetch the briefing audio while signal exists and it plays back offline
 * like any on-device voice.
 *
 * Entries are keyed by locale+text (see ttsCacheKey). Speech is pruned by a
 * simple count cap, oldest first: audio is nice-to-have polish, never data a
 * farmer depends on, so eviction must be cheap and silent.
 */

/**
 * Cache key for a spoken sentence. The full text is the key, deliberately not
 * a hash: a hash collision would speak the WRONG advice to the farmer, while
 * a few extra kilobytes of key cost nothing. The locale is part of the key so
 * the same English sentence and its Hindi translation coexist.
 */
export function ttsCacheKey(locale: string, text: string): string {
  return `${locale}::${text}`;
}

/** Most recent audio entries kept before the oldest are evicted. ~60 briefings'
 *  worth of one-liners, or a day's dashboard use — enough that a farmer's
 *  repeated plays are instant, small enough that the DB never balloons. */
export const TTS_CACHE_MAX_ENTRIES = 120;

export async function getCachedTtsAudio(locale: string, text: string): Promise<Blob | undefined> {
  const db = await getDb();
  const entry = await db.get('ttsCache', ttsCacheKey(locale, text));
  return entry?.audio;
}

/**
 * Store audio and prune the cache to the entry cap.
 *
 * Pruning after every write, not on a timer: a timer would compete with the
 * briefing for the event loop on low-end devices, while a post-write prune is
 * bounded work on a path that is already async.
 */
export async function cacheTtsAudio(locale: string, text: string, audio: Blob): Promise<void> {
  const db = await getDb();
  const entry: TtsCacheEntry = {
    key: ttsCacheKey(locale, text),
    audio,
    cachedAt: new Date().toISOString(),
  };
  await db.put('ttsCache', entry);

  const count = await db.count('ttsCache');
  if (count > TTS_CACHE_MAX_ENTRIES) {
    // getAll on a keyPath store returns entries sorted by key (the locale+text
    // string), not by recency — so recency comes from the stored timestamp,
    // evicting the OLDEST synthesised audio first.
    const all = await db.getAll('ttsCache');
    const excess = all
      .sort((a, b) => a.cachedAt.localeCompare(b.cachedAt))
      .slice(0, count - TTS_CACHE_MAX_ENTRIES);
    await Promise.all(excess.map((victim) => db.delete('ttsCache', victim.key)));
  }
}

/** Test/maintenance hook: drop every cached audio entry. */
export async function clearTtsCache(): Promise<void> {
  const db = await getDb();
  await db.clear('ttsCache');
}
