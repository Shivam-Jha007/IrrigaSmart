/**
 * Edge TTS provider (V2.4 speech upgrade, tier 1: the free Microsoft voices).
 *
 * WHAT THIS IS, HONESTLY
 * The Edge browser's "Read Aloud" feature speaks through Microsoft's Azure
 * Neural voices; the `msedge-tts` library speaks that same undocumented
 * WebSocket protocol. There is no API key because this was never offered as
 * an API — the library presents itself as the browser. Verified working from
 * this network on 2026-09-08 (Hindi, Bengali and Urdu MP3s synthesised
 * live). It is the FIRST tier because it is free, unlimited and the best
 * quality available to this project; Sarvam/Gemini stay behind it as
 * key-backed, contract-backed fallbacks for the day Microsoft changes
 * something — which is a real possibility for an unofficial endpoint and
 * exactly why nothing depends on Edge alone.
 *
 * VOICE CHOICE (verified against the live voice list, 2026-09-08)
 * hi-IN-MadhurNeural, bn-IN-BashkarNeural, ur-IN-SalmanNeural — and
 * en-IN-PrabhatNeural. One measured male voice per language, the same
 * register Shubh (Sarvam) and Charon (Gemini) were chosen for. Assamese has
 * no Edge voice: it never reaches this provider.
 *
 * OUTPUT FORMAT
 * MP3 (audio-24khz-48kbitrate-mono-mp3) — the browser <audio> element plays
 * MP3 as happily as WAV, so the frontend chain needed no change. The route
 * tags the response Content-Type per provider.
 */

import { mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { TtsProviderError } from './tts.js';

/**
 * The Edge voice per locale. Keys are LOWERCASE normalised tags, same
 * convention as tts.ts's language tables.
 */
const EDGE_VOICES: Readonly<Record<string, string>> = {
  'en-in': 'en-IN-PrabhatNeural',
  'hi-in': 'hi-IN-MadhurNeural',
  'bn-in': 'bn-IN-BashkarNeural',
  'ur-in': 'ur-IN-SalmanNeural',
};

/** Whether Edge has a voice for a locale (case/underscore-tolerant). */
export function edgeServesLocale(locale: string): boolean {
  return locale.toLowerCase().replace(/_/g, '-') in EDGE_VOICES;
}

/** The Edge voice name for a locale, or null. Exported for the tests. */
export function edgeVoiceFor(locale: string): string | null {
  return EDGE_VOICES[locale.toLowerCase().replace(/_/g, '-')] ?? null;
}

/**
 * Synthesise text as MP3 via Edge Read Aloud.
 *
 * The library's file API (`toFile`) writes into a directory rather than a
 * path, so this runs in a private temp dir per call and reads the result
 * back — slightly awkward, but it keeps the library's internals (and their
 * updates) at arm's length: we only depend on "setMetadata + toFile" which
 * has been stable across the library's 2.x line.
 */
export async function synthesizeViaEdge(text: string, locale: string): Promise<Buffer> {
  const voice = edgeVoiceFor(locale);
  if (!voice) {
    throw new TtsProviderError(`no Edge voice exists for ${locale}`, 503);
  }

  const dir = join(tmpdir(), `irrigasmart-tts-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try {
    await mkdir(dir, { recursive: true });
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioFilePath } = await tts.toFile(dir, text);
    await tts.close();
    if (!audioFilePath) {
      throw new TtsProviderError('Edge TTS returned no audio path', 502);
    }
    const mp3 = await readFile(audioFilePath);
    // A valid MP3 frame starts with 0xFF 0xFB/0xF3/0xF2 (or an ID3 tag).
    if (mp3.length === 0 || (mp3[0] !== 0xff && mp3.subarray(0, 3).toString('ascii') !== 'ID3')) {
      throw new TtsProviderError('Edge TTS returned audio that is not MP3', 502);
    }
    return mp3;
  } catch (error) {
    if (error instanceof TtsProviderError) throw error;
    // The library throws plain Errors (403 handshakes, timeouts, protocol
    // drift). Log for the operator — this is the tier most likely to break
    // silently one morning, and the server log is the only trace.
    console.error(`[IrrigaSmart] Edge TTS failed: ${error instanceof Error ? error.message : error}`);
    throw new TtsProviderError(
      `Edge TTS failed: ${error instanceof Error ? error.message : String(error)}`,
      502,
    );
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
