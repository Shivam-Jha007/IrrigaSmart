/**
 * Text-to-Speech providers (V2.4 speech upgrade: Edge, Sarvam, Gemini).
 *
 * WHY THREE PROVIDERS, IN THIS ORDER
 * Edge TTS first: Microsoft's Azure Neural voices (the Edge browser's Read
 * Aloud), free and unlimited — but through an UNOFFICIAL protocol with no
 * contract, so it may break some morning without notice. Sarvam AI second:
 * Bulbul v3, Indian voices, ₹30/10K characters, 30 requests/min, a real
 * contract — the fallback that spends credits only when Edge is down. Gemini
 * third: covers Urdu (Sarvam does not) and backstops everything else on its
 * free tier. Assamese remains device-voice only — no provider speaks it.
 *
 * THE FALLBACK TREE, IN FULL
 *   cache (IndexedDB, offline) → [Edge → Sarvam → Gemini] by locale →
 *   device voice. A request only ever reaches here on a cache miss; a
 *   failure here only ever means the device voice, never an error on screen.
 *
 * THE ROUTE SERVES TWO FORMATS
 * Edge returns MP3; Sarvam returns base64 WAV; Gemini returns base64 raw PCM
 * which `pcmToWav` wraps in a RIFF header. `synthesizeSpeech` reports which
 * provider answered so the route can set the matching Content-Type; the
 * browser <audio> element plays both formats, so no consumer ever needs to
 * know.
 *
 * THE KEYS, AND WHERE THEY ARE ALLOWED TO LIVE
 * Edge needs NO key. SARVAM_API_KEY and GEMINI_API_KEY live in the backend
 * environment only — never sent to the browser, never in the bundle. Both
 * are OPTIONAL: with neither, Edge still serves every language it has a
 * voice for, and only those languages' device-tier fallback changes.
 *
 * LICENSING NOTES
 * Sarvam requires a commercial licence for shipped/generated Bulbul v3
 * audio; fine for a hackathon/college demo, revisit before commercial use.
 * Edge Read Aloud is an undocumented browser feature used through a
 * community library — same verdict: fine for a demo, not a business.
 */

import { edgeServesLocale, synthesizeViaEdge } from './edgeTts.js';

/** Sarvam's TTS endpoint and model. One constant each to swap on rename. */
const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';
export const SARVAM_TTS_MODEL = 'bulbul:v3';

/**
 * The Sarvam voice. Shubh — the default male voice — carries the same
 * measured, informative register Charon was chosen for on the Gemini path.
 */
export const SARVAM_SPEAKER = 'shubh';

/** Gemini's TTS model (the Urdu path). Free tier, separate daily quota. */
export const GEMINI_TTS_MODEL = 'gemini-3.1-flash-tts-preview';
export const GEMINI_TTS_VOICE = 'Charon';

/** Cap on the text the route will accept. A full spoken briefing is well under
 *  1,000 characters; 2,500 is Sarvam's own v3 limit, and staying at or under
 *  it keeps both providers valid for any accepted request. */
export const TTS_MAX_TEXT_LENGTH = 2500;

/**
 * Languages each provider speaks, normalised lowercase. Edge: en, hi, bn, ur
 * (Azure Neural, verified live 2026-09-08). Sarvam Bulbul v3: 10 Indian
 * languages + English (hi, bn, ta, te, kn, ml, mr, gu, pa, or, en) — no
 * Urdu, no Assamese. Gemini TTS: en, hi, bn, ur — no Assamese. The
 * frontend's CLOUD_TTS_LOCALES table is the UNION and must not drift from
 * these sets: a locale no provider serves must not be listed there, or every
 * play for it wastes a failed request.
 */
const SARVAM_LANGUAGES: ReadonlySet<string> = new Set(['en-in', 'hi-in', 'bn-in']);
const GEMINI_LANGUAGES: ReadonlySet<string> = new Set(['en-in', 'hi-in', 'bn-in', 'ur-in']);

/** The API keys the providers are called with, gathered by the route.
 *  `| undefined` keeps the type assignable under exactOptionalPropertyTypes
 *  when a caller builds the object with `x?.trim() || undefined`. */
export interface TtsKeys {
  sarvam?: string | undefined;
  gemini?: string | undefined;
}

