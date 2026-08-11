import { useCallback, useEffect, useRef, useState } from 'react';
import type { CropName, Language } from '../types';
import {
  cropLabelKey,
  diseaseNameKey,
  localeFor,
  visionErrorKey,
  visionLabelNameKey,
  visionPlantKey,
  type TranslateFn,
  type TranslationKey,
} from '../i18n';
import {
  classifyPhoto,
  visionCoversCrop,
  VisionError,
  type VisionFinding,
  type VisionResult,
  type VisionVerdict,
} from '../services';

/**
 * Photo leaf check (V1.7 item 16).
 *
 * Sits beside DiseaseRiskCard. That card reasons from weather and says a disease
 * is FAVOURED; this one looks at a leaf the farmer is holding and says what it
 * RESEMBLES. Neither diagnoses, and this component's job is largely to keep the
 * second from being mistaken for the first.
 *
 * Three deliberate choices, all from docs/12 §Product Boundaries and the
 * roadmap's own note that a confidently wrong model is worse than none:
 *
 *  1. Nothing is claimed to be present. Every result reads "looks similar to
 *     photos of X", and the percentage is labelled similarity, not probability.
 *  2. Low confidence shows NO disease name at all. Not a hedged name — none.
 *  3. Uncovered crops (seven of ten, Rice included) are told so up front, and
 *     the picker is not offered. A rice farmer gets an honest "not trained on
 *     rice" instead of a confident tomato answer.
 */

interface Props {
  readonly crop: CropName;
  readonly language: Language;
  readonly t: TranslateFn;
}

/** Idle → busy → done/failed. One shot per photo; no queueing. */
type State =
  | { readonly phase: 'idle' }
  | { readonly phase: 'busy' }
  | { readonly phase: 'done'; readonly result: VisionResult }
  | { readonly phase: 'failed'; readonly key: TranslationKey };

export function DiseasePhotoCard({ crop, language, t }: Props) {
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
      } catch (error) {
        if (activeRun.current !== run) return;
        // A VisionError carries a code that maps to translated, actionable text.
        // Anything else is a genuine surprise and gets the generic failure
        // rather than leaking an English exception message into a Hindi UI.
        setState({
          phase: 'failed',
          key: visionErrorKey(error instanceof VisionError ? error.code : 'inferenceFailed'),
        });
      }
    },
    [crop],
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
            covered: t('vision.coveredCrops'),
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
              <Outcome verdict={state.result.verdict} crop={crop} language={language} t={t} />
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
 * Split out from the card so each branch is readable on its own — the four
 * outcomes say materially different things and blending them into one paragraph
 * with conditionals is how a hedge turns into a claim.
 */
function Outcome({
  verdict,
  crop,
  language,
  t,
}: {
  readonly verdict: VisionVerdict;
  readonly crop: CropName;
  readonly language: Language;
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

  if (verdict.kind === 'unknownClass') {
    return (
      <div className="photo-card__outcome photo-card__outcome--unsure">
        <p>{t('vision.unknownClass')}</p>
      </div>
    );
  }

  const { entry, confidence } = verdict;
  const percent = formatPercent(confidence, language);

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
          <p className="photo-card__reading">{t('vision.healthy', { percent })}</p>
          {/* A healthy leaf is not a healthy field. Saying so is the difference
              between a useful answer and false reassurance. */}
          <p className="photo-card__tips">{t('vision.healthyCaveat')}</p>
        </>
      ) : (
        <p className="photo-card__reading">
          {t('vision.similarTo', { name: t(nameKeyFor(entry.finding)), percent })}
        </p>
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
 * healthy leaf is not a condition, and it needs the percentage woven into its
 * own sentence ("looks healthy, N% similar") instead of being substituted into
 * "looks similar to {name}". The caller must branch on it, and this signature
 * makes forgetting to a compile error.
 */
function nameKeyFor(finding: Exclude<VisionFinding, { kind: 'healthy' }>): TranslationKey {
  return finding.kind === 'known'
    ? diseaseNameKey(finding.disease)
    : visionLabelNameKey(finding.label);
}

/**
 * Similarity as a whole number, in the user's numerals.
 *
 * Rounded down rather than nearest: 69.8% must not display as "70%" when 70 is
 * the threshold the app just applied. Locale-aware so Hindi and Bengali get
 * their own digits, matching how percentages already render elsewhere.
 */
function formatPercent(confidence: number, language: Language): string {
  const whole = Math.floor(confidence * 100);
  try {
    return new Intl.NumberFormat(localeFor(language)).format(whole);
  } catch {
    return String(whole);
  }
}
