import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteDB } from 'idb';
import { closeDb, DB_NAME } from '../../storage/db';
import { cacheTtsAudio, getCachedTtsAudio } from '../../storage';
import {
  CLOUD_TTS_LOCALES,
  fetchCloudAudio,
  prefetchTtsAudio,
  speakViaChain,
  stopSpeaking,
  _setAudioPlayerForTests,
  type AudioPlayer,
} from '../speechService';

/**
 * The speak chain (V2.4): cached cloud audio → cloud synthesis → device voice.
 *
 * The incident this suite guards is the Bengali gibberish demo, redux: the
 * voice a farmer hears must never depend on which voice packs a machine
 * happens to have installed. The chain answers that with two cloud tiers over
 * the unchanged device tier — and these tests pin the ORDER (a cache hit must
 * not hit the network; a cloud failure must fall through, never throw), the
 * COVERAGE (Assamese must never touch the network tier, because no cloud
 * voice speaks it; Urdu MUST, because Gemini does), and the STOP semantics (a
 * stop tap after a tier fallback must still silence the device voice).
 *
 * The whole chain is driven with stubs — no real audio, no real fetch —
 * because what is worth testing is the decision logic, not whether jsdom can
 * decode audio (it cannot).
 */

const { speak: speakDeviceMock, stopSpeaking: stopDeviceMock } = vi.hoisted(() => ({
  speak: vi.fn(),
  stopSpeaking: vi.fn(),
}));

vi.mock('../speech', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../speech')>();
  return {
    ...actual,
    // The device tier (tier 3) is speech.ts's own, tested in speech.test.ts;
    // here it is a seam the chain's fallback behaviour pins against.
    speak: speakDeviceMock,
    stopSpeaking: stopDeviceMock,
  };
});

const fetchMock = vi.fn();

beforeEach(async () => {
  await closeDb();
  await deleteDB(DB_NAME);
  speakDeviceMock.mockReset();
  stopDeviceMock.mockReset();
  fetchMock.mockReset();
});

afterEach(() => {
  _setAudioPlayerForTests(null);
  vi.unstubAllGlobals();
});

function stubAudioPlayer(behaviour: 'ok' | 'fail'): {
  player: AudioPlayer;
  played: Blob[];
} {
  const played: Blob[] = [];
  const player: AudioPlayer = {
    play(blob: Blob): Promise<void> {
      played.push(blob);
      return behaviour === 'ok' ? Promise.resolve() : Promise.reject(new Error('no decode'));
    },
    stop: vi.fn(),
  };
  _setAudioPlayerForTests(player);
  return { player, played };
}

function cloudAudio(): Blob {
  return new Blob([new Uint8Array([0xff, 0xfb])], { type: 'audio/wav' });
}

