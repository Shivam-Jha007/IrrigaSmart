import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translate, type TranslateFn } from '../../i18n';
import { askAssistant } from '../assistantService';
import type { AssistantContext } from '../assistantRules';

/**
 * Assistant dispatcher (item 17) — the hybrid rule under test.
 *
 * The claim this suite defends is the one the whole feature rests on: the
 * device answers first, and every way the network can fail leaves the farmer
 * exactly where the offline rules left them. A farmer in a field with no signal
 * must never see a blank box, a thrown error, or a hang.
 *
 * `fetch` is stubbed rather than the apiClient, so the real envelope handling,
 * the real error codes and the real abort plumbing are all exercised.
 */

const t: TranslateFn = (key, vars) => translate('en', key, vars);

const OFFLINE_FALLBACK = translate('en', 'assistant.offlineFallback');

function context(): AssistantContext {
  return {
    status: 'Irrigate Today',
    depthMm: 12.4,
    volumeLiters: 18_500,
    durationMinutes: 34,
    explanation: 'The soil is 22 mm short of full across the root zone.',
  };
}

/** Reply in the backend's success envelope. */
function okResponse(answer: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data: { answer, source: 'claude', model: 'claude-opus-5' } }),
  } as unknown as Response;
}

function errorResponse(status: number, errorCode: string, message: string): Response {
  return {
    ok: false,
    status,
    json: async () => ({ error: { errorCode, message } }),
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  // The dispatcher logs the real cause for whoever operates the deployment;
  // silence it here so a passing run is not full of expected warnings.
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  warnSpy.mockRestore();
});

/** Force navigator.onLine for the duration of one test. */
function setOnline(online: boolean): void {
  vi.stubGlobal('navigator', { onLine: online });
}

describe('askAssistant — the device answers first', () => {
  it('answers from the rules without touching the network', async () => {
    setOnline(true);
    const answer = await askAssistant({ question: 'how much water today?', context: context(), t });

    expect(answer.source).toBe('rules');
    expect(answer.intent).toBe('amount');
    expect(answer.text).toContain('12.4 mm');
    // The whole point: an answer the device already had cost no request.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers a boundary question from the rules even with a connection', async () => {
    setOnline(true);
    const answer = await askAssistant({ question: 'which spray should I use?', context: context(), t });

    expect(answer.source).toBe('rules');
    expect(answer.intent).toBe('referral');
    // A spray question must never reach the model as if it were ordinary.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an empty question without a request', async () => {
    setOnline(true);
    const answer = await askAssistant({ question: '   ', context: context(), t });

    expect(answer.source).toBe('unavailable');
    expect(answer.text).toBe(translate('en', 'assistant.rule.empty'));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('askAssistant — offline', () => {
  it('says plainly that it cannot answer, without attempting a fetch', async () => {
    setOnline(false);
    const answer = await askAssistant({
      question: 'my pump is making a strange noise',
      context: context(),
      t,
    });

    expect(answer.source).toBe('unavailable');
    expect(answer.text).toBe(OFFLINE_FALLBACK);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still answers rule-covered questions with no connection at all', async () => {
    setOnline(false);
    const answer = await askAssistant({ question: 'how much water today?', context: context(), t });

    expect(answer.source).toBe('rules');
    expect(answer.text).toContain('12.4 mm');
  });
});

describe('askAssistant — the model path', () => {
  it('forwards unclassifiable questions and returns the reply', async () => {
    setOnline(true);
    fetchMock.mockResolvedValue(okResponse('Check the foot valve for a leak.'));

    const answer = await askAssistant({
      question: 'my pump is making a strange noise',
      context: context(),
      t,
    });

    expect(answer.source).toBe('claude');
    expect(answer.text).toBe('Check the foot valve for a leak.');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.question).toBe('my pump is making a strange noise');
    expect(body.context.depthMm).toBe(12.4);
  });

  it('sends at most the last 8 turns of history', async () => {
    setOnline(true);
    fetchMock.mockResolvedValue(okResponse('ok'));
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `turn ${i}`,
    }));

    await askAssistant({ question: 'my pump rattles', context: context(), history, t });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.history).toHaveLength(8);
    expect(body.history[7].content).toBe('turn 19');
  });

  it('truncates an over-long question rather than letting the backend refuse it', async () => {
    setOnline(true);
    fetchMock.mockResolvedValue(okResponse('ok'));

    await askAssistant({ question: 'z'.repeat(900), context: context(), t });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.question).toHaveLength(500);
  });

  it('omits context entirely when there is no farm yet', async () => {
    setOnline(true);
    fetchMock.mockResolvedValue(okResponse('ok'));

    await askAssistant({ question: 'my pump rattles', context: undefined, t });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).not.toHaveProperty('context');
  });
});

describe('askAssistant — every network failure is non-fatal', () => {
  const question = 'my pump is making a strange noise';

  it.each([
    ['a missing API key (503)', errorResponse(503, 'ASSISTANT_UNCONFIGURED', 'no key')],
    ['a rate limit (429)', errorResponse(429, 'RATE_LIMITED', 'slow down')],
    ['a provider outage (502)', errorResponse(502, 'UPSTREAM_ERROR', 'upstream failed')],
    ['a server fault (500)', errorResponse(500, 'INTERNAL', 'boom')],
  ])('degrades gracefully on %s', async (_label, response) => {
    setOnline(true);
    fetchMock.mockResolvedValue(response);

    const answer = await askAssistant({ question, context: context(), t });

    expect(answer.source).toBe('unavailable');
    expect(answer.text).toBe(OFFLINE_FALLBACK);
  });

  it('degrades gracefully when the fetch itself rejects', async () => {
    setOnline(true);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const answer = await askAssistant({ question, context: context(), t });

    expect(answer.source).toBe('unavailable');
    expect(answer.text).toBe(OFFLINE_FALLBACK);
  });

  it('degrades gracefully on an unparseable response', async () => {
    setOnline(true);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('not json');
      },
    } as unknown as Response);

    const answer = await askAssistant({ question, context: context(), t });

    expect(answer.source).toBe('unavailable');
  });

  it('treats an empty answer as no answer', async () => {
    setOnline(true);
    fetchMock.mockResolvedValue(okResponse('   '));

    const answer = await askAssistant({ question, context: context(), t });

    expect(answer.source).toBe('unavailable');
    expect(answer.text).toBe(OFFLINE_FALLBACK);
  });

  it('degrades gracefully when the request is aborted', async () => {
    setOnline(true);
    fetchMock.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    const answer = await askAssistant({ question, context: context(), t });

    expect(answer.source).toBe('unavailable');
  });

  it('never throws, whatever the failure', async () => {
    setOnline(true);
    fetchMock.mockRejectedValue('a bare string, not an Error');

    await expect(
      askAssistant({ question, context: context(), t }),
    ).resolves.toMatchObject({ source: 'unavailable' });
  });
});
