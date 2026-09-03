import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CropName, Language } from '../types';
import { cropLabelKey, translate } from '../i18n';
import { TRANSLATIONS } from '../i18n/translations';
import { COVERED_CROPS, SUPPORTED_CROPS, visionCoversCrop } from '../services';
import { DiseasePhotoCard } from './DiseasePhotoCard';

/**
 * Photo leaf check — the coverage message.
 *
 * The uncovered-crop branch is the only part of this card that renders without a
 * model, a camera or a worker, which makes it the only part worth asserting from
 * a static render. It is also the part that went wrong: the covered-crop list
 * used to be a hard-coded phrase inside each translation, and it stayed at three
 * crops for two months after the retrain made it four. A farmer growing cotton
 * was shown a confident, factually false claim about what the app can do.
 *
 * So the list is derived from COVERED_CROPS now, and this asserts the derivation
 * in all five languages — because a stale translated string is exactly the kind
 * of defect a typecheck cannot see.
 */

const LANGUAGES: readonly Language[] = ['en', 'hi', 'bn', 'as', 'ur'];

/** A crop the model has no classes for. Cotton, today. */
const UNCOVERED: CropName = 'Cotton';

function render(crop: CropName, language: Language): string {
  return renderToStaticMarkup(
    createElement(DiseasePhotoCard, {
      crop,
      t: (key, vars) => translate(language, key, vars),
    }),
  );
}

/**
 * The card names the farmer's own crop twice in the same sentence, so a plain
 * `toContain` on a covered-crop label could be satisfied by the wrong occurrence
 * if the two ever coincide. This strips the farmer's crop label out first.
 */
function markupWithoutCropName(language: Language): string {
  const own = translate(language, cropLabelKey(UNCOVERED));
  return render(UNCOVERED, language).split(own).join('');
}

describe('DiseasePhotoCard coverage message', () => {
  it('is the uncovered branch that is under test', () => {
    // Guards the fixture: if a retrain covers cotton, this test is measuring
    // nothing and should be pointed at whatever is still uncovered.
    expect(visionCoversCrop(UNCOVERED)).toBe(false);
    expect(SUPPORTED_CROPS).toContain(UNCOVERED);
  });

  it('names every covered crop, in every language', () => {
    for (const language of LANGUAGES) {
      const markup = render(UNCOVERED, language);
      for (const covered of COVERED_CROPS) {
        const label = translate(language, cropLabelKey(covered));
        expect(markup, `${language}: ${covered}`).toContain(label);
      }
    }
  });

  it('names rice specifically, the crop the stale string omitted', () => {
    for (const language of LANGUAGES) {
      expect(markupWithoutCropName(language), language).toContain(
        translate(language, cropLabelKey('Rice')),
      );
    }
  });

  it('does not offer the picker for a crop the model cannot read', () => {
    const markup = render(UNCOVERED, 'en');
    expect(markup).toContain('photo-card__blocked');
    expect(markup).not.toContain('<input');
    expect(markup).not.toContain(translate('en', 'vision.choose'));
  });

  it('offers the picker for a covered crop', () => {
    // The other half: the message must not be blocking crops the model handles.
    const markup = render('Rice', 'en');
    expect(markup).toContain('<input');
    expect(markup).toContain(translate('en', 'vision.choose'));
    expect(markup).not.toContain('photo-card__blocked');
  });

  it('has dropped the hard-coded covered-crop string entirely', () => {
    // Not merely unused — gone. Leaving it in the table invites the next author
    // to reach for it, and it would still be wrong.
    for (const language of LANGUAGES) {
      expect(Object.keys(TRANSLATIONS[language]), language).not.toContain('vision.coveredCrops');
    }
  });
});
