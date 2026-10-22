/**
 * In-memory LRU cache for synthesised speech (the /api/tts latency fix).
 *
 * WHY THIS EXISTS — THE MEASURED PROBLEM
 * A cold /api/tts request costs ~2.2s for one sentence and ~7s for a full
 * briefing (measured 2026-09-08): almost all of it is the Edge WebSocket
 * handshake and the synthesis round trip, not the audio. Briefing text is
 * deterministic — built from the same context the cards render — so the same
 * text+locale is asked for again and again: every dashboard reload, every
 * second device, every re-run of the demo. The browser's IndexedDB cache
 * helps only ONE device and only until its text changes (the briefing embeds
 * today's date and figures), so the server kept paying the full round trip
 * for repeats. Caching the synthesis server-side makes every repeat answer
 * in microseconds, whatever device asks.
 *
 * WHAT IS CACHED AND WHAT DELIBERATELY IS NOT
 * Only SUCCESSFUL results are stored: a provider failure (Edge's unofficial
 * protocol breaking, Sarvam credits exhausted, a rate limit) is transient
 * state, and remembering it would pin a device to silence or the device
 * voice long after the provider recovered. The cache lives in MEMORY: a
 * restart starts cold, which costs nothing — the first request after a
 * restart re-synthesises exactly as before this cache existed.
 *
 * VOICE IDENTITY IS NOT PART OF THE KEY
 * Which provider answers can vary between two identical requests (Edge
 * first, Sarvam when Edge is down), and the keys in the environment decide
 * which providers exist at all. None of that is in the key, on purpose: a
 * cached Sarvam WAV is a perfectly good answer to a request Edge could have
 * served, and the keys do not change while a process lives. The cache trades
 * "always the freshest voice" for "always fast" — the right trade for a
 * demo, where the wait is the failure mode anyone notices.
 */

import { synthesizeSpeech, type TtsKeys, type TtsResult } from './tts.js';

/**
 * Soft ceiling on cached audio, ~32 MiB — roughly a hundred full briefings
 * (a 2500-character synthesis produces at most ~1.2 MB) or thousands of
 * single sentences. Generous for a demo backend, small next to the Node
 * process itself.
 */
export const TTS_CACHE_MAX_BYTES = 32 * 1024 * 1024;

/**
 * A byte-budgeted LRU of successful syntheses, keyed by (locale, text).
 * Map preserves insertion order, so "least recently used" is approximated
 * the usual way: re-insert on read, evict from the front on write.
 */
export class TtsCache {
  private readonly entries = new Map<string, TtsResult>();
  private totalBytes = 0;

  constructor(private readonly maxBytes: number) {}

  /**
   * The cache key: the locale normalised exactly as the provider tables in
   * tts.ts normalise it (lowercase, hyphenated) — so 'EN_in' and 'en-IN'
   * share an entry, because providersFor treats them as the same language —
   * then a newline (no locale tag contains one) and the exact text.
   */
  private static keyFor(text: string, locale: string): string {
    return `${locale.toLowerCase().replace(/_/g, '-')}\n${text}`;
  }

  /** The cached result for (text, locale), or undefined. A hit re-inserts
   *  the entry so recently READ entries survive eviction as long as
   *  recently written ones. */
  get(text: string, locale: string): TtsResult | undefined {
    const key = TtsCache.keyFor(text, locale);
    const hit = this.entries.get(key);
    if (hit === undefined) return undefined;
    this.entries.delete(key);
    this.entries.set(key, hit);
    return hit;
  }

  /**
   * Store a successful synthesis, evicting least-recently-used entries until
   * the byte budget is met. The size > 1 guard means a single entry larger
   * than the whole budget is still kept: dropping the just-synthesised
   * answer would only force the next request to synthesise it again.
   */
  set(text: string, locale: string, result: TtsResult): void {
    const key = TtsCache.keyFor(text, locale);
    const previous = this.entries.get(key);
    if (previous !== undefined) {
      this.entries.delete(key);
      this.totalBytes -= previous.audio.length;
    }
    this.entries.set(key, result);
    this.totalBytes += result.audio.length;
    while (this.totalBytes > this.maxBytes && this.entries.size > 1) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      const evicted = this.entries.get(oldest);
      this.entries.delete(oldest);
      if (evicted !== undefined) this.totalBytes -= evicted.audio.length;
    }
  }

  /** Entry count and byte total — observability for tests and any future
   *  operational logging. */
  get size(): number {
    return this.entries.size;
  }

  get byteSize(): number {
    return this.totalBytes;
  }
}

/** What the cached synthesiser returns: the provider result plus whether the
 *  cache answered, so the route can label the response for debugging. */
export interface CachedTtsResult extends TtsResult {
  cacheHit: boolean;
}

/** The signature of the route-facing synthesiser. */
export type CachedSynthesizer = (
  text: string,
  locale: string,
  keys: TtsKeys,
) => Promise<CachedTtsResult>;

/**
 * Build the route's synthesiser: `synthesizeSpeech` with an LRU cache in
 * front. A hit answers without touching any provider; a miss synthesises and
 * stores the result only on success (failures propagate unchanged, so the
 * route's error mapping and the frontend's fallback tier behave exactly as
 * they did before the cache existed).
 *
 * A factory rather than a module-level singleton so consumers — the route,
 * and the tests — each own an isolated cache instead of sharing module state
 * across test cases.
 */
export function createCachedSynthesizer(maxBytes = TTS_CACHE_MAX_BYTES): CachedSynthesizer {
  const cache = new TtsCache(maxBytes);
  return async function synthesizeCached(
    text: string,
    locale: string,
    keys: TtsKeys,
  ): Promise<CachedTtsResult> {
    const hit = cache.get(text, locale);
    if (hit !== undefined) return { ...hit, cacheHit: true };
    const result = await synthesizeSpeech(text, locale, keys);
    cache.set(text, locale, result);
    return { ...result, cacheHit: false };
  };
}
