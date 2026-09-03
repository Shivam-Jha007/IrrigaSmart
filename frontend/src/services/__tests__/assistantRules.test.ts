import { describe, expect, it } from 'vitest';
import { translate, type TranslateFn } from '../../i18n';
import {
  answerFromRules,
  classify,
  normalise,
  type AssistantContext,
} from '../assistantRules';

/**
 * Offline assistant rules (item 17).
 *
 * These are assertions, not snapshots. The module answers from figures the
 * decision engine already produced, so every assertion pins a number the engine
 * itself published — the test suite for the engine owns the arithmetic, this
 * suite owns the wording and the routing.
 *
 * The two claims that matter most, because a farmer cannot see the code:
 *   1. A boundary question (spray / fertiliser / price) is answered as a
 *      referral BEFORE any other intent can capture it, even when it contains a
 *      disease word ("which spray for my tomato leaf spot" is referral, not
 *      disease) — and it is answered offline, with no farm data at all.
 *   2. The rules never fabricate a figure: every intent that needs data returns
 *      null when its data is absent, so a chat panel cannot invent "0 mm today"
 *      from an empty context.
 */

const t: TranslateFn = (key, vars) => translate('en', key, vars);

/** A context carrying every field the rules read. */
function fullContext(): AssistantContext {
  return {
    cropName: 'Maize',
    growthStage: 'Vegetative',
    soilType: 'Sandy Loam',
    status: 'Irrigate Today',
    depthMm: 12.4,
    volumeLiters: 18_500,
    durationMinutes: 34,
    windowStart: '5:00 am',
    windowEnd: '8:00 am',
    explanation: 'The soil is 22 mm short of full across the root zone.',
    confidence: 'High',
    temperatureC: 31.2,
    humidityPercent: 68,
    rainfallForecastMm: 2.1,
    depletionMm: 22,
    readilyAvailableMm: 18,
    totalAvailableMm: 64,
    diseaseRiskLevel: 'Moderate',
    diseaseName: 'Maize Leaf Blight',
    savedTodayLiters: 4_200,
    savedLifetimeLiters: 96_000,
    tomorrowStatus: 'Delay',
  };
}

/**
 * A full context with the named fields REMOVED.
 *
 * Under `exactOptionalPropertyTypes`, `{ ...ctx, depthMm: undefined }` is not
 * the same as a context that never had `depthMm` — and the second is what the
 * app actually produces when the engine had no figure. Deleting the key models
 * the real absence.
 */
function without(...keys: (keyof AssistantContext)[]): AssistantContext {
  const context = fullContext();
  for (const key of keys) delete context[key];
  return context;
}

describe('normalise', () => {
  it('folds case and punctuation to spaces', () => {
    expect(normalise('How MUCH water?')).toBe(' how much water ');
  });

  it('preserves Indic and Arabic script characters', () => {
    // A naive [^a-z0-9] strip would erase the question for four of the five
    // supported languages; this is the assertion that guards that.
    expect(normalise('कितना पानी चाहिए?')).toContain('पानी');
    expect(normalise('আজ কত জল দেব?')).toContain('জল');
    expect(normalise('کتنا پانی؟')).toContain('پانی');
  });

  it('separates adjacent words so tokens cannot fuse', () => {
    expect(normalise('water?why')).toBe(' water why ');
  });

  it('returns empty padding for an empty question', () => {
    expect(normalise('   !!!   ')).toBe('  ');
  });
});

