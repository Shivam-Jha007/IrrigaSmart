import {
  cropLabelKey,
  visionPlantKey,
  visionLabelNameKey,
  diseaseNameKey,
  type TranslateFn,
  type TranslationKey,
} from '../i18n';
import type { VisionResult } from './diseaseVision';
import type { VisionVerdict } from './diseaseVisionMap';

/**
 * The assistant's view of the latest leaf-photo check (V2.2).
 *
 * WHY THIS EXISTS AS ITS OWN MODULE
 * `DiseasePhotoCard` renders the verdict for the farmer's eyes; this turns the
 * SAME verdict into the one or two sentences the assistant quotes. Two reasons
 * it is not inline in either place:
 *
 *  1. THE WORDING IS THE BOUNDARY. "Looks similar to", similarity percent, no
 *     name below the confidence threshold, no all-clear for another plant's
 *     healthy class (docs/14 §5: `Corn_(maize)___healthy` is where this model
 *     puts leaves it does not recognise) — every one of those rules must hold
 *     in the assistant's answer exactly as they hold in the card. Building
 *     both texts from the same translation keys keeps the two paths from
 *     drifting apart in wording, which is how a hedge becomes a claim.
 *
 *  2. THE CARD HOLDS STATE, NOT A SUMMARY. The card keeps the whole
 *     `VisionResult` for rendering (reference images, retake tips); the
 *     assistant wants only the verdict sentence. This module is the only
 *     place that reduction happens, so the offline rule and the backend
 *     prompt receive the identical string.
 *
 * PRE-WORDED, NOT RAW. The caller gets translated sentences, never class ids
 * or confidence numbers to re-word — a model handed "RiceBlast 0.72" will say
 * "your rice has blast", and that sentence is the one this product may never
 * produce.
 */

export interface PhotoCheckSummary {
  /** The verdict sentence, e.g. "The photo looks similar to Rice Blast (72% similar)." */
  verdict: string;
  /** Crop of the photographed plant, set only when it differs from the farm's. */
  plant?: string;
}

/** Whole-number similarity, floor rather than round: 69.8% must not read as 70%. */
function percentText(confidence: number): string {
  return String(Math.floor(confidence * 100));
}

/**
 * The display name for a finding — same rule as the card's `nameKeyFor`:
 * a `known` finding borrows the weather path's disease name so one condition
 * has one name everywhere; a `vision-only` label uses its own.
 */
function nameKeyFor(entry: { finding: { kind: string; disease?: unknown; label?: unknown } }): TranslationKey {
  if (entry.finding.kind === 'known') {
    return diseaseNameKey(entry.finding.disease as Parameters<typeof diseaseNameKey>[0]);
  }
  return visionLabelNameKey(entry.finding.label as Parameters<typeof visionLabelNameKey>[0]);
}

/**
 * Turn the latest photo check into the assistant's summary of it.
 *
 * Returns undefined when the result is not something the assistant should
 * quote at all (unsure / unknown class / other-plant-healthy — the three
 * outcomes that say "no usable reading"), so a farmer asking "what did the
 * photo show?" about a failed check is told to retake rather than handed a
 * non-answer dressed as one.
 */
export function summarizePhotoCheck(
  result: VisionResult,
  crop: Parameters<typeof cropLabelKey>[0],
  t: TranslateFn,
): PhotoCheckSummary | undefined {
  const verdict: VisionVerdict = result.verdict;
  const plantLabel = (plant: Parameters<typeof visionPlantKey>[0]): string =>
    t(visionPlantKey(plant));

  if (verdict.kind === 'unsure' || verdict.kind === 'unknownClass') {
    // No usable reading. The assistant must not paraphrase a non-result into
    // an answer; the caller omits the fields and the question routes to "no
    // photo checked yet" advice.
    return undefined;
  }

  // A healthy class for a plant the farmer is not growing: evidence about
  // nothing (docs/14 §5). Treated as no usable reading for the same reason.
  if (verdict.kind === 'otherPlantHealthy') {
    return undefined;
  }

  if (verdict.kind === 'otherPlant') {
    return {
      verdict: t('assistant.photo.otherPlant', {
        plant: plantLabel(verdict.entry.plant),
        crop: t(cropLabelKey(crop)),
      }),
      plant: plantLabel(verdict.entry.plant),
    };
  }

  // match / tentative, healthy or named — the two kinds with a real reading.
  if (verdict.entry.finding.kind === 'healthy') {
    return { verdict: t('assistant.photo.healthy', { percent: percentText(verdict.confidence) }) };
  }

  const name = t(nameKeyFor(verdict.entry));
  return {
    verdict:
      verdict.kind === 'tentative'
        ? t('assistant.photo.tentative', { name, percent: percentText(verdict.confidence) })
        : t('assistant.photo.match', { name, percent: percentText(verdict.confidence) }),
  };
}
