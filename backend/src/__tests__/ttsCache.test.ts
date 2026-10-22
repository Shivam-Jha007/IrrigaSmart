import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCachedSynthesizer, TtsCache, TTS_CACHE_MAX_BYTES } from '../ttsCache.js';
import type { TtsResult } from '../tts.js';

/**
 * The server-side TTS cache (the /api/tts latency fix, 2026-09-08).
 *
 * A cold synthesis costs ~2.2s per sentence / ~7s per briefing, and briefing
 * text is deterministic — the same request recurs across reloads, devices
 * and demo runs. These tests pin the properties the cache must hold to be
 * worth its memory: a HIT must skip the providers entirely; only SUCCESS is
 * stored (a cached failure would pin a device to the fallback long after
 * the provider recovered); the key must treat locale-tag spellings the
 * providers already treat as identical, but never conflate different texts;
 * and eviction must stay inside its byte budget, dropping the oldest
 * entries first while never discarding the entry just written.
 *
 * synthesizeSpeech itself is MOCKED (same seam as tts.test.ts): what is
 * under test here is the cache's decisions, not Microsoft's WebSocket.
 */

const synthMock = vi.hoisted(() => ({ synthesize: vi.fn() }));
vi.mock('../tts.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tts.js')>();
  return {
    ...actual,
    synthesizeSpeech: synthMock.synthesize,
  };
});

/** A valid-looking Edge MP3 result with a distinctive payload. */
function edgeResult(payload = 'audio'): TtsResult {
  return {
    audio: Buffer.concat([Buffer.from([0xff, 0xfb]), Buffer.from(payload)]),
    provider: 'edge',
    format: 'mp3',
  };
}

beforeEach(() => {
  synthMock.synthesize.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createCachedSynthesizer — the route-facing seam', () => {
  it('answers a repeat from the cache without calling any provider', async () => {
    synthMock.synthesize.mockResolvedValue(edgeResult('one'));
    const synthesize = createCachedSynthesizer();

    const first = await synthesize('Irrigate today.', 'en-IN', {});
    const second = await synthesize('Irrigate today.', 'en-IN', {});

    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(synthMock.synthesize).toHaveBeenCalledTimes(1);
    // The cached audio is the SAME bytes, not a re-synthesis.
    expect(second.audio).toBe(first.audio);
  });

  it('reports which provider answered, on both the miss and the hit', async () => {
    synthMock.synthesize.mockResolvedValue(edgeResult());
    const synthesize = createCachedSynthesizer();

    const miss = await synthesize('text', 'hi-IN', {});
    const hit = await synthesize('text', 'hi-IN', {});

    expect(miss.provider).toBe('edge');
    expect(miss.format).toBe('mp3');
    expect(hit.provider).toBe('edge');
    expect(hit.format).toBe('mp3');
  });

  it('does not cache failures — the next request retries the providers', async () => {
    synthMock.synthesize.mockRejectedValueOnce(new Error('Edge down'));
    synthMock.synthesize.mockResolvedValueOnce(edgeResult('recovered'));
    const synthesize = createCachedSynthesizer();

    await expect(synthesize('Irrigate today.', 'en-IN', {})).rejects.toThrow('Edge down');
    const result = await synthesize('Irrigate today.', 'en-IN', {});

    expect(result.cacheHit).toBe(false);
    expect(result.audio.subarray(2).toString()).toBe('recovered');
    expect(synthMock.synthesize).toHaveBeenCalledTimes(2);
  });

  it('keys on text: two different texts are two syntheses', async () => {
    synthMock.synthesize.mockImplementation(async () => edgeResult());
    const synthesize = createCachedSynthesizer();

    await synthesize('Irrigate today.', 'en-IN', {});
    await synthesize('Do not irrigate today.', 'en-IN', {});

    expect(synthMock.synthesize).toHaveBeenCalledTimes(2);
  });

  it('keys on locale: the same text in two languages is two syntheses', async () => {
    synthMock.synthesize.mockImplementation(async () => edgeResult());
    const synthesize = createCachedSynthesizer();

    await synthesize('same text', 'hi-IN', {});
    await synthesize('same text', 'en-IN', {});

    expect(synthMock.synthesize).toHaveBeenCalledTimes(2);
  });

  it("treats locale-tag spellings the providers treat as identical as the same key", async () => {
    // providersFor normalises 'EN_in' → 'en-in'; the cache key must agree,
    // or 'EN_in' would bypass a perfectly good 'en-IN' entry.
    synthMock.synthesize.mockResolvedValue(edgeResult());
    const synthesize = createCachedSynthesizer();

    await synthesize('text', 'en-IN', {});
    const hit = await synthesize('text', 'EN_in', {});

    expect(hit.cacheHit).toBe(true);
    expect(synthMock.synthesize).toHaveBeenCalledTimes(1);
  });

  it('passes text, locale and keys through to the provider layer unchanged', async () => {
    synthMock.synthesize.mockResolvedValue(edgeResult());
    const synthesize = createCachedSynthesizer();
    const keys = { sarvam: 'sarvam-key', gemini: 'gemini-key' };

    await synthesize('आज सिंचाई करें।', 'hi-IN', keys);

    expect(synthMock.synthesize).toHaveBeenCalledWith('आज सिंचाई करें।', 'hi-IN', keys);
  });

  it('isolates each instance — no module-level cache shared between consumers', async () => {
    synthMock.synthesize.mockResolvedValue(edgeResult());
    const first = createCachedSynthesizer();
    const second = createCachedSynthesizer();

    await first('text', 'en-IN', {});
    await second('text', 'en-IN', {});

    expect(synthMock.synthesize).toHaveBeenCalledTimes(2);
  });
});

