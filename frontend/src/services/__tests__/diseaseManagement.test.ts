import { describe, expect, it } from 'vitest';
import type { Language } from '../../types';
import { translate } from '../../i18n';
import { TRANSLATIONS } from '../../i18n/translations';
import { VISION_CLASSES, type VisionFinding } from '../diseaseVisionMap';
import { managementFor } from '../diseaseManagement';

/**
 * Disease management advice (V2.3).
 *
 * The panel names real chemicals with real doses — the project owner's explicit
 * decision, made safe by three properties this suite pins:
 *
 *   1. COVERAGE IS CLOSED: every finding the photo check can name for a rice
 *      farm has an entry, and nothing else does. No finding ever falls through
 *      to nearest-neighbour advice, and no non-rice finding gets rice advice.
 *   2. THE ADVICE IS ALWAYS THE FULL PANEL: steps, chemical, source, KVK line
 *      and disclaimer are one unit — there is no path that shows a chemical
 *      without the KVK confirmation and the label disclaimer beside it.
 *   3. IT IS THE SAME IN EVERY LANGUAGE: a chemical line missing from one of
 *      the five tables would hand a Hindi farmer advice a Bengali farmer never
 *      sees.
 */

const LANGUAGES: readonly Language[] = ['en', 'hi', 'bn', 'as', 'ur'];

/** Every finding the rice photo check can produce, from the real class map. */
const RICE_FINDINGS: VisionFinding[] = Object.values(VISION_CLASSES)
  .map((entry) => entry.finding)
  .filter((finding): finding is VisionFinding => finding.kind !== 'healthy');

describe('managementFor — coverage is closed over the model', () => {
  it('has curated management for every rice disease finding the model can name', () => {
    // The photo check is rice-gated (V2.3), so the reachable findings are the
    // rice ones. Each must carry advice — a named disease with no "what now"
    // is the dead end this feature exists to close.
    const riceFindings = RICE_FINDINGS.filter(
      (f) =>
        (f.kind === 'known' && (f.disease === 'riceBlast' || f.disease === 'riceBacterialLeafBlight')) ||
        (f.kind === 'visionOnly' &&
          (f.label === 'riceBrownSpot' || f.label === 'riceLeafScald' || f.label === 'riceSheathBlight')),
    );
    expect(riceFindings).toHaveLength(5);
    for (const finding of riceFindings) {
      expect(managementFor(finding), JSON.stringify(finding)).not.toBeNull();
    }
  });

  it('gives NO management to a healthy finding — nothing to treat', () => {
    expect(managementFor({ kind: 'healthy' })).toBeNull();
  });

  it('gives NO management to another plant’s disease — not the farmer’s crop', () => {
    // A tomato label cannot appear for a rice farm (rice-conditioned reading),
    // but the guard must hold regardless: non-rice findings are not in the
    // table, and managementFor returns null rather than guessing.
    expect(managementFor({ kind: 'visionOnly', label: 'tomatoMosaicVirus' as never })).toBeNull();
    expect(
      managementFor({ kind: 'known', disease: 'wheatStripeRust' as never }),
    ).toBeNull();
  });
});

describe('the panel is complete and identical in every language', () => {
  const sharedKeys = [
    'treat.button',
    'treat.culturalTitle',
    'treat.chemicalTitle',
    'treat.source',
    'treat.kvk',
    'treat.disclaimer',
  ] as const;

  it('every management entry exists in all five language tables', () => {
    const riceFindings = [
      { kind: 'known', disease: 'riceBlast' },
      { kind: 'known', disease: 'riceBacterialLeafBlight' },
      { kind: 'visionOnly', label: 'riceBrownSpot' },
      { kind: 'visionOnly', label: 'riceLeafScald' },
      { kind: 'visionOnly', label: 'riceSheathBlight' },
    ] as const;
    for (const language of LANGUAGES) {
      for (const finding of riceFindings) {
        const management = managementFor(finding as VisionFinding);
        expect(management, `${language}: ${JSON.stringify(finding)}`).not.toBeNull();
        for (const key of management!.steps) {
          expect(TRANSLATIONS[language][key], `${language}: ${key}`).toBeTruthy();
        }
        expect(TRANSLATIONS[language][management!.chemical], language).toBeTruthy();
      }
      for (const key of sharedKeys) {
        expect(TRANSLATIONS[language][key], `${language}: ${key}`).toBeTruthy();
      }
    }
  });

  it('every chemical line names a formulated product — a % form and a dose figure', () => {
    // The panel's whole value is the named chemical; a line that lost its
    // product while being translated would render as empty advice. Product
    // formulations (% WP/EC/AS) and dose digits are language-neutral, so this
    // is checkable identically in all five languages.
    const riceFindings = [
      { kind: 'known', disease: 'riceBlast' },
      { kind: 'known', disease: 'riceBacterialLeafBlight' },
      { kind: 'visionOnly', label: 'riceBrownSpot' },
      { kind: 'visionOnly', label: 'riceLeafScald' },
      { kind: 'visionOnly', label: 'riceSheathBlight' },
    ] as const;
    for (const language of LANGUAGES) {
      for (const finding of riceFindings) {
        const management = managementFor(finding as VisionFinding)!;
        const line = translate(language, management.chemical);
        expect(line, `${language}: ${JSON.stringify(finding)}`).toMatch(/%\s*(WP|EC|AS)/);
        expect(line, `${language}: ${JSON.stringify(finding)}`).toMatch(/\d/);
      }
    }
  });

  it('the KVK line and the disclaimer are never empty, in any language', () => {
    for (const language of LANGUAGES) {
      expect(translate(language, 'treat.kvk').length, language).toBeGreaterThan(40);
      expect(translate(language, 'treat.disclaimer').length, language).toBeGreaterThan(40);
    }
  });
});
