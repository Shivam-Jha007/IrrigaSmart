import { useCallback, useEffect, useRef, useState } from 'react';
import type { CropName } from '../types';
import {
  cropLabelKey,
  diseaseNameKey,
  visionErrorKey,
  visionLabelNameKey,
  visionPlantKey,
  type TranslateFn,
  type TranslationKey,
} from '../i18n';
import {
  classifyPhoto,
  creditLineFor,
  managementFor,
  referenceImagesFor,
  visionCoversCrop,
  VISION_ENABLED_CROPS,
  VisionError,
  type VisionFinding,
  type VisionResult,
  type VisionVerdict,
} from '../services';

/**
 * Photo leaf check (V1.7 item 16).
 *
 * Sits beside DiseaseRiskCard. That card reasons from weather and says a disease
 * is FAVOURED; this one looks at a leaf the farmer is holding and names what
 * the on-device model found on it — plainly, and with no percentages.
 *
 * Four deliberate choices, all from docs/12 §Product Boundaries and the
 * roadmap's own note that a confidently wrong model is worse than none:
 *
 *  1. The finding is named plainly ("This is X") and no percentage is shown.
 *     A number the farmer cannot check reads as precision this model does not
 *     have, and it invited reading the figure as a probability of disease.
 *  2. Low confidence shows NO disease name at all. Not a hedged name — none.
 *  3. The check is offered for RICE farms only: every other crop gets the plain
 *     "not offered" message and no picker. The offered list is derived from
 *     VISION_ENABLED_CROPS rather than written into a translated string.
 *  4. A confident HEALTHY reading is only ever shown for the farmer's own crop.
 *     The replacement model is rice-only, so a healthy result is a supported
 *     rice-leaf result rather than a cross-crop fallback.
 */

interface Props {
  readonly crop: CropName;
  readonly t: TranslateFn;
  /**
   * Called once per completed check with the result (or undefined for a failed
   * one). The Dashboard uses this to keep the assistant's "what did the photo
   * show?" answer in step with what the card just showed — the alternative, a
   * summary read back out of this component's state by a sibling, would couple
   * the assistant to the card's internals.
   */
  readonly onResult?: (result: VisionResult | undefined) => void;
}

/** Idle → busy → done/failed. One shot per photo; no queueing. */
type State =
  | { readonly phase: 'idle' }
  | { readonly phase: 'busy' }
  | { readonly phase: 'done'; readonly result: VisionResult }
  | { readonly phase: 'failed'; readonly key: TranslationKey };

export function DiseasePhotoCard({ crop, t, onResult }: Props) {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /**
   * Guards against a stale result overwriting a newer one when the farmer picks
   * a second photo while the first is still running. Compared by identity rather
   * than a counter so it reads unambiguously.
   */
  const activeRun = useRef<object | null>(null);

  const covered = visionCoversCrop(crop);

  // Revoke the object URL when it is replaced or the card unmounts. Without
  // this, every photo leaks a blob for the lifetime of the tab, which matters
  // on the low-end phones this app targets.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const onPick = useCallback(
    async (file: File | undefined) => {
      if (!file) return;

      const run = {};
      activeRun.current = run;
      setPreviewUrl(URL.createObjectURL(file));
      setState({ phase: 'busy' });

      try {
        const result = await classifyPhoto(file, crop);
        if (activeRun.current !== run) return;
        setState({ phase: 'done', result });
        onResult?.(result);
      } catch (error) {
        if (activeRun.current !== run) return;
        // A VisionError carries a code that maps to translated, actionable text.
        // Anything else is a genuine surprise and gets the generic failure
        // rather than leaking an English exception message into a Hindi UI.
        setState({
          phase: 'failed',
          key: visionErrorKey(error instanceof VisionError ? error.code : 'inferenceFailed'),
        });
        // A failed check is also a result: the assistant must not keep quoting
        // an older photo as "the latest" when the farmer just saw this one fail.
        onResult?.(undefined);
      }
    },
    [crop, onResult],
  );

  const reset = useCallback(() => {
    activeRun.current = null;
    setPreviewUrl(null);
    setState({ phase: 'idle' });
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  return (
    <section className="photo-card" aria-labelledby="photo-card-title">
      <header className="photo-card__head">
        <h2 className="photo-card__title" id="photo-card-title">
          {t('vision.title')}
        </h2>
        <span className="photo-card__badge">{t('vision.onDevice')}</span>
      </header>

      {!covered ? (
        <p className="photo-card__blocked" role="note">
          {t('vision.cropNotCovered', {
            crop: t(cropLabelKey(crop)),
            // Derived, and comma-joined rather than run through a conjunction:
            // `Intl.ListFormat` has no Assamese data and would splice an English
            // "and" into an Assamese sentence.
            covered: VISION_ENABLED_CROPS.map((enabled) => t(cropLabelKey(enabled))).join(', '),
          })}
        </p>
      ) : (
        <>
          <p className="photo-card__lede">{t('vision.lede')}</p>

          {state.phase === 'idle' && (
            <>
              <label className="photo-card__pick">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => void onPick(event.target.files?.[0])}
                />
                <span>{t('vision.choose')}</span>
              </label>
              <p className="photo-card__hint">{t('vision.firstUseHint')}</p>
            </>
          )}

          {previewUrl && (
            <img className="photo-card__preview" src={previewUrl} alt={t('vision.previewAlt')} />
          )}

          {/* aria-busy + aria-live so a screen reader announces the wait and
              then the outcome, rather than the result appearing silently. */}
          <div aria-live="polite" aria-busy={state.phase === 'busy'}>
            {state.phase === 'busy' && <p className="photo-card__busy">{t('vision.working')}</p>}

            {state.phase === 'failed' && (
              <p className="photo-card__error" role="alert">
                {t(state.key)}
              </p>
            )}

            {state.phase === 'done' && (
              <Outcome
                verdict={state.result.verdict}
                rawClass={state.result.reading.rawClass}
                crop={crop}
                t={t}
              />
            )}
          </div>

          {state.phase !== 'idle' && state.phase !== 'busy' && (
            <button type="button" className="btn btn--ghost" onClick={reset}>
              {t('vision.again')}
            </button>
          )}

          {/* The caveat and the referral are outside every branch on purpose:
              they apply to a healthy reading and an uncertain one just as much
              as to a named one, so no outcome can appear without them. */}
          <p className="photo-card__caveat">{t('vision.caveat')}</p>
          <p className="photo-card__advice">{t('vision.advice')}</p>
        </>
      )}
    </section>
  );
}
/**
 * Renders one verdict.
 *
 * Split out from the card so each branch is readable on its own — the five
 * outcomes say materially different things and blending them into one paragraph
 * with conditionals is how a hedge turns into a claim. `otherPlantHealthy` is the
 * proof: it used to share the healthy branch, and the result was a confident
 * "healthy" printed under a photo of a diseased onion.
 */
