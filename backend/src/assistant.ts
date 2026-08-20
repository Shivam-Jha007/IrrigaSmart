/**
 * Farmer assistant (item 17).
 *
 * WHY THIS IS A BACKEND ROUTE AT ALL
 * Everything else the app does is deterministic and runs on the device. This one
 * cannot: understanding a question typed in Hinglish, or spoken into a phone in
 * Bengali, needs a language model. That has two consequences that shape the whole
 * design:
 *
 *   1. The provider key may never reach the browser. A key shipped in a bundle
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
 *
 * TWO INTERCHANGEABLE PROVIDERS
 * Anthropic's API is not free, and asking every developer running this project
 * to pay for one is a worse default than supporting a provider with a genuine
 * no-cost tier. Google's Gemini API free tier (no billing account required) is
 * that provider, so the route picks whichever key is present at start-up —
 * `ANTHROPIC_API_KEY` if set, otherwise `GEMINI_API_KEY` — and calls that
 * provider. Both paths share the same system prompt, the same context-to-facts
 * builder, and the same `sanitizeReply` safety net, so the product boundaries
 * hold identically regardless of which provider answered. `source` on the reply
 * tells the frontend (for logging only; the farmer only ever sees "Answered
 * online") which one it was.
 */

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

/** Anthropic model id. Pinned deliberately: an unexpected model change alters advice. */
const MODEL = 'claude-opus-5';

/**
 * Default Gemini model id. Flash-Lite is chosen over Flash or Pro because it is
 * the model the Gemini free tier grants the most daily requests on — this route
 * answers short, low-stakes explanatory questions, not tasks that need a larger
 * model's reasoning depth.
 */
const DEFAULT_GEMINI_MODEL = 'gemini-flash-lite-latest';

/**
 * Which Gemini model this deployment calls.
 *
 * `GEMINI_MODEL` overrides the default so a deployment can move to a newer model
 * — or pin an older one that is being retired — without a code change and
 * without a redeploy of the frontend. It is deliberately not a general-purpose
 * setting: nothing here validates the id, so a value the API does not recognise
 * means the provider rejects every call and the route reports itself
 * unavailable, at which point the frontend falls back to the offline rules. That
 * is a safe failure and a confusing one, so the variable is documented as
 * optional and left unset in `render.yaml`.
 *
 * Read on each call rather than captured at import, for two reasons: the value is
 * only consulted when a question is actually asked, so there is nothing to gain
 * from freezing it at start-up; and a test can set the variable, exercise the
 * accessor and restore it without re-importing the module.
 *
 * Whitespace is trimmed because a value pasted into a dashboard field commonly
 * arrives with a trailing space, and `'gemini-flash-lite-latest '` would fail at
 * the provider for a reason no log would make obvious.
 */
