import type { TranslateFn, TranslationKey } from '../i18n';
import { classifyNutrient } from './fertilizerKnowledge';

/**
 * Offline assistant rules (item 17).
 *
 * WHY THIS FILE IS THE MECHANISM AND THE MODEL IS THE ENHANCEMENT
 * A farmer standing in a field with one bar of signal is the normal case, not
 * the edge case (item 18). So the questions farmers actually ask most — how
 * much water, when, why, will it rain, how dry is the soil — are answered here,
 * from the figures the decision engine already computed on this device. No
 * network, no key, no latency. `assistantService` calls the backend only when
 * this file could not answer AND the device is online.
 *
 * Every answer is assembled from translation keys rather than composed in
 * English and translated later, so a Bengali farmer gets Bengali from the same
 * code path an English farmer gets English from — there is no "primary
 * language" here.
 *
 * THE NUMBERS ARE NEVER RECOMPUTED
 * This module does no arithmetic on water figures beyond formatting. Every
 * quantity it speaks comes from `AssistantContext`, which is filled from the
 * engine's own output. That is the same rule the backend prompt enforces on the
 * model, held for the same reason: two sources of truth for "how much water
 * today" is precisely the disagreement a farmer cannot detect.
 *
 * PRODUCT BOUNDARIES ARE ENFORCED BEFORE INTENT
 * `referral` is matched first and short-circuits everything else. A question
 * about which spray to use must never be routed to a rule that happens to
 * mention water, and must never be silently escalated as if it were an
 * ordinary irrigation question. It is answered here, offline, with a pointer to
 * the local Krishi Vigyan Kendra, and it names no chemical
 * (docs/12_Product_Roadmap_v2.md V1.3 Product Boundaries, docs/10 §10.2).
 */

/**
 * What the farmer is asking about.
 *
 * `referral` is a real answer, not a failure: "I cannot advise on that, here is
 * who can" is the correct response to a spray question and the app should give
 * it instantly rather than spending a model call to reach the same place.
 *
 * `unknown` is absent on purpose — a question this file cannot classify returns
 * null, which is the signal `assistantService` uses to decide whether to reach
 * for the model.
 */
export type AssistantIntent =
  | 'referral'
  | 'today'
  | 'amount'
  | 'timing'
  | 'why'
  | 'rain'
  | 'moisture'
  | 'ph'
  | 'soil'
  | 'fertility'
  | 'photo'
  | 'disease'
  | 'savings'
  | 'plan'
  | 'weather'
  | 'greeting'
  | 'capability';

/**
 * The farm's situation as the device already knows it.
 *
 * This is the same shape the backend accepts (backend/src/assistant.ts
 * AssistantContext) so one object serves both paths: the rules read it, and if
 * the rules fall short it is sent over the wire unchanged. Two shapes would
 * mean the model and the offline answer could disagree about the facts, not
 * just the wording.
 *
 * Every field is optional because the farmer may ask before a farm exists, or
 * while offline with no cached weather.
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
  status?: string;
  depthMm?: number;
  volumeLiters?: number;
  durationMinutes?: number;
  windowStart?: string;
  windowEnd?: string;
  explanation?: string;
  confidence?: string;
  temperatureC?: number;
  humidityPercent?: number;
  rainfallForecastMm?: number;
  depletionMm?: number;
  readilyAvailableMm?: number;
  totalAvailableMm?: number;
  diseaseRiskLevel?: string;
  diseaseName?: string;
  /** Where on the plant to look for the at-risk disease (translated). */
  diseaseWhere?: string;
  /** What the signs look like (translated). */
  diseaseWhat?: string;

  // --- Latest leaf-photo check (V2.2, on-device model) ---
  //
  // A summary of the most recent photo the farmer checked on the Today screen,
  // PRE-WORDED by deterministic code rather than handed to the model as raw
  // class strings. The verdict's careful phrasing — "looks similar to", never
  // "has"; similarity %, never probability; no name at all below the
  // confidence threshold — is a product boundary (docs/12 §Product Boundaries,
  // docs/14), and it is enforced here, in the sentence itself, so neither
  // answer path can re-word it into a claim.

  /** Pre-translated verdict sentence, e.g. "The photo looks similar to Rice Blast (72% similar)." */
  photoVerdict?: string;
  /** Which crop the checked photo was of, when it differed from the farm's. */
  photoPlant?: string;
  /** When the photo was checked. ISO 8601. */
  photoCheckedAt?: string;
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
  // 'USER_PROVIDED', 'FORECAST', 'CALCULATED', 'INFERRED', 'UNKNOWN' — not a
  // translated chip. A rule can only branch on a closed vocabulary, and the
  // backend prompt has to be able to name the exact token it is forbidding the
  // model to misrepresent. `diseaseRiskLevel` already sets this precedent by
  // carrying raw 'Moderate'. The farmer never sees these strings; they see the
  // sentence a rule or the model builds from them.

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
  /** USDA texture class from the soil map, e.g. "clay loam". Model-only. */
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
  /** Pre-translated top farm issues (Phase 3), highest severity first. */
  topIssues?: string[];

  // --- Soil fertility: the farmer's own Soil Health Card reading ---
  //
  // USER_PROVIDED, unlike every other soil-chemistry field above — the farmer
  // typed these off their own lab slip; the app did not predict them from a
  // map. `fertilityBand` is CALCULATED, the same distinction `phSuitability`
  // draws against `soilPh`: the farmer supplied the numbers, the app supplied
  // the verdict.

  /** Available nitrogen from the farmer's own reading, kg/ha. */
  fertilityN?: number;
  fertilityP2O5?: number;
  fertilityK2O?: number;
  fertilityProvenance?: string;
  fertilityBand?: string;
  fertilityPh?: number;
  fertilityEc?: number;
  fertilityOrganicCarbonPct?: number;
  fertilitySulphur?: number;
  fertilityZinc?: number;
  fertilityBoron?: number;
  fertilityIron?: number;
  fertilityManganese?: number;
  fertilityCopper?: number;

  // --- Resolved fertilizer schedule (State Agriculture Department booklet) ---
  //
  // Unlike every soil-chemistry field above, these figures ARE quotable exact
  // values: they are a transcription of the official State Agriculture
  // Department (West Bengal) soil-test-based fertilizer schedule — the same
  // tables the app's Fertilizer tab shows — resolved to the crop, variety, soil
  // zone and fertility band the farmer selected. The model may state these
  // numbers verbatim WITH attribution to the State schedule. It may still never
  // invent or adjust one: if no schedule line is present below, there is no
  // figure to give, and the answer is to say so.

  /** Official schedule dose for the selected band, e.g. "N 50, P2O5 25, K2O 25 kg/ha". */
  fertScheduleNpk?: string;
  /** The band the dose was resolved for, e.g. "Medium". */
  fertScheduleBand?: string;
  /** Variety label, e.g. "Kharif (monsoon) rice" or "Potato". */
  fertScheduleVariety?: string;
  /** Soil zone label the schedule was resolved for, e.g. "Terai". */
  fertScheduleZone?: string;
  /** Booklet soil amendment line, e.g. "Dolomite @ 1-2 t/ha". */
  fertScheduleAmeliorant?: string;
  /** Booklet manure/bio-fertilizer line, e.g. "FYM @ 5 t/ha ...". */
  fertScheduleManure?: string;
  /** Booklet sulphur line, e.g. "S @ 20 kg/ha at land preparation". */
  fertScheduleSulphur?: string;
  /** Booklet micronutrient line. */
  fertScheduleMicronutrients?: string;
  /** Booklet split-timing / general note for this crop table. */
  fertScheduleTiming?: string;
  /** True when the booklet has no NPK cell for this zone (Hill/Coastal gaps). */
  fertScheduleNoDose?: boolean;
  /** Crop alternatives ranked by pH suitability for this farm's soil. */
  phAltCrops?: string[];
}

