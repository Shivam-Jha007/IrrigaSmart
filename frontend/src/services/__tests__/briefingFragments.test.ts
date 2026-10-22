import { describe, expect, it } from 'vitest';
import { translate, type TranslateFn } from '../../i18n';
import type { AssistantContext } from '../assistantContext';
import {
  amountSentence,
  buildBriefingFragments,
  daysOfWaterLeftSentence,
  diseaseSpeech,
  headingSentence,
  irrigationSpeech,
  moistureSpeech,
  phSentences,
  phSpeech,
  photoTipSentence,
  scheduleSentence,
  seasonalSentences,
  seasonalSpeech,
  testsSentence,
  timingSentence,
  weatherSpeech,
} from '../briefingFragments';

/**
 * Briefing fragments (V2.3).
 *
 * These are the sentences the spoken briefing, the card speaker buttons and
 * the chat panel all quote. The claims that matter most, because a farmer
 * cannot see the code:
 *
 *   1. A fragment quotes the engine's figure VERBATIM — the same string the
 *      offline rules answer with. Two surfaces, one sentence, by construction.
 *   2. Absent data leaves no trace: no fragment, no "0 mm", no empty gap.
 *   3. The briefing is ordered like a bulletin: what to do, how much, when,
 *      why, then what to watch, then what is next.
 */

const t: TranslateFn = (key, vars) => translate('en', key, vars);

/** A context carrying every field the fragments read. */
function fullContext(): AssistantContext {
  return {
    language: 'en',
    farmName: 'North Field',
    cropName: 'Aman Paddy',
    status: 'Irrigate Today',
    depthMm: 12.4,
    volumeLiters: 18_500,
    durationMinutes: 34,
    windowStart: '5:00 am',
    windowEnd: '8:00 am',
    explanation: 'The soil is 22 mm short of full across the root zone.',
    temperatureC: 31.2,
    humidityPercent: 68,
    rainfallForecastMm: 2.1,
    depletionMm: 22,
    readilyAvailableMm: 18,
    totalAvailableMm: 64,
    diseaseRiskLevel: 'High',
    diseaseName: 'Rice Blast',
    diseaseWhere: 'the lower leaves',
    savedTodayLiters: 4_200,
    tomorrowStatus: 'Delay',
    topIssues: ['Soil moisture is falling fast'],
    soilPh: 6.2,
    soilPhProvenance: 'REGIONAL_ESTIMATE',
    phSuitability: 'Well suited',
    phOptimalMin: 5.5,
    phOptimalMax: 7.0,
  };
}

function without(...keys: (keyof AssistantContext)[]): AssistantContext {
  const context = fullContext();
  for (const key of keys) delete context[key];
  return context;
}

describe('headingSentence', () => {
  it('names the farm, crop and status', () => {
    expect(headingSentence(fullContext(), t)).toBe(
      'North Field: Aman Paddy. Today’s advice is Irrigate Today.',
    );
  });

  it('is absent when nothing is known', () => {
    expect(headingSentence(undefined, t)).toBeNull();
    expect(headingSentence(without('farmName', 'status', 'depthMm', 'cropName'), t)).toBeNull();
  });
});

describe('amountSentence', () => {
  it('quotes the engine figures verbatim, rounded for display only', () => {
    expect(amountSentence(fullContext(), t)).toBe(
      'Give 12.4 mm today — about 18,500 litres for your field.',
    );
  });

  it('says "no irrigation" rather than "0 mm" when the depth is zero or below', () => {
    expect(amountSentence({ ...fullContext(), depthMm: 0 }, t)).toBe(
      'No irrigation is needed today.',
    );
    expect(amountSentence({ ...fullContext(), depthMm: -3 }, t)).toBe(
      'No irrigation is needed today.',
    );
  });

  it('is absent when either figure is missing', () => {
    expect(amountSentence(without('depthMm'), t)).toBeNull();
    expect(amountSentence(without('volumeLiters'), t)).toBeNull();
    expect(amountSentence(undefined, t)).toBeNull();
  });
});