describe('classify — intent routing', () => {
  it('classifies each core intent from an English question', () => {
    expect(classify('What should I do today?')).toBe('today');
    expect(classify('How much water should I give today?')).toBe('amount');
    expect(classify('What time should I irrigate?')).toBe('timing');
    expect(classify('Why is the app advising this?')).toBe('why');
    expect(classify('Will it rain tomorrow?')).toBe('rain');
    expect(classify('How dry is my soil?')).toBe('moisture');
    expect(classify('Is the weather good for disease?')).toBe('disease');
    expect(classify('How much water have I saved?')).toBe('savings');
    expect(classify('What is tomorrow\'s plan?')).toBe('plan');
    expect(classify('What is the temperature right now?')).toBe('weather');
    expect(classify('Hello!')).toBe('greeting');
    expect(classify('What can you do?')).toBe('capability');
  });

  it('classifies romanised and native-script questions', () => {
    expect(classify('kitna pani dena hai?')).toBe('amount');
    expect(classify('कितना पानी देना है?')).toBe('amount');
    expect(classify('আজ কত জল দেব?')).toBe('amount');
    expect(classify('আজি কিমান পানী দিম?')).toBe('amount');
    expect(classify('کتنا پانی دوں؟')).toBe('amount');
    expect(classify('kab pani dena chahiye?')).toBe('timing');
    expect(classify('barish hogi?')).toBe('rain');
    expect(classify('kya mausam hai?')).toBe('weather');
    expect(classify('meri mitti kitni sukhi hai?')).toBe('moisture');
  });

  it('classifies the daily-action question in every supported script', () => {
    expect(classify('What should I do today?')).toBe('today');
    expect(classify('आज क्या करूं?')).toBe('today');
    expect(classify('আজ কী করব?')).toBe('today');
    expect(classify('আজি কি কৰিম?')).toBe('today');
    expect(classify('آج کیا کروں؟')).toBe('today');
  });

  it('returns null for an empty question', () => {
    expect(classify('   ')).toBeNull();
    expect(classify('')).toBeNull();
  });

  it('returns null for an unclassifiable question', () => {
    // The rules are honest about their reach: what they cannot classify is
    // left for the model path, never guessed at here.
    expect(classify('my pump is making a strange noise')).toBeNull();
  });

  it('routes a spray question to referral even when it contains a disease word', () => {
    // "leaf spot" is a disease term, but the question is about spraying, and a
    // disease answer would be an answer. Referral is matched before intent.
    expect(classify('which spray should I use for tomato leaf spot?')).toBe('referral');
    expect(classify('tomato leaf spot — which medicine?')).toBe('referral');
  });

  it('routes a fertiliser question to fertility, and a price question to referral', () => {
    // A fertiliser question has an estimate the app can offer (pH, organic
    // carbon); a price question has nothing the app knows at all, so it stays
    // a hard referral.
    expect(classify('how much urea should I apply?')).toBe('fertility');
    expect(classify('what is the mandi price of paddy?')).toBe('referral');
  });

  it('routes native-script spray questions to referral', () => {
    expect(classify('छिड़काव कौन सा करें?')).toBe('referral');
    expect(classify('কোন স্প্রে করব?')).toBe('referral');
    expect(classify('কোন স্প্রে কৰিম?')).toBe('referral');
    expect(classify('کون سا اسپرے کروں؟')).toBe('referral');
  });

  it('routes a fertiliser DOSE question to fertility, not the spray referral', () => {
    // The V2.2 bug this guards: 'dose' lived in REFERRAL_TERMS, so "what dose
    // of NPK?" on the Fertilizer tab got the plant-protection referral. Since
    // the official schedule became quotable, dose language is fertility
    // language — in every script the farmer types it in.
    expect(classify('what dose of npk should i give my rice?')).toBe('fertility');
    expect(classify('urea dose kitni?')).toBe('fertility');
    expect(classify('धान के लिए खुराक क्या हो?')).toBe('fertility');
    expect(classify('চালের ডোজ কত?')).toBe('fertility');
  });

  it('still refers a plant-protection dose question through its own words', () => {
    // Removing 'dose' from referral must not open a gap: a spray/medicine dose
    // question carries 'spray'/'medicine', which referral still wins with.
    expect(classify('what dose of spray for leaf spot?')).toBe('referral');
    expect(classify('medicine dose kitni du?')).toBe('referral');
  });

  it('answers a bare dose question with the resolved schedule, offline', () => {
    // The Fertilizer-tab experience this fixes: "what dose should I give?"
    // with a saved selection must return the official numbers, not a referral.
    const answer = answerFromRules('what dose should i give?', {
      ...fullContext(),
      fertScheduleNpk: 'N 50, P2O5 25, K2O 25 kg/ha',
      fertScheduleBand: 'Medium',
      fertScheduleVariety: 'Kharif (monsoon) rice',
      fertScheduleZone: 'Terai',
    }, t);
    expect(answer?.intent).toBe('fertility');
    expect(answer?.answer).toContain('N 50, P2O5 25, K2O 25 kg/ha');
    expect(answer?.answer).not.toContain('cannot name medicines');
  });

  it('does not let a short common word steal a real question', () => {
    // "help me" is a capability term; a question about water that happens to
    // open politely must still be an amount question.
    expect(classify('help me, how much water today?')).toBe('amount');
  });
});