export interface RuleAnswer {
  answer: string;
  intent: AssistantIntent;
}

/**
 * Fold a question down to something matchable.
 *
 * Punctuation is replaced with spaces rather than deleted so "water?why" cannot
 * fuse into one unmatchable token. Indic and Arabic script ranges are preserved
 * explicitly — a naive [^a-z0-9] strip would erase the entire question for four
 * of the five supported languages, which is exactly the bug that would make
 * this look like it works while only working in English.
 *
 * WHY \p{M} IS IN THE KEEP SET
 * Combining marks are not letters. Every Devanagari matra (ि ा ी े), every
 * Bengali and Assamese vowel sign, the virama, and the Urdu diacritics are
 * Unicode category M, not L. Keeping only \p{L}\p{N} turns "कितना पानी" into
 * "क तन प न" — still non-empty, still Devanagari, and matching nothing. That
 * failure is invisible in English and silently disables every native-script
 * keyword in four languages, so the marks are preserved deliberately.
 *
 * Zero-width joiners are dropped outright rather than turned into spaces:
 * they sit INSIDE a word to shape a conjunct, so substituting a space would
 * split the very word being matched.
 */
export function normalise(question: string): string {
  return ` ${question
    .toLowerCase()
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
    .trim()} `;
}

/** True when any term appears in the normalised question. */
function hasAny(normalised: string, terms: readonly string[]): boolean {
  return terms.some((term) => normalised.includes(term));
}

/**
 * Keyword tables, one per intent.
 *
 * Each covers the five interface languages plus romanised Hindi/Urdu, because a
 * farmer with an English keyboard types "kitna pani" far more often than
 * "कितना पानी" — matching only the native script would leave the most common
 * real input falling through to the network path, which is the one path that
 * does not work in a field.
 *
 * Terms are substrings, not whole words: Indic languages inflect heavily
 * ("पानी", "पानीचा", "पानीची") and a word-boundary match would miss most forms.
 * The cost is that a short term can over-match, so short terms are avoided in
 * favour of distinctive stems.
 */
const REFERRAL_TERMS = [
  // Plant protection, seed, market, schemes — everything outside what this app
  // is allowed to advise on at all (V1.3 Product Boundaries: no chemical name,
  // no dose, no spray schedule, ever). Fertility and soil-amendment questions
  // used to live in this table too; they now have their own `fertility` intent
  // below, which answers from the app's own pH/organic-carbon estimate before
  // adding the same "no exact quantity" caution — an estimate-then-caution
  // answer is more useful than an instant refusal, and the app does have
  // relevant figures to offer even though it cannot name a rate.
  'spray',
  'fungicide',
  'pesticide',
  'insecticide',
  'chemical',
  'medicine',
  'dose',
  'dosage',
  'seed variety',
  'which seed',
  'market price',
  'mandi',
  'subsidy',
  'scheme',
  'loan',
  'insurance',
  'dawa',
  'dawai',
  'davai',
  'chidkav',
  'chhidkav',
  'keetnashak',
  'kitnashak',
  'दवा',
  'दवाई',
  'छिड़काव',
  'कीटनाशक',
  'फफूंदनाशक',
  'बीज',
  'भाव',
  'मंडी',
  'योजना',
  'ওষুধ',
  'ছত্রাকনাশক',
  'কীটনাশক',
  'বীজ',
  'দাম',
  'স্প্রে',
  'ঔষধ',
  'বীজ',
  'স্প্ৰে',
  'ঔষধি',
  'دوا',
  'دوائی',
  'کیڑے',
  'بیج',
  'قیمت',
  'اسپرے',
  'چھڑکاؤ',
] as const;

/**
 * Fertility and soil-amendment terms.
 *
 * WHY THESE ARE NOT `REFERRAL_TERMS`
 * A question about fertiliser, a nutrient, or an amendment like lime is not the
 * same shape as "which pesticide should I spray" — the app has NO estimate at
 * all for a spray decision, but it does have a pH reading, an organic-carbon
 * estimate and (via `topIssues`) any fertility problem the engine already
 * flagged. Refusing outright throws that estimate away. The `fertility` rule
 * below states whatever the app knows first, and only then adds the same
 * unconditional caution the `ph` rule already carries: no exact quantity,
 * because that needs a soil test and the local KVK (PRD §28 Guardrail 2, which
 * this table does not loosen — it only moves WHERE the caution is said from).
 *
 * Checked immediately after `referral` and before every other intent, for the
 * same reason `ph`/`soil` sit early: a fertility phrase must not be captured by
 * `moisture` (which owns the bare word for soil) or by `disease`.
 */