describe('timingSentence / run time / irrigationSpeech', () => {
  it('quotes the window verbatim', () => {
    expect(timingSentence(fullContext(), t)).toBe('Irrigate between 5:00 am and 8:00 am.');
  });

  it('joins amount, window and run time in bulletin order', () => {
    expect(irrigationSpeech(fullContext(), t)).toBe(
      'Give 12.4 mm today — about 18,500 litres for your field. ' +
        'Irrigate between 5:00 am and 8:00 am. That is about 34 minutes of running time.',
    );
  });

  it('omits timing cleanly when no window exists', () => {
    const speech = irrigationSpeech(without('windowStart', 'windowEnd', 'durationMinutes'), t);
    expect(speech).toBe('Give 12.4 mm today — about 18,500 litres for your field.');
  });
});

describe('moistureSpeech', () => {
  it('states depletion against capacity, with the stress verdict', () => {
    // 22 mm depleted >= 18 mm RAW → stress.
    expect(moistureSpeech(fullContext(), t)).toBe(
      'Your root zone is 22.0 mm short of full, out of 64.0 mm this soil can hold. ' +
        'That has passed the 18.0 mm point where the crop starts to feel stress, which is why irrigation is advised.',
    );
  });

  it('says "still comfortable" below the stress threshold', () => {
    const context = { ...fullContext(), depletionMm: 10 };
    expect(moistureSpeech(context, t)).toContain('so it is still comfortable.');
  });

  it('is empty when the balance is unknown', () => {
    expect(moistureSpeech(without('depletionMm', 'totalAvailableMm', 'readilyAvailableMm'), t)).toBeNull();
  });
});

describe('daysOfWaterLeftSentence — the gauge in farmer time (V2.3)', () => {
  it('speaks whole days for the middle range', () => {
    expect(daysOfWaterLeftSentence({ ...fullContext(), daysOfWaterLeft: 3.4 }, t)).toBe(
      'At today’s demand, the soil still holds about 3 more days of water.',
    );
    // 4.6 rounds up, not truncates.
    expect(daysOfWaterLeftSentence({ ...fullContext(), daysOfWaterLeft: 4.6 }, t)).toContain('5 more days');
  });

  it('collapses to "more than a week" at seven days and beyond', () => {
    expect(daysOfWaterLeftSentence({ ...fullContext(), daysOfWaterLeft: 7 }, t)).toBe(
      'At today’s demand, the soil holds more than a week of water.',
    );
    expect(daysOfWaterLeftSentence({ ...fullContext(), daysOfWaterLeft: 31 }, t)).toContain('more than a week');
  });

  it('gets its own grammar for a single day', () => {
    expect(daysOfWaterLeftSentence({ ...fullContext(), daysOfWaterLeft: 1.2 }, t)).toBe(
      'At today’s demand, the soil still holds about 1 more day of water.',
    );
  });

  it('says the water is used up when rounding hits zero', () => {
    expect(daysOfWaterLeftSentence({ ...fullContext(), daysOfWaterLeft: 0.3 }, t)).toBe(
      'At today’s demand, the water in the soil is already used up.',
    );
  });

  it('is silent when the engine had no demand to divide by', () => {
    expect(daysOfWaterLeftSentence(fullContext(), t)).toBeNull();
    expect(daysOfWaterLeftSentence(undefined, t)).toBeNull();
  });

  it('rides along with the moisture speech, after the stress verdict', () => {
    // depletionMm 10 < RAW 18: the comfortable branch, with days appended.
    const speech = moistureSpeech(
      { ...fullContext(), depletionMm: 10, daysOfWaterLeft: 2.6 },
      t,
    );
    expect(speech).toContain('so it is still comfortable.');
    expect(speech).toContain('about 3 more days of water.');
    // ...and the stressed branch carries it too.
    const stressed = moistureSpeech({ ...fullContext(), daysOfWaterLeft: 0.4 }, t);
    expect(stressed).toContain('which is why irrigation is advised.');
    expect(stressed).toContain('the water in the soil is already used up.');
  });
});

describe('weatherSpeech', () => {
  it('states temperature, humidity and rain', () => {
    expect(weatherSpeech(fullContext(), t)).toBe(
      'It is about 31°C right now. Humidity is around 68%. Rain expected today: 2.1 mm.',
    );
  });

  it('keeps whichever figures exist and drops the rest', () => {
    const speech = weatherSpeech(without('temperatureC', 'rainfallForecastMm'), t);
    expect(speech).toBe('Humidity is around 68%.');
  });
});