describe('answerFromRules — figures are quoted, never invented', () => {
  it('answers referral questions with no farm data at all', () => {
    const answer = answerFromRules('which spray should I use?', undefined, t);
    expect(answer?.intent).toBe('referral');
    expect(answer?.answer).toContain('Krishi Vigyan Kendra');
  });

  it('answers capability and greeting with no farm data', () => {
    expect(answerFromRules('what can you do?', undefined, t)?.intent).toBe('capability');
    expect(answerFromRules('namaste', undefined, t)?.intent).toBe('greeting');
  });

  it('returns null for a data-dependent question with no context', () => {
    expect(answerFromRules('how much water today?', undefined, t)).toBeNull();
    expect(answerFromRules('what time should I irrigate?', undefined, t)).toBeNull();
    expect(answerFromRules('is it going to rain?', undefined, t)).toBeNull();
  });

  it('answers what to do today from the complete engine recommendation', () => {
    const answer = answerFromRules('what should I do today?', fullContext(), t);
    expect(answer?.intent).toBe('today');
    expect(answer?.answer).toContain('Irrigate Today');
    expect(answer?.answer).toContain('12.4 mm');
    expect(answer?.answer).toContain('18,500 litres');
    expect(answer?.answer).toContain('5:00 am');
    expect(answer?.answer).toContain('34 minutes');
    expect(answer?.answer).toContain('22 mm short');
  });

  it('turns the today-answer into an action list with the dashboard\'s own facts', () => {
    // V2.2 interactive pack: with a flagged issue, a weather-favoured disease
    // and a resolved schedule in context, the offline today-answer names all
    // three — each one a fact the dashboard already shows, so the two cannot
    // disagree — and carries the Fertilizer deep-link only because the
    // schedule line is present.
    const answer = answerFromRules('what should I do today?', {
      ...fullContext(),
      diseaseWhere: 'lower leaves first, moving upward',
      topIssues: ['Surface method on sloping land'],
      fertScheduleNpk: 'N 50, P2O5 25, K2O 25 kg/ha',
    }, t);
    expect(answer?.answer).toContain('Surface method on sloping land');
    expect(answer?.answer).toContain('Maize Leaf Blight');
    expect(answer?.answer).toContain('lower leaves first');
    expect(answer?.answer).toContain('Fertilizer tab');
    expect(answer?.action).toBe('fertilizer');
  });

  it('keeps the today-answer quiet about facts it does not have', () => {
    // No issue, no disease name, no schedule: nothing appended, no action.
    // A bare today-answer must not grow boilerplate lines about absent facts.
    const answer = answerFromRules('what should I do today?', without(
      'topIssues',
      'diseaseName',
      'fertScheduleNpk',
    ), t);
    expect(answer?.answer).not.toContain('Also worth a look');
    expect(answer?.answer).not.toContain('favours');
    expect(answer?.answer).not.toContain('Fertilizer tab');
    expect(answer?.action).toBeUndefined();
  });

  it('answers delay irrigation without exposing misleading zero values', () => {
    const context: AssistantContext = {
      ...fullContext(),
      status: 'Delay Irrigation',
      depthMm: 0,
      volumeLiters: 0,
      durationMinutes: 0,
      explanation: "Rainfall can cover today's crop water demand.",
    };
    delete context.windowStart;
    delete context.windowEnd;

    const answer = answerFromRules('what should I do today?', context, t);
    expect(answer?.answer).toContain('Delay Irrigation');
    expect(answer?.answer).toContain('No irrigation is needed today.');
    expect(answer?.answer).toContain("Rainfall can cover today's crop water demand.");
    expect(answer?.answer).not.toContain('0 mm');
    expect(answer?.answer).not.toContain('0 litres');
    expect(answer?.answer).not.toContain('0 minutes');
  });

  it('interprets farmer-provided soil test values instead of only referring out', () => {
    const answer = answerFromRules(
      'I have test values: pH 6.2, organic carbon 0.8%, N 240, P 12, K 150 kg/ha',
      undefined,
      t,
    );
    expect(answer?.intent).toBe('fertility');
    expect(answer?.answer).toContain('farmer-provided soil results');
    expect(answer?.answer).toContain('N: 240 (Low)');
    expect(answer?.answer).toContain('P2O5: 12 (Medium)');
    expect(answer?.answer).toContain('K2O: 150 (Medium)');
    expect(answer?.answer).toContain('low nutrient group is N');
    expect(answer?.answer).toContain('select the matching crop and soil zone');
  });

  it('accepts the complete Soil Health Card field set', () => {
    const answer = answerFromRules(
      'soil test: pH 6.2, EC 0.3 dS/m, organic carbon 0.8%, N 240, P 12, K 150, S 10, Zn 1.2, B 0.5, Fe 8, Mn 5, Cu 0.4',
      undefined,
      t,
    );
    expect(answer?.answer).toContain('EC: 0.3 dS/m');
    expect(answer?.answer).toContain('S: 10 kg/ha');
    expect(answer?.answer).toContain('Zn: 1.2 mg/kg');
    expect(answer?.answer).toContain('B: 0.5 mg/kg');
    expect(answer?.answer).toContain('Fe: 8 mg/kg');
    expect(answer?.answer).toContain('Mn: 5 mg/kg');
    expect(answer?.answer).toContain('Cu: 0.4 mg/kg');
  });

  it('answers the amount question with the engine\'s own figures', () => {
    const answer = answerFromRules('how much water today?', fullContext(), t);
    expect(answer?.answer).toContain('12.4 mm');
    expect(answer?.answer).toContain('18,500 litres');
    expect(answer?.answer).toContain('34 minutes');
  });

  it('says no irrigation is needed rather than reporting 0 mm', () => {
    const context = { ...fullContext(), depthMm: 0, volumeLiters: 0 };
    const answer = answerFromRules('how much water today?', context, t);
    expect(answer?.answer).toContain('No irrigation is needed today.');
  });

  it('returns null for an amount question missing its figures', () => {
    expect(answerFromRules('how much water today?', without('depthMm'), t)).toBeNull();
  });

  it('answers the timing question with the window and the reason', () => {
    const answer = answerFromRules('what time should I irrigate?', fullContext(), t);
    expect(answer?.answer).toContain('5:00 am');
    expect(answer?.answer).toContain('8:00 am');
    expect(answer?.answer).toContain('evaporation');
  });

  it('explains a missing window through the status when one exists', () => {
    const answer = answerFromRules(
      'what time should I irrigate?',
      without('windowStart', 'windowEnd'),
      t,
    );
    expect(answer?.answer).toContain('no irrigation is advised');
  });

  it('returns null for a timing question with neither window nor status', () => {
    expect(
      answerFromRules(
        'what time should I irrigate?',
        without('windowStart', 'windowEnd', 'status'),
        t,
      ),
    ).toBeNull();
  });

  it('answers the why question from the stored explanation', () => {
    const answer = answerFromRules('why is the app advising this?', fullContext(), t);
    expect(answer?.answer).toContain('22 mm short');
    expect(answer?.answer).toContain('High');
  });

  it('answers the rain question and ties it back to the status', () => {
    const answer = answerFromRules('will it rain today?', fullContext(), t);
    expect(answer?.answer).toContain('2.1 mm');
    expect(answer?.answer).toContain('already counted');
  });

  it('says no meaningful rain when the forecast is a trace', () => {
    const context = { ...fullContext(), rainfallForecastMm: 0.2 };
    const answer = answerFromRules('will it rain today?', context, t);
    expect(answer?.answer).toContain('No meaningful rain');
  });

  it('reports stress only past the readily-available threshold', () => {
    const stressed = answerFromRules('how dry is my soil?', fullContext(), t);
    expect(stressed?.answer).toContain('has passed the 18.0 mm point');

    const comfortable = {
      ...fullContext(),
      depletionMm: 10,
      readilyAvailableMm: 18,
    };
    const answer = answerFromRules('how dry is my soil?', comfortable, t);
    expect(answer?.answer).toContain('still comfortable');
  });

  it('answers the disease question but never claims a diagnosis', () => {
    const answer = answerFromRules('is the weather good for disease?', fullContext(), t);
    expect(answer?.answer).toContain('Moderate');
    expect(answer?.answer).toContain('Maize Leaf Blight');
    // The caveat is the product boundary (docs/10 §10.2): the app has not seen
    // the crop, so no answer may claim a disease is present.
    expect(answer?.answer).toContain('cannot say any disease is present');
  });

  it('turns a disease-risk answer into scouting, not a dead end', () => {
    // V2.2: where to look, what the signs look like, the on-phone photo check
    // and a prepared referral — from the Knowledge Base profile of the same
    // disease the weather named. No chemical, no diagnosis (docs/10 §10.2).
    const context = {
      ...fullContext(),
      diseaseWhere: 'lower leaves first, moving upward',
      diseaseWhat: 'Long grey-brown lesions with dark borders.',
    };
    const answer = answerFromRules('is the weather good for disease?', context, t);
    expect(answer?.answer).toContain('lower leaves first');
    expect(answer?.answer).toContain('Long grey-brown lesions');
    expect(answer?.answer).toContain('Check a leaf photo');
    expect(answer?.answer).toContain('Krishi Vigyan Kendra');
  });

  it('keeps the disease answer caveat-only when no disease is named', () => {
    // A None day names no disease, so there is nothing to scout for: no
    // where/what lines, and crucially no photo or referral boilerplate
    // attached to a disease the weather did not name.
    const none = fullContext();
    delete none.diseaseName;
    const answer = answerFromRules('is the weather good for disease?', none, t);
    expect(answer?.answer).not.toContain('Check a leaf photo');
  });

  it('answers what the photo showed from the latest check, plainly and without percentages', () => {
    // V2.2: the photo question routes to the photo result, not the weather
    // risk — and the verdict sentence is quoted verbatim, because the wording
    // is the boundary (docs/14). No percentage may ride along.
    const withPhoto = {
      ...fullContext(),
      photoVerdict: 'The photo shows Maize Leaf Blight.',
    };
    const answer = answerFromRules('what did the photo show?', withPhoto, t);
    expect(answer?.intent).toBe('photo');
    expect(answer?.answer).toContain('The photo shows Maize Leaf Blight.');
    expect(answer?.answer).not.toContain('%');
    expect(answer?.answer).toContain('Krishi Vigyan Kendra');
  });

  it('tells a farmer with no photo check how to take one', () => {
    const answer = answerFromRules('what did the photo show?', fullContext(), t);
    expect(answer?.intent).toBe('photo');
    expect(answer?.answer).toContain('Check a leaf photo');
  });

  it('answers the photo question with no context at all', () => {
    // Like referral and greeting: the how-to answer needs no farm data, so it
    // must never fall through to the model.
    const answer = answerFromRules('फोटो में क्या दिखाया?', undefined, t);
    expect(answer?.intent).toBe('photo');
    expect(answer?.answer).toContain('Check a leaf photo');
  });

  it('answers the savings question from the ledger figures', () => {
    const answer = answerFromRules('how much water have I saved?', fullContext(), t);
    expect(answer?.answer).toContain('4,200 litres today');
    expect(answer?.answer).toContain('96,000 litres');
  });

  it('answers the plan question with tomorrow\'s action and its caveat', () => {
    const answer = answerFromRules('what is tomorrow\'s plan?', fullContext(), t);
    expect(answer?.answer).toContain('Delay');
    expect(answer?.answer).toContain('can change if the weather does');
  });

  it('answers the weather question from the current conditions', () => {
    const answer = answerFromRules('how is the weather?', fullContext(), t);
    expect(answer?.answer).toContain('31°C');
    expect(answer?.answer).toContain('68%');
    expect(answer?.answer).toContain('2.1 mm');
  });

  it('translates every answer into the requested language', () => {
    const bn: TranslateFn = (key, vars) => translate('bn', key, vars);
    const answer = answerFromRules('how much water today?', fullContext(), bn);
    expect(answer?.answer).toContain('মিমি');
    expect(answer?.answer).toContain('লিটার');
  });
});

