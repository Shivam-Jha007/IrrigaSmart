import { describe, expect, it } from 'vitest';
import { summarizePhotoCheck } from '../photoCheckSummary';
import { translate, type TranslateFn } from '../../i18n';
import type { CropName } from '../../types';
import type { VisionResult } from '../diseaseVision';
import type { VisionVerdict } from '../diseaseVisionMap';

/**
 * The assistant's photo-check summary (V2.2).
 *
 * THE WORDING IS THE BOUNDARY. The card renders the finding plainly with no
 * percentages, no name below the confidence threshold, and no all-clear for
 * another plant's healthy class (docs/14 §5). These tests assert that the
 * summary the assistant quotes is built from those same rules — a model or an
 * offline rule handed this string cannot attach a confidence figure to it,
 * because the string carries no number to inflate. The REAL translator is
 * used, not an identity stub, because the interpolated English sentence is
 * exactly what a farmer (and the model) will read.
 */

const t: TranslateFn = (key, vars) => translate('en', key, vars);

function result(verdict: VisionVerdict): VisionResult {
  return { verdict, reading: { classIndex: 0, rawClass: 'test', confidence: 0.9 }, elapsedMs: 1 };
}

const ENTRY = {
  plant: 'Rice',
  appCrop: 'Rice',
  finding: { kind: 'known', disease: 'riceBlast' },
} as const;

describe('summarizePhotoCheck — what the assistant may quote', () => {
  const crop: CropName = 'Rice';

  it('names a confident match plainly, with no percentage', () => {
    const summary = summarizePhotoCheck(
      result({ kind: 'match', entry: ENTRY, confidence: 0.72, plantHasHealthyClass: true }),
      crop,
      t,
    );
    expect(summary?.verdict).toContain('The photo shows rice blast');
    expect(summary?.verdict).not.toContain('%');
    expect(summary?.plant).toBeUndefined();
  });

  it('words a tentative match with its own hedge and no percentage', () => {
    const summary = summarizePhotoCheck(
      result({ kind: 'tentative', entry: ENTRY, confidence: 0.3, plantHasHealthyClass: true }),
      crop,
      t,
    );
    expect(summary?.verdict).toContain('The photo may show rice blast');
    expect(summary?.verdict).not.toContain('%');
  });

  it('words a healthy reading without naming any condition', () => {
    const summary = summarizePhotoCheck(
      result({
        kind: 'match',
        entry: { ...ENTRY, finding: { kind: 'healthy' } },
        confidence: 0.88,
        plantHasHealthyClass: true,
      }),
      crop,
      t,
    );
    expect(summary?.verdict).toContain('healthy leaf');
    expect(summary?.verdict).not.toContain('%');
    expect(summary?.verdict).not.toContain('blast');
  });

  it('carries the cross-plant warning with the plant it read', () => {
    const summary = summarizePhotoCheck(
      result({ kind: 'otherPlant', entry: { ...ENTRY, plant: 'Tomato' }, confidence: 0.8 }),
      crop,
      t,
    );
    expect(summary?.verdict).toContain('tomato leaf, not your Rice');
    expect(summary?.plant).toBe('tomato');
  });

  it('returns nothing for the outcomes that carry no usable reading', () => {
    // unsure / unknownClass / otherPlantHealthy are non-results: quoting any of
    // them would dress a non-answer as one (docs/14 §5 for the last).
    expect(
      summarizePhotoCheck(result({ kind: 'unsure', confidence: 0.2 }), crop, t),
    ).toBeUndefined();
    expect(
      summarizePhotoCheck(result({ kind: 'unknownClass', raw: 'mystery' }), crop, t),
    ).toBeUndefined();
    expect(
      summarizePhotoCheck(
        result({
          kind: 'otherPlantHealthy',
          entry: { ...ENTRY, plant: 'Maize', finding: { kind: 'healthy' } },
          confidence: 0.96,
        }),
        crop,
        t,
      ),
    ).toBeUndefined();
  });

  it('carries no confidence number whatever the model scored', () => {
    // The verdict is pre-worded and number-free by construction; this guards
    // the regressions that would put a figure back — a stray interpolation, a
    // future "add the percent back" edit — for every verdict kind.
    const cases = [
      result({ kind: 'match', entry: ENTRY, confidence: 0.698, plantHasHealthyClass: true }),
      result({ kind: 'tentative', entry: ENTRY, confidence: 0.421, plantHasHealthyClass: true }),
      result({
        kind: 'match',
        entry: { ...ENTRY, finding: { kind: 'healthy' } },
        confidence: 0.96,
        plantHasHealthyClass: true,
      }),
    ];
    for (const case_ of cases) {
      expect(summarizePhotoCheck(case_, crop, t)?.verdict).not.toMatch(/\d/);
    }
  });
});