const FERTILITY_TERMS = [
  'fertiliser',
  'fertilizer',
  'urea',
  'npk',
  'nutrient',
  'manure',
  'compost',
  'improve soil',
  'improve my soil',
  'improve the soil',
  'soil health',
  'better soil',
  'मिट्टी सुधार',
  'मिट्टी की गुणवत्ता',
  'মাটির উন্নতি',
  'মাটির স্বাস্থ্য',
  'মাটিৰ উন্নতি',
  'مٹی بہتر',
  // Spelled-out nutrients, not just 'npk' — "how much phosphorus does my soil
  // need?" is the same question as "how much fertiliser", asked differently.
  'nitrogen',
  'phosphorus',
  'phosphate',
  'potassium',
  'potash',
  'नाइट्रोजन',
  'फॉस्फोरस',
  'पोटाश',
  'खाद',
  'उर्वरक',
  'खाद डालूं',
  'खाद चाहिए',
  'sar dena',
  'khad dena',
  'khad',
  'khaad',
  'urvarak',
  'নাইট্রোজেন',
  'ফসফরাস',
  'পটাশ',
  'সার',
  'নাইট্ৰোজেন',
  'ফছফৰাছ',
  'সাৰ',
  'نائٹروجن',
  'فاسفورس',
  'پوٹاش',
  'کھاد',
  // Soil amendments: the honest follow-up to "your soil is acidic" is "how much
  // lime?", and the fertility rule reports the reading and refuses the exact
  // quantity in the same breath rather than a bare refusal.
  'lime',
  'gypsum',
  'chuna',
  'चूना',
  'चुना',
  'জিপসাম',
  'চুন',
  'چونا',
] as const;

const TEST_VALUE_TERMS = [
  'soil test',
  'test value',
  'test result',
  'lab report',
  'soil health card',
  // Native-script equivalents, so "I have my soil test" in the farmer's own
  // language reaches the card-guidance answer rather than being swallowed by
  // the moisture terms (which own the bare word for soil in every language).
  'मिट्टी की जाँच',
  'मिट्टी जाँच',
  'मृदा परीक्षण',
  'सॉइल हेल्थ कार्ड',
  'मिट्टी की रिपोर्ट',
  'মাটির পরীক্ষা',
  'মাটি পরীক্ষা',
  'মৃত্তিকা স্বাস্থ্য কার্ড',
  'মাটির রিপোর্ট',
  'মাটিৰ পৰীক্ষা',
  'মাটি পৰীক্ষা',
  'মৃত্তিকা স্বাস্থ্য কাৰ্ড',
  'مٹی کی جانچ',
  'مٹی ٹیسٹ',
  'سائل ہیلتھ کارڈ',
  'مٹی کی رپورٹ',
] as const;

const LAB_VALUE_PATTERN = /(?:\bph\b|\bec\b|\belectrical\s+conductivity\b|\bnitrogen\b|\bphosphorus\b|\bpotassium\b|\borganic\s+carbon\b|\bsulphur\b|\bsulfur\b|\bzinc\b|\bboron\b|\biron\b|\bmanganese\b|\bcopper\b)\s*[:=]?\s*\d+(?:\.\d+)?/i;

function parseSoilTestValues(question: string): {
  ph?: number;
  ec?: number;
  organicCarbonPct?: number;
  n?: number;
  p2o5?: number;
  k2o?: number;
  sulphur?: number;
  zinc?: number;
  boron?: number;
  iron?: number;
  manganese?: number;
  copper?: number;
} {
  const source = question.toLowerCase();
  const value = (patterns: readonly RegExp[]): number | undefined => {
    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match?.[1]) {
        const number = Number(match[1]);
        if (Number.isFinite(number)) return number;
      }
    }
    return undefined;
  };
  const result: ReturnType<typeof parseSoilTestValues> = {};
  const readings: Array<[keyof typeof result, number | undefined]> = [
    ['ph', value([/\bph\s*[:=]?\s*(\d+(?:\.\d+)?)/i])],
    ['ec', value([/(?:electrical\s+conductivity|\bec\b)\s*[:=]?\s*(\d+(?:\.\d+)?)/i])],
    ['organicCarbonPct', value([/(?:organic\s+carbon|oc)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*%?/i])],
    ['n', value([/(?:\bnitrogen\b|\bN\b)\s*[:=]?\s*(\d+(?:\.\d+)?)/i])],
    ['p2o5', value([/(?:phosphorus|phosphate|\bP\b)\s*(?:\(\s*P2?O5\s*\))?\s*[:=]?\s*(\d+(?:\.\d+)?)/i])],
    ['k2o', value([/(?:potassium|potash|\bK\b)\s*(?:\(\s*K2?O\s*\))?\s*[:=]?\s*(\d+(?:\.\d+)?)/i])],
    ['sulphur', value([/(?:sulphur|sulfur|\bS\b)\s*[:=]?\s*(\d+(?:\.\d+)?)/i])],
    ['zinc', value([/(?:zinc|\bZn\b)\s*[:=]?\s*(\d+(?:\.\d+)?)/i])],
    ['boron', value([/(?:boron|\bB\b)\s*[:=]?\s*(\d+(?:\.\d+)?)/i])],
    ['iron', value([/(?:iron|\bFe\b)\s*[:=]?\s*(\d+(?:\.\d+)?)/i])],
    ['manganese', value([/(?:manganese|\bMn\b)\s*[:=]?\s*(\d+(?:\.\d+)?)/i])],
    ['copper', value([/(?:copper|\bCu\b)\s*[:=]?\s*(\d+(?:\.\d+)?)/i])],
  ];
  for (const [name, reading] of readings) {
    if (reading !== undefined) result[name] = reading;
  }
  return result;
}

