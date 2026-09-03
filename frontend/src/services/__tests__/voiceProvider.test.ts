import { describe, expect, it } from 'vitest';
import {
  unavailableVoiceProvider,
  voiceConversationSupported,
  VoiceUnavailableError,
  type VoiceProvider,
} from '../voiceProvider';

/**
 * The live audio seam (PRD §13).
 *
 * These tests assert that the feature is honestly absent rather than that it
 * works. That is the whole contract today: a UI wired against `VoiceProvider`
 * must be told "no" clearly enough that it shows nothing, and must never be
 * handed a token or a model id that implies a call was made.
 *
 * The decision behind this is recorded in
 * `docs/13_Voice_Copilot_Model_Evaluation.md`.
 */

describe('voiceConversationSupported', () => {
  it('is false, because no implementation exists', () => {
    expect(voiceConversationSupported()).toBe(false);
  });
});

describe('unavailableVoiceProvider', () => {
  it('declines rather than returning an empty or fabricated token', () => {
    // A resolved empty string would send a client into a socket handshake that
    // cannot succeed. Rejection is the truthful answer.
    return expect(unavailableVoiceProvider.createSessionToken()).rejects.toBeInstanceOf(
      VoiceUnavailableError,
    );
  });

  it('says why, and says "not built" rather than blaming the network', async () => {
    await expect(unavailableVoiceProvider.createSessionToken()).rejects.toMatchObject({
      name: 'VoiceUnavailableError',
      reason: 'notBuilt',
    });
  });

  it('points at the document that explains the decision', async () => {
    // The next person to read this failure should reach the evaluation, not
    // conclude the feature is broken and try to fix it.
    await expect(unavailableVoiceProvider.createSessionToken()).rejects.toThrow(
      /13_Voice_Copilot_Model_Evaluation/,
    );
  });

  it('names no model, because it calls none', () => {
    expect(unavailableVoiceProvider.model).toBe('');
  });

  it('satisfies the interface a real provider would have to satisfy', () => {
    // If the interface widens, this line stops compiling — which is the signal
    // that the stub, and any UI wired to it, needs revisiting too.
    const provider: VoiceProvider = unavailableVoiceProvider;
    expect(typeof provider.createSessionToken).toBe('function');
    expect(provider.id).toBe('gemini-live');
  });
});

describe('VoiceUnavailableError', () => {
  it('is a real Error, so existing catch and logging paths handle it', () => {
    const error = new VoiceUnavailableError('offline', 'No connection.');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('VoiceUnavailableError');
    expect(error.message).toBe('No connection.');
    expect(error.reason).toBe('offline');
  });

  it('distinguishes the reasons a UI must respond to differently', () => {
    // "No signal, try again" and "this build has no voice conversation" are
    // different messages to a farmer; one invites a retry and the other must
    // not show a button at all.
    const reasons = (['notBuilt', 'offline', 'unauthorized', 'ceilingReached'] as const).map(
      (reason) => new VoiceUnavailableError(reason, reason).reason,
    );
    expect(new Set(reasons).size).toBe(4);
  });
});
