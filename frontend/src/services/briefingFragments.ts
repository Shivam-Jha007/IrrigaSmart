import type { CropName, Language, Season } from '../types';
import { cropLabelKey, localeFor, type TranslateFn, type TranslationKey } from '../i18n';
import type { AssistantContext } from './assistantContext';
import { visionCoversCrop } from './diseaseVisionMap';
import { getSeasonalGuidance } from './regionalKnowledge';

/**
 * Briefing fragments — the app's own figures, as finished sentences (V2.3).
 *
 * THE SINGLE PLACE A NUMBER BECOMES WORDS
 * Every sentence this module returns is assembled from translation keys whose
 * wording predates the chatbot (they were the offline rules' answers), the
 * same rounding and the same guards, so the spoken briefing and a card's
 * speaker button can never quote two different versions of "how much water
 * today" — and neither can disagree with the dashboard, because every figure
 * comes from the same AssistantContext the cards render. One wording, one
 * source, everywhere.
 *
 * NOTHING IS COMPUTED HERE
 * Every figure arrives already computed by the engine, and the only
 * arithmetic is display formatting (docs/07_Engineering_Rules.md). A fragment
 * is either the engine's own sentence or it does not exist — there is no
 * branch that can invent a number, which is the whole reason this module
 * exists instead of an LLM prompt (the chatbot it replaced drifted exactly
 * here).
 *
 * ABSENT IS ABSENT
 * Each builder returns null (or an empty list) when its data is missing: a
 * briefing that says "give  mm" or "0 mm" from an absent figure is worse
 * than one that omits the sentence.
 *
 * NOT EVERY SENTENCE THE DASHBOARD KNOWS
 * The briefing is a summary of the dashboard, not a substitute for it. The
 * long caveat sentences (the fertilizer quantity rules, the full disease
 * scouting script) stay on their cards; a fragment quotes the verdict line
 * the farmer can see one screen away.
 */

/** A single line of the briefing: one id for tests and React keys, one finished sentence-group. */
export interface BriefingFragment {
  id:
    | 'heading'
    | 'season'
    | 'amount'
    | 'timing'
    | 'runTime'
    | 'why'
    | 'moisture'
    | 'ph'
    | 'weather'
    | 'disease'
    | 'photo'
    | 'issue'
    | 'savings'
    | 'plan'
    | 'schedule'
    | 'tests'
    | 'photoTip';
  text: string;
}

/**
 * "Today on {farm}: {crop} today's advice is {status}."
 *
 * Same key, same fallbacks and same guards the briefing card's lead line
 * uses — the first line a farmer READS on the card and the first line they
 * HEAR from the speaker are the same sentence, because a farmer who does
 * both should recognise both.
 */
export function headingSentence(context: AssistantContext | undefined, t: TranslateFn): string | null {
  if (!context) return null;
  if (!context.farmName && !context.status && context.depthMm === undefined && !context.cropName) {
    return null;
  }
  const status = context.status ?? t('assistant.briefing.noRecommendation');
  // The crop carries the leading space and the template carries none after the
  // colon — the two spacings are one decision, so a farm with no crop named
  // cannot produce a doubled gap where the crop would have been.
  const crop = context.cropName ? ` ${context.cropName}.` : '';
  return t('assistant.briefing.today', {
    farm: context.farmName ?? t('nav.today'),
    crop,
    status,
  });
}

/** "Give {mm} mm today — about {litres} litres." / "No irrigation is needed today." */
export function amountSentence(context: AssistantContext | undefined, t: TranslateFn): string | null {
  if (!context || context.depthMm === undefined || context.volumeLiters === undefined) return null;
  if (context.depthMm <= 0) return t('assistant.rule.amountNone');
  return t('assistant.rule.amount', {
    mm: context.depthMm.toFixed(1),
    litres: Math.round(context.volumeLiters).toLocaleString('en-US'),
  });
}

/** "Irrigate between {start} and {end}." */
export function timingSentence(context: AssistantContext | undefined, t: TranslateFn): string | null {
  if (!context || !context.windowStart || !context.windowEnd) return null;
  return t('assistant.rule.timing', { start: context.windowStart, end: context.windowEnd });
}

/** "That is about {minutes} minutes of running time." */
export function runTimeSentence(context: AssistantContext | undefined, t: TranslateFn): string | null {
  if (!context || context.durationMinutes === undefined || context.durationMinutes <= 0) return null;
  return t('assistant.rule.amountRun', { minutes: Math.round(context.durationMinutes) });
}

/** The engine's own explanation, verbatim — the "why" behind the advice. */
export function whySentence(context: AssistantContext | undefined): string | null {
  return context?.explanation ?? null;
}

