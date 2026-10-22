import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cloudServesLocale,
  GEMINI_TTS_MODEL,
  GEMINI_TTS_VOICE,
  pcmToWav,
  providersFor,
  SARVAM_SPEAKER,
  SARVAM_TTS_MODEL,
  synthesizeSpeech,
  TtsProviderError,
  TTS_MAX_TEXT_LENGTH,
} from '../tts.js';

/**
 * Cloud TTS provider tests (V2.4: Edge tier 1, Sarvam tier 2, Gemini tier 3).
 *
 * The design hinges on four properties, each pinned here without a network:
 * the provider ROUTING (Edge first for en/hi/bn/ur — keyless — then the
 * key-backed providers by locale, as → nothing; the frontend's chain never
 * calls for Assamese, and if these tables drift from the frontend's, every
 * play for a mismatched language costs a wasted round trip or loses its
 * cloud voice); validation before any fetch; the IN-REQUEST FAILOVER (Edge
 * failing must hand the SAME request to Sarvam, Sarvam to Gemini — the
 * unofficial Edge protocol can break any morning, credits run out, rate
 * limits hit, and the farmer must not hear the difference); and pcmToWav's
 * header bytes, because a wrong WAV header is the one failure a browser
 * cannot recover from or even report clearly.
 *
 * The Edge provider module itself (edgeTts.ts) is MOCKED here: it drives a
 * WebSocket to Microsoft and has no place in unit tests — its live behaviour
 * was verified by hand (Hindi/Bengali/Urdu MP3s synthesised on 2026-09-08)
 * and is exercised again by any live /api/tts call.
 */

// Mock the Edge provider: tests control whether it succeeds, and what it
// reports about its own routing, without any network.
const edgeMock = vi.hoisted(() => ({ synthesize: vi.fn() }));
vi.mock('../edgeTts.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../edgeTts.js')>();
  return {
    ...actual,
    synthesizeViaEdge: edgeMock.synthesize,
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  edgeMock.synthesize.mockReset();
});

const BOTH_KEYS = { sarvam: 'sarvam-key', gemini: 'gemini-key' };

/** A fake Edge MP3: valid-looking frame start (0xFF 0xFB). */
const EDGE_MP3 = Buffer.from([0xff, 0xfb, 0x90, 0x00]);

/**
 * Stub fetch so calls to Sarvam's endpoint and Gemini's endpoint can both be
 * recognised and answered independently — the failover tests need one
 * provider to fail while another succeeds in the SAME process.
 */
function stubProviders(options: {
  sarvam?: { ok: boolean; status?: number; audios?: string[]; body?: string };
  gemini?: { ok: boolean; status?: number; data?: string; mime?: string; body?: string };
}): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (input: unknown) => {
    const url = String(input);
    if (url.includes('api.sarvam.ai')) {
      const s = options.sarvam ?? { ok: true, audios: [] };
      if (!s.ok) {
        return {
          ok: false,
          status: s.status ?? 402,
          json: () => Promise.reject(new Error('no json')),
          text: () => Promise.resolve(s.body ?? 'payment required'),
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            request_id: 'r',
            audios: s.audios ?? [Buffer.from('wav-bytes').toString('base64')],
          }),
        text: () => Promise.resolve(''),
      } as unknown as Response;
    }
    if (url.includes('generativelanguage.googleapis.com')) {
      const g = options.gemini ?? { ok: true, data: '' };
      if (!g.ok) {
        return {
          ok: false,
          status: g.status ?? 429,
          json: () => Promise.reject(new Error('no json')),
          text: () => Promise.resolve(g.body ?? 'quota exceeded'),
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: g.mime ?? 'audio/L16;codec=pcm;rate=24000',
                        data: g.data ?? Buffer.from('pcm-bytes').toString('base64'),
                      },
                    },
                  ],
                },
              },
            ],
          }),
        text: () => Promise.resolve(''),
      } as unknown as Response;
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** A minimal valid WAV so Sarvam's RIFF check passes. */
function fakeWav(payload = 'payload'): string {
  return pcmToWav(Buffer.from(payload)).toString('base64');
}