/**
 * pH and soil-character questions (PRD §7, §28 Guardrail 1, §33).
 *
 * These exist to make one promise mechanically true: the app cannot state a soil
 * pH without saying, in the same reply, that it is an area estimate rather than
 * a test of this field. The rule path is where that is enforceable — the answer
 * is assembled from fixed keys, so the caveat cannot be dropped by a model
 * choosing a shorter phrasing. Routing the question here BEFORE the network is
 * therefore the guarantee, not an optimisation.
 */
describe('classify — pH and soil questions never reach the model', () => {
  it('classifies a pH question in every supported language', () => {
    // "pH" is written in Latin script in all five languages, including inside a
    // Devanagari or Bengali sentence, because that is how it is printed on a
    // Soil Health Card. That is why the Latin token does most of the work here.
    expect(classify('What is my exact soil pH?')).toBe('ph');
    expect(classify('meri mitti ka pH kya hai?')).toBe('ph');
    expect(classify('मेरी मिट्टी का pH क्या है?')).toBe('ph');
    expect(classify('আমার মাটির pH কত?')).toBe('ph');
    expect(classify('মোৰ মাটিৰ pH কিমান?')).toBe('ph');
    expect(classify('میری مٹی کا pH کیا ہے؟')).toBe('ph');
  });

  it('classifies acidity questions asked without the letters pH', () => {
    expect(classify('Is my soil acidic?')).toBe('ph');
    expect(classify('मेरी मिट्टी अम्लीय है?')).toBe('ph');
    expect(classify('আমার মাটি কি অম্লীয়?')).toBe('ph');
    expect(classify('کیا میری مٹی تیزابی ہے؟')).toBe('ph');
  });

  it('does not match "ph" inside an ordinary word', () => {
    // ' ph ' is matched with its surrounding spaces, which `normalise` guarantees
    // by padding the question. A bare 'ph' substring would capture "phone",
    // "photo", "graph" and dozens of everyday words in five languages.
    expect(classify('my phone is not working')).toBeNull();
    expect(classify('should I send a photo')).toBeNull();
  });

  it('routes a nutrient question to fertility, not to pH, amount or referral', () => {
    // Before `fertility` existed, "how much phosphorus does my soil need?" was
    // classified as `amount` and answered with today's irrigation depth — a
    // water figure offered as a fertiliser answer (PRD §28 Guardrail 2). It now
    // has its own intent, which answers with the app's pH/carbon estimate
    // first and refuses only the exact quantity — see the `fertility` describe
    // block below.
    expect(classify('how much phosphorus does my soil need?')).toBe('fertility');
    expect(classify('what is the nitrogen level in my soil?')).toBe('fertility');
  });

  it('routes an amendment question to fertility rather than a hard referral', () => {
    // The next question after "your soil is acidic" is "how much lime?". The
    // app still cannot give an exact rate, but it can state the pH reading that
    // prompted the question before saying so.
    expect(classify('how much lime should I add to my soil?')).toBe('fertility');
    expect(classify('should I use gypsum on this field?')).toBe('fertility');
    expect(classify('कितना चूना डालना चाहिए?')).toBe('fertility');
  });

  it('classifies a soil-character question', () => {
    expect(classify('what soil type do I have?')).toBe('soil');
    expect(classify('how much organic carbon is in my soil?')).toBe('soil');
    expect(classify('मेरे खेत की मिट्टी का प्रकार क्या है?')).toBe('soil');
    expect(classify('আমার জমির মাটির ধরন কী?')).toBe('soil');
    expect(classify('মোৰ খেতিৰ মাটিৰ প্ৰকাৰ কি?')).toBe('soil');
    expect(classify('میری مٹی کی قسم کیا ہے؟')).toBe('soil');
  });

  it('still routes moisture questions to moisture, not soil', () => {
    // `MOISTURE_TERMS` owns the bare word for soil in every language because
    // "how dry is my soil" is the commoner question. The soil-character table is
    // checked first and must therefore contain only specific phrases — if it
    // ever gains a bare soil word, these assertions fail.
    expect(classify('How dry is my soil?')).toBe('moisture');
    expect(classify('meri mitti kitni sukhi hai?')).toBe('moisture');
    expect(classify('মাটিৰ আৰ্দ্ৰতা কেনে?')).toBe('moisture');
  });
});

