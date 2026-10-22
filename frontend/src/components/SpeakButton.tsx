import { useEffect, useRef, useState } from 'react';
import type { Language } from '../types';
import { localeFor, type TranslateFn, type TranslationKey } from '../i18n';
import { speakViaChain, stopSpeaking, utteranceStillCurrent } from '../services/speechService';

/**
 * SpeakButton — one card's or panel's pre-built sentence, read aloud.
 *
 * WHY A SHARED COMPONENT (V2.3)
 * The briefing card, the dashboard cards and the header intro all play
 * speech, and each one was one copy of the same rules away from being its own
 * little variant: cancel-on-close, capability-check before render, a label
 * the screen reader can use. One component, one behaviour — and a stop state,
 * because a farmer who taps play by mistake (or wants to answer a call)
 * needs the voice to stop when they tap again.
 *
 * THE CHAIN (V2.4)
 * `speakViaChain` tries, in order: cloud audio cached on the device → Google
 * Cloud synthesis via the backend → the device's own voice (the whole V2.3
 * path, gibberish gate included). A demo machine with no Bengali voice pack
 * still speaks Bengali, because the neural voice comes from the cloud — and a
 * machine with no signal still speaks, because two of the three tiers need
 * no network.
 *
 * THE MISSING-VOICE MESSAGE (V2.3, still the last resort)
 * Only the device tier can return 'noVoice' — no cached audio, no cloud, and
 * no installed voice for the language. This component surfaces that refusal
 * as a visible, translated message telling the farmer which voice to install,
 * rather than leaving a button that does nothing. Silence with an explanation
 * beats garbage audio every time.
 */

interface Props {
  /** The finished sentence(s) to read. Null hides the button (nothing to say). */
  text: string | null;
  /** UI language, e.g. 'bn'. */
  language: Language;
  /** Unique per-instance id so the playing state belongs to THIS button. */
  speakId: string;
  /** Label shown as aria-label/title, e.g. "Play today's briefing". */
  label: string;
  /**
   * Extra class for surfaces whose background needs a different button style
   * (e.g. the dark app header). The base class is always applied.
   */
  variantClass?: string;
  /** Stop when the farmer navigates away (leaving a card must not leave a voice). */
  t: TranslateFn;
}

/** Reactive "something is speaking for this button" state. Poll-free: the
 *  chain is the only writer, via the utterance id it registered. */
function useChainPlaying(speakId: string): readonly [boolean, () => void, (up: boolean) => void] {
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = (): void => {
    stopSpeaking();
    setPlaying(false);
  };

  // While the chain plays, poll the utterance-current flag (cheap: a string
  // compare every 250 ms) so the button flips back to 🔊 when playback ends
  // on its own — the chain resolves asynchronously and the promise settles
  // before the audio element's 'ended' in some engines, so the flag is the
  // single source of truth rather than either event.
  useEffect(() => {
    if (!playing) {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
      return;
    }
    timer.current = setInterval(() => {
      if (!utteranceStillCurrent(speakId)) setPlaying(false);
    }, 250);
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [playing, speakId]);

  return [playing, stop, setPlaying];
}

export function SpeakButton({ text, language, speakId, label, variantClass, t }: Props) {
  const [playing, stop, setPlaying] = useChainPlaying(speakId);
  const [voiceMissing, setVoiceMissing] = useState(false);
  const currentId = useRef<string | null>(null);
  /** Guards a double-tap while the chain's async fetch is still settling. */
  const starting = useRef(false);

  // Leaving the card stops its speech — a voice that keeps talking after its
  // card is gone is a voice the farmer cannot shut up.
  useEffect(
    () => () => {
      if (currentId.current === speakId) {
        stopSpeaking();
        currentId.current = null;
      }
    },
    [speakId],
  );

  if (!text) return null;

  const toggle = (): void => {
    if (starting.current) return;
    if (playing) {
      stop();
      currentId.current = null;
      return;
    }
    setVoiceMissing(false);
    starting.current = true;
    currentId.current = speakId;
    void speakViaChain(text, localeFor(language), speakId).then((outcome) => {
      starting.current = false;
      if (outcome === 'noVoice') {
        currentId.current = null;
        setPlaying(false);
        setVoiceMissing(true);
      }
    });
  };

  return (
    <span className="speak-btn__wrap">
      <button
        type="button"
        className={`speak-btn${variantClass ? ` ${variantClass}` : ''}${playing ? ' speak-btn--playing' : ''}`}
        onClick={toggle}
        aria-label={playing ? t('briefing.stop') : label}
        title={playing ? t('briefing.stop') : label}
        aria-pressed={playing}
      >
        {playing ? '⏹' : '🔊'}
      </button>
      {voiceMissing && (
        <p className="speak-btn__error" role="alert">
          {t('speech.voiceMissing', {
            language: t(`lang.${language}` as TranslationKey),
          })}
        </p>
      )}
    </span>
  );
}