/** The provider id, surfaced so the route can set the audio Content-Type and
 *  a debug header. */
export type TtsProviderId = 'edge' | 'sarvam' | 'gemini';

/** Which audio encoding a provider returns. */
export type TtsAudioFormat = 'mp3' | 'wav';

/** What a successful synthesis produced. */
export interface TtsResult {
  audio: Buffer;
  provider: TtsProviderId;
  format: TtsAudioFormat;
}

/** Whether ANY provider can serve a locale. Case/underscore-tolerant. */
export function cloudServesLocale(locale: string): boolean {
  const normalised = locale.toLowerCase().replace(/_/g, '-');
  return (
    edgeServesLocale(normalised) ||
    SARVAM_LANGUAGES.has(normalised) ||
    GEMINI_LANGUAGES.has(normalised)
  );
}

/** Which providers serve a locale, most-preferred first, given the keys the
 *  server actually holds. Edge is keyless and therefore always first for its
 *  languages; the key-backed providers follow only when configured. */
export function providersFor(
  locale: string,
  keys: TtsKeys,
): readonly TtsProviderId[] {
  const normalised = locale.toLowerCase().replace(/_/g, '-');
  const order: TtsProviderId[] = [];
  if (edgeServesLocale(normalised)) order.push('edge');
  if (keys.sarvam && SARVAM_LANGUAGES.has(normalised)) order.push('sarvam');
  if (keys.gemini && GEMINI_LANGUAGES.has(normalised)) order.push('gemini');
  return order;
}

/** Error thrown for invalid input or a failed synthesis, mirroring the other
 *  provider modules (WeatherProviderError etc.) so the route maps it the same
 *  way. */
export class TtsProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'TtsProviderError';
  }
}

/**
 * Wrap raw signed 16-bit little-endian PCM in a RIFF/WAVE header so a browser
 * <audio> element can play it. 44 bytes of header: the minimum every decoder
 * accepts. Exported for the tests, which pin the header's bytes. (Gemini path
 * only — Sarvam already answers WAV.)
 */
export function pcmToWav(pcm: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // size of the fmt chunk
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// --- Sarvam (primary: en, hi, bn) ---

/** Shape of Sarvam's successful response: base64 WAV strings. */
interface SarvamTtsResponse {
  request_id?: string;
  audios?: string[];
}

async function synthesizeViaSarvam(text: string, locale: string, apiKey: string): Promise<Buffer> {
  let response: globalThis.Response;
  try {
    response = await fetch(SARVAM_TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        text,
        // Sarvam's field is the bare locale tag; ours is already BCP-47.
        language_code: locale,
        speaker: SARVAM_SPEAKER,
        model: SARVAM_TTS_MODEL,
        // Matches the deliberate slower pace of the device tier (speech.ts):
        // agronomic advice with numbers in it, heard once, sometimes over the
        // noise of a field.
        pace: 0.95,
        speech_sample_rate: 24000,
      }),
    });
  } catch {
    throw new TtsProviderError('Sarvam TTS is unreachable', 502);
  }

  if (!response.ok) {
    const reason = await response.text().catch(() => '');
    // Logged as well as thrown: the frontend swallows failures into its
    // device-voice fallback, so the server log is the only place an operator
    // can see why cloud speech stopped (402 = credits exhausted is the one
    // to watch on the Starter plan).
    console.error(`[IrrigaSmart] Sarvam TTS ${response.status} ${reason.slice(0, 200)}`);
    throw new TtsProviderError(
      `Sarvam TTS returned ${response.status}: ${reason.slice(0, 200)}`,
      502,
    );
  }

  let body: SarvamTtsResponse;
  try {
    body = (await response.json()) as SarvamTtsResponse;
  } catch {
    throw new TtsProviderError('Sarvam TTS returned an unparseable response', 502);
  }
  // Sarvam's own sample code joins the array before decoding; a multi-element
  // response for a single text is one WAV split across elements.
  const audio = (body.audios ?? []).join('');
  if (audio.length === 0) {
    throw new TtsProviderError('Sarvam TTS returned no audio', 502);
  }
  const wav = Buffer.from(audio, 'base64');
  if (wav.length <= 44 || wav.toString('ascii', 0, 4) !== 'RIFF') {
    throw new TtsProviderError('Sarvam TTS returned audio that is not WAV', 502);
  }
  return wav;
}