function Outcome({
  verdict,
  rawClass,
  crop,
  t,
}: {
  readonly verdict: VisionVerdict;
  readonly rawClass: string;
  readonly crop: CropName;
  readonly t: TranslateFn;
}) {
  if (verdict.kind === 'unsure') {
    return (
      <div className="photo-card__outcome photo-card__outcome--unsure">
        <p>{t('vision.unsure')}</p>
        <p className="photo-card__tips">{t('vision.retakeTips')}</p>
      </div>
    );
  }

  if (verdict.kind === 'notRiceLeaf') {
    return (
      <div className="photo-card__outcome photo-card__outcome--unsure">
        <p>{t('vision.notRiceLeaf')}</p>
        <p className="photo-card__tips">{t('vision.retakeTips')}</p>
      </div>
    );
  }

  if (verdict.kind === 'unsupportedCondition') {
    return (
      <div className="photo-card__outcome photo-card__outcome--unsure">
        <p>{t('vision.unsupportedCondition')}</p>
        <p className="photo-card__tips">{t('vision.retakeTips')}</p>
      </div>
    );
  }

  if (verdict.kind === 'unknownClass') {
    return (
      <div className="photo-card__outcome photo-card__outcome--unsure">
        <p>{t('vision.unknownClass')}</p>
      </div>
    );
  }

  // A healthy class for a plant the farmer is not growing. No percentage, no
  // health claim, no reference images: the reading is about someone else's crop,
  // and the only useful thing to say is what it does and does not mean.
  if (verdict.kind === 'otherPlantHealthy') {
    return (
      <div className="photo-card__outcome photo-card__outcome--unsure">
        <p className="photo-card__mismatch" role="note">
          {t('vision.otherPlantHealthy', {
            plant: t(visionPlantKey(verdict.entry.plant)),
            crop: t(cropLabelKey(crop)),
          })}
        </p>
        <p className="photo-card__tips">{t('vision.retakeTips')}</p>
      </div>
    );
  }

  const { entry } = verdict;
  const nameKey = entry.finding.kind === 'healthy' ? null : nameKeyFor(entry.finding);
  const referenceImages =
    verdict.kind === 'match' ? referenceImagesFor(rawClass, entry) : [];

  return (
    <div className="photo-card__outcome">
      {verdict.kind === 'otherPlant' && (
        <p className="photo-card__mismatch" role="note">
          {t('vision.otherPlant', {
            plant: t(visionPlantKey(entry.plant)),
            crop: t(cropLabelKey(crop)),
          })}
        </p>
      )}

      {entry.finding.kind === 'healthy' ? (
        <>
          <p className="photo-card__reading">{t('vision.healthy')}</p>
          {/* A healthy leaf is not a healthy field. Saying so is the difference
              between a useful answer and false reassurance. */}
          <p className="photo-card__tips">{t('vision.healthyCaveat')}</p>
        </>
      ) : (
        <>
          <p className="photo-card__reading">
            {t('vision.similarTo', { name: t(nameKey as TranslationKey) })}
          </p>
          {verdict.kind === 'match' && !verdict.plantHasHealthyClass && (
            <p className="photo-card__tips">
              {t('vision.noHealthyClass', { crop: t(cropLabelKey(crop)) })}
            </p>
          )}
          {verdict.kind === 'tentative' && (
            <p className="photo-card__tips">{t('vision.retakeTips')}</p>
          )}
          {referenceImages.length > 0 && (
            <div className="photo-card__references">
              <p className="photo-card__references-title">{t('vision.referenceTitle')}</p>
              <p className="photo-card__references-note">{t('vision.referenceNote')}</p>
              <div className="photo-card__reference-grid">
                {referenceImages.map((image, index) => (
                  <img
                    key={image.src}
                    className="photo-card__reference-image"
                    src={image.src}
                    alt={t('vision.referenceAlt', {
                      name: t(nameKey as TranslationKey),
                      number: index + 1,
                    })}
                    loading="lazy"
                  />
                ))}
              </div>
              {/* One picture beats none, but the farmer should know they are
                  comparing against a single example rather than a pair. */}
              {referenceImages.length === 1 && (
                <p className="photo-card__references-note">{t('vision.referenceSingle')}</p>
              )}
              {/* Derived from the images on screen. The fixed string it replaces
                  credited PlantVillage for the rice photographs, none of which
                  came from PlantVillage — see services/diseaseReference.ts. */}
              <p className="photo-card__reference-credit">
                {t('vision.referenceCredit', { credits: creditLineFor(referenceImages) })}
              </p>
            </div>
          )}

          {/* The help panel (V2.3): what to DO about the named condition —
              field steps, the standard chemical recommendation, the KVK
              pointer and the label disclaimer, one tap away. A finding
              without curated management renders nothing rather than
              nearest-neighbour advice. */}
          <HelpPanel finding={entry.finding} t={t} />
        </>
      )}
    </div>
  );
}

