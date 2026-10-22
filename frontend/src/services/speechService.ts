/**
 * The speak chain (V2.4): cached cloud audio → cloud synthesis → device voice.
 *
 * WHY A CHAIN, IN THIS ORDER
 * The Bengali gibberish incident (see speech.ts) proved that on-device voices
 * cannot be relied on at a demo: whether a language speaks at all depends on
 * which voice packs the machine happens to have installed. Cloud synthesis
 * removes that dependency — the same cloud voice speaks on every device —
 * but it needs the network and the backend key, neither of which a field
 * with no signal has. So the chain is:
 *
 *   1. CACHED AUDIO (IndexedDB, offline) — a sentence already synthesised.
 *   2. CLOUD (backend /api/tts → Sarvam for en/hi/bn, Gemini for ur) —
 *      fetch, play, and cache for next time.
 *   3. DEVICE (speechSynthesis, offline) — the V2.3 path, entire and intact,
 *      including its gibberish gate. Assamese lives here exclusively,
 *      because no cloud provider speaks it.
 *
 * The one rule that survives from V2.3 unchanged: NEVER let a wrong-language
 * voice speak. Every tier either speaks the right language or hands control to
 * the next tier; only the last tier can refuse ('noVoice').
 *
 * THE CLOUD IS TWO PROVIDERS (V2.4)
 * The backend route picks per language: Sarvam Bulbul v3 — Indian voices
 * built for Indian languages, no daily cap — for en/hi/bn, and Gemini TTS
 * for Urdu (the one language Sarvam does not speak) and as an in-request
 * backstop if Sarvam fails. Four of five languages get a cloud voice;
 * Assamese's only voice is the device engine.
 *
 * ONE CONTROLLER, TWO ENGINES
 * A spoken briefing can now play through an <audio> element (tiers 1–2) or the
 * speechSynthesis queue (tier 3) — and a farmer who taps stop must stop
 * whichever one is running. A module-level controller tracks the current
 * utterance id; `speakViaChain` records it on start and `stopSpeaking` cancels
 * both engines unconditionally, so a stop tap after a fallback (audio
 * element → speechSynthesis handover) still works.
 */

import { apiPostBinary } from './apiClient';
import { cacheTtsAudio, getCachedTtsAudio } from '../storage';
import { speak as speakOnDevice, stopSpeaking as stopDeviceSpeaking } from './speech';

/**
 * Locales the cloud tier serves — the UNION of the backend's provider tables
 * (backend/src/tts.ts): Sarvam Bulbul v3 speaks en/hi/bn, Gemini TTS adds ur.
 * Verified September 2026; Assamese is absent on both sides — its only voice
 * is the device engine. The backend picks the provider per locale (Sarvam
 * first, Gemini for Urdu and as backstop); this side only decides WHETHER to
 * ask the cloud at all, so this table must not drift from the backend's
 * union: a locale listed here but not there wastes a failed request on every
 * play; a locale listed there but not here never gets cloud audio.
 */
export const CLOUD_TTS_LOCALES: readonly string[] = ['en-IN', 'hi-IN', 'bn-IN', 'ur-IN'];

/** What the chain did — same contract as speech.ts's SpeakOutcome, plus which
 *  tier answered, so the UI can show "better voice when online" honestly. */
export type SpeakOutcome = 'spoken' | 'noVoice';

/** The id of the utterance currently registered with the controller, if any. */
let currentUtteranceId: string | null = null;
let currentAudio: HTMLAudioElement | null = null;

/**
 * A minimal seam for tests: jsdom (and Node) have no real audio decoding, so
 * tests stub this to a fake player the chain can drive.
 */
export interface AudioPlayer {
  play(blob: Blob): Promise<void>;
  stop(): void;
}

/** The real player: object URL + <audio> element. */
const browserAudioPlayer: AudioPlayer = {
  play(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      const cleanup = (): void => {
        currentAudio = null;
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        URL.revokeObjectURL(url);
      };
      const onEnded = (): void => {
        cleanup();
        resolve();
      };
      const onError = (): void => {
        cleanup();
        reject(new Error('audio playback failed'));
      };
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      audio.play().catch((err: unknown) => {
        cleanup();
        reject(err instanceof Error ? err : new Error('audio playback failed'));
      });
    });
  },
  stop(): void {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
  },
};

/** Injectable for tests; the real one everywhere else. */
let player: AudioPlayer = browserAudioPlayer;

/** Test seam — never call from app code. */
export function _setAudioPlayerForTests(p: AudioPlayer | null): void {
  player = p ?? browserAudioPlayer;
}

/**
 * Stop whatever is speaking, whichever engine has it.
 *
 * Called by a stop tap, a card unmount, or another speak starting — and it
 * cancels BOTH engines unconditionally rather than trying to remember which
 * one is active, because a fallback mid-utterance (cloud audio failed →
 * device voice) means the honest answer to "which engine" can change between
 * the tap and the cancel.
 */
export function stopSpeaking(): void {
  // Releasing the id FIRST is the whole point: every in-flight chain checks
  // utteranceStillCurrent() before playing or falling back, so nulling the id
  // here is what makes a stopped utterance stay stopped — a cancel that left
  // the id registered would let the chain hand the text to the device voice
  // after the farmer asked for silence.
  currentUtteranceId = null;
  player.stop();
  stopDeviceSpeaking();
}