// --- Gemini (Urdu, and backstop for en/hi/bn) ---

/** Shape of the successful generateContent response (TTS preview models). */
interface GeminiTtsResponse {
  candidates?: {
    content?: {
      parts?: {
        inlineData?: {
          /** e.g. "audio/L16;codec=pcm;rate=24000". */
          mimeType?: string;
          /** Base64 raw PCM. */
          data?: string;
        };
      }[];
    };
  }[];
}

async function synthesizeViaGemini(text: string, apiKey: string): Promise<Buffer> {
  let response: globalThis.Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // The key travels in the header, not the query string: URLs end up
          // in logs and browser history, and this request's URL is one an
          // operator might paste somewhere.
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE } },
            },
          },
        }),
      },
    );
  } catch {
    throw new TtsProviderError('Gemini TTS is unreachable', 502);
  }

  if (!response.ok) {
    const reason = await response.text().catch(() => '');
    console.error(`[IrrigaSmart] Gemini TTS ${response.status} ${reason.slice(0, 200)}`);
    throw new TtsProviderError(
      `Gemini TTS returned ${response.status}: ${reason.slice(0, 200)}`,
      502,
    );
  }

  let body: GeminiTtsResponse;
  try {
    body = (await response.json()) as GeminiTtsResponse;
  } catch {
    throw new TtsProviderError('Gemini TTS returned an unparseable response', 502);
  }

  const inline = body.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (typeof inline?.data !== 'string' || inline.data.length === 0) {
    throw new TtsProviderError('Gemini TTS returned no audio', 502);
  }

  // The PCM sample rate comes from the response mime type when present;
  // 24000 is the documented default for these models.
  const rate = /rate=(\d+)/.exec(inline.mimeType ?? '')?.[1];
  const sampleRate = rate ? Number(rate) : 24000;
  return pcmToWav(
    Buffer.from(inline.data, 'base64'),
    Number.isFinite(sampleRate) ? sampleRate : 24000,
  );
}

/**
 * Synthesise text as audio, trying the providers that serve the locale in
 * preference order. Throws TtsProviderError on invalid input or when every
 * candidate provider fails; the caller decides what the frontend should fall
 * back to (it always falls back to the on-device voice). The result carries
 * the provider and format so the route can label the response correctly.
 */
export async function synthesizeSpeech(text: string, locale: string, keys: TtsKeys): Promise<TtsResult> {
  if (!text.trim()) {
    throw new TtsProviderError('text must not be empty', 400);
  }
  if (text.length > TTS_MAX_TEXT_LENGTH) {
    throw new TtsProviderError(`text must be at most ${TTS_MAX_TEXT_LENGTH} characters`, 400);
  }
  const candidates = providersFor(locale, keys);
  if (candidates.length === 0) {
    // Only Assamese today: a language no cloud provider speaks. 503, not
    // 400 — "we cannot synthesise this" is a server-capability fact, not a
    // malformed request — and the frontend treats it like any cloud
    // failure: the device voice.
    throw new TtsProviderError(`no cloud voice is configured for ${locale}`, 503);
  }

  let lastError: TtsProviderError = new TtsProviderError('no provider attempted', 503);
  for (const provider of candidates) {
    try {
      const audio =
        provider === 'edge'
          ? await synthesizeViaEdge(text, locale)
          : provider === 'sarvam'
            ? await synthesizeViaSarvam(text, locale, keys.sarvam!)
            : await synthesizeViaGemini(text, keys.gemini!);
      return { audio, provider, format: provider === 'edge' ? 'mp3' : 'wav' };
    } catch (error) {
      lastError =
        error instanceof TtsProviderError
          ? error
          : new TtsProviderError('unexpected provider failure', 502);
      // ANY provider failure — 402 credits, 429 rate limit, 5xx, even a 400 —
      // hands the request to the next provider. A 400 is not "the caller's
      // fault" here: the caller-fault cases (empty, over-long) were already
      // rejected by the local validation above, and the providers have
      // different request schemas and limits, so what one rejects the next
      // may accept. A failed request bills nothing.
    }
  }
  throw lastError;
}