/** Root-zone depletion, plus the stress verdict when the threshold is known. */
export function moistureSentences(context: AssistantContext | undefined, t: TranslateFn): string[] {
  if (!context || context.depletionMm === undefined || context.totalAvailableMm === undefined) {
    return [];
  }
  const moisture = t('assistant.rule.moisture', {
    short: context.depletionMm.toFixed(1),
    capacity: context.totalAvailableMm.toFixed(1),
  });
  const days = daysOfWaterLeftSentence(context, t);
  if (context.readilyAvailableMm === undefined) return days ? [moisture, days] : [moisture];
  const stressed = context.depletionMm >= context.readilyAvailableMm;
  const verdict = t(stressed ? 'assistant.rule.moistureStress' : 'assistant.rule.moistureOk', {
    threshold: context.readilyAvailableMm.toFixed(1),
  });
  return days ? [moisture, verdict, days] : [moisture, verdict];
}

/**
 * "At today's demand, the soil still holds about N more days of water."
 *
 * THE GAUGE'S MISSING SENTENCE (V2.3): farmers reason in days, not percent of
 * TAW, and the days figure also defuses the gauge's misleading case — a high
 * percentage sitting just under the stress marker. Branches: a week or more
 * is "more than a week" (precision past that advises nothing), rounding to
 * zero says the water is used up, one day gets its own grammar, and anything
 * else is "about {days} days". Shared by the briefing and the moisture card,
 * so the spoken and shown sentences are one string.
 */
export function daysOfWaterLeftSentence(
  context: AssistantContext | undefined,
  t: TranslateFn,
): string | null {
  if (!context || context.daysOfWaterLeft === undefined) return null;
  const days = context.daysOfWaterLeft;
  if (days >= 7) return t('moisture.daysLeftWeek');
  const rounded = Math.max(0, Math.round(days));
  if (rounded === 0) return t('moisture.daysLeftNone');
  if (rounded === 1) return t('moisture.daysLeftOne');
  return t('moisture.daysLeft', { days: rounded });
}

/** Current temperature, humidity and today's forecast rain, whichever exist. */
export function weatherSentences(context: AssistantContext | undefined, t: TranslateFn): string[] {
  if (!context) return [];
  const parts: string[] = [];
  if (context.temperatureC !== undefined) {
    parts.push(t('assistant.rule.weatherTemp', { temp: Math.round(context.temperatureC) }));
  }
  if (context.humidityPercent !== undefined) {
    parts.push(t('assistant.rule.weatherHumidity', { humidity: Math.round(context.humidityPercent) }));
  }
  if (context.rainfallForecastMm !== undefined) {
    parts.push(t('assistant.rule.weatherRain', { mm: context.rainfallForecastMm.toFixed(1) }));
  }
  return parts;
}

/** "The weather favours {disease} today ({level}) — glance at {where}." */
export function diseaseSentence(context: AssistantContext | undefined, t: TranslateFn): string | null {
  if (
    !context ||
    context.diseaseName === undefined ||
    context.diseaseRiskLevel === undefined ||
    context.diseaseWhere === undefined
  ) {
    return null;
  }
  return t('assistant.rule.todayDisease', {
    disease: context.diseaseName,
    level: context.diseaseRiskLevel,
    where: context.diseaseWhere,
  });
}

/** "Also worth a look: {issue}." — the first issue the dashboard's plan card shows. */
export function issueSentence(context: AssistantContext | undefined, t: TranslateFn): string | null {
  const issue = context?.topIssues?.[0];
  return issue === undefined ? null : t('assistant.rule.todayIssue', { issue });
}

/** "You saved about {litres} litres today." */
export function savedTodaySentence(context: AssistantContext | undefined, t: TranslateFn): string | null {
  if (!context || context.savedTodayLiters === undefined) return null;
  return t('assistant.rule.savedToday', {
    litres: Math.round(context.savedTodayLiters).toLocaleString('en-US'),
  });
}

/** Tomorrow's plan and its forecast caveat — the same pair the plan intent answers with. */
export function planSentences(context: AssistantContext | undefined, t: TranslateFn): string[] {
  if (!context?.tomorrowStatus) return [];
  return [
    t('assistant.rule.plan', { status: context.tomorrowStatus }),
    t('assistant.rule.planCaveat'),
  ];
}

/**
 * The fertilizer pointer (V2.3). When a schedule resolved for this crop, the
 * farmer's own saved selection is named; otherwise the Fertilizer page itself
 * is pointed at — the one tab whose content the briefing cannot quote
 * (booklet tables, not engine figures) but every farmer should know exists.
 *
 * GATED ON A FARM, like every pointer: an empty context has no farm to point
 * around.
 */
export function scheduleSentence(context: AssistantContext | undefined, t: TranslateFn): string | null {
  if (!context?.farmName) return null;
  if (context.fertScheduleNpk !== undefined) return t('assistant.rule.todaySchedule');
  return t('assistant.rule.todayFertTip');
}