function answerFromSoilTest(question: string, t: TranslateFn): RuleAnswer {
  const values = parseSoilTestValues(question);
  const line = (key: TranslationKey, vars?: Record<string, string | number>): string => t(key, vars);
  const nutrients = (['n', 'p2o5', 'k2o'] as const)
    .filter((nutrient) => values[nutrient] !== undefined)
    .map((nutrient) => `${nutrient.toUpperCase()}: ${values[nutrient]} (${classifyNutrient(values[nutrient]!, nutrient)})`);
  const low = (['n', 'p2o5', 'k2o'] as const)
    .filter((nutrient) => values[nutrient] !== undefined && classifyNutrient(values[nutrient]!, nutrient) === 'Low')
    .map((nutrient) => nutrient.toUpperCase());
  const high = (['n', 'p2o5', 'k2o'] as const)
    .filter((nutrient) => values[nutrient] !== undefined && classifyNutrient(values[nutrient]!, nutrient) === 'High')
    .map((nutrient) => nutrient.toUpperCase());

  const secondary = [
    values.ec === undefined ? undefined : `EC: ${values.ec} dS/m`,
    values.sulphur === undefined ? undefined : `S: ${values.sulphur} kg/ha`,
    values.zinc === undefined ? undefined : `Zn: ${values.zinc} mg/kg`,
    values.boron === undefined ? undefined : `B: ${values.boron} mg/kg`,
    values.iron === undefined ? undefined : `Fe: ${values.iron} mg/kg`,
    values.manganese === undefined ? undefined : `Mn: ${values.manganese} mg/kg`,
    values.copper === undefined ? undefined : `Cu: ${values.copper} mg/kg`,
  ].filter((reading): reading is string => reading !== undefined);

  if (nutrients.length === 0 && secondary.length === 0 && values.ph === undefined && values.organicCarbonPct === undefined) {
    return { intent: 'fertility', answer: line('assistant.rule.testPrompt') };
  }
  return {
    intent: 'fertility',
    answer: sentences(
      line('assistant.rule.testInterpreted', {
        ph: values.ph?.toFixed(1) ?? '—',
        oc: values.organicCarbonPct?.toFixed(1) ?? '—',
        values: [...nutrients, ...secondary].length > 0
          ? [...nutrients, ...secondary].join(', ')
          : 'no nutrient values',
      }),
      low.length > 0 ? line('assistant.rule.testLow', { nutrients: low.join(', ') }) : line('assistant.rule.testNoLow'),
      high.length > 0 ? line('assistant.rule.testHigh', { nutrients: high.join(', ') }) : undefined,
      line('assistant.rule.testNextSteps'),
    ),
  };
}

const TODAY_TERMS = [
  'what should i do today',
  'what do i do today',
  'today advice',
  'today plan',
  'aaj kya karu',
  'आज क्या कर',
  'আজ কী কর',
  'আজি কি কৰ',
  'آج کیا کروں',
] as const;

const AMOUNT_TERMS = [
  'how much water',
  'how much',
  'quantity',
  'amount',
  'litre',
  'liter',
  'how many litre',
  'depth',
  'mm of water',
  'kitna pani',
  'kitna paani',
  'pani kitna',
  'paani kitna',
  'kitne litre',
  'कितना पानी',
  'कितनी सिंचाई',
  'कितने लीटर',
  'मात्रा',
  'কত জল',
  'কত পানি',
  'কত লিটার',
  'পরিমাণ',
  'কিমান পানী',
  'কিমান লিটাৰ',
  'کتنا پانی',
  'کتنے لیٹر',
  'مقدار',
] as const;

const TIMING_TERMS = [
  'what time',
  'when should',
  'when to',
  'when do i',
  'best time',
  'how long',
  'run time',
  'duration',
  'minutes',
  'morning or evening',
  'kab pani',
  'kab paani',
  'kab dena',
  'kitni der',
  'kitne baje',
  'samay',
  'कब पानी',
  'कब दें',
  'कब सिंचाई',
  'कितनी देर',
  'कितने बजे',
  'समय',
  'কখন জল',
  'কখন পানি',
  'কত সময়',
  'কত ক্ষণ',
  'সময়',
  'কেতিয়া পানী',
  'কিমান সময়',
  'کب پانی',
  'کتنی دیر',
  'کتنے بجے',
  'وقت',
] as const;

const WHY_TERMS = [
  'why',
  'reason',
  'explain',
  'how do you know',
  'kyu',
  'kyun',
  'kyon',
  'kaise pata',
  'क्यों',
  'क्यूँ',
  'कारण',
  'वजह',
  'कैसे पता',
  'কেন',
  'কারণ',
  'কিয়',
  'কাৰণ',
  'کیوں',
  'وجہ',
] as const;

const RAIN_TERMS = [
  'rain',
  'rainfall',
  'monsoon',
  'will it rain',
  'barish',
  'baarish',
  'varsha',
  'बारिश',
  'वर्षा',
  'बरसात',
  'বৃষ্টি',
  'বরষা',
  'বৰষুণ',
  'بارش',
  'برسات',
] as const;

/**
 * pH terms.
 *
 * WHY ' ph ' IS PADDED WITH SPACES
 * "ph" as a bare substring matches "phosphorus", "photo", "phal" and dozens of
 * ordinary words in five languages. `normalise()` pads the whole question with
 * a leading and trailing space and turns every punctuation run into a space, so
 * ' ph ' matches the standalone token and nothing else. That is the only form
 * that is safe here, and it is the form farmers actually type: "ph" is written
 * in Latin script in all five languages, including inside Devanagari and
 * Bengali sentences, because that is how it appears on a Soil Health Card.
 *
 * The native-script terms are for acidity and alkalinity, which is how the
 * question is asked when the farmer is not quoting a card.
 */
const PH_TERMS = [
  ' ph ',
  'ph level',
  'ph value',
  'soil ph',
  'acidic',
  'acidity',
  'alkaline',
  'alkalinity',
  'sour soil',
  'amliya',
  'kshariya',
  'पीएच',
  'अम्लीय',
  'अम्लता',
  'क्षारीय',
  'खट्टी मिट्टी',
  'পিএইচ',
  'অম্লীয়',
  'অম্লতা',
  'ক্ষারীয়',
  'অম্লীয়তা',
  'পি এইচ',
  'پی ایچ',
  'تیزابی',
  'تیزابیت',
  'کھاری',
] as const;