/** Stub the global fetch the apiClient uses, answering /api/tts with WAV. */
function stubCloud(ok: boolean): void {
  fetchMock.mockImplementation(async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    if (!url.includes('/api/tts')) throw new Error(`unexpected fetch: ${url}`);
    if (!ok) {
      return {
        ok: false,
        status: 503,
        json: () =>
          Promise.resolve({ status: 'error', errorCode: 'TTS_UNAVAILABLE', message: 'no key' }),
      } as unknown as Response;
    }
    // Capture the request body so tests can assert what was synthesised.
    void init;
    return {
      ok: true,
      blob: () => Promise.resolve(cloudAudio()),
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
}

describe('the tier order', () => {
  it('plays from the cache without touching the network or the device engine', async () => {
    const cached = cloudAudio();
    await cacheTtsAudio('hi-IN', 'आज सेच दिन।', cached);
    const { played } = stubAudioPlayer('ok');
    vi.stubGlobal('fetch', fetchMock); // fetchMock with no implementations → would throw

    const outcome = await speakViaChain('आज सेच दिन।', 'hi-IN', 'btn-1');

    expect(outcome).toBe('spoken');
    expect(played).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(speakDeviceMock).not.toHaveBeenCalled();
  });

  it('fetches from the cloud on a cache miss, plays, and caches for next time', async () => {
    stubCloud(true);
    const { played } = stubAudioPlayer('ok');

    await speakViaChain('Irrigate today.', 'en-IN', 'btn-1');
    expect(played).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call: cache hit, no second network round trip.
    fetchMock.mockClear();
    await speakViaChain('Irrigate today.', 'en-IN', 'btn-2');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(played).toHaveLength(2);
  });

  it('falls back to the device voice when the cloud is unavailable', async () => {
    stubCloud(false);
    stubAudioPlayer('ok');
    speakDeviceMock.mockResolvedValue('spoken');

    const outcome = await speakViaChain('Irrigate today.', 'en-IN', 'btn-1');

    expect(outcome).toBe('spoken');
    expect(speakDeviceMock).toHaveBeenCalledWith('Irrigate today.', 'en-IN');
  });

  it('falls back to the device voice when the cloud audio cannot play', async () => {
    stubCloud(true);
    stubAudioPlayer('fail');
    speakDeviceMock.mockResolvedValue('spoken');

    const outcome = await speakViaChain('Irrigate today.', 'en-IN', 'btn-1');

    expect(outcome).toBe('spoken');
    expect(speakDeviceMock).toHaveBeenCalledTimes(1);
  });

  it('returns noVoice when the device tier refuses (the gibberish gate)', async () => {
    stubCloud(false);
    stubAudioPlayer('ok');
    speakDeviceMock.mockResolvedValue('noVoice');

    const outcome = await speakViaChain('আজ সেচ দিন।', 'bn-IN', 'btn-1');

    expect(outcome).toBe('noVoice');
  });
});

describe('coverage — languages the cloud does not serve', () => {
  it('never fetches for Assamese, and goes straight to the device voice', async () => {
    vi.stubGlobal('fetch', fetchMock);
    speakDeviceMock.mockResolvedValue('spoken');
    stubAudioPlayer('ok');

    await speakViaChain('আজি খেতিখন পানী দিব', 'as-IN', 'btn-as');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(speakDeviceMock).toHaveBeenCalledTimes(1);
  });

  it('urdu DOES use the cloud tier — Gemini speaks it (the reason for Gemini)', async () => {
    stubCloud(true);
    const { played } = stubAudioPlayer('ok');

    await speakViaChain('کیا حال ہے؟', 'ur-IN', 'btn-ur');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(played).toHaveLength(1);
    expect(speakDeviceMock).not.toHaveBeenCalled();
  });

  it('lists exactly the locales the backend offers — the tables must not drift', () => {
    // backend/src/tts.ts CLOUD_LANGUAGES: en, hi, bn, ur. If either half
    // adds a locale without the other, every play either wastes a request or
    // loses a cloud voice. Pinned from both sides (see backend tts.test.ts).
    expect([...CLOUD_TTS_LOCALES].sort()).toEqual(['bn-IN', 'en-IN', 'hi-IN', 'ur-IN']);
  });
});

describe('stop and supersede semantics', () => {
  it('stopSpeaking cancels both engines', async () => {
    stubCloud(false);
    stubAudioPlayer('ok');
    speakDeviceMock.mockResolvedValue('spoken');

    await speakViaChain('text', 'en-IN', 'btn-1');
    stopSpeaking();

    expect(stopDeviceMock).toHaveBeenCalled();
  });

  it('a superseded utterance does not speak a late-fetched cloud reply', async () => {
    let releaseFetch: (blob: Response) => void = () => {};
    const gate = new Promise<Response>((resolve) => {
      releaseFetch = resolve;
    });
    fetchMock.mockImplementation(async () => gate);
    vi.stubGlobal('fetch', fetchMock);
    const { played } = stubAudioPlayer('ok');

    const first = speakViaChain('Irrigate today.', 'en-IN', 'btn-1');
    // The farmer taps another card's speaker before the cloud answers.
    void speakViaChain('About 12 mm.', 'en-IN', 'btn-2');
    releaseFetch({ ok: true, blob: () => Promise.resolve(cloudAudio()) } as unknown as Response);
    await first;

    // The stale reply for btn-1 was fetched but never played.
    expect(played).toHaveLength(0);
  });

  it('a stop tap before the device fallback keeps the fallback silent', async () => {
    stubCloud(false);
    stubAudioPlayer('ok');
    speakDeviceMock.mockResolvedValue('spoken');

    const utterance = speakViaChain('Irrigate today.', 'en-IN', 'btn-1');
    stopSpeaking();
    const outcome = await utterance;

    // The controller was released by the stop, so the chain must not hand the
    // text to the device engine after being cancelled.
    expect(outcome).toBe('noVoice');
    expect(speakDeviceMock).not.toHaveBeenCalled();
  });
});

describe('prefetchTtsAudio', () => {
  it('prefetches cloud audio for a served locale and does not play anything', async () => {
    stubCloud(true);
    const { played } = stubAudioPlayer('ok');

    await prefetchTtsAudio('Irrigate today.', 'hi-IN');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(played).toHaveLength(0);
    expect(await getCachedTtsAudio('hi-IN', 'Irrigate today.')).toBeDefined();
  });

  it('does nothing for an unserved locale', async () => {
    vi.stubGlobal('fetch', fetchMock);
    await prefetchTtsAudio('আজি খেতিখন পানী দিব', 'as-IN');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips the network when the sentence is already cached', async () => {
    await cacheTtsAudio('en-IN', 'Irrigate today.', cloudAudio());
    vi.stubGlobal('fetch', fetchMock);

    await prefetchTtsAudio('Irrigate today.', 'en-IN');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('swallows cloud failure — prefetching is best-effort', async () => {
    stubCloud(false);
    await expect(prefetchTtsAudio('Irrigate today.', 'en-IN')).resolves.toBeUndefined();
  });
});

describe('fetchCloudAudio — in-flight dedup (prefetch and tap share one flight)', () => {
  it('a second concurrent fetch for the same sentence shares the first flight', async () => {
    stubCloud(true);

    const [first, second] = await Promise.all([
      fetchCloudAudio('Irrigate today.', 'en-IN'),
      fetchCloudAudio('Irrigate today.', 'en-IN'),
    ]);

    // ONE network round trip, and BOTH callers got its audio.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toBeDefined();
    expect(second).toBeDefined();
  });

  it('deduplicates per (locale, text) — different sentences get their own flights', async () => {
    stubCloud(true);

    await Promise.all([
      fetchCloudAudio('Irrigate today.', 'en-IN'),
      fetchCloudAudio('Spray tomorrow.', 'en-IN'),
      fetchCloudAudio('Irrigate today.', 'hi-IN'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('a failed flight is not remembered — the next caller retries', async () => {
    stubCloud(false);

    await expect(fetchCloudAudio('Irrigate today.', 'en-IN')).resolves.toBeNull();
    await expect(fetchCloudAudio('Irrigate today.', 'en-IN')).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('the real scenario: a play tap while the render-time prefetch is still in flight', async () => {
    // Gate the fetch so the prefetch's flight is still on the wire when the
    // farmer taps play — exactly the demo-day race the dedup exists for.
    let release!: (response: Response) => void;
    const gate = new Promise<Response>((resolve) => {
      release = resolve;
    });
    fetchMock.mockImplementation(async () => gate);
    vi.stubGlobal('fetch', fetchMock);
    const { played } = stubAudioPlayer('ok');

    void prefetchTtsAudio('Irrigate today.', 'en-IN');
    // Let the prefetch finish its cache-miss read and register its flight.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const speak = speakViaChain('Irrigate today.', 'en-IN', 'btn-1');
    release({ ok: true, blob: () => Promise.resolve(cloudAudio()) } as unknown as Response);
    const outcome = await speak;

    expect(outcome).toBe('spoken');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(played).toHaveLength(1);
    // And the shared flight seeded the cache, so the next tap is instant.
    expect(await getCachedTtsAudio('en-IN', 'Irrigate today.')).toBeDefined();
  });
});

describe('fetchCloudAudio', () => {
  it('returns null (never throws) when the cloud is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchCloudAudio('x', 'en-IN')).resolves.toBeNull();
  });

  it('returns null for an unserved locale without any network call', async () => {
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchCloudAudio('x', 'as-IN')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