describe('TtsCache — the LRU itself', () => {
  // edgeResult(payload) is 2 header bytes + payload; 'old'/'mid'/'new'
  // are 5 bytes each, so a 10-byte budget holds exactly two of them.
  it('evicts the least recently used entry when the byte budget is exceeded', () => {
    const cache = new TtsCache(10);
    cache.set('old', 'en-IN', edgeResult('old'));
    cache.set('mid', 'en-IN', edgeResult('mid'));
    cache.set('new', 'en-IN', edgeResult('new'));

    expect(cache.get('old', 'en-IN')).toBeUndefined();
    expect(cache.get('mid', 'en-IN')).toBeDefined();
    expect(cache.get('new', 'en-IN')).toBeDefined();
  });

  it('a READ refreshes an entry against eviction', () => {
    const cache = new TtsCache(10);
    cache.set('old', 'en-IN', edgeResult('old'));
    cache.set('mid', 'en-IN', edgeResult('mid'));
    // Touch 'old' so 'mid' is now the least recently used.
    expect(cache.get('old', 'en-IN')).toBeDefined();
    cache.set('new', 'en-IN', edgeResult('new'));

    expect(cache.get('old', 'en-IN')).toBeDefined();
    expect(cache.get('mid', 'en-IN')).toBeUndefined();
    expect(cache.get('new', 'en-IN')).toBeDefined();
  });

  it('never evicts the entry it just wrote, even alone over budget', () => {
    const cache = new TtsCache(10);
    cache.set('huge', 'en-IN', edgeResult('huge'));

    expect(cache.get('huge', 'en-IN')).toBeDefined();
  });

  it('overwriting the same key replaces the old bytes, not the entry count', () => {
    const cache = new TtsCache(1_000_000);
    cache.set('same', 'en-IN', edgeResult('first'));
    cache.set('same', 'en-IN', edgeResult('second'));

    expect(cache.size).toBe(1);
    expect(cache.get('same', 'en-IN')!.audio.subarray(2).toString()).toBe('second');
  });

  it('accounting survives overwrite and eviction without going negative', () => {
    // 'a' is overwritten with a 19-byte payload (2 + 17 chars); b and c are
    // 3 bytes each. After c: 25 bytes > the 22-byte budget, so 'a' (the
    // oldest, 19 bytes) is evicted and eviction stops — 6 bytes is within
    // budget. The point: the 19 bytes 'a' freed are neither double-counted
    // nor left behind in the running total.
    const cache = new TtsCache(22);
    cache.set('a', 'en-IN', edgeResult('a'));
    cache.set('a', 'en-IN', edgeResult('a-longer-payload'));
    cache.set('b', 'en-IN', edgeResult('b'));
    cache.set('c', 'en-IN', edgeResult('c')); // evicts 'a'

    expect(cache.size).toBe(2);
    expect(cache.byteSize).toBe(6);
    expect(cache.get('a', 'en-IN')).toBeUndefined();
  });

  it('tracks bytes as the sum of the stored audio', () => {
    const cache = new TtsCache(TTS_CACHE_MAX_BYTES);
    cache.set('a', 'en-IN', edgeResult('aaaa'));
    cache.set('b', 'en-IN', edgeResult('bbbbbbbb'));

    expect(cache.byteSize).toBe(2 + 4 + 2 + 8);
  });
});