export function geminiModel(): string {
  const configured = (process.env.GEMINI_MODEL ?? '').trim();
  return configured.length > 0 ? configured : DEFAULT_GEMINI_MODEL;
}

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
 *
 * THIS SHAPE IS THE WIRE CONTRACT AND IT HAS A TWIN.
 * `frontend/src/services/assistantRules.ts` declares the same interface, because
 * one object serves both paths: the offline rules read it, and if they cannot
 * answer it is sent here unchanged. The two copies must stay field-for-field
 * identical. If they drift, the offline answer and the model's answer can
 * disagree about the FACTS rather than merely the wording, and a farmer has no
 * way to tell which one was working from the truth.
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
  /** Litres saved today versus the baseline practice, from the water ledger. */
  savedTodayLiters?: number;
  savedLifetimeLiters?: number;
  /** Tomorrow's advised action from the multi-day plan, e.g. "Irrigate Today". */
  tomorrowStatus?: string;

  // --- Soil chemistry and where it came from (PRD §7, §28 Guardrail 1) ---
  //
  // WHY THE PROVENANCE FIELDS CARRY THE RAW ENGLISH LABEL
  // These hold the §7 vocabulary verbatim — 'MEASURED', 'REGIONAL_ESTIMATE',
  // 'USER_PROVIDED', 'FORECAST', 'CALCULATED', 'INFERRED', 'UNKNOWN'. The
  // prompt below has to name the exact token it is forbidding the model to
  // misrepresent, and a closed vocabulary is the only thing a rule can branch
  // on. `diseaseRiskLevel` already sets this precedent with raw 'Moderate'.
  // The farmer never sees these strings.

  /** Topsoil pH. An area prediction unless `soilPhProvenance` says MEASURED. */
  soilPh?: number;
  /** §7 label for `soilPh`, e.g. 'REGIONAL_ESTIMATE'. */
  soilPhProvenance?: string;
  /** Plain-language sentence naming what produced `soilPh`. */
  soilPhOrigin?: string;
  /** Already-translated verdict for the crop, e.g. "Well suited". */
  phSuitability?: string;
  phOptimalMin?: number;
  phOptimalMax?: number;
  /** USDA texture class from the soil map, e.g. "clay loam". */
  soilTextureClass?: string;
  soilTextureProvenance?: string;
  /** Topsoil organic carbon, percent by mass. */
  organicCarbonPct?: number;
  /** §7 label for `soilType` — USER_PROVIDED when the farmer chose it. */
  soilTypeProvenance?: string;
  /** §7 label for the weather figures, normally FORECAST. */
  weatherProvenance?: string;
  /** §7 label for the water-holding figures the moisture answer rests on. */
  soilMoistureProvenance?: string;
  /** Pre-translated top farm issues, highest severity first. */
  topIssues?: string[];

  // --- Soil fertility: the farmer's own Soil Health Card reading ---
  //
  // USER_PROVIDED, unlike every other soil-chemistry field above. The farmer
  // typed these off their own lab slip; the app did not predict them from a
  // map. `fertilityBand` is the one CALCULATED exception — the app's own
  // classification of the three numbers into Low/Medium/High, the same
  // distinction `phSuitability` draws against `soilPh`.

  /** Available nitrogen from the farmer's own reading, kg/ha. */
  fertilityN?: number;
  /** Available phosphorus (P₂O₅) from the same reading, kg/ha. */
  fertilityP2O5?: number;
  /** Available potassium (K₂O) from the same reading, kg/ha. */
  fertilityK2O?: number;
  /** The booklet's Low/Medium/High band this reading classifies into. */
  fertilityBand?: string;
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
  /**
   * `claude` — from the model, whichever provider actually answered. Frontend
   * rule answers never reach this route, so this is always one of the two
   * network providers below.
   */
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
 *
 * THE PROVENANCE SECTION IS A GUARDRAIL, NOT DOCUMENTATION (PRD §7, §28).
 * Most of the soil facts this app holds are predictions for a 250 m map cell,
 * not tests of the farmer's field. A model handed "pH 6.2" will say "your pH is
 * 6.2" — fluently, confidently, and wrongly — and a farmer who believes it may
 * skip the Soil Health Card test that would have told them the truth. So the
 * §7 label vocabulary is defined in the prompt and each label is tied to what it
 * licenses the model to claim. It is stated unconditionally, even when no
 * labelled fact follows, because a rule that appears only sometimes is a rule
 * the model learns to treat as optional.
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
    'WHERE THE FACTS BELOW COME FROM.',
    'Some facts carry a label in square brackets. The label says how the app knows that fact, and it changes what you are allowed to call it:',
    '- MEASURED — an actual reading from this field. Only this label may be spoken of as a measurement of their land.',
    '- USER_PROVIDED — the farmer told the app. Treat it as true about their field; they can see it and you cannot.',
    "- REGIONAL_ESTIMATE — a prediction for the wider area from a coarse map, NOT a test of this field. Their neighbours' land is inside the same figure.",
    '- FORECAST — a weather prediction that has not happened yet and can change.',
    '- CALCULATED — worked out by the app from the figures above it, so it inherits their uncertainty.',
    '- INFERRED — deduced indirectly, weaker still.',
    '- UNKNOWN — the app does not have it. Say so; do not fill the gap.',
    '',
    'RULES YOU MUST FOLLOW ABOUT THOSE LABELS.',
    '- Never present a REGIONAL_ESTIMATE as if it were a field measurement. Do not say "your soil pH is 6.2" when 6.2 is a REGIONAL_ESTIMATE. Say it is an estimate for the area, and name what it came from.',
    '- If the farmer asks for an exact, actual or true value and all the app has is a REGIONAL_ESTIMATE, your FIRST sentence must say that the app does not have a test of their field, and you must point them at a Soil Health Card soil test. Give the estimate afterwards, labelled as one, or not at all. Never answer such a question with a bare number.',
    '- Never overrule a USER_PROVIDED fact with a REGIONAL_ESTIMATE one. If the map and the farmer disagree, say both and say the farmer is the better source for their own field.',
    '- Never state a quantity of lime, gypsum, sulphur, fertiliser, manure or any soil amendment or chemical, even when the app has told you a value is out of range. Naming a rate needs a soil test and a local officer. Say what the reading suggests and who can act on it.',
    '- Never turn a CALCULATED or INFERRED figure into a certainty. "The app works it out as about X" is honest; "your soil holds exactly X" is not.',
    '',
    'WHAT YOU MUST NOT DO.',
    '- Never name a fungicide, pesticide, insecticide or any plant-protection chemical, and never give a dose, concentration or spray schedule. You cannot see the crop, so naming a product would mean guessing at a diagnosis you have not made, and a wrong spray costs the farmer money and can harm the crop.',
    '- Never state that a disease is present. The app can only say that the weather favours a disease, or that a photo looks similar to one. Phrase it that way.',
    "- Never state an exact quantity of fertiliser, urea, lime, gypsum, sulphur, manure or any other soil amendment or chemical — that always needs an actual soil test and a local officer, whatever the app's own figures suggest.",
    '- For pest and disease treatment, seed choice, market prices or government schemes, say this is outside what the app can advise and point the farmer to their local Krishi Vigyan Kendra (KVK) or agriculture extension officer.',
    '- Do not invent local details you were not given: village names, prices, dates or scheme names.',
    '',
    'ON FERTILITY AND SOIL-HEALTH QUESTIONS (how much fertiliser, is my soil deficient, should I add lime, etc.), DO THIS INSTEAD OF REFUSING.',
    '- Answer with what the app actually has FIRST: its pH figure and verdict, its organic-carbon estimate, and any fertility issue already listed under "Improvements the app has already flagged" below, each with its own [LABEL] caveat exactly as the RULES above require.',
    '- Only after giving that estimate, add one line saying you cannot give an exact fertiliser or amendment amount from an estimate, and that a soil or leaf test at the local Krishi Vigyan Kendra will give the real figure and the right quantity.',
    '- If the app has no pH, organic-carbon or fertility figure at all for this farm, say so plainly and go straight to recommending a soil test — there is nothing to estimate from.',
    '- This still means you may never state a quantity yourself (see WHAT YOU MUST NOT DO above): you may describe the reading and the verdict, never a rate.',
    '',
    'WHAT YOU SHOULD DO.',
    "- Answer the actual question first, in the first sentence, using the app's own figures whenever it has any that bear on the question — an estimate with its caveat stated is more useful to a farmer than an instant refusal.",
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
 *
 * WHY EVERY UNCERTAIN FIGURE CARRIES ITS SOURCE IN THE SAME LINE
 * A model given "Topsoil pH: 6.2" will say "your soil pH is 6.2", because that
 * is what the sentence it was handed means. The provenance is therefore not a
 * separate note further down the prompt — it is welded into the same line as the
 * number, so there is no phrasing of that fact available to the model that omits
 * it (PRD §7, §28 Guardrail 1).
 */
