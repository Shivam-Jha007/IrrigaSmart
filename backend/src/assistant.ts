/**
 * Farmer assistant (item 17).
 *
 * WHY THIS IS A BACKEND ROUTE AT ALL
 * Everything else the app does is deterministic and runs on the device. This one
 * cannot: understanding a question typed in Hinglish, or spoken into a phone in
 * Bengali, needs a language model. That has two consequences that shape the whole
 * design:
 *
 *   1. ANTHROPIC_API_KEY may never reach the browser. A key shipped in a bundle
 *      is a key published, so the model is called from here and the frontend only
 *      ever sees text. This route is the reason the backend stops being a pure
 *      provider proxy.
 *
 *   2. The model is an ENHANCEMENT, never the mechanism. The frontend answers
 *      every question from its own deterministic rules first (see
 *      services/assistantRules.ts) and calls this route only when it is online
 *      and the rules could not answer. A farmer in a field with no signal still
 *      gets an answer; one with signal gets a better-worded one. If this route is
 *      down, misconfigured, or rate-limited, the app is exactly as useful as it
 *      was before item 17 existed (item 18).
 *
 * WHAT THE MODEL IS AND IS NOT ALLOWED TO DO
 * The irrigation numbers are computed by the decision engine and passed in as
 * context. The model explains them; it never recomputes them. That boundary is
 * enforced by construction — no tool, no calculator, and a system prompt that
 * states the figures are already decided — because two sources of truth for
 * "how much water today" is precisely the failure a farmer cannot detect.
 *
 * The V1.3 Product Boundaries (docs/12_Product_Roadmap_v2.md) apply to this
 * route in full and are restated in the system prompt: no chemical, pesticide or
 * fungicide name, no dose, no spray schedule, no claimed diagnosis, and anything
 * beyond irrigation goes to the local Krishi Vigyan Kendra. A model is a fluent
 * writer of exactly the sentences those boundaries forbid, so the prohibition is
 * spelled out rather than assumed, and `sanitizeReply` checks the output for the
 * one class of violation with a hard, mechanical test: a named chemical.
 */

import Anthropic from '@anthropic-ai/sdk';

/** Model id. Pinned deliberately: an unexpected model change alters advice. */
const MODEL = 'claude-opus-5';

/**
 * Reply budget. Farmers read this on a phone, often aloud via TTS, so the cap is
 * short on purpose — the prompt asks for a few sentences and this is the ceiling
 * that keeps a runaway answer from becoming an essay.
 */
const MAX_TOKENS = 1024;

/** One farmer question is a small request; a long wait is worse than a fallback. */
const REQUEST_TIMEOUT_MS = 30_000;

/** How many prior turns the client may send. Enough to resolve "and tomorrow?". */
export const MAX_HISTORY_TURNS = 8;

/** Longest question accepted. Guards the token bill and the request body size. */
export const MAX_QUESTION_CHARS = 500;

export class AssistantError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'AssistantError';
  }
}

/**
 * The farm's current situation, computed on the device by the decision engine
 * and sent with the question.
 *
 * Every field is optional because the client may be mid-onboarding, offline
 * without a cache, or asking a general question with no farm selected. The
 * prompt builder omits whatever is absent rather than substituting a default —
 * inventing a temperature the engine never saw would put a number in front of a
 * farmer that nothing in the app can reproduce.
 */
export interface AssistantContext {
  language?: string;
  farmName?: string;
  locationLabel?: string;
  cropName?: string;
  growthStage?: string;
  soilType?: string;
  irrigationMethod?: string;
  areaLabel?: string;
  /** The engine's outcome today, e.g. "Irrigate Today". */
  status?: string;
  /** Gross application depth in mm, as the card shows it. */
  depthMm?: number;
  volumeLiters?: number;
  durationMinutes?: number;
  /** Advised window, "HH:MM"–"HH:MM". */
  windowStart?: string;
  windowEnd?: string;
  /** The engine's own farmer-facing explanation. */
  explanation?: string;
  confidence?: string;
  temperatureC?: number;
  humidityPercent?: number;
  rainfallForecastMm?: number;
  /** Root-zone depletion and the threshold it is compared against. */
  depletionMm?: number;
  readilyAvailableMm?: number;
  totalAvailableMm?: number;
  /** Advisory disease-risk summary, already computed from weather. */
  diseaseRiskLevel?: string;
  diseaseName?: string;
  /** Approximate slope from the ~90 m DEM, when the farm has a terrain record. */
  slopePercent?: number;
}

