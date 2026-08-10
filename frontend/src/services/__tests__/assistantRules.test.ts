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

  it('routes fertiliser and price questions to referral', () => {
    expect(classify('how much urea should I apply?')).toBe('referral');
    expect(classify('what is the mandi price of paddy?')).toBe('referral');
  });

  it('routes native-script spray questions to referral', () => {
    expect(classify('छिड़काव कौन सा करें?')).toBe('referral');
    expect(classify('কোন স্প্রে করব?')).toBe('referral');
    expect(classify('কোন স্প্রে কৰিম?')).toBe('referral');
    expect(classify('کون سا اسپرے کروں؟')).toBe('referral');
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