/**
 * The soil & water test pointer (V2.3). A farmer who HAS entered lab figures
 * is told they are in today's advice (they are — pH provenance, ECe/ECw
 * leaching, fertility band all read them); a farmer who has none is invited
 * to add them, because the advice gets sharper with the field's own numbers.
 */
export function testsSentence(context: AssistantContext | undefined, t: TranslateFn): string | null {
  if (!context?.farmName) return null;
  const hasTests =
    (context.soilPhProvenance === 'USER_PROVIDED' || context.soilPhProvenance === 'MEASURED') ||
    context.fertilityN !== undefined ||
    context.soilEce !== undefined ||
    context.waterEcw !== undefined;
  return t(hasTests ? 'assistant.rule.todayTestsHave' : 'assistant.rule.todayTestsNone');
}

/**
 * The leaf-photo pointer (V2.3), offered only for a crop the photo check is
 * enabled for — Rice, per VISION_ENABLED_CROPS — and only when there is no
 * photo verdict to quote instead: a farmer who just checked a leaf has
 * already used the feature, and their result is spoken as the photo
 * fragment. A wheat farmer hears nothing about the feature, exactly as the
 * card shows them nothing.
 */
export function photoTipSentence(
  context: AssistantContext | undefined,
  t: TranslateFn,
  crop?: CropName,
): string | null {
  if (!context?.farmName) return null;
  if (crop === undefined || !visionCoversCrop(crop)) return null;
  return context.photoVerdict === undefined ? t('assistant.rule.todayPhotoTip') : null;
}

function joinSentences(sentences: readonly (string | null | undefined)[]): string | null {
  const text = sentences.filter((s): s is string => Boolean(s && s.trim())).join(' ');
  return text.length > 0 ? text : null;
}

/**
 * Locale-aware short month name (e.g. "Jun" / "जून" / "জুন").
 *
 * Exported because the SeasonalGuidance card renders the same month range its
 * spoken line carries — one formatting function means the sowing window a
 * farmer READS and the one they HEAR cannot be two different strings.
 */
export function monthNameFor(month: number, language: Language): string {
  return new Date(2000, month - 1, 1).toLocaleDateString(localeFor(language), { month: 'short' });
}

/**
 * The pH card's spoken lines: the reading, its provenance, and the verdict.
 *
 * THE PROVENANCE SENTENCE IS NOT OPTIONAL (PRD §7, §28 Guardrail 1). The pH
 * figure is an area estimate from a 250 m soil map unless provenance says
 * MEASURED, and a spoken number without that qualifier is a farmer liming a
 * field on their neighbour's soil data. The sentences here are the same keys
 * the offline ph intent answers with — one wording, everywhere.
 */
export function phSentences(context: AssistantContext | undefined, t: TranslateFn): string[] {
  if (!context || context.soilPh === undefined) return [];
  const sentences = [t('assistant.rule.ph', { ph: context.soilPh.toFixed(1) })];
  // A farmer-supplied pH (the farm form's Soil test box, or the Soil Health
  // Card's own pH line) is a test of this field — the map-estimate caveat
  // would be false for it. Anything else is the 250 m regional estimate and
  // says so.
  const isFarmerReading = context.soilPhProvenance === 'MEASURED' || context.soilPhProvenance === 'USER_PROVIDED';
  sentences.push(
    t(isFarmerReading ? 'assistant.rule.phMeasured' : 'assistant.rule.phEstimate'),
  );
  if (
    context.phSuitability !== undefined &&
    context.phOptimalMin !== undefined &&
    context.phOptimalMax !== undefined
  ) {
    sentences.push(
      t('assistant.rule.phSuitability', {
        verdict: context.phSuitability,
        min: context.phOptimalMin.toFixed(1),
        max: context.phOptimalMax.toFixed(1),
      }),
    );
  }
  return sentences;
}

/**
 * The season card's spoken lines: in/out of the crop's main season, the
 * sowing/harvest calendar, and the seasonal irrigation guideline.
 *
 * Derives from the same bundled `getSeasonalGuidance` the card renders —
 * the spoken season advice cannot disagree with the shown one. `now` is
 * injectable so tests can pin a season; the app passes nothing and gets
 * today, exactly like the card.
 */
