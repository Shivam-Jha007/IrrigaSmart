import { ApiError, apiPost } from './apiClient';
import type { TranslateFn, TranslationKey } from '../i18n';
import { answerFromRules, type AssistantContext, type AssistantIntent } from './assistantRules';

export type AssistantTopic = 'today' | 'irrigation' | 'soil' | 'weather' | 'fertilizer' | 'disease';

export interface AssistantAction {
  type: 'ask';
  topic: AssistantTopic;
  question: string;
}

const TOPIC_QUESTIONS: Record<AssistantTopic, TranslationKey> = {
  today: 'assistant.topic.todayQuestion',
  irrigation: 'assistant.topic.irrigationQuestion',
  soil: 'assistant.topic.soilQuestion',
  weather: 'assistant.topic.weatherQuestion',
  fertilizer: 'assistant.topic.fertilizerQuestion',
  disease: 'assistant.topic.diseaseQuestion',
};

export function assistantTopicActions(t: TranslateFn): AssistantAction[] {
  return (Object.keys(TOPIC_QUESTIONS) as AssistantTopic[]).map((topic) => ({
    type: 'ask',
    topic,
    question: t(TOPIC_QUESTIONS[topic]),
  }));
}

export function farmBriefing(context: AssistantContext | undefined, t: TranslateFn): string | null {
  if (!context?.farmName && !context?.status && context?.depthMm === undefined) return null;
  const status = context.status ?? t('assistant.briefing.noRecommendation');
  const crop = context.cropName ? ` ${context.cropName}.` : '';
  const water = context.volumeLiters !== undefined
    ? ` ${t('assistant.rule.amount', { mm: context.depthMm ?? 0, litres: Math.round(context.volumeLiters) })}`
    : '';
  return `${t('assistant.briefing.today', { farm: context.farmName ?? t('nav.today'), crop, status })}${water}`.trim();
}

/**
 * Assistant dispatcher (item 17).
 *
 * THE HYBRID RULE, IN ONE PLACE
 * Offline rules run first, always. The model is consulted only when the rules
 * returned null AND the browser reports a connection. That order is the whole
 * point of the feature: the answers farmers ask for most arrive instantly with
 * no network and no cost, and the model is spent on the questions that actually
 * need language understanding.
 *
 * Because the rules run first, EVERY failure of the network path is non-fatal
 * by construction. No key (503), rate limit (429), provider down (502), offline,
 * aborted — each one lands on the same branch: say plainly that a fuller answer
 * needs a connection, and leave the farmer no worse off than before item 17
 * existed (item 18).
 *
 * WHAT CROSSES THE WIRE
 * The question, the engine's already-computed figures, and the recent turns.
 * Nothing else — no farmer name, no coordinates, no device identifier. The farm
 * label and village name are included because a question like "is this normal
 * for my area" is unanswerable without them, and they are already the least
 * identifying things on the screen.
 */

/** Where an answer came from. Shown to the farmer so the two are never confused. */
export type AssistantSource = 'rules' | 'claude' | 'unavailable';

export interface AssistantAnswer {
  text: string;
  source: AssistantSource;
  /** Set when the rules answered, for tests and for the UI's offline badge. */
  intent?: AssistantIntent;
}

export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface BackendReply {
  answer: string;
  source: 'claude';
  model: string;
}

/** Mirrors backend/src/assistant.ts. Longer questions are refused there. */
export const MAX_QUESTION_CHARS = 500;

/** Mirrors MAX_HISTORY_TURNS on the backend; trimmed here to save bandwidth. */
const MAX_HISTORY_TURNS = 8;

/**
 * Is the device online?
 *
 * `navigator.onLine` is famously optimistic — it reports true for a connection
 * that reaches the router and no further. That is fine here precisely because
 * being wrong is cheap: a false positive costs one failed fetch and falls into
 * the same branch as being offline. A false negative would be the expensive
 * error, and `onLine` does not produce those.
 */
function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

export interface AskOptions {
  question: string;
  context?: AssistantContext | undefined;
  history?: AssistantTurn[];
  t: TranslateFn;
  signal?: AbortSignal | undefined;
}

/**
 * Answer a farmer's question: rules first, model second, honest refusal last.
 *
 * Never throws. Every path returns an AssistantAnswer, because a chat panel
 * that can throw is a chat panel that can show a farmer a blank box with no
 * explanation.
 */
export async function askAssistant({
  question,
  context,
  history = [],
  t,
  signal,
}: AskOptions): Promise<AssistantAnswer> {
  const trimmed = question.trim().slice(0, MAX_QUESTION_CHARS);
  if (trimmed.length === 0) {
    return { text: t('assistant.rule.empty'), source: 'unavailable' };
  }

  // 1. The device's own knowledge. No network, no key, no wait.
  const rule = answerFromRules(trimmed, context, t);
  if (rule) {
    return { text: rule.answer, source: 'rules', intent: rule.intent };
  }

  // 2. Offline and the rules fell short — say so instead of hanging on a fetch
  // that cannot succeed.
  if (!isOnline()) {
    return { text: t('assistant.offlineFallback'), source: 'unavailable' };
  }

  // 3. The model. The only path that needs a connection, and the only one that
  // can fail without consequence.
  try {
    const reply = await apiPost<BackendReply>(
      '/api/assistant',
      {
        question: trimmed,
        ...(context ? { context } : {}),
        history: history.slice(-MAX_HISTORY_TURNS),
      },
      signal,
    );
    const answer = reply.answer.trim();
    if (answer.length === 0) {
      return { text: t('assistant.offlineFallback'), source: 'unavailable' };
    }
    return { text: answer, source: 'claude' };
  } catch (error) {
    // Deliberately uniform: the farmer does not benefit from telling a rate
    // limit apart from a missing key, and both leave them in the same place.
    // The distinction is logged for whoever operates the deployment.
    if (error instanceof ApiError) {
      console.warn('[IrrigaSmart] assistant unavailable', error.code, error.message);
    } else {
      console.warn('[IrrigaSmart] assistant unavailable', error);
    }
    return { text: t('assistant.offlineFallback'), source: 'unavailable' };
  }
}
