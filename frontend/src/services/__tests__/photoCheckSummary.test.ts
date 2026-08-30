import { describe, expect, it } from 'vitest';
import { summarizePhotoCheck } from '../photoCheckSummary';
import { translate, type TranslateFn } from '../../i18n';
import type { CropName } from '../../types';
import type { VisionResult } from '../diseaseVision';
import type { VisionVerdict } from '../diseaseVisionMap';

/**
 * The assistant's photo-check summary (V2.2).
 *
 * THE WORDING IS THE BOUNDARY. The card renders "looks similar to", similarity
 * percent, no name below the confidence threshold, and no all-clear for
 * another plant's healthy class (docs/14 §5). These tests assert that the
 * summary the assistant quotes is built from those same rules — a model or an
 * offline rule handed this string cannot re-word it into a diagnosis, because
 * the string already carries its own qualifier. The REAL translator is used,
 * not an identity stub, because the interpolated English sentence is exactly
 * what a farmer (and the model) will read.
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

  it('words a confident match as a resemblance with its percent', () => {
    const summary = summarizePhotoCheck(
      result({ kind: 'match', entry: ENTRY, confidence: 0.72, plantHasHealthyClass: true }),
      crop,
      t,
    );
    expect(summary?.verdict).toContain('similar to rice blast');
    expect(summary?.verdict).toContain('72% similar');
    expect(summary?.verdict).not.toContain('has');
    expect(summary?.plant).toBeUndefined();
  });

  it('words a tentative match differently — weak resemblance, same percent honesty', () => {
    const summary = summarizePhotoCheck(
      result({ kind: 'tentative', entry: ENTRY, confidence: 0.3, plantHasHealthyClass: true }),
      crop,
      t,
    );
    expect(summary?.verdict).toContain('weakly resembles rice blast');
    expect(summary?.verdict).toContain('30% similar');
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
    expect(summary?.verdict).toContain('88% similar');
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

  it('floors the percent — 69.8 must not read as 70', () => {
    // The card displays floor(confidence*100) because 70 is the very threshold
    // the app applied; the assistant's number must match the card's.
    const summary = summarizePhotoCheck(
      result({ kind: 'match', entry: ENTRY, confidence: 0.698, plantHasHealthyClass: true }),
      crop,
      t,
    );
    expect(summary?.verdict).toContain('69% similar');
    expect(summary?.verdict).not.toContain('70%');
  });
});