describe('cloudServesLocale / providersFor — the routing table', () => {
  it('serves en, hi, bn and ur across the providers', () => {
    for (const locale of ['en-IN', 'hi-IN', 'bn-IN', 'ur-IN']) {
      expect(cloudServesLocale(locale)).toBe(true);
    }
  });

  it('does not serve Assamese — its only voice is the device engine', () => {
    expect(cloudServesLocale('as-IN')).toBe(false);
  });

  it('puts keyless Edge FIRST for every language it speaks, whatever keys are set', () => {
    // Edge is tier 1 even with both keys configured: it is free and
    // unlimited, so the credits are only spent when Edge is down.
    expect(providersFor('hi-IN', BOTH_KEYS)).toEqual(['edge', 'sarvam', 'gemini']);
    expect(providersFor('en-IN', BOTH_KEYS)).toEqual(['edge', 'sarvam', 'gemini']);
    expect(providersFor('ur-IN', BOTH_KEYS)).toEqual(['edge', 'gemini']);
  });

  it('serves Edge alone when no key is configured at all', () => {
    // A keyless deployment still gets cloud voices for en/hi/bn/ur.
    expect(providersFor('hi-IN', {})).toEqual(['edge']);
    expect(providersFor('ur-IN', {})).toEqual(['edge']);
  });

  it('serves Edge alone for Urdu when no Gemini key is set — Sarvam cannot fill in', () => {
    // Urdu: Sarvam has no voice for it, so its key buys nothing here; only
    // Gemini could back up Edge, and only with GEMINI_API_KEY present.
    expect(providersFor('ur-IN', { sarvam: 'k' })).toEqual(['edge']);
  });

  it('tolerates underscore and case variants of a locale tag', () => {
    expect(cloudServesLocale('UR_in')).toBe(true);
    expect(providersFor('BN_in', BOTH_KEYS)).toEqual(['edge', 'sarvam', 'gemini']);
    expect(cloudServesLocale('as_in')).toBe(false);
  });
});

describe('pcmToWav — the 44-byte header a browser needs to play raw PCM', () => {
  const pcm = Buffer.from([1, 2, 3, 4, 5, 6]);

  it('writes a canonical RIFF/WAVE header (every field, exact offsets)', () => {
    const wav = pcmToWav(pcm, 24000, 1, 16);
    expect(wav.length).toBe(44 + pcm.length);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.readUInt32LE(4)).toBe(36 + pcm.length);
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.toString('ascii', 12, 16)).toBe('fmt ');
    expect(wav.readUInt32LE(16)).toBe(16); // fmt chunk size
    expect(wav.readUInt16LE(20)).toBe(1); // PCM format
    expect(wav.readUInt16LE(22)).toBe(1); // mono
    expect(wav.readUInt32LE(24)).toBe(24000); // sample rate
    expect(wav.readUInt32LE(28)).toBe(48000); // byte rate = 24000 × 2
    expect(wav.readUInt16LE(32)).toBe(2); // block align
    expect(wav.readUInt16LE(34)).toBe(16); // bits per sample
    expect(wav.toString('ascii', 36, 40)).toBe('data');
    expect(wav.readUInt32LE(40)).toBe(pcm.length);
  });

  it('appends the PCM bytes untouched', () => {
    expect(pcmToWav(pcm).subarray(44)).toEqual(pcm);
  });
});

