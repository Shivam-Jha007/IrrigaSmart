import { describe, expect, it } from 'vitest';
import { buildExplanation, type ExplanationParts } from '../explanationText';
import type { CropName, GrowthStage, IrrigationMethod, Language, SoilType } from '../../types';

/**
 * The delay sentence's soil clause (V2.2 fix).
 *
 * THE INCIDENT THIS FILE GUARDS
 * Until V2.2 the "Delay Irrigation" explanation ended, for EVERY soil, with
 * "On {soil} soil this moisture stays available longer." On sandy soil that is
 * the opposite of the truth — sand holds the least water of any soil in the
 * app — and a farmer who believed it would skip checking a field that dries
 * out fastest. The clause now branches: light soils get a check-again-tomorrow
 * warning, water-holding soils get the holds-well reassurance.
 *
 * These tests walk every soil × language so neither half of the branch can
 * silently become the whole branch again.
 */

const SOILS: readonly SoilType[] = [
  'Sandy',
  'Sandy Loam',
  'Loamy',
  'Silty Loam',
  'Clay Loam',
  'Clay',
];

/** The light-soil half of the branch, per language. */
const DRAINS_QUICKLY: Record<Language, string> = {
  en: 'drains quickly',
  hi: 'जल्दी सूख जाती है',
  bn: 'দ্রুত শুকিয়ে যায়',
  // Assamese renders through the English templates (see VOCAB in
  // explanationText.ts), so its clause is the English one.
  as: 'drains quickly',
  ur: 'جلد خشک ہو جاتی ہے',
};

/** The water-holding half of the branch, per language. */
const HOLDS_WELL: Record<Language, string> = {
  en: 'holds this moisture well',
  hi: 'अच्छी तरह रोक लेती है',
  bn: 'ভালোভাবে ধরে রাখে',
  as: 'holds this moisture well',
  ur: 'اچھی طرح روک لیتی ہے',
};

/** The false claim from the incident, per language — must appear for NO soil. */
const OLD_FALSE_CLAUSE: Record<Language, string> = {
  en: 'stays available longer',
  hi: 'ज़्यादा देर तक बनी रहती है',
  bn: 'বেশি দিন ধরে থাকে',
  as: 'stays available longer',
  ur: 'زیادہ دیر تک دستیاب رہتی ہے',
};

function delayParts(soil: SoilType): ExplanationParts {
  return {
    status: 'Delay Irrigation',
    cropName: 'Rice' as CropName,
    growthStage: 'Mid Season' as GrowthStage,
    soilName: soil,
    method: 'Drip' as IrrigationMethod,
    rainMeaningful: true,
    hot: false,
  };
}

describe('buildExplanation — the delay sentence tells the truth about the soil', () => {
  it.each(SOILS)('on %s the clause matches the soil, in every language', (soil) => {
    for (const language of ['en', 'hi', 'bn', 'as', 'ur'] as const) {
      const explanation = buildExplanation(delayParts(soil), language);
      // Exactly one half of the branch appears, and it is the right one.
      const light = soil === 'Sandy' || soil === 'Sandy Loam';
      expect(explanation.includes(DRAINS_QUICKLY[language]), `${language} ${soil}`).toBe(light);
      expect(explanation.includes(HOLDS_WELL[language]), `${language} ${soil}`).toBe(!light);
      // The pre-fix clause — true for no soil, "longer" than nothing — is gone.
      expect(explanation, `${language} ${soil}`).not.toContain(OLD_FALSE_CLAUSE[language]);
    }
  });

  it('names the soil it is talking about', () => {
    // A clause that does not name the soil it describes cannot be checked by
    // the farmer against the field they are standing in. Native-script names
    // from the vocab in explanationText.ts.
    const sandyName: Record<Language, string> = {
      en: 'sandy',
      hi: 'रेतीली',
      bn: 'বালুকাময়',
      as: 'sandy',
      ur: 'ریتلی',
    };
    for (const language of ['en', 'hi', 'bn', 'as', 'ur'] as const) {
      expect(buildExplanation(delayParts('Sandy'), language), language).toContain(
        sandyName[language],
      );
    }
  });
});
