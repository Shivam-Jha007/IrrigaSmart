import { useEffect, useState } from 'react';
import type { Crop, Language } from '../types';
import { localeFor, type TranslateFn } from '../i18n';
import type { AssistantContext } from '../services/assistantContext';
import { buildBriefingFragments } from '../services/briefingFragments';
import { prefetchTtsAudio } from '../services/speechService';
import { SpeakButton } from './SpeakButton';

/**
 * TodayBriefingCard — the whole dashboard, spoken and shown (V2.3).
 *
 * THE SUMMARISE BUTTON, DONE THE ONLY WAY IT CAN BE DONE HONESTLY
 * Every line this card shows and speaks is built by `briefingFragments` from
 * the same `AssistantContext` the chat rules read and the same figures the
 * cards render. No model call, no network, no generated prose: the spoken
 * briefing cannot disagree with the dashboard, because it IS the dashboard's
 * own sentences, in order.
 *
 * TEXT FIRST, VOICE SECOND
 * The briefing is always readable as text and only additionally speakable:
 * a farmer in a noisy field, a device with a poor Assamese voice, and a
 * screen-reader user all get the same complete bulletin. The play button
 * reads exactly the lines on screen — never a longer or shorter variant —
 * so what the farmer hears and what they can re-read are one document.
 */

interface Props {
  context: AssistantContext | undefined;
  language: Language;
  /**
   * The selected farm's crop (V2.3). The season fragment needs the crop enum
   * — the context carries only the translated label — so the card receives
   * the crop itself and the briefing opens with the season scene-setter.
   */
  crop?: Crop | undefined;
  t: TranslateFn;
}

export function TodayBriefingCard({ context, language, crop, t }: Props) {
  const [open, setOpen] = useState(false);
  const fragments = buildBriefingFragments(
    context,
    t,
    crop ? { crop: crop.name, language } : undefined,
  );

  const speech = fragments.length > 0 ? fragments.map((fragment) => fragment.text).join(' ') : '';

  // Prefetch the briefing's audio while the farmer is still reading (V2.4):
  // by the time they tap play, the cloud MP3 is already on the device — so
  // the tap plays instantly, and keeps playing if the venue's network dies.
  // Only cloud-served locales (en/hi/bn) do any work; ur/as return at once.
  useEffect(() => {
    if (speech) void prefetchTtsAudio(speech, localeFor(language));
  }, [speech, language]);

  if (fragments.length === 0) return null;

  const firstLine = fragments[0]!.text;

  return (
    <section className="briefing" aria-label={t('briefing.title')}>
      <div className="briefing__head">
        <h3 className="briefing__title">
          <span aria-hidden>📻</span> {t('briefing.title')}
        </h3>
        <SpeakButton
          text={speech}
          language={language}
          speakId="briefing"
          label={t('briefing.play')}
          t={t}
        />
      </div>

      <p className="briefing__lead">{firstLine}</p>

      {fragments.length > 1 && (
        <>
          <button
            type="button"
            className="btn btn--ghost briefing__toggle"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? t('briefing.showLess') : t('briefing.showMore')}
          </button>
          {open && (
            <ul className="briefing__lines">
              {fragments.slice(1).map((fragment) => (
                <li key={fragment.id} className={`briefing__line briefing__line--${fragment.id}`}>
                  {fragment.text}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