export function describeContext(context: AssistantContext | undefined): string[] {
  if (!context) return [];
  const facts: string[] = [];
  const add = (label: string, value: string | number | undefined): void => {
    if (value === undefined || value === null || value === '') return;
    facts.push(`${label}: ${String(value)}`);
  };

  /**
   * Attach the §7 label to a value, e.g. "Loamy [USER_PROVIDED]".
   *
   * The bracketed token is the machine-readable half; the RULES section of the
   * prompt defines what each one licenses the model to say. An empty or absent
   * value passes straight through so `add` can still drop it.
   */
  const labelled = (
    value: string | undefined,
    provenance: string | undefined,
  ): string | undefined => {
    if (!value) return value;
    return provenance ? `${value} [${provenance}]` : value;
  };

  add('Farm', context.farmName);
  add('Location', context.locationLabel);
  add('Crop', context.cropName);
  add('Growth stage', context.growthStage);
  add('Soil', labelled(context.soilType, context.soilTypeProvenance));
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
  const hasWeather =
    context.temperatureC !== undefined ||
    context.humidityPercent !== undefined ||
    context.rainfallForecastMm !== undefined;
  if (hasWeather && context.weatherProvenance !== undefined) {
    facts.push(
      `Provenance of those weather figures: ${context.weatherProvenance}. A FORECAST is a prediction, not something that has already happened — word it that way.`,
    );
  }

  if (context.depletionMm !== undefined) {
    const parts = [`the root zone is ${context.depletionMm} mm short of full`];
    if (context.readilyAvailableMm !== undefined) {
      parts.push(`the crop starts to feel stress past ${context.readilyAvailableMm} mm`);
    }
    if (context.totalAvailableMm !== undefined) {
      parts.push(`this soil can hold ${context.totalAvailableMm} mm in total`);
    }
    // There is no moisture sensor in this field and there never has been. The
    // depletion figure is a running FAO-56 water balance on top of a
    // map-derived holding capacity, so the model must not describe it as a
    // reading taken from the soil.
    if (
      context.soilMoistureProvenance !== undefined &&
      context.soilMoistureProvenance !== 'MEASURED'
    ) {
      parts.push(
        `the holding figures behind this are ${context.soilMoistureProvenance} — worked out from a soil map and a texture table, NOT read from a sensor in this field`,
      );
    }
    facts.push(`Soil moisture: ${parts.join('; ')}`);
  }

  // --- Soil fertility: the farmer's own Soil Health Card reading, cited
  // before the pH/carbon map estimates below — it is USER_PROVIDED and specific
  // to this field, so it is the better answer to "how is my soil doing"
  // whenever it exists. ---

  if (
    context.fertilityN !== undefined ||
    context.fertilityP2O5 !== undefined ||
    context.fertilityK2O !== undefined
  ) {
    const parts: string[] = [];
    if (context.fertilityN !== undefined) parts.push(`available N ${context.fertilityN} kg/ha`);
    if (context.fertilityP2O5 !== undefined) parts.push(`available P2O5 ${context.fertilityP2O5} kg/ha`);
    if (context.fertilityK2O !== undefined) parts.push(`available K2O ${context.fertilityK2O} kg/ha`);
    const band = context.fertilityBand === undefined ? '' : ` — the app classifies this as ${context.fertilityBand} overall fertility`;
    facts.push(
      `Soil Health Card reading the farmer entered [USER_PROVIDED]: ${parts.join(', ')}${band}. This is the farmer's own field, not a map estimate — you may state it as their reading. Still never turn it into an exact fertiliser, urea, lime or amendment QUANTITY (see WHAT YOU MUST NOT DO); say what it suggests and point to a soil test / local KVK for the rate.`,
    );
  }

  // --- Soil chemistry: the figures a farmer is most likely to mistake for a
  // lab result, so each one names what produced it in the same breath. ---

  if (context.soilPh !== undefined) {
    const label =
      context.soilPhProvenance === undefined ? '' : ` [${context.soilPhProvenance}]`;
    const from = context.soilPhOrigin ? `, from ${context.soilPhOrigin}` : '';
    facts.push(
      context.soilPhProvenance === 'MEASURED'
        ? `Topsoil pH from a field test${label}: ${context.soilPh}${from}. This one you may state as this field's own measured value.`
        : `Topsoil pH ESTIMATE${label}: ${context.soilPh}${from}. This is NOT a test of this field. If the farmer asks for their exact or actual pH, say plainly that this is an area estimate and that a Soil Health Card soil test is what gives their field's own value.`,
    );
  }

  if (context.phOptimalMin !== undefined && context.phOptimalMax !== undefined) {
    const verdict =
      context.phSuitability === undefined ? '' : ` The app's verdict: ${context.phSuitability}.`;
    facts.push(
      `pH band this crop prefers: ${context.phOptimalMin} to ${context.phOptimalMax}.${verdict} The verdict is only as good as the pH figure above. Never state a lime, gypsum or sulphur quantity — that needs a soil test and the local KVK.`,
    );
  }

  if (context.soilTextureClass !== undefined) {
    facts.push(
      `Soil texture class from the same soil map: ${labelled(context.soilTextureClass, context.soilTextureProvenance)}. If this disagrees with the farmer's own soil choice above, THEIRS wins — they have dug in this field and the map has not.`,
    );
  }

  if (context.organicCarbonPct !== undefined) {
    facts.push(
      `Topsoil organic carbon: ${context.organicCarbonPct}% (the same 250 m map estimate, not a test of this field)`,
    );
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

  // Array.isArray rather than a length check: the context arrives from a client
  // and `parseRequest` does not validate its interior, so a string here would
  // otherwise reach `.join` and throw a 500 on a farmer's question.
  if (Array.isArray(context.topIssues) && context.topIssues.length > 0) {
    facts.push(
      `Improvements the app has already flagged for this farm, most important first: ${context.topIssues.join('; ')}. If the farmer asks what to fix, work from this list — it was produced by the same rules that produced the figures above. Do not invent a different one.`,
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

/** Which network provider a deployment is configured to use. */
type Provider = 'anthropic' | 'gemini';

/**
 * Which provider this deployment should call, or null if neither key is set.
 *
 * Anthropic takes priority when both are present, mirroring the order these
 * providers were added to the project. A deployment only ever needs one key —
 * setting both is not a supported way to get a fallback between them, because
 * a farmer cannot tell "the model answered" from "which of two models
 * answered", so there is nothing to gain from silently trying a second
 * provider after the first fails.
 */
function activeProvider(): Provider | null {
  if ((process.env.ANTHROPIC_API_KEY ?? '').trim().length > 0) return 'anthropic';
  if ((process.env.GEMINI_API_KEY ?? '').trim().length > 0) return 'gemini';
  return null;
}

/** True when the route can serve requests. Reported by /health. */
export function assistantConfigured(): boolean {
  return activeProvider() !== null;
}

/** Lazily constructed so the module can be imported without a key present. */
let anthropicClient: Anthropic | null = null;
let geminiClient: GoogleGenAI | null = null;

function getAnthropicClient(): Anthropic {
  anthropicClient ??= new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: REQUEST_TIMEOUT_MS,
  });
  return anthropicClient;
}

function getGeminiClient(): GoogleGenAI {
  // Only called once activeProvider() has confirmed GEMINI_API_KEY is set, but
  // exactOptionalPropertyTypes still requires the string to be narrowed here.
  const apiKey = process.env.GEMINI_API_KEY ?? '';
  geminiClient ??= new GoogleGenAI({ apiKey, httpOptions: { timeout: REQUEST_TIMEOUT_MS } });
  return geminiClient;
}

/**
 * Answer via the Anthropic Messages API.
 *
 * `thinking` is left at the model's default (adaptive on this model) and no
 * sampling parameters are sent: `temperature`, `top_p`, `top_k` and
 * `budget_tokens` are all rejected with a 400 here. Steering is done through
 * the prompt.
 */
async function askAnthropic(request: AssistantRequest): Promise<{ answer: string; model: string }> {
  const anthropic = getAnthropicClient();

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

  return { answer, model: response.model };
}

/**
 * Answer via the Gemini API.
 *
 * Gemini has no separate "system" message slot in the chat history the way
 * `buildMessages` shapes it for Anthropic — the SDK takes the system prompt as
 * `config.systemInstruction` instead, and the conversation as `contents` with
 * `role: 'user' | 'model'` (Gemini's name for the assistant turn, not `role:
 * 'assistant'`). Mapped here rather than in `buildMessages`, so that function
 * stays specific to the Anthropic shape it was written for.
 */
async function askGemini(request: AssistantRequest): Promise<{ answer: string; model: string }> {
  const ai = getGeminiClient();
  const messages = buildMessages(request);
  // Resolved once, so the id reported back is provably the id that was called.
  const model = geminiModel();

  let response: Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>;
  try {
    response = await ai.models.generateContent({
      model,
      contents: messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof message.content === 'string' ? message.content : '' }],
      })),
      config: {
        systemInstruction: buildSystemPrompt(request.context),
        maxOutputTokens: MAX_TOKENS,
      },
    });
  } catch (error) {
    // The SDK throws ApiError with an HTTP status for provider-side failures.
    // Mapped the same way as the Anthropic branch, so the frontend's handling
    // of ASSISTANT_DISABLED / ASSISTANT_BUSY / ASSISTANT_UNAVAILABLE does not
    // need to know which provider is behind this deployment.
    const status = (error as { status?: number } | null)?.status;
    if (status === 400 || status === 401 || status === 403) {
      throw new AssistantError('assistant credentials are not valid', 503, 'ASSISTANT_DISABLED');
    }
    if (status === 429) {
      throw new AssistantError('assistant is busy, try again shortly', 429, 'ASSISTANT_BUSY');
    }
    throw new AssistantError('assistant is unavailable', 502, 'ASSISTANT_UNAVAILABLE');
  }

  const answer = (response.text ?? '').trim();
  return { answer, model };
}

/**
 * Answer a farmer's question.
 *
 * Non-streaming: the reply is a few sentences well inside `MAX_TOKENS`, and the
 * client shows a typing indicator rather than a partial answer — a half-rendered
 * irrigation figure is worse than a short wait.
 */
export async function askAssistant(request: AssistantRequest): Promise<AssistantReply> {
  const provider = activeProvider();
  if (!provider) {
    // Not a 500: the deployment simply has no key, and the frontend's offline
    // rules have already answered. Saying so plainly makes the state
    // diagnosable instead of looking like an outage.
    throw new AssistantError('assistant is not configured', 503, 'ASSISTANT_DISABLED');
  }

  const { answer, model } = provider === 'anthropic' ? await askAnthropic(request) : await askGemini(request);

  if (answer.length === 0) {
    // A refusal or an empty completion. The frontend falls back to its rules.
    throw new AssistantError('assistant returned no answer', 502, 'ASSISTANT_UNAVAILABLE');
  }

  const { text, blocked } = sanitizeReply(answer);
  if (blocked) {
    console.warn('[IrrigaSmart] assistant reply blocked: it named a plant-protection product');
  }

  return { answer: text, source: 'claude', model };
}