/**
 * General soil-character terms — texture, type, organic matter.
 *
 * WHY EVERY TERM HERE IS A MULTI-WORD PHRASE
 * `MOISTURE_TERMS` already owns the bare word for soil in every language
 * ('mitti', 'मिट्टी', 'জমি', 'মাটি', 'মাটিৰ', 'مٹی') because "how dry is my
 * soil" is a far commoner question than "what soil do I have". So this table
 * must never contain a bare soil word: it would swallow every moisture
 * question. Each term instead pins the shape of a question about the soil's
 * character, and `classify()` checks this table BEFORE `moisture` so the
 * specific phrase wins over the general word it contains.
 */
const SOIL_TERMS = [
  'what soil',
  'which soil',
  'soil type',
  'soil texture',
  'my soil like',
  'kind of soil',
  'soil quality',
  'organic carbon',
  'organic matter',
  'kaunsi mitti',
  'kaisi mitti',
  'mitti ka prakar',
  'कौन सी मिट्टी',
  'कैसी मिट्टी',
  'मिट्टी का प्रकार',
  'मिट्टी कैसी',
  'जैविक कार्बन',
  'কোন মাটি',
  'মাটির ধরন',
  'মাটি কেমন',
  'জৈব কার্বন',
  'কেনেকুৱা মাটি',
  'মাটিৰ প্ৰকাৰ',
  'کون سی مٹی',
  'مٹی کی قسم',
  'مٹی کیسی',
  'نامیاتی کاربن',
] as const;

const MOISTURE_TERMS = [
  'soil moisture',
  'how dry',
  'dry soil',
  'moisture',
  'wet soil',
  'depletion',
  'root zone',
  'mitti',
  'nami',
  'sukhi',
  'मिट्टी',
  'नमी',
  'सूखी',
  'सूखा',
  'জমি',
  'মাটি',
  'আর্দ্রতা',
  'শুকনো',
  'মাটিৰ',
  'مٹی',
  'نمی',
  'خشک',
] as const;

const DISEASE_TERMS = [
  'disease',
  'infection',
  'fungus',
  'blight',
  'rust',
  'spot',
  'yellow leaves',
  'leaves turning',
  'rog',
  'bimari',
  'beemari',
  'रोग',
  'बीमारी',
  'फफूंद',
  'पत्ते पीले',
  'রোগ',
  'ছত্রাক',
  'পাতা হলুদ',
  'ৰোগ',
  'بیماری',
  'روگ',
  'پتے',
] as const;

const SAVINGS_TERMS = [
  'saving',
  'saved',
  'save water',
  'bachat',
  'bachaya',
  'बचत',
  'बचाया',
  'सहेजा',
  'সাশ্রয়',
  'বাঁচিয়েছি',
  'সঞ্চয়',
  'বচত',
  'বচাই',
  'بچت',
  'بچایا',
] as const;

/**
 * Leaf-photo check terms — questions about what the last photo showed.
 *
 * Checked BEFORE `disease` (see classify): "what did the leaf photo show?"
 * contains "leaf"/"photo" but the answer must come from the photo result, not
 * the weather risk. Every term is multi-word or unambiguous on purpose — a
 * bare "photo" would swallow "take a photo of the field?" style chat.
 */
const PHOTO_TERMS = [
  'photo show',
  'photo say',
  'photo result',
  'leaf photo',
  'photo of my leaf',
  'what did the photo',
  'the photo check',
  'photo dekha',
  'photo kya',
  'photo dikha',
  'photo kiya',
  'फोटो क्या',
  'फोटो में क्या',
  'फोटो ने क्या',
  'फोटो दिखाया',
  'पत्ते की फोटो',
  'फ़ोटो क्या',
  'फ़ोटो में क्या',
  'फ़ोटो दिखाया',
  'फोटোত কী',
  'ছবিতে কী',
  'ছবিতে কি',
  'ছবিটা কী',
  'পাতার ছবি',
  'ফটোত কি',
  'ফটোখনে কি',
  'পাতৰ ফটো',
  'تصویر نے کیا',
  'تصویر میں کیا',
  'پتے کی تصویر',
] as const;

const PLAN_TERMS = [
  'tomorrow',
  'next few days',
  'this week',
  'coming days',
  'forecast plan',
  'kal',
  'agle din',
  'कल',
  'अगले दिन',
  'इस हफ्ते',
  'আগামীকাল',
  'কাল',
  'সপ্তাহ',
  'কাইলৈ',
  'کل',
  'ہفتے',
] as const;

const WEATHER_TERMS = [
  'weather',
  'temperature',
  'how hot',
  'humidity',
  'wind',
  'mausam',
  'garmi',
  'tapman',
  'मौसम',
  'तापमान',
  'गर्मी',
  'नमी हवा',
  'আবহাওয়া',
  'তাপমাত্রা',
  'বতৰ',
  'موسم',
  'درجہ حرارت',
] as const;

const GREETING_TERMS = [
  'hello',
  'hi there',
  'namaste',
  'namaskar',
  'salaam',
  'salam',
  'assalam',
  'good morning',
  'नमस्ते',
  'नमस्कार',
  'सलाम',
  'নমস্কার',
  'সালাম',
  'নমস্কাৰ',
  'سلام',
  'آداب',
] as const;

const CAPABILITY_TERMS = [
  'what can you do',
  'who are you',
  'help me',
  'what do you know',
  'kya kar sakte',
  'tum kaun',
  'क्या कर सकते',
  'तुम कौन',
  'आप कौन',
  'मदद',
  'কী করতে পার',
  'তুমি কে',
  'সাহায্য',
  'সহায়',
  'کیا کر سکتے',
  'تم کون',
  'مدد',
] as const;

/**
 * Classify a question.
 *
 * Order is the whole design here. `referral` is checked first so a boundary
 * question can never be captured by a rule that merely shares a word with it —
 * "which spray for my tomato leaf spot" contains a disease term, but answering
 * it as a disease question would mean answering it at all. `capability` and
 * `greeting` are checked last because their terms are short and common enough
 * to swallow a real question that happens to be polite.
 *
 * `ph` and `soil` sit immediately before `moisture` for the same reason: their
 * terms are specific phrases that CONTAIN the general words `moisture` owns
 * ("what soil do I have" contains "soil"; "मिट्टी का प्रकार" contains "मिट्टी").
 * Checked after `moisture` they would never fire at all.
 */