export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantRequest {
  question: string;
  context?: AssistantContext;
  history?: AssistantTurn[];
}

export interface AssistantReply {
  /** The answer, in the farmer's language. */
  answer: string;
  /** `claude` — from the model. Frontend rule answers never reach this route. */
  source: 'claude';
  model: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi (Devanagari script)',
  bn: 'Bengali (Bengali script)',
  as: 'Assamese (Bengali-Assamese script)',
  ur: 'Urdu (Nastaliq script)',
};

/**
 * Chemical names that must never appear in a reply (docs/10 §10.2).
 *
 * This is a safety net, not the mechanism — the system prompt is what keeps the
 * model on the right side of the boundary. It exists because this is the one
 * violation with an objective test, and because a fungicide name reaching a
 * farmer who then buys and sprays it is the highest-consequence output this
 * route can produce. Matched as whole words so ordinary prose is untouched.
 */
const FORBIDDEN_TERMS = [
  'captan',
  'myclobutanil',
  'mancozeb',
  'chlorothalonil',
  'streptomycin',
  'carbendazim',
  'tebuconazole',
  'propiconazole',
  'azoxystrobin',
  'copper oxychloride',
  'bordeaux mixture',
  'fungicide',
  'pesticide',
  'insecticide',
] as const;

const FORBIDDEN_PATTERN = new RegExp(`\\b(${FORBIDDEN_TERMS.join('|')})\\b`, 'i');

/**
 * Replace a reply that names a chemical with a referral.
 *
 * Dropping the whole answer rather than editing the offending sentence is
 * deliberate: a reply built around a spray recommendation does not become sound
 * advice with the chemical name removed, and a farmer reading a half-answer
 * cannot tell that something was taken out.
 */
export function sanitizeReply(text: string): { text: string; blocked: boolean } {
  if (FORBIDDEN_PATTERN.test(text)) {
    return {
      text: 'For anything involving plant protection products, please speak to your local Krishi Vigyan Kendra or agriculture extension officer — they can see your crop and advise what is approved locally. I can help with irrigation timing and water amounts.',
      blocked: true,
    };
  }
  return { text, blocked: false };
}
/**
 * The system prompt.
 *
 * Assembled per request rather than held as a constant because the farm's
 * situation is part of it: the model must answer "how much water today?" with
 * the engine's own figure, and the only way to guarantee that is to put the
 * figure in front of it and forbid arithmetic.
 *
 * The boundaries are stated as rules with reasons rather than as a bare list.
 * "Never name a chemical" invites a model to find the edge; "you cannot see the
 * crop, so naming a product would be guessing at a diagnosis you have not made"
 * does not.
 */
export function buildSystemPrompt(context: AssistantContext | undefined): string {
  const languageName = LANGUAGE_NAMES[context?.language ?? 'en'] ?? 'English';

  const lines: string[] = [
    'You are the IrrigaSmart field assistant, helping a smallholder farmer in India.',
    '',
    `Reply in ${languageName}. If the farmer writes in another language or mixes languages, answer in ${languageName} unless they clearly asked for something else. Use plain everyday words, not agronomy jargon.`,
    '',
    'Keep answers to 2-4 short sentences. The farmer is reading this on a phone, often standing in the field, and it may be read aloud to them.',
    '',
    'THE NUMBERS ARE ALREADY DECIDED.',
    "The app's irrigation engine has already computed today's advice from an FAO-56 crop water balance, the farm's soil, and the weather forecast. Those figures appear below. Your job is to explain them, not to recompute them.",
    '- Quote the depth, volume, run time and timing exactly as given. Never round them differently, never re-derive them, never offer an alternative figure.',
    '- If the farmer asks something the figures below do not cover, say plainly that you do not have that information rather than estimating it.',
    '',
    'WHAT YOU MUST NOT DO.',
    '- Never name a fungicide, pesticide, insecticide or any plant-protection chemical, and never give a dose, concentration or spray schedule. You cannot see the crop, so naming a product would mean guessing at a diagnosis you have not made, and a wrong spray costs the farmer money and can harm the crop.',
    '- Never state that a disease is present. The app can only say that the weather favours a disease, or that a photo looks similar to one. Phrase it that way.',
    '- For pest and disease treatment, fertiliser doses, seed choice, market prices or government schemes, say this is outside what the app can advise and point the farmer to their local Krishi Vigyan Kendra (KVK) or agriculture extension officer.',
    '- Do not invent local details you were not given: village names, prices, dates or scheme names.',
    '',
    'WHAT YOU SHOULD DO.',
    '- Answer the actual question first, in the first sentence.',
    '- Explain reasoning in terms the farmer can check against what they can see: rain that fell, how dry the soil is, how hot it is.',
    '- If the farmer disagrees with the advice, take it seriously. They can see the field and you cannot. Explain what the app assumed, and say that their own reading of the soil should win when the two conflict.',
  ];

  const facts = describeContext(context);
  if (facts.length > 0) {
    lines.push('', "TODAY'S SITUATION ON THIS FARM:", ...facts.map((fact) => `- ${fact}`));
  } else {
    lines.push(
      '',
      'NO FARM DATA came with this question. Answer generally, and say you cannot see their specific figures right now.',
    );
  }

  return lines.join('\n');
}