describe('diseaseSpeech', () => {
  it('names the disease with its level and where to look', () => {
    expect(diseaseSpeech(fullContext(), t)).toBe(
      'The weather favours Rice Blast today (High) — while you are out there, glance at the lower leaves.',
    );
  });

  it('is absent when no disease is favoured', () => {
    expect(diseaseSpeech(without('diseaseName', 'diseaseRiskLevel', 'diseaseWhere'), t)).toBeNull();
  });
});

describe('phSentences / phSpeech', () => {
  it('speaks the reading, the estimate caveat and the verdict — never the number alone', () => {
    // Guardrail 1 pinned: the provenance sentence is part of the same string
    // a farmer hears, in the same breath as the figure.
    expect(phSentences(fullContext(), t)).toEqual([
      'The app’s figure for your topsoil pH is 6.2.',
      'That is an estimate for your area from a 250 m soil map — it is not a test of your field. A Soil Health Card test at your local centre gives the figure for your own plot.',
      'Your crop prefers pH 5.5 to 7.0, so this reads as: Well suited.',
    ]);
    expect(phSpeech(fullContext(), t)).toContain('250 m soil map');
  });

  it('says "your own field" only when the reading is MEASURED', () => {
    const measured = { ...fullContext(), soilPhProvenance: 'MEASURED' };
    expect(phSentences(measured, t)[1]).toBe('That one comes from a test of your own field.');
  });

  it('quotes the pH reading with its provenance in one string — the number is never alone', () => {
    // The ph intent that once shared this wording was removed with the chatbot
    // (V2.3); what remains pinned is the invariant that mattered: a spoken pH
    // figure always carries its "this is a map estimate" caveat.
    expect(phSentences(fullContext(), t).join(' ')).toContain('250 m soil map');
  });

  it('is empty when there is no pH figure', () => {
    expect(phSentences(without('soilPh', 'soilPhProvenance'), t)).toEqual([]);
    expect(phSpeech(undefined, t)).toBeNull();
  });
});

describe('seasonalSentences / seasonalSpeech', () => {
  it('opens with the in-season line, the calendar, and the seasonal guideline', () => {
    // September = Kharif; Rice's main season is Kharif.
    const sentences = seasonalSentences('Rice', 'en', t, '2026-09-06');
    expect(sentences).toEqual([
      'Rice is in its main growing season.',
      'Sowing: Jun–Jul · Harvest: Oct–Dec',
      'Monsoon months: irrigate only during dry spells and let the rain do the work. Watch for waterlogging.',
    ]);
    expect(seasonalSpeech('Rice', 'en', t, '2026-09-06')).toBe(sentences.join(' '));
  });

  it('says which season the crop belongs to when it is out of season', () => {
    // September = Kharif; Wheat's main season is Rabi.
    const sentences = seasonalSentences('Wheat', 'en', t, '2026-09-06');
    expect(sentences[0]).toBe('Wheat is usually grown in Rabi (winter).');
    // The guideline spoken is the CURRENT season's (Kharif), not the crop's.
    expect(sentences[2]).toContain('Monsoon months');
  });

  it('the shown and spoken calendars are one string — same month formatting', () => {
    // The card builds its range with the same monthNameFor the fragments use;
    // this pins the format both surfaces share.
    expect(seasonalSentences('Potato', 'en', t, '2026-01-15')[1]).toBe(
      'Sowing: Oct–Nov · Harvest: Jan–Mar',
    );
  });
});

