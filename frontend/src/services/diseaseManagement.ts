import type { TranslationKey } from '../i18n';
import type { VisionFinding } from './diseaseVisionMap';

/**
 * Disease management advice for the photo check's findings (V2.3).
 *
 * THE BOUNDARY CHANGE THIS MODULE RECORDS
 * The old product boundary (docs/10 §10.2) banned naming any chemical, dose or
 * spray interval — a ban written for the LLM chatbot, whose invented chemicals
 * could not be checked. That chatbot is gone. What replaces it is the same
 * discipline the Fertilizer page already follows for its State-schedule doses:
 * a CURATED, STATIC, ATTRIBUTED table — not generated text, not a model's
 * guess. The project owner decided this explicitly (V2.3): a farmer told "this
 * is rice blast" and nothing else has a dead end, and official Indian extension
 * sources (State package of practices, CIB&RC-registered products) do publish
 * named chemicals with doses for exactly these diseases.
 *
 * WHAT KEEPS IT HONEST
 *  1. Every entry is written from standard published recommendations (State
 *     Agriculture Department / TNAU package-of-practices style), and the panel
 *     says so — the farmer knows where the advice stands.
 *  2. The KVK line and the label disclaimer are part of the SAME panel, not a
 *     footnote: confirm locally, follow the product label. In India the label
 *     is the legally binding dose.
 *  3. The table is keyed by the model's own finding ids — an unknown finding
 *     gets NO advice rather than nearest-neighbour advice.
 *  4. Non-rice findings get nothing: the check is offered for rice only, and
 *     every entry here is a rice disease.
 *
 * VERIFY BEFORE JUDGING (maintainer note): the doses below are standard
 * published recommendations, written from general extension knowledge — NOT
 * transcribed from the West Bengal booklet the way the fertilizer schedule
 * was. Cross-check each line against the official WB package of practices
 * before a public demo; a wrong dose in a real recommendation is exactly the
 * failure the old boundary existed to prevent.
 */

/** Management advice for one disease, as translation keys + product strings. */
export interface DiseaseManagement {
  /** Ordered field-step sentences (cultural control first). */
  steps: readonly TranslationKey[];
  /** The chemical control sentence: product, formulation, dose. */
  chemical: TranslationKey;
}

/** Management per finding. Rice diseases only — see the module note. */
const MANAGEMENT: Record<string, DiseaseManagement> = {
  riceBlast: {
    steps: ['treat.riceBlast.step1', 'treat.riceBlast.step2'],
    chemical: 'treat.riceBlast.chemical',
  },
  riceBacterialLeafBlight: {
    steps: ['treat.riceBacterialLeafBlight.step1', 'treat.riceBacterialLeafBlight.step2'],
    chemical: 'treat.riceBacterialLeafBlight.chemical',
  },
  riceBrownSpot: {
    steps: ['treat.riceBrownSpot.step1', 'treat.riceBrownSpot.step2'],
    chemical: 'treat.riceBrownSpot.chemical',
  },
  riceSheathBlight: {
    steps: ['treat.riceSheathBlight.step1', 'treat.riceSheathBlight.step2'],
    chemical: 'treat.riceSheathBlight.chemical',
  },
  riceLeafScald: {
    steps: ['treat.riceLeafScald.step1', 'treat.riceLeafScald.step2'],
    chemical: 'treat.riceLeafScald.chemical',
  },
};

/**
 * Management advice for a photo finding, or null when the app has none to
 * give: healthy leaves (nothing to treat), other plants' diseases (not the
 * farmer's crop) and any finding without a curated entry all return null —
 * no advice is better than nearest-neighbour advice.
 */
export function managementFor(finding: VisionFinding): DiseaseManagement | null {
  if (finding.kind === 'healthy') return null;
  const key = finding.kind === 'known' ? finding.disease : finding.label;
  return MANAGEMENT[key] ?? null;
}