/**
 * Flatten the context into plain statements.
 *
 * Absent fields are skipped entirely. A line reading "soil: unknown" would invite
 * the model to fill the gap; a line that is not there cannot.
 */
export function describeContext(context: AssistantContext | undefined): string[] {
  if (!context) return [];
  const facts: string[] = [];
  const add = (label: string, value: string | number | undefined): void => {
    if (value === undefined || value === null || value === '') return;
    facts.push(`${label}: ${String(value)}`);
  };

  add('Farm', context.farmName);
  add('Location', context.locationLabel);
  add('Crop', context.cropName);
  add('Growth stage', context.growthStage);
  add('Soil', context.soilType);
  add('Irrigation method', context.irrigationMethod);
  add('Field size', context.areaLabel);

  add("Today's advice", context.status);
  add('Water depth advised', context.depthMm === undefined ? undefined : `${context.depthMm} mm`);
  add(
    'Total volume advised',
    context.volumeLiters === undefined ? undefined : `${context.volumeLiters} litres`,
  );
  add(
    'Run time advised',
    context.durationMinutes === undefined ? undefined : `${context.durationMinutes} minutes`,
  );
  if (context.windowStart !== undefined && context.windowEnd !== undefined) {
    add('Best time today', `${context.windowStart} to ${context.windowEnd}`);
  }
  add('Confidence in this advice', context.confidence);
  add("The app's own explanation", context.explanation);

  add(
    'Temperature now',
    context.temperatureC === undefined ? undefined : `${context.temperatureC} degrees C`,
  );
  add(
    'Humidity now',
    context.humidityPercent === undefined ? undefined : `${context.humidityPercent}%`,
  );
  add(
    'Rain expected today',
    context.rainfallForecastMm === undefined ? undefined : `${context.rainfallForecastMm} mm`,
  );

  if (context.depletionMm !== undefined) {
    const parts = [`the root zone is ${context.depletionMm} mm short of full`];
    if (context.readilyAvailableMm !== undefined) {
      parts.push(`the crop starts to feel stress past ${context.readilyAvailableMm} mm`);
    }
    if (context.totalAvailableMm !== undefined) {
      parts.push(`this soil can hold ${context.totalAvailableMm} mm in total`);
    }
    facts.push(`Soil moisture: ${parts.join('; ')}`);
  }

  if (context.diseaseRiskLevel !== undefined) {
    const named = context.diseaseName ? ` for ${context.diseaseName}` : '';
    facts.push(
      `Disease risk from weather${named}: ${context.diseaseRiskLevel}. This means the weather favours it — NOT that the disease is present.`,
    );
  }

  if (context.slopePercent !== undefined) {
    facts.push(
      `Approximate land slope: ${context.slopePercent}% (from a coarse ~90 m elevation map, so treat it as rough)`,
    );
  }

  return facts;
}

/**
 * Validate and normalise the request body.
 *
 * Rejects rather than coerces. A question arriving as a number or an object means
 * the client is broken, and quietly stringifying it would send whatever it was to
 * the model and bill for it.
 */