export function seasonalSentences(
  crop: CropName,
  language: Language,
  t: TranslateFn,
  now?: string,
): string[] {
  const guidance = getSeasonalGuidance(crop, now ?? new Date().toISOString());
  const cropLabel = t(cropLabelKey(crop));
  const seasonLine = guidance.inMainSeason
    ? t('season.inSeason', { crop: cropLabel })
    : t('season.offSeason', {
        crop: cropLabel,
        season: t(seasonKey(guidance.cropMainSeason)),
      });
  const sow = `${monthNameFor(guidance.sowingMonths[0]!, language)}–${monthNameFor(
    guidance.sowingMonths[1]!,
    language,
  )}`;
  const harvest = `${monthNameFor(guidance.harvestMonths[0]!, language)}–${monthNameFor(
    guidance.harvestMonths[1]!,
    language,
  )}`;
  return [
    seasonLine,
    t('season.calendar', { sow, harvest }),
    t(`season.guide.${guidance.season}` as TranslationKey),
  ];
}

/** Season label key — same pattern the SeasonalGuidance card renders with. */
function seasonKey(season: Season): TranslationKey {
  return `season.${season}`;
}

/** What the season fragment needs — the briefing's context carries the crop's
 * translated label, but the season lookup needs the crop enum itself. */
export interface SeasonInput {
  crop: CropName;
  language: Language;
  /** Injectable date for tests; defaults to now, exactly like the card. */
  now?: string;
}

/**
 * The full spoken/readable briefing: the dashboard's own verdicts, in the
 * order a radio bulletin would say them — the scene (farm, season), what to
 * do, how much, when, why, then what to watch (soil moisture, pH, weather,
 * disease), then what is next (issues, savings, tomorrow), and finally the
 * standing pointers (fertilizer, soil/water tests, leaf photo) so a farmer
 * who only ever listens to the briefing still knows the app's features.
 *
 * A context with no usable figures produces no fragments, and the card that
 * renders this renders nothing — a briefing that says only "no data" would be
 * a card-shaped apology, and the dashboard already has empty states.
 */
export function buildBriefingFragments(
  context: AssistantContext | undefined,
  t: TranslateFn,
  season?: SeasonInput,
): BriefingFragment[] {
  if (!context) return [];
  const fragments: BriefingFragment[] = [];
  const push = (id: BriefingFragment['id'], ...sentences: readonly (string | null | undefined)[]): void => {
    const text = joinSentences(sentences);
    if (text) fragments.push({ id, text });
  };

  push('heading', headingSentence(context, t));
  // The scene-setter: whether this crop is even in its season frames every
  // line that follows, so it opens the bulletin rather than closing it.
  if (season) push('season', ...seasonalSentences(season.crop, season.language, t, season.now));
  push('amount', amountSentence(context, t));
  push('timing', timingSentence(context, t));
  push('runTime', runTimeSentence(context, t));
  push('why', whySentence(context));
  push('moisture', ...moistureSentences(context, t));
  push('ph', ...phSentences(context, t));
  push('weather', ...weatherSentences(context, t));
  push('disease', diseaseSentence(context, t));
  // Pre-worded by `summarizePhotoCheck` — quoted, never re-worded.
  push('photo', context.photoVerdict);
  push('issue', issueSentence(context, t));
  push('savings', savedTodaySentence(context, t));
  push('plan', ...planSentences(context, t));
  // The closing pointers (V2.3): fertilizer, soil/water tests, leaf photo —
  // the features the briefing cannot quote as figures but every farmer
  // should hear exist. Last, because they are "what you could do next",
  // not news about today.
  push('schedule', scheduleSentence(context, t));
  push('tests', testsSentence(context, t));
  // The photo tip needs the crop enum — the season input carries it. Without
  // a crop (no farm selected) there is no farm, and every pointer above has
  // already stayed silent.
  push('photoTip', photoTipSentence(context, t, season?.crop));

  return fragments;
}

/** The irrigation card's spoken line: amount, timing and running time together. */
export function irrigationSpeech(context: AssistantContext | undefined, t: TranslateFn): string | null {
  if (!context) return null;
  return joinSentences([
    amountSentence(context, t),
    timingSentence(context, t),
    runTimeSentence(context, t),
  ]);
}

/** The soil-moisture card's spoken line. */
export function moistureSpeech(context: AssistantContext | undefined, t: TranslateFn): string | null {
  return joinSentences(moistureSentences(context, t));
}

/** The weather card's spoken line. */
export function weatherSpeech(context: AssistantContext | undefined, t: TranslateFn): string | null {
  return joinSentences(weatherSentences(context, t));
}

/** The disease-watch card's spoken line. */
export function diseaseSpeech(context: AssistantContext | undefined, t: TranslateFn): string | null {
  return diseaseSentence(context, t);
}

/** The pH suitability card's spoken line. */
export function phSpeech(context: AssistantContext | undefined, t: TranslateFn): string | null {
  return joinSentences(phSentences(context, t));
}

/** The season card's spoken line. */
export function seasonalSpeech(
  crop: CropName,
  language: Language,
  t: TranslateFn,
  now?: string,
): string | null {
  return joinSentences(seasonalSentences(crop, language, t, now));
}