/**
 * The "what can I do?" panel for a named disease finding.
 *
 * Collapsed to a single button under the reading — the verdict is what the
 * farmer came for, the treatment is what they do next, and hiding next steps
 * behind one deliberate tap keeps the reading uncluttered while making the
 * whole journey (reading → steps → chemical → confirm with KVK) reachable.
 *
 * The content itself is curated and static (services/diseaseManagement.ts):
 * cultural steps first, the standard chemical recommendation with its dose,
 * then the KVK confirmation line and the label disclaimer — in that order,
 * because the KVK line applies to the chemical above it.
 */
function HelpPanel({
  finding,
  t,
}: {
  readonly finding: VisionFinding;
  readonly t: TranslateFn;
}) {
  const [open, setOpen] = useState(false);
  const management = managementFor(finding);
  if (!management) return null;

  return (
    <div className="treat">
      <button
        type="button"
        className="treat__toggle"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        🩺 {t('treat.button')}
      </button>
      {open && (
        <div className="treat__panel">
          <p className="treat__steps-title">{t('treat.culturalTitle')}</p>
          <ul className="treat__steps">
            {management.steps.map((stepKey) => (
              <li key={stepKey}>{t(stepKey)}</li>
            ))}
          </ul>
          <p className="treat__chem-title">{t('treat.chemicalTitle')}</p>
          <p className="treat__chem">{t(management.chemical)}</p>
          <p className="treat__source">{t('treat.source')}</p>
          <p className="treat__kvk">{t('treat.kvk')}</p>
          <p className="treat__disclaimer">{t('treat.disclaimer')}</p>
        </div>
      )}
    </div>
  );
}

/**
 * The display name for a finding.
 *
 * A `known` finding borrows the weather path's disease name, so the same
 * condition reads identically whether the app inferred it from humidity or from
 * a photo — two names for one disease in one app is a support burden and a
 * credibility problem.
 *
 * `healthy` is excluded at the type level rather than given a name here: a
 * healthy leaf is not a condition, and it reads as its own sentence rather
 * than being substituted into "This is {name}". The caller must branch on it,
 * and this signature makes forgetting to a compile error.
 */
function nameKeyFor(finding: Exclude<VisionFinding, { kind: 'healthy' }>): TranslationKey {
  return finding.kind === 'known'
    ? diseaseNameKey(finding.disease)
    : visionLabelNameKey(finding.label);
}