export function parseRequest(body: unknown): AssistantRequest {
  if (typeof body !== 'object' || body === null) {
    throw new AssistantError('request body must be an object', 400, 'INVALID_INPUT');
  }
  const raw = body as Record<string, unknown>;

  if (typeof raw.question !== 'string') {
    throw new AssistantError('question is required', 400, 'INVALID_INPUT');
  }
  const question = raw.question.trim();
  if (question.length === 0) {
    throw new AssistantError('question is required', 400, 'INVALID_INPUT');
  }
  if (question.length > MAX_QUESTION_CHARS) {
    throw new AssistantError(
      `question must be ${MAX_QUESTION_CHARS} characters or fewer`,
      400,
      'INVALID_INPUT',
    );
  }

  // History is truncated rather than refused: a long conversation is a normal
  // thing for a client to accumulate, and the newest turns are the ones that
  // resolve a follow-up like "and tomorrow?".
  const history: AssistantTurn[] = [];
  if (Array.isArray(raw.history)) {
    for (const entry of raw.history.slice(-MAX_HISTORY_TURNS)) {
      if (typeof entry !== 'object' || entry === null) continue;
      const turn = entry as Record<string, unknown>;
      const role = turn.role;
      const content = turn.content;
      if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') continue;
      const trimmed = content.trim();
      if (trimmed.length === 0) continue;
      history.push({ role, content: trimmed.slice(0, MAX_QUESTION_CHARS) });
    }
  }

  const context =
    typeof raw.context === 'object' && raw.context !== null
      ? (raw.context as AssistantContext)
      : undefined;

  return { question, ...(context ? { context } : {}), history };
}

/**
 * Build the message list.
 *
 * The Messages API requires the first message to be `user`, so a history that
 * opens with an assistant turn — which this client can produce, because the
 * offline rules answer first — is trimmed from the front rather than sent and
 * rejected.
 */
export function buildMessages(request: AssistantRequest): Anthropic.MessageParam[] {
  const history = [...(request.history ?? [])];
  while (history.length > 0 && history[0]!.role !== 'user') {
    history.shift();
  }
  return [
    ...history.map((turn): Anthropic.MessageParam => ({ role: turn.role, content: turn.content })),
    { role: 'user', content: request.question },
  ];
}

/** Lazily constructed so the module can be imported without a key present. */
let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    // Not a 500: the deployment simply has no key, and the frontend's offline
    // rules have already answered. Saying so plainly makes the state
    // diagnosable instead of looking like an outage.
    throw new AssistantError('assistant is not configured', 503, 'ASSISTANT_DISABLED');
  }
  client ??= new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS });
  return client;
}

/** True when the route can serve requests. Reported by /health. */
export function assistantConfigured(): boolean {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
}

/**
 * Answer a farmer's question.
 *
 * Non-streaming: the reply is a few sentences well inside `MAX_TOKENS`, and the
 * client shows a typing indicator rather than a partial answer — a half-rendered
 * irrigation figure is worse than a short wait.
 *
 * `thinking` is left at the model's default (adaptive on this model) and no
 * sampling parameters are sent: `temperature`, `top_p`, `top_k` and
 * `budget_tokens` are all rejected with a 400 here. Steering is done through the
 * prompt.
 */
export async function askAssistant(request: AssistantRequest): Promise<AssistantReply> {
  const anthropic = getClient();

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(request.context),
      messages: buildMessages(request),
    });
  } catch (error) {
    // Most specific first. Each maps to something the frontend can act on: a
    // configuration problem, a wait-and-retry, or a fall back to offline rules.
    if (error instanceof Anthropic.AuthenticationError) {
      throw new AssistantError('assistant credentials are not valid', 503, 'ASSISTANT_DISABLED');
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new AssistantError('assistant is busy, try again shortly', 429, 'ASSISTANT_BUSY');
    }
    if (error instanceof Anthropic.APIError) {
      throw new AssistantError('assistant is unavailable', 502, 'ASSISTANT_UNAVAILABLE');
    }
    throw new AssistantError('assistant is unreachable', 502, 'ASSISTANT_UNAVAILABLE');
  }

  // `content` is a discriminated union; thinking blocks are not the answer.
  const answer = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (answer.length === 0) {
    // A refusal or an empty completion. The frontend falls back to its rules.
    throw new AssistantError('assistant returned no answer', 502, 'ASSISTANT_UNAVAILABLE');
  }

  const { text, blocked } = sanitizeReply(answer);
  if (blocked) {
    console.warn('[IrrigaSmart] assistant reply blocked: it named a plant-protection product');
  }

  return { answer: text, source: 'claude', model: response.model };
}