describe('synthesizeSpeech — validation happens before any network call', () => {
  it('rejects empty text with 400 without fetching or touching Edge', async () => {
    const fetchMock = stubProviders({});
    await expect(synthesizeSpeech('   ', 'hi-IN', BOTH_KEYS)).rejects.toMatchObject({
      name: 'TtsProviderError',
      status: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(edgeMock.synthesize).not.toHaveBeenCalled();
  });

  it('rejects over-long text with 400 without fetching', async () => {
    const fetchMock = stubProviders({});
    await expect(
      synthesizeSpeech('x'.repeat(TTS_MAX_TEXT_LENGTH + 1), 'hi-IN', BOTH_KEYS),
    ).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(edgeMock.synthesize).not.toHaveBeenCalled();
  });

  it('rejects an unserved locale with 503 (not a client error)', async () => {
    const fetchMock = stubProviders({});
    await expect(
      synthesizeSpeech('আজি খেতিখন পানী দিব', 'as-IN', BOTH_KEYS),
    ).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(edgeMock.synthesize).not.toHaveBeenCalled();
  });
});

describe('synthesizeSpeech — the Edge tier (tier 1, keyless)', () => {
  it('answers from Edge alone for a cloud language, reporting mp3', async () => {
    stubProviders({});
    edgeMock.synthesize.mockResolvedValue(EDGE_MP3);

    const result = await synthesizeSpeech('Irrigate today.', 'en-IN', BOTH_KEYS);

    expect(result.provider).toBe('edge');
    expect(result.format).toBe('mp3');
    expect(result.audio).toBe(EDGE_MP3);
    // Edge succeeded, so the key-backed providers were never contacted —
    // credits are spent only when Edge is down.
    expect(edgeMock.synthesize).toHaveBeenCalledTimes(1);
    expect(fetchMockGlobal()).not.toHaveBeenCalled();
  });

  it('passes the caller text and locale through to Edge unchanged', async () => {
    stubProviders({});
    edgeMock.synthesize.mockResolvedValue(EDGE_MP3);
    await synthesizeSpeech('आज सिंचाई करें।', 'hi-IN', {});
    expect(edgeMock.synthesize).toHaveBeenCalledWith('आज सिंचाई करें।', 'hi-IN');
  });

  it('serves Urdu from Edge too — Edge has ur-IN voices', async () => {
    stubProviders({});
    edgeMock.synthesize.mockResolvedValue(EDGE_MP3);
    const result = await synthesizeSpeech('کیا حال ہے؟', 'ur-IN', {});
    expect(result.provider).toBe('edge');
  });
});

describe('synthesizeSpeech — the Sarvam call (tier 2)', () => {
  it('sends the key in the Sarvam header and names the model, speaker and locale', async () => {
    edgeMock.synthesize.mockRejectedValue(new TtsProviderError('Edge down', 502));
    const fetchMock = stubProviders({ sarvam: { ok: true, audios: [fakeWav('audio')] } });
    await synthesizeSpeech('Irrigate today.', 'en-IN', BOTH_KEYS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.sarvam.ai/text-to-speech');
    expect((init.headers as Record<string, string>)['api-subscription-key']).toBe('sarvam-key');
    const body = JSON.parse(init.body as string) as {
      text: string;
      language_code: string;
      speaker: string;
      model: string;
      pace: number;
      speech_sample_rate: number;
    };
    expect(body.text).toBe('Irrigate today.');
    expect(body.language_code).toBe('en-IN');
    expect(body.model).toBe(SARVAM_TTS_MODEL);
    expect(body.speaker).toBe(SARVAM_SPEAKER);
    expect(body.pace).toBe(0.95);
    expect(body.speech_sample_rate).toBe(24000);
  });

  it("returns Sarvam's WAV bytes as-is, reporting wav", async () => {
    edgeMock.synthesize.mockRejectedValue(new TtsProviderError('Edge down', 502));
    stubProviders({ sarvam: { ok: true, audios: [fakeWav('the-audio')] } });
    const result = await synthesizeSpeech('text', 'bn-IN', BOTH_KEYS);
    expect(result.provider).toBe('sarvam');
    expect(result.format).toBe('wav');
    expect(result.audio.toString('ascii', 0, 4)).toBe('RIFF');
    expect(result.audio.subarray(44).toString()).toBe('the-audio');
  });

  it('joins a multi-element audios array before decoding', async () => {
    edgeMock.synthesize.mockRejectedValue(new TtsProviderError('Edge down', 502));
    const whole = fakeWav('split-audio');
    const a = whole.slice(0, Math.floor(whole.length / 2));
    const b = whole.slice(Math.floor(whole.length / 2));
    stubProviders({ sarvam: { ok: true, audios: [a, b] } });
    const result = await synthesizeSpeech('text', 'hi-IN', BOTH_KEYS);
    expect(result.audio.subarray(44).toString()).toBe('split-audio');
  });

  it("rejects a Sarvam 200 whose body is not WAV", async () => {
    edgeMock.synthesize.mockRejectedValue(new TtsProviderError('Edge down', 502));
    stubProviders({
      gemini: { ok: true, data: 'AQID' },
      sarvam: { ok: true, audios: [Buffer.from('not a wav file').toString('base64')] },
    });
    // Sarvam's broken audio hands the request to Gemini rather than failing.
    const result = await synthesizeSpeech('text', 'hi-IN', BOTH_KEYS);
    expect(result.provider).toBe('gemini');
  });
});

describe('synthesizeSpeech — the Gemini call (tier 3)', () => {
  it('routes Urdu to Gemini when Edge fails, with the key in the header', async () => {
    edgeMock.synthesize.mockRejectedValue(new TtsProviderError('Edge down', 502));
    const fetchMock = stubProviders({ gemini: { ok: true, data: 'AQID' } });
    const result = await synthesizeSpeech('کیا حال ہے؟', 'ur-IN', BOTH_KEYS);

    expect(result.provider).toBe('gemini');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`,
    );
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('gemini-key');
    const body = JSON.parse(init.body as string) as {
      contents: { parts: { text: string }[] }[];
      generationConfig: {
        responseModalities: string[];
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: string } } };
      };
    };
    expect(body.contents[0]!.parts[0]!.text).toBe('کیا حال ہے؟');
    expect(body.generationConfig.responseModalities).toEqual(['AUDIO']);
    expect(body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe(
      GEMINI_TTS_VOICE,
    );
  });

  it("wraps Gemini's raw PCM in a WAV header", async () => {
    edgeMock.synthesize.mockRejectedValue(new TtsProviderError('Edge down', 502));
    stubProviders({ gemini: { ok: true, data: Buffer.from([1, 2, 3, 4]).toString('base64') } });
    const result = await synthesizeSpeech('text', 'ur-IN', BOTH_KEYS);
    expect(result.format).toBe('wav');
    expect(result.audio.length).toBe(44 + 4);
    expect(result.audio.toString('ascii', 0, 4)).toBe('RIFF');
    expect(result.audio.subarray(44)).toEqual(Buffer.from([1, 2, 3, 4]));
  });

  it("uses the sample rate from Gemini's response mime type when present", async () => {
    edgeMock.synthesize.mockRejectedValue(new TtsProviderError('Edge down', 502));
    stubProviders({ gemini: { ok: true, data: 'AQ==', mime: 'audio/L16;codec=pcm;rate=16000' } });
    const result = await synthesizeSpeech('text', 'ur-IN', BOTH_KEYS);
    expect(result.audio.readUInt32LE(24)).toBe(16000);
  });
});

describe('synthesizeSpeech — in-request failover (the demo-safety net)', () => {
  it('falls back Edge → Sarvam when Edge fails (the unofficial tier can break any day)', async () => {
    edgeMock.synthesize.mockRejectedValue(new TtsProviderError('403 handshake rejected', 502));
    const fetchMock = stubProviders({ sarvam: { ok: true, audios: [fakeWav('rescued')] } });

    const result = await synthesizeSpeech('Irrigate today.', 'hi-IN', BOTH_KEYS);

    expect(edgeMock.synthesize).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe('sarvam');
    expect(result.audio.subarray(44).toString()).toBe('rescued');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back Edge → Gemini for Urdu when Edge fails', async () => {
    edgeMock.synthesize.mockRejectedValue(new TtsProviderError('timeout', 502));
    const fetchMock = stubProviders({ gemini: { ok: true, data: 'AQID' } });

    const result = await synthesizeSpeech('کیا حال ہے؟', 'ur-IN', BOTH_KEYS);

    expect(result.provider).toBe('gemini');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('chains Edge → Sarvam → Gemini when the first two both fail', async () => {
    edgeMock.synthesize.mockRejectedValue(new TtsProviderError('Edge down', 502));
    const fetchMock = stubProviders({
      sarvam: { ok: false, status: 402, body: 'insufficient credits' },
      gemini: { ok: true, data: 'AQID' },
    });

    const result = await synthesizeSpeech('text', 'en-IN', BOTH_KEYS);

    expect(result.provider).toBe('gemini');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]![0])).toContain('api.sarvam.ai');
    expect(String(fetchMock.mock.calls[1]![0])).toContain('generativelanguage.googleapis.com');
  });

  it('surfaces the last error when EVERY provider fails', async () => {
    edgeMock.synthesize.mockRejectedValue(new TtsProviderError('Edge down', 502));
    stubProviders({
      sarvam: { ok: false, status: 402, body: 'insufficient credits' },
      gemini: { ok: false, status: 429, body: 'quota exceeded' },
    });
    await expect(synthesizeSpeech('text', 'en-IN', BOTH_KEYS)).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining('Gemini TTS returned 429'),
    });
  });

  it('falls back even on a provider 400 — different schemas, different limits', async () => {
    // The providers have different request schemas; what one rejects the
    // next may accept. Caller-fault cases are already stopped by the local
    // validation before any provider call.
    edgeMock.synthesize.mockRejectedValue(new TtsProviderError('Edge down', 502));
    const fetchMock = stubProviders({
      sarvam: { ok: false, status: 400, body: 'invalid_request_error' },
      gemini: { ok: true, data: 'AQID' },
    });
    const result = await synthesizeSpeech('text', 'en-IN', BOTH_KEYS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.provider).toBe('gemini');
  });

  it('maps a network failure (fetch rejects) to 502 via the next provider', async () => {
    edgeMock.synthesize.mockRejectedValue(new TtsProviderError('Edge down', 502));
    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.includes('api.sarvam.ai')) throw new Error('connection refused');
      return {
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [{ inlineData: { mimeType: 'audio/L16;rate=24000', data: 'AQID' } }],
                },
              },
            ],
          }),
        text: () => Promise.resolve(''),
      } as unknown as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await synthesizeSpeech('text', 'bn-IN', BOTH_KEYS);
    expect(result.provider).toBe('gemini');
  });
});

describe('TtsProviderError shape', () => {
  it('carries its name and status', () => {
    const err = new TtsProviderError('boom', 503);
    expect(err.name).toBe('TtsProviderError');
    expect(err.status).toBe(503);
    expect(err).toBeInstanceOf(Error);
  });
});

/** The global fetch stub installed by the most recent stubProviders call. */
function fetchMockGlobal(): ReturnType<typeof vi.fn> {
  return fetch as unknown as ReturnType<typeof vi.fn>;
}