export function classify(question: string): AssistantIntent | null {
  const q = normalise(question);
  if (q.trim().length === 0) return null;

  if (hasAny(q, REFERRAL_TERMS)) return 'referral';
  if (hasAny(q, TEST_VALUE_TERMS)) return 'fertility';
  if (hasAny(q, TODAY_TERMS)) return 'today';
  if (hasAny(q, FERTILITY_TERMS)) return 'fertility';
  if (hasAny(q, SAVINGS_TERMS)) return 'savings';
  if (hasAny(q, PH_TERMS)) return 'ph';
  if (hasAny(q, SOIL_TERMS)) return 'soil';
  if (hasAny(q, MOISTURE_TERMS)) return 'moisture';
  if (hasAny(q, PHOTO_TERMS)) return 'photo';
  if (hasAny(q, DISEASE_TERMS)) return 'disease';
  if (hasAny(q, AMOUNT_TERMS)) return 'amount';
  if (hasAny(q, TIMING_TERMS)) return 'timing';
  if (hasAny(q, RAIN_TERMS)) return 'rain';
  if (hasAny(q, PLAN_TERMS)) return 'plan';
  if (hasAny(q, WEATHER_TERMS)) return 'weather';
  if (hasAny(q, WHY_TERMS)) return 'why';
  if (hasAny(q, CAPABILITY_TERMS)) return 'capability';
  if (hasAny(q, GREETING_TERMS)) return 'greeting';
  return null;
}

/**
 * Join sentence fragments into one reply.
 *
 * Blank fragments are dropped rather than joined, because a missing figure must
 * leave no trace: a reply reading "Give 12.4 mm today.  Best time ." is worse
 * than one that simply omits the timing it never had.
 */
function sentences(...parts: (string | null | undefined)[]): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' ');
}

/**
 * Answer from the device's own figures, or return null.
 *
 * Returning null is a real outcome and not a failure: it means the rules cannot
 * answer honestly, and `assistantService` should either reach for the model (if
 * online) or say plainly that it cannot answer offline. Guessing here would put
 * a number in front of a farmer that nothing in the app can reproduce.
 */
