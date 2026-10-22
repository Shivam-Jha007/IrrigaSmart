import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteDB } from 'idb';
import { closeDb, getDb, DB_NAME } from '../../storage/db';
import {
  cacheTtsAudio,
  clearTtsCache,
  getCachedTtsAudio,
  ttsCacheKey,
  TTS_CACHE_MAX_ENTRIES,
} from '../../storage';

/**
 * TTS audio cache tests (V2.4).
 *
 * The cache is what makes the cloud tier safe: a sentence synthesised once
 * plays from the device forever after, offline included. These tests pin the
 * two properties that, if broken, would do worse than a cache miss:
 *
 *  1. THE KEY IS THE FULL TEXT — a key that could collide would silently
 *     speak the WRONG advice (yesterday's numbers, another language's
 *     sentence) with cloud-voice confidence.
 *  2. EVICTION IS BOUNDED — the cache must never grow unbounded on a device
 *     with gigabytes less storage than a laptop.
 */

beforeEach(async () => {
  await closeDb();
  await deleteDB(DB_NAME);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function audioBlob(bytes = [1, 2, 3]): Blob {
  return new Blob([new Uint8Array(bytes)], { type: 'audio/mpeg' });
}

describe('ttsCacheKey', () => {
  it('separates the same text across locales', () => {
    expect(ttsCacheKey('hi-IN', 'Irrigate today.')).not.toBe(
      ttsCacheKey('en-IN', 'Irrigate today.'),
    );
  });

  it('separates different texts in the same locale — the whole text is the key', () => {
    // Not a hash: a collision here would speak the wrong advice.
    expect(ttsCacheKey('en-IN', 'Irrigate 12 mm today.')).not.toBe(
      ttsCacheKey('en-IN', 'Irrigate 15 mm today.'),
    );
  });
});

describe('cache round-trip', () => {
  it('returns undefined for a miss', async () => {
    expect(await getCachedTtsAudio('en-IN', 'never cached')).toBeUndefined();
  });

  it('returns the stored Blob byte-for-byte', async () => {
    await cacheTtsAudio('bn-IN', 'আজ সেচ দিন।', audioBlob([9, 9, 9, 9]));
    const blob = await getCachedTtsAudio('bn-IN', 'আজ সেচ দিন।');
    expect(blob).toBeDefined();
    expect(blob!.size).toBe(4);
    expect(blob!.type).toBe('audio/mpeg');
    expect(new Uint8Array(await blob!.arrayBuffer())).toEqual(new Uint8Array([9, 9, 9, 9]));
  });

  it('overwrites the entry when the same sentence is re-synthesised', async () => {
    await cacheTtsAudio('en-IN', 'same text', audioBlob([1]));
    await cacheTtsAudio('en-IN', 'same text', audioBlob([2, 2]));
    const blob = await getCachedTtsAudio('en-IN', 'same text');
    expect(blob!.size).toBe(2);
  });

  it('clearTtsCache empties the store', async () => {
    await cacheTtsAudio('en-IN', 'a', audioBlob());
    await cacheTtsAudio('en-IN', 'b', audioBlob());
    await clearTtsCache();
    expect(await getCachedTtsAudio('en-IN', 'a')).toBeUndefined();
    expect(await getCachedTtsAudio('en-IN', 'b')).toBeUndefined();
  });
});

describe('eviction', () => {
  it('keeps at most TTS_CACHE_MAX_ENTRIES, evicting the oldest written first', async () => {
    // Overwrite cachedAt so eviction order is deterministic and observable.
    const db = await getDb();

    for (let i = 0; i < TTS_CACHE_MAX_ENTRIES + 5; i += 1) {
      await cacheTtsAudio('en-IN', `sentence ${i}`, audioBlob([i]));
      // Backdate every entry a little so each write is strictly older than
      // the next: cachedAt = base - i minutes.
      await db.put('ttsCache', {
        key: ttsCacheKey('en-IN', `sentence ${i}`),
        audio: audioBlob([i]),
        cachedAt: new Date(Date.now() - (TTS_CACHE_MAX_ENTRIES + 10) * 60_000 + i * 60_000).toISOString(),
      });
    }

    expect(await db.count('ttsCache')).toBe(TTS_CACHE_MAX_ENTRIES);
    // The five oldest ("sentence 0".."sentence 4" by backdated timestamp) are
    // gone; the newest five survive.
    expect(await getCachedTtsAudio('en-IN', 'sentence 0')).toBeUndefined();
    expect(await getCachedTtsAudio('en-IN', 'sentence 4')).toBeUndefined();
    expect(await getCachedTtsAudio('en-IN', 'sentence 5')).toBeDefined();
    expect(await getCachedTtsAudio('en-IN', `sentence ${TTS_CACHE_MAX_ENTRIES + 4}`)).toBeDefined();
  });
});
