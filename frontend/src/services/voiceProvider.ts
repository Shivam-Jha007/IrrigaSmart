/**
 * VoiceProvider — the seam for a live audio Copilot (PRD §13).
 *
 * THERE IS NO IMPLEMENTATION BEHIND THIS, AND THAT IS THE POINT.
 * `docs/13_Voice_Copilot_Model_Evaluation.md` records the decision in full:
 * both Gemini Live candidates were evaluated on 16 August 2026 and neither is
 * being built. What is built is this interface, so that the decision can be
 * revisited by writing one implementation rather than by reworking the
 * assistant. PRD §13 asks for the abstraction rather than the integration,
 * because the thing it protects against is architecting around a free tier whose
 * limits Google has stopped publishing.
 *
 * VOICE ALREADY WORKS. THIS IS NOT THAT.
 * `speech.ts` is the shipped voice path: the browser's own `SpeechRecognition`
 * turns the farmer's speech into text, the text goes through the same rule
 * engine and the same `sanitizeReply` boundary as a typed question, and
 * `speechSynthesis` reads the answer back in the farmer's language. It costs
 * nothing, needs no key, and its synthesis half keeps working with no signal.
 * A live audio session is a different thing entirely — an open socket in which
 * the model hears and speaks directly — and it would sit alongside `speech.ts`,
 * never in place of it.
 *
 * WHY A TOKEN AND NOT A KEY
 * A browser cannot hold `GEMINI_API_KEY`; anything shipped to the client is
 * readable by anyone who opens the network tab, and a leaked key is billable to
 * us. Google's Live API answer is an ephemeral token minted server-side, which
 * is why the one method here returns a token rather than taking a key. Any
 * implementation of this interface must call our own backend for it. An
 * implementation that reads a key out of `import.meta.env` has misunderstood
 * the interface and breaks PRD §12.
 *
 * WHY IT IS THIS SMALL
 * One method and one model id, exactly as PRD §13 sketches it. A larger
 * interface would be guesswork: session resumption, audio framing, interruption
 * handling and spend ceilings all belong to an implementation that does not
 * exist, and inventing their shapes now would produce an abstraction fitted to
 * an imagined client rather than a real one. Notably absent is token expiry —
 * a real client needs it, since Live sessions cap at 15 minutes and want a
 * reconnect around 10. It is left out on purpose: whoever writes the first
 * implementation will know whether the right shape is an expiry timestamp, a
 * TTL, or a re-mint callback, and can widen this then.
 */

/**
 * Which live audio model an implementation speaks to.
 *
 * Both were evaluated; see `docs/13_Voice_Copilot_Model_Evaluation.md` §2 for the
 * comparison and §6 for why the recommendation is `gemini-live` with
 * `gemini-native-audio` as the A/B candidate for Hinglish and Banglish
 * code-switching — the one difference between them that cannot be settled from
 * documentation.
 */
export type VoiceProviderId = 'gemini-live' | 'gemini-native-audio';

/**
 * A provider of live audio Copilot sessions.
 *
 * `model` is carried on the provider rather than passed per call because it is
 * a property of the deployment, not of a conversation: a farmer does not choose
 * a model, and an A/B test that changed model mid-session would be measuring
 * nothing.
 */
export interface VoiceProvider {
  readonly id: VoiceProviderId;
  /** The provider's model id, verbatim as the API names it. For logs and A/B. */
  readonly model: string;
  /**
   * Mint a short-lived session credential from our own backend.
   *
   * Rejects with `VoiceUnavailableError` when a session cannot be started —
   * no backend route, no network, a spend ceiling reached, or the feature simply
   * not built. Callers must treat rejection as ordinary: voice conversation is
   * an enhancement for a farmer with signal, and the typed and `speech.ts`
   * paths remain the ones that always work.
   */
  createSessionToken(): Promise<string>;
}

/**
 * Why a live audio session could not be started.
 *
 * `notBuilt` is the honest state today. It is distinct from `offline` and
 * `unavailable` because the UI response differs: a farmer with no signal should
 * be told to try again with a connection, and one using a build without the
 * feature should not be told anything at all — no dead button, as `speech.ts`
 * already does with its capability checks.
 */
export type VoiceUnavailableReason = 'notBuilt' | 'offline' | 'unauthorized' | 'ceilingReached';

/** Thrown when a live audio session cannot be started. */
export class VoiceUnavailableError extends Error {
  readonly reason: VoiceUnavailableReason;

  constructor(reason: VoiceUnavailableReason, message: string) {
    super(message);
    this.name = 'VoiceUnavailableError';
    this.reason = reason;
  }
}

/**
 * The only provider that exists: one that always declines.
 *
 * Not a placeholder to be filled in later — it is what the app honestly has. A
 * UI may be wired against `VoiceProvider` today and will correctly conclude that
 * live audio is unavailable, which is the same conclusion it should reach on a
 * phone with no signal. `model` is empty because there is no model behind it;
 * naming one here would put a string in the logs implying a call was made.
 */
export const unavailableVoiceProvider: VoiceProvider = {
  id: 'gemini-live',
  model: '',
  createSessionToken(): Promise<string> {
    return Promise.reject(
      new VoiceUnavailableError(
        'notBuilt',
        'Live audio Copilot is not implemented. See docs/13_Voice_Copilot_Model_Evaluation.md.',
      ),
    );
  },
};

/**
 * Whether the app can hold a live audio conversation. Always false today.
 *
 * Exists so a UI asks this rather than inferring it from a failed call, and so
 * the answer is a single readable line when an implementation does arrive.
 */
export function voiceConversationSupported(): boolean {
  return false;
}