export function answerFromRules(
  question: string,
  context: AssistantContext | undefined,
  t: TranslateFn,
): RuleAnswer | null {
  const intent = classify(question);
  if (!intent) return null;

  // Boundary questions are answered without any farm data at all — the answer
  // is the same whether or not a farm is selected, and it must never wait on
  // context the farmer might not have.
  if (intent === 'referral') {
    return { intent, answer: t('assistant.rule.referral') };
  }
  if (intent === 'capability') {
    return { intent, answer: t('assistant.rule.capability') };
  }
  if (intent === 'greeting') {
    return { intent, answer: t('assistant.rule.greeting') };
  }

  const line = (key: TranslationKey, vars?: Record<string, string | number>): string =>
    t(key, vars);

  if (intent === 'fertility') {
    const supplied = parseSoilTestValues(question);
    const hasValues = Object.values(supplied).some((value) => value !== undefined);
    if (hasValues || LAB_VALUE_PATTERN.test(question) || TEST_VALUE_TERMS.some((term) => normalise(question).includes(term))) {
      return answerFromSoilTest(question, t);
    }
  }

  // A pH question is answered even with no farm at all, because the honest
  // answer does not need one (PRD §33). "What is my exact soil pH?" must never
  // reach the model on the chance that it obliges with a number, and the reply
  // that is always true — the app holds an area estimate, only a Soil Health
  // Card test gives this field's value — needs no context to be said.
  if (intent === 'ph' && !context) {
    return { intent, answer: t('assistant.rule.phUnknown') };
  }
  // Same shape for fertility: "how much fertiliser?" with no farm selected has
  // one honest, context-free answer.
  if (intent === 'fertility' && !context) {
    return { intent, answer: t('assistant.rule.fertilityUnknown') };
  }
  // And for the photo question: with no farm there is no photo either, and the
  // how-to answer (where the card is, that it works offline) is the same one.
  if (intent === 'photo' && !context) {
    return { intent, answer: t('assistant.rule.photoNone') };
  }

  if (!context) return null;

  // V2.2: which side of the crop's optimal pH band the soil sits on. Derived
  // from the numbers rather than the translated verdict string, so both the ph
  // and fertility answers below branch on the same fact — and the direction
  // line (which amendment family, never a quantity) plus the crop alternatives
  // turn "your pH is out of range" into a plan instead of a dead end.
  const phDirection =
    context.soilPh === undefined ||
    context.phOptimalMin === undefined ||
    context.phOptimalMax === undefined
      ? undefined
      : context.soilPh < context.phOptimalMin
        ? 'acidic'
        : context.soilPh > context.phOptimalMax
          ? 'alkaline'
          : undefined;
  const amendLine =
    phDirection === undefined
      ? undefined
      : line(
          phDirection === 'acidic'
            ? 'assistant.rule.phAmendAcidic'
            : 'assistant.rule.phAmendAlkaline',
        );
  // Only offered when the CURRENT crop does not suit — a suited crop makes the
  // alternatives noise, not options.
  const altsLine =
    phDirection !== undefined && context.phAltCrops && context.phAltCrops.length > 0
      ? line('assistant.rule.phAlts', { crops: context.phAltCrops.slice(0, 3).join(', ') })
      : undefined;

  switch (intent) {
    case 'today': {
      if (!context.status && context.depthMm === undefined) return null;
      const status = context.status ?? line('assistant.briefing.noRecommendation');
      return {
        intent,
        answer: sentences(
          line('assistant.rule.today', { status }),
          context.depthMm === undefined || context.volumeLiters === undefined
            ? undefined
            : context.depthMm <= 0
              ? line('assistant.rule.amountNone')
              : line('assistant.rule.amount', {
                  mm: context.depthMm.toFixed(1),
                  litres: Math.round(context.volumeLiters).toLocaleString('en-US'),
                }),
          context.windowStart && context.windowEnd
            ? line('assistant.rule.timing', { start: context.windowStart, end: context.windowEnd })
            : undefined,
          context.durationMinutes === undefined || context.durationMinutes <= 0
            ? undefined
            : line('assistant.rule.amountRun', { minutes: Math.round(context.durationMinutes) }),
          context.explanation,
        ),
      };
    }

    case 'ph': {
      // A farm created offline, or before the soil profile existed, has no
      // figure. Both this and the no-farm case above are reachable, and both
      // say the same thing rather than falling through to the model.
      if (context.soilPh === undefined) {
        return { intent, answer: line('assistant.rule.phUnknown') };
      }
      // The provenance sentence is not optional and not conditional on the
      // farmer asking: the reading is meaningless, and dangerous, without the
      // statement of what produced it (§28 Guardrail 1).
      const measured = context.soilPhProvenance === 'MEASURED';
      return {
        intent,
        answer: sentences(
          line('assistant.rule.ph', { ph: context.soilPh.toFixed(1) }),
          line(measured ? 'assistant.rule.phMeasured' : 'assistant.rule.phEstimate'),
          context.phSuitability === undefined ||
          context.phOptimalMin === undefined ||
          context.phOptimalMax === undefined
            ? undefined
            : line('assistant.rule.phSuitability', {
                verdict: context.phSuitability,
                min: context.phOptimalMin.toFixed(1),
                max: context.phOptimalMax.toFixed(1),
              }),
          // V2.2: out-of-range pH gets the direction, the alternatives, and
          // the amount-needs-a-test caveat IN the direction line — the plain
          // phAdvice sentence below would only repeat the same KVK referral.
          amendLine,
          altsLine,
          amendLine === undefined ? line('assistant.rule.phAdvice') : undefined,
        ),
      };
    }

    case 'soil': {
      if (!context.soilType) return null;
      return {
        intent,
        answer: sentences(
          line('assistant.rule.soilType', { soil: context.soilType }),
          context.organicCarbonPct === undefined
            ? undefined
            : line('assistant.rule.soilCarbon', { oc: context.organicCarbonPct.toFixed(1) }),
          context.organicCarbonPct === undefined
            ? undefined
            : line('assistant.rule.soilMapCaveat'),
        ),
      };
    }

    // "How much fertiliser/lime/urea should I give?" The app cannot name a
    // rate, but it is not empty-handed either: the farmer's own Soil Health
    // Card reading (if entered), pH, organic carbon and any fertility issue
    // the engine already flagged are all estimates worth stating before the
    // caution, not instead of it (docs: answer with what the app knows first,
    // then say what needs a soil test).
    case 'fertility': {
      // The farmer's own reading outranks every map estimate below it.
      const nutrientReading =
        context.fertilityN === undefined &&
        context.fertilityP2O5 === undefined &&
        context.fertilityK2O === undefined
          ? undefined
          : line('assistant.rule.fertilityReading', {
              n: context.fertilityN?.toFixed(0) ?? '—',
              p: context.fertilityP2O5?.toFixed(0) ?? '—',
              k: context.fertilityK2O?.toFixed(0) ?? '—',
              band:
                context.fertilityBand === undefined
                  ? '—'
                  : t(`fert.fertility.${context.fertilityBand as 'Low' | 'Medium' | 'High'}`),
            });
      const phEstimate =
        context.soilPh === undefined
          ? undefined
          : sentences(
              line('assistant.rule.ph', { ph: context.soilPh.toFixed(1) }),
              line(
                context.soilPhProvenance === 'MEASURED'
                  ? 'assistant.rule.phMeasured'
                  : 'assistant.rule.phEstimate',
              ),
              context.phSuitability === undefined ||
              context.phOptimalMin === undefined ||
              context.phOptimalMax === undefined
                ? undefined
                : line('assistant.rule.phSuitability', {
                    verdict: context.phSuitability,
                    min: context.phOptimalMin.toFixed(1),
                    max: context.phOptimalMax.toFixed(1),
                  }),
            );
      const carbonEstimate =
        context.organicCarbonPct === undefined
          ? undefined
          : sentences(
              line('assistant.rule.soilCarbon', { oc: context.organicCarbonPct.toFixed(1) }),
              line('assistant.rule.soilMapCaveat'),
            );
      // Any fertility-flavoured issue the engine already surfaced on the
      // dashboard — reusing it here rather than composing a new sentence keeps
      // this answer identical to what the farmer can already see on screen.
      const flaggedIssue = context.topIssues?.find((issue) =>
        /pH|carbon|nutrient|fertil/i.test(issue),
      );

      // The improvement the farmer asked for, assembled from everything the
      // app resolved: direction + alternatives when pH mismatches, and the
      // official State schedule when the farmer's Fertilizer-page selection
      // resolved one. The booklet manure/timing lines stay on that page — the
      // raw English transcription does not belong mid-sentence in a translated
      // reply (the model path quotes them in full, with the language rule).
      const schedule =
        context.fertScheduleNpk !== undefined &&
        context.fertScheduleVariety !== undefined &&
        context.fertScheduleZone !== undefined &&
        context.fertScheduleBand !== undefined
          ? sentences(
              line('assistant.rule.fertScheduleQuote', {
                variety: context.fertScheduleVariety,
                zone: context.fertScheduleZone,
                band: context.fertScheduleBand,
                npk: context.fertScheduleNpk,
              }),
              line('assistant.rule.fertScheduleMore'),
            )
          : undefined;

      const hasEstimate =
        nutrientReading !== undefined ||
        phEstimate !== undefined ||
        carbonEstimate !== undefined ||
        flaggedIssue !== undefined ||
        schedule !== undefined;
      return {
        intent,
        answer: sentences(
          hasEstimate ? undefined : line('assistant.rule.fertilityNoEstimate'),
          flaggedIssue,
          nutrientReading,
          phEstimate,
          amendLine,
          altsLine,
          carbonEstimate,
          schedule,
          // With a schedule quoted, the closing line confirms rather than
          // refuses; without one the no-quantity rule still gets said plainly.
          schedule !== undefined
            ? line('assistant.rule.fertScheduleNote')
            : line('assistant.rule.fertilityAdvice'),
        ),
      };
    }

    case 'amount': {
      if (context.depthMm === undefined || context.volumeLiters === undefined) return null;
      // Nothing to give today is an answer, not an absence — say so plainly
      // rather than reporting "0 mm", which reads like a broken figure.
      if (context.depthMm <= 0) {
        return { intent, answer: sentences(line('assistant.rule.amountNone'), context.explanation) };
      }
      return {
        intent,
        answer: sentences(
          line('assistant.rule.amount', {
            mm: context.depthMm.toFixed(1),
            litres: Math.round(context.volumeLiters).toLocaleString('en-US'),
          }),
          context.durationMinutes === undefined
            ? undefined
            : line('assistant.rule.amountRun', { minutes: Math.round(context.durationMinutes) }),
        ),
      };
    }

    case 'timing': {
      if (!context.windowStart || !context.windowEnd) {
        // No window means no irrigation was advised today. Answering "no time"
        // without saying why would read like a fault in the app.
        if (context.status) {
          return { intent, answer: sentences(line('assistant.rule.timingNone'), context.explanation) };
        }
        return null;
      }
      return {
        intent,
        answer: sentences(
          line('assistant.rule.timing', { start: context.windowStart, end: context.windowEnd }),
          context.durationMinutes === undefined
            ? undefined
            : line('assistant.rule.amountRun', { minutes: Math.round(context.durationMinutes) }),
          line('assistant.rule.timingWhy'),
        ),
      };
    }

    case 'why': {
      if (!context.explanation) return null;
      return {
        intent,
        answer: sentences(
          context.explanation,
          context.confidence ? line('assistant.rule.confidence', { level: context.confidence }) : undefined,
        ),
      };
    }

    case 'rain': {
      if (context.rainfallForecastMm === undefined) return null;
      const mm = context.rainfallForecastMm;
      return {
        intent,
        answer: sentences(
          mm < 0.5
            ? line('assistant.rule.rainNone')
            : line('assistant.rule.rain', { mm: mm.toFixed(1) }),
          context.status ? line('assistant.rule.rainAdvice', { status: context.status }) : undefined,
        ),
      };
    }

    case 'moisture': {
      if (context.depletionMm === undefined || context.totalAvailableMm === undefined) return null;
      const stressed =
        context.readilyAvailableMm !== undefined && context.depletionMm >= context.readilyAvailableMm;
      return {
        intent,
        answer: sentences(
          line('assistant.rule.moisture', {
            short: context.depletionMm.toFixed(1),
            capacity: context.totalAvailableMm.toFixed(1),
          }),
          context.readilyAvailableMm === undefined
            ? undefined
            : line(stressed ? 'assistant.rule.moistureStress' : 'assistant.rule.moistureOk', {
                threshold: context.readilyAvailableMm.toFixed(1),
              }),
        ),
      };
    }

    case 'photo': {
      // No photo checked yet — answerable offline with the how-to, which is
      // more useful than a null that routes to the model to guess.
      if (!context?.photoVerdict) {
        return { intent, answer: line('assistant.rule.photoNone') };
      }
      return {
        intent,
        answer: sentences(
          context.photoVerdict,
          // Unconditional: the photo result is a resemblance, and a farmer
          // acting on it must hear that in the same breath (docs/12 §Product
          // Boundaries, docs/14).
          line('assistant.rule.photoAnswer'),
          line('assistant.rule.photoNext'),
        ),
      };
    }

    case 'disease': {
      if (!context.diseaseRiskLevel) return null;
      // The wording here carries the whole boundary: weather favours a disease;
      // the app has not seen the crop and does not claim it is present. The
      // scouting lines that follow turn that risk into an action the farmer can
      // take TODAY (look, photograph, arrive prepared) — a dead-end "ask your
      // KVK" answers nothing, and naming a spray remains out of bounds
      // (docs/10 §10.2).
      return {
        intent,
        answer: sentences(
          context.diseaseName
            ? line('assistant.rule.disease', {
                level: context.diseaseRiskLevel,
                disease: context.diseaseName,
              })
            : line('assistant.rule.diseaseNone'),
          line('assistant.rule.diseaseCaveat'),
          context.diseaseName === undefined || context.diseaseWhere === undefined
            ? undefined
            : line('assistant.rule.diseaseScout', { where: context.diseaseWhere }),
          context.diseaseName === undefined || context.diseaseWhat === undefined
            ? undefined
            : line('assistant.rule.diseaseSigns', { what: context.diseaseWhat }),
          context.diseaseName === undefined ? undefined : line('assistant.rule.diseasePhoto'),
          context.diseaseName === undefined ? undefined : line('assistant.rule.diseaseNext'),
        ),
      };
    }

    case 'savings': {
      if (context.savedTodayLiters === undefined && context.savedLifetimeLiters === undefined) {
        return null;
      }
      return {
        intent,
        answer: sentences(
          context.savedTodayLiters === undefined
            ? undefined
            : line('assistant.rule.savedToday', {
                litres: Math.round(context.savedTodayLiters).toLocaleString('en-US'),
              }),
          context.savedLifetimeLiters === undefined
            ? undefined
            : line('assistant.rule.savedTotal', {
                litres: Math.round(context.savedLifetimeLiters).toLocaleString('en-US'),
              }),
          line('assistant.rule.savedBasis'),
        ),
      };
    }

    case 'plan': {
      if (!context.tomorrowStatus) return null;
      return {
        intent,
        answer: sentences(
          line('assistant.rule.plan', { status: context.tomorrowStatus }),
          line('assistant.rule.planCaveat'),
        ),
      };
    }

    case 'weather': {
      if (context.temperatureC === undefined && context.humidityPercent === undefined) return null;
      return {
        intent,
        answer: sentences(
          context.temperatureC === undefined
            ? undefined
            : line('assistant.rule.weatherTemp', { temp: Math.round(context.temperatureC) }),
          context.humidityPercent === undefined
            ? undefined
            : line('assistant.rule.weatherHumidity', {
                humidity: Math.round(context.humidityPercent),
              }),
          context.rainfallForecastMm === undefined
            ? undefined
            : line('assistant.rule.weatherRain', { mm: context.rainfallForecastMm.toFixed(1) }),
        ),
      };
    }

    default:
      return null;
  }
}