describe('answerFromRules — a pH figure is never spoken without its source', () => {
  /** A context carrying the soil-chemistry fields, as the app produces them. */
  function withSoil(): AssistantContext {
    return {
      ...fullContext(),
      soilPh: 6.3,
      soilPhProvenance: 'REGIONAL_ESTIMATE',
      soilPhOrigin: 'a 250 m soil map prediction (ISRIC SoilGrids v2.0)',
      phSuitability: 'Suitable',
      phOptimalMin: 5.5,
      phOptimalMax: 6.5,
      organicCarbonPct: 1.8,
    };
  }

  it('answers the PRD §33 question without a farm at all', () => {
    // "What is my exact soil pH?" with no farm selected. The model path is never
    // reached, so there is nothing that could answer it with a bare number.
    const answer = answerFromRules('What is my exact soil pH?', undefined, t);
    expect(answer?.intent).toBe('ph');
    expect(answer?.answer).toContain('estimate for your area');
    expect(answer?.answer).toContain('a test of your field');
    expect(answer?.answer).toContain('Soil Health Card');
    // No pH-shaped number may appear, because there is no farm to have one.
    expect(answer?.answer).not.toMatch(/\d\.\d/);
  });

  it('answers the same way for a farm with no stored soil profile', () => {
    // Reachable: farms created offline, or before the pH property existed.
    const answer = answerFromRules('what is my soil pH?', fullContext(), t);
    expect(answer?.intent).toBe('ph');
    expect(answer?.answer).toContain('Soil Health Card');
  });

  it('states the estimate caveat in the same reply as the figure', () => {
    const answer = answerFromRules('what is my soil pH?', withSoil(), t);
    expect(answer?.answer).toContain('6.3');
    expect(answer?.answer).toContain('not a test of your field');
    expect(answer?.answer).toContain('Soil Health Card');
  });

  it('never calls the estimate a field test', () => {
    const answer = answerFromRules('what is my exact soil pH?', withSoil(), t);
    expect(answer?.answer).not.toContain('test of your own field');
  });

  it('says so when the figure really is a field test', () => {
    // No path in the app produces this today — nothing stores a Soil Health Card
    // reading yet. The branch exists so that when one does, the wording is
    // already correct rather than being bolted on beside a caveat that lies.
    const answer = answerFromRules('what is my soil pH?', {
      ...withSoil(),
      soilPhProvenance: 'MEASURED',
    }, t);
    expect(answer?.answer).toContain('test of your own field');
    expect(answer?.answer).not.toContain('estimate for your area');
  });

  it('gives the crop band and the verdict together', () => {
    const answer = answerFromRules('is my soil pH ok for my crop?', withSoil(), t);
    expect(answer?.answer).toContain('5.5');
    expect(answer?.answer).toContain('6.5');
    expect(answer?.answer).toContain('Suitable');
  });

  it('refuses to name an amendment quantity, whatever the verdict', () => {
    // Unconditional: the same sentence appears when the pH suits the crop and
    // when it does not (PRD §28 Guardrail 2).
    for (const verdict of ['Suitable', 'Significant pH issue']) {
      const answer = answerFromRules('what is my soil pH?', {
        ...withSoil(),
        phSuitability: verdict,
      }, t);
      expect(answer?.answer).toContain('cannot tell you how much lime');
      expect(answer?.answer).toContain('Krishi Vigyan Kendra');
    }
  });

  it('turns an out-of-range pH into direction and crop options, offline', () => {
    // V2.2: the farmer's own complaint — "after saying the pH is out of range
    // it should also say how to bring it into range, or what to grow instead."
    // Numbers out of band (6.9 against 5.5-6.5) so the direction is computed,
    // not the hand-set verdict string.
    const answer = answerFromRules('what is my soil pH?', {
      ...withSoil(),
      soilPh: 6.9,
      phSuitability: 'Significant pH issue',
      phAltCrops: ['Groundnut', 'Onion', 'Tomato', 'Rice', 'Soybean'],
    }, t);
    expect(answer?.answer).toContain('gypsum');
    expect(answer?.answer).toContain('Groundnut, Onion, Tomato');
    expect(answer?.answer).toContain('Krishi Vigyan Kendra');
    // A rate is still never named — '@' is the booklet's rate marker and the
    // only place a quantity could hide in these lines.
    expect(answer?.answer).not.toContain('@');
    // The redundant no-quantity sentence is replaced by the direction line,
    // which carries the same caveat.
    expect(answer?.answer).not.toContain('cannot tell you how much lime');
  });

  it('gives the acidic-side direction when the pH is below the band', () => {
    const answer = answerFromRules('is my soil pH ok for my crop?', {
      ...withSoil(),
      soilPh: 4.9,
      phOptimalMin: 5.5,
      phAltCrops: ['Potato'],
    }, t);
    expect(answer?.answer).toContain('lime or dolomite');
    expect(answer?.answer).toContain('Potato');
  });

  it('still states the reading and the caveat when the crop band is missing', () => {
    // A crop the pH table does not cover leaves no optimum band, so the verdict
    // sentence is dropped. The two sentences that carry Guardrail 1 are not.
    const partial = withSoil();
    delete partial.phOptimalMin;
    delete partial.phOptimalMax;
    delete partial.phSuitability;
    const answer = answerFromRules('what is my soil pH?', partial, t);
    expect(answer?.answer).toContain('6.3');
    expect(answer?.answer).toContain('not a test of your field');
    expect(answer?.answer).not.toContain('Your crop prefers');
  });

  it('answers a soil-character question from the farmer’s own record', () => {
    const answer = answerFromRules('what soil type do I have?', withSoil(), t);
    expect(answer?.intent).toBe('soil');
    expect(answer?.answer).toContain('Sandy Loam');
    expect(answer?.answer).toContain('1.8%');
    expect(answer?.answer).toContain('250 m area');
  });

  it('omits the carbon figure and its caveat together', () => {
    // The caveat exists to qualify the figure. Emitting it alone would warn the
    // farmer about a number they were never shown.
    const answer = answerFromRules('what soil type do I have?', fullContext(), t);
    expect(answer?.answer).toContain('Sandy Loam');
    expect(answer?.answer).not.toContain('250 m area');
  });

  it('returns null for a soil question on a farm with no soil recorded', () => {
    expect(answerFromRules('what soil type do I have?', without('soilType'), t)).toBeNull();
  });

  it('answers pH and soil questions in the farmer’s language', () => {
    const bn: TranslateFn = (key, vars) => translate('bn', key, vars);
    const answer = answerFromRules('আমার মাটির pH কত?', withSoil(), bn);
    expect(answer?.intent).toBe('ph');
    expect(answer?.answer).toContain('6.3');
    // The caveat has to survive translation, not just exist in English.
    expect(answer?.answer).toContain('মাটি স্বাস্থ্য কার্ড');
    expect(answer?.answer).toContain('কৃষি বিজ্ঞান কেন্দ্র');
  });

  /**
   * Fertility and amendment questions (how much fertiliser / urea / lime).
   *
   * The claim under test: the app answers with what it actually knows FIRST
   * (pH reading and verdict, organic carbon), and only THEN says it cannot give
   * an exact quantity — never the other way around, and never a bare refusal
   * when an estimate exists. This is the behaviour change from the old
   * `referral`-only routing.
   */
  it('states the pH and carbon estimate before the no-quantity caution', () => {
    // withSoil() has a SUITABLE pH (6.3 in 5.5-6.5), so since V2.2 the close
    // is the soil-test next step rather than the old "cannot tell you" — the
    // ordering claim (figures first, referral last) is what still holds.
    const answer = answerFromRules('how much fertiliser should I add?', withSoil(), t);
    expect(answer?.intent).toBe('fertility');
    expect(answer?.answer).toContain('6.3');
    expect(answer?.answer).toContain('1.8%');
    const closing = answer?.answer.indexOf('Soil Health Card test') ?? -1;
    const phFigure = answer?.answer.indexOf('6.3') ?? -1;
    expect(phFigure).toBeGreaterThanOrEqual(0);
    expect(closing).toBeGreaterThan(phFigure);
  });

  it('tells a farmer whose pH suits the crop that nothing needs correcting', () => {
    // The transcript complaint: suitable pH + uncovered crop still read like
    // the old refusal ("I cannot tell you an exact amount…") when the honest
    // answer is that nothing needs correcting and a soil test is the next
    // step for an exact plan.
    const answer = answerFromRules('how much lime should I add?', withSoil(), t);
    expect(answer?.answer).toContain('nothing to correct');
    expect(answer?.answer).toContain('Soil Health Card');
    expect(answer?.answer).not.toContain('cannot tell you an exact amount');
    // Still no quantity, whatever the framing.
    expect(answer?.answer).not.toMatch(/\d+\s*(kg|kilograms?|litres?|grams?)/i);
  });

  it('surfaces a flagged fertility issue, after the soil state it is about', () => {
    // Reordered in V2.2: the pH reading leads (it is the direct answer to
    // "improve my soil"); the flagged issue follows rather than opening the
    // answer with a negative, which was the transcript complaint.
    const context = {
      ...withSoil(),
      topIssues: ['Soil pH is below what rice prefers'],
    };
    const answer = answerFromRules('how much urea should I use?', context, t);
    expect(answer?.answer).toContain('Soil pH is below what rice prefers');
    const phFigure = answer?.answer.indexOf('6.3') ?? -1;
    const issue = answer?.answer.indexOf('Soil pH is below') ?? -1;
    expect(phFigure).toBeGreaterThanOrEqual(0);
    expect(issue).toBeGreaterThan(phFigure);
  });

  it('says plainly there is no estimate when the farm has none, then still cautions', () => {
    const answer = answerFromRules('how much fertiliser do I need?', fullContext(), t);
    expect(answer?.intent).toBe('fertility');
    expect(answer?.answer).toContain('no soil pH or organic-carbon estimate');
    expect(answer?.answer).toContain('cannot tell you an exact amount');
  });

  it('answers a fertility question with no farm at all', () => {
    const answer = answerFromRules('how much urea should I apply?', undefined, t);
    expect(answer?.intent).toBe('fertility');
    expect(answer?.answer).toContain('Soil Health Card');
    expect(answer?.answer).toContain('Krishi Vigyan Kendra');
  });

  it('never states an exact quantity, even with a full estimate available', () => {
    // The one thing that must never change: no number of kg/ha, no "apply X",
    // ever appears — only the reading, the verdict, and the referral.
    // (The one exception is the official State schedule, tested below, where
    // the quantity is a quotation, not a computation.)
    const answer = answerFromRules('how much urea should I apply?', withSoil(), t);
    expect(answer?.answer).not.toMatch(/\d+\s*(kg|kilograms?|litres?|grams?)/i);
  });

  it('quotes the official schedule when the farm resolved one', () => {
    // V2.2's quotable exception, on the offline path: the dose appears
    // verbatim, attributed to the State schedule, with a pointer to the
    // manure/timing lines on the Fertilizer tab — and the closing line
    // confirms with the KVK rather than refusing.
    const answer = answerFromRules('how to improve my soil?', {
      ...withSoil(),
      soilPh: 6.6,
      phSuitability: 'Slightly outside the optimal range',
      phAltCrops: ['Groundnut', 'Onion', 'Tomato'],
      fertScheduleNpk: 'N 50, P2O5 25, K2O 25 kg/ha',
      fertScheduleBand: 'Medium',
      fertScheduleVariety: 'Kharif (monsoon) rice',
      fertScheduleZone: 'Terai',
    }, t);
    expect(answer?.intent).toBe('fertility');
    expect(answer?.answer).toContain('State schedule');
    expect(answer?.answer).toContain('N 50, P2O5 25, K2O 25 kg/ha');
    expect(answer?.answer).toContain('Kharif (monsoon) rice');
    // The improvement plan: direction (6.6 is alkaline-side of 5.5-6.5),
    // alternatives, and a confirm-with-KVK close — never a bare referral.
    expect(answer?.answer).toContain('gypsum');
    expect(answer?.answer).toContain('Groundnut, Onion, Tomato');
    expect(answer?.answer).toContain('Confirm the final plan');
    expect(answer?.answer).not.toContain('cannot tell you an exact amount');
  });

  it('routes the natural phrasings of the soil-improvement question to fertility', () => {
    // The transcript complaint: "how to improve my soil?" fell through to the
    // model because 'improve soil' (no "my") was the only phrase on the list.
    expect(classify('how to improve my soil?')).toBe('fertility');
    expect(classify('how do i improve the soil?')).toBe('fertility');
  });

  it('shows a farmer holding a Soil Health Card where to enter it', () => {
    // "I have my soil test" with no numbers: the answer must teach both entry
    // paths — paste the numbers in chat, or the Fertilizer tab's soil-test
    // mode — instead of a referral that wastes the card they are holding.
    const answer = answerFromRules('i have my soil health card', fullContext(), t);
    expect(answer?.intent).toBe('fertility');
    expect(answer?.answer).toContain('Fertilizer');
    expect(answer?.answer).toContain('Save reading');
    expect(answer?.answer).toContain('pH 6.2');
  });

  it('routes native-script soil-test mentions to the card guidance', () => {
    // Without these terms the bare word for soil belongs to the moisture
    // terms, and a Bengali farmer saying they have a test would be told how
    // dry their soil is.
    expect(classify('মাটির পরীক্ষা করিয়েছি')).toBe('fertility');
    expect(classify('मेरे पास मिट्टी की जाँच है')).toBe('fertility');
  });

  it('answers fertility questions in the farmer’s language', () => {
    const bn: TranslateFn = (key, vars) => translate('bn', key, vars);
    const answer = answerFromRules('কত সার দিতে হবে?', withSoil(), bn);
    expect(answer?.intent).toBe('fertility');
    expect(answer?.answer).toContain('6.3');
    expect(answer?.answer).toContain('কৃষি বিজ্ঞান কেন্দ্র');
  });
});