/** Whether the current utterance id is still the one a caller registered. */
export function utteranceStillCurrent(id: string): boolean {
  return currentUtteranceId === id;
}

/** Register the caller's utterance as the active one, stopping whatever was
 *  speaking first. Order matters: stopSpeaking() nulls the current id, so it
 *  must run BEFORE this utterance claims the slot — the reverse order would
 *  cancel the claim it had just made. */
function claimUtterance(id: string): void {
  stopSpeaking();
  currentUtteranceId = id;
}

/** Release the controller at the natural end of an utterance. */
function releaseUtterance(id: string): void {
  if (currentUtteranceId === id) currentUtteranceId = null;
}

/**
 * Fetch (and cache) cloud audio for a sentence, or null when the cloud tier
 * cannot serve it — no locale voice, no key on the server, or no network.
 * Failures are deliberately swallowed into null: this tier is an upgrade, and
 * an upgrade that throws is a downgrade.
 *
 * CONCURRENT CALLS SHARE ONE FLIGHT
 * The briefing card prefetches on render, and the farmer's play tap can land
 * while that prefetch is still on the wire — before dedup, that meant TWO
 * identical POST /api/tts requests racing each other (and, before the
 * server-side cache, two Edge WebSocket handshakes), the tapped one possibly
 * finishing later than the prefetch it duplicated. The map below keys
 * in-flight requests by (locale, text); a second caller for the same
 * sentence awaits the first's promise instead of issuing its own. Entries
 * are removed when the flight settles, successful or not: only the SHARING
 * of a live request is deduped — a failed flight is retried by the next
 * caller, never remembered as a null. (The IndexedDB tier 1 read stays
 * outside the dedup: it is instant, local, and free of exactly the cost
 * the map exists to avoid.)
 */
const inFlightFetches = new Map<string, Promise<Blob | null>>();

export async function fetchCloudAudio(text: string, locale: string): Promise<Blob | null> {
  if (!CLOUD_TTS_LOCALES.includes(locale)) return null;
  const flightKey = `${locale}\n${text}`;
  const existing = inFlightFetches.get(flightKey);
  if (existing) return existing;

  const flight = (async (): Promise<Blob | null> => {
    try {
      const blob = await apiPostBinary('/api/tts', { text, locale });
      // A synthesis that produced no bytes is not audio; treat it as a miss.
      if (blob.size === 0) return null;
      await cacheTtsAudio(locale, text, blob);
      return blob;
    } catch {
      return null;
    } finally {
      inFlightFetches.delete(flightKey);
    }
  })();
  inFlightFetches.set(flightKey, flight);
  return flight;
}

/**
 * Prefetch a sentence's audio into the cache without playing anything.
 *
 * Called when the briefing card renders, so that by the time the farmer taps
 * play — especially at a demo, where the tap IS the demo — the audio is on
 * the device and plays instantly even if the venue Wi-Fi has died by then.
 * Cheap by construction: a cache hit costs one IndexedDB read; a locale the
 * cloud does not serve returns before any network call.
 */
export async function prefetchTtsAudio(text: string, locale: string): Promise<void> {
  if (!CLOUD_TTS_LOCALES.includes(locale)) return;
  if (text.length === 0) return;
  try {
    const cached = await getCachedTtsAudio(locale, text);
    if (cached) return;
    await fetchCloudAudio(text, locale);
  } catch {
    // Cache reads can fail (private mode, quota); prefetching is best-effort.
  }
}

/**
 * Speak a sentence through the chain.
 *
 * The id is the caller's SpeakButton instance id (e.g. 'briefing'): it is
 * registered with the controller on start, checked after every await so a
 * superseded utterance (the farmer tapped another card's speaker, or stop)
 * neither speaks nor errors, and released when playback ends.
 */
export async function speakViaChain(
  text: string,
  locale: string,
  utteranceId: string,
): Promise<SpeakOutcome> {
  claimUtterance(utteranceId);

  // Tier 1 — cached cloud audio.
  if (CLOUD_TTS_LOCALES.includes(locale)) {
    try {
      const cached = await getCachedTtsAudio(locale, text);
      if (cached && utteranceStillCurrent(utteranceId)) {
        try {
          await player.play(cached);
          releaseUtterance(utteranceId);
          return 'spoken';
        } catch {
          // A cache entry that cannot play (corrupt blob, codec) falls
          // through to re-synthesise rather than to the device voice.
        }
      }
    } catch {
      // IndexedDB unavailable — skip straight to the network tier.
    }

    // Tier 2 — cloud synthesis, then play and cache (fetchCloudAudio caches).
    if (utteranceStillCurrent(utteranceId)) {
      const blob = await fetchCloudAudio(text, locale);
      if (blob && utteranceStillCurrent(utteranceId)) {
        try {
          await player.play(blob);
          releaseUtterance(utteranceId);
          return 'spoken';
        } catch {
          // Playback failure — fall to the device voice.
        }
      }
    }
  }

  if (!utteranceStillCurrent(utteranceId)) return 'noVoice';

  // Tier 3 — the device voice, entire and unchanged (V2.3): its own voice
  // pick, gibberish gate and chunking apply, and it returns 'spoken' or
  // 'noVoice' by itself.
  const outcome = await speakOnDevice(text, locale);
  releaseUtterance(utteranceId);
  return outcome;
}