describe('buildBriefingFragments', () => {
  it('orders the bulletin: scene, action, amount, timing, why, watch, next', () => {
    const ids = buildBriefingFragments(fullContext(), t, {
      crop: 'Rice',
      language: 'en',
      now: '2026-09-06',
    }).map((fragment) => fragment.id);
    // Relative order is the contract; absence is data-dependent, so assert
    // the subsequence rather than an exact list.
    const expected: Array<typeof ids[number]> = [
      'heading',
      'season',
      'amount',
      'timing',
      'why',
      'moisture',
      'ph',
      'disease',
      'plan',
    ];
    const filtered = ids.filter((id) => expected.includes(id));
    expect(filtered).toEqual(expected.filter((id) => ids.includes(id)));
    expect(ids[0]).toBe('heading');
  });

  it('omits the season fragment when no crop is passed', () => {
    const ids = buildBriefingFragments(fullContext(), t).map((fragment) => fragment.id);
    expect(ids).not.toContain('season');
  });

  it('every fragment is a non-empty sentence', () => {
    for (const fragment of buildBriefingFragments(fullContext(), t, {
      crop: 'Rice',
      language: 'en',
      now: '2026-09-06',
    })) {
      expect(fragment.text.trim().length).toBeGreaterThan(0);
    }
  });

  it('produces nothing from no context — the card renders nothing', () => {
    expect(buildBriefingFragments(undefined, t)).toEqual([]);
    expect(buildBriefingFragments({}, t)).toEqual([]);
  });

  it('spoken text is exactly the shown text joined', () => {
    // The card plays fragments.map(text).join(' ') — the test pins that the
    // fragment list is the single document both surfaces share.
    const fragments = buildBriefingFragments(fullContext(), t, {
      crop: 'Rice',
      language: 'en',
      now: '2026-09-06',
    });
    const spoken = fragments.map((fragment) => fragment.text).join(' ');
    expect(spoken).toContain('Give 12.4 mm today');
    expect(spoken).toContain('Irrigate between 5:00 am and 8:00 am.');
    expect(spoken).toContain('topsoil pH is 6.2');
    expect(spoken).toContain('main growing season');
  });
});

describe('feature pointers (V2.3) — fertilizer, tests, leaf photo', () => {
  it('invites the soil test when none is entered', () => {
    expect(testsSentence(fullContext(), t)).toBe(
      'Have a soil or water test? Add it on the farm form — the app will use your field’s own figures.',
    );
  });

  it('acknowledges the farmer’s own test figures when present', () => {
    const context = { ...fullContext(), soilPh: 6.0, soilPhProvenance: 'USER_PROVIDED' };
    expect(testsSentence(context, t)).toBe(
      'Your own soil and water test figures are already part of this advice.',
    );
    const cardReading = { ...fullContext(), fertilityN: 240 };
    expect(testsSentence(cardReading, t)).toBe(
      'Your own soil and water test figures are already part of this advice.',
    );
  });

  it('points at the leaf photo check for a rice farm, when no verdict exists to quote', () => {
    expect(photoTipSentence(fullContext(), t, 'Rice')).toContain('Check a leaf photo');
    expect(photoTipSentence(fullContext(), t, 'Rice')).toContain('offline');
  });

  it('never points at the photo check for a non-rice crop', () => {
    // The check is offered for rice farms only (V2.3) — a wheat or maize
    // farmer must not be invited to photograph leaves the app cannot read.
    expect(photoTipSentence(fullContext(), t, 'Wheat')).toBeNull();
    expect(photoTipSentence(fullContext(), t, 'Maize')).toBeNull();
    expect(photoTipSentence(fullContext(), t)).toBeNull();
  });

  it('is silent about the photo check when a verdict is already spoken', () => {
    const context = { ...fullContext(), photoVerdict: 'The photo shows a healthy leaf.' };
    expect(photoTipSentence(context, t, 'Rice')).toBeNull();
  });

  it('falls back to the Fertilizer-page pointer when no schedule resolved', () => {
    expect(scheduleSentence(fullContext(), t)).toBe(
      'The Fertilizer page shows the official fertilizer schedule for covered crops.',
    );
    const context = { ...fullContext(), fertScheduleNpk: 'N 50, P2O5 25, K2O 25 kg/ha' };
    expect(scheduleSentence(context, t)).toBe(
      'Your saved fertilizer schedule for this crop is ready on the Fertilizer tab.',
    );
  });

  it('no pointers without a farm — the card still renders nothing for an empty context', () => {
    expect(scheduleSentence({}, t)).toBeNull();
    expect(testsSentence({}, t)).toBeNull();
    expect(photoTipSentence({}, t, 'Rice')).toBeNull();
    expect(scheduleSentence(undefined, t)).toBeNull();
  });
});

describe('fragment self-consistency', () => {
  it('the amount fragment carries the engine figures verbatim', () => {
    const context = fullContext();
    expect(amountSentence(context, t)).toBe(
      'Give 12.4 mm today — about 18,500 litres for your field.',
    );
  });
});
