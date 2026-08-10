/**
 * Voice input and output for the farmer assistant (item 17).
 *
 * WHY VOICE IS PART OF THIS FEATURE AND NOT A NICETY
 * The farmer this app is built for may read slowly, may be holding a spade, and
 * may be looking at a phone in bright sunlight. Typing a question in Devanagari
 * on a phone keyboard is a real barrier; speaking one is not. So voice is
 * offered on equal footing with text, in the farmer's own language.
 *
 * WHY THE SHIM
 * `SpeechRecognition` is not in TypeScript's DOM library: browsers ship it
 * prefixed (`webkitSpeechRecognition` in Chrome, which is what nearly every
 * Android farmer will have) and the standard is still unratified. The minimal
 * interface below declares only what this module actually calls. Declaring it
 * here rather than reaching for `any` keeps `no-explicit-any` intact and means
 * a typo in an event name is a compile error rather than a silent dead mic.
 *
 * WHAT IS DELIBERATELY NOT ASSUMED
 * Recognition is online-only in most browsers — it streams audio to the vendor.
 * That makes it the ONE part of the assistant that cannot work in a field with
 * no signal, which is exactly why it is an alternative input and never the only
 * one. Speech synthesis, by contrast, is usually on-device and does work
 * offline. Both are capability-checked before being offered, so a browser
 * without them shows no dead button.
 */

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechWindow {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as SpeechWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** True when this browser can listen. Checked before showing the mic button. */
export function speechInputSupported(): boolean {
  return recognitionCtor() !== null;
}

/** True when this browser can speak. Checked before showing the speaker button. */
export function speechOutputSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export interface ListenHandlers {
  /** Fired as the farmer speaks, so the input box fills in visibly. */
  onPartial(text: string): void;
  /** Fired once with the final transcript. */
  onFinal(text: string): void;
  /**
   * Fired on failure. `code` is the browser's own error string — 'not-allowed'
   * (permission refused), 'no-speech', 'network', 'audio-capture'. The UI maps
   * these to messages rather than showing the raw code.
   */
  onError(code: string): void;
  onEnd(): void;
}

/** A running recognition session; call stop() to end it early. */
export interface ListenSession {
  stop(): void;
}

/**
 * Start listening in the given BCP-47 locale.
 *
 * Interim results are on so the farmer can see the phone is hearing them —
 * several seconds of a blank box while speaking reads as a broken microphone,
 * and a farmer who cannot tell will simply stop using it.
 *
 * Returns null when unsupported, so the caller never has to guard twice.
 */
export function startListening(locale: string, handlers: ListenHandlers): ListenSession | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = locale;
  // Single-utterance: a farmer asks one question and expects the mic to stop by
  // itself. Continuous mode leaves a hot microphone open on someone's phone.
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (!result) continue;
      const alternative = result[0];
      if (!alternative) continue;
      if (result.isFinal) {
        final += alternative.transcript;
      } else {
        interim += alternative.transcript;
      }
    }
    if (final.trim()) {
      handlers.onFinal(final.trim());
    } else if (interim.trim()) {
      handlers.onPartial(interim.trim());
    }
  };

  recognition.onerror = (event) => {
    handlers.onError(event.error);
  };

  recognition.onend = () => {
    handlers.onEnd();
  };

  try {
    recognition.start();
  } catch {
    // start() throws if a session is already running on this instance. Treat it
    // as a normal failure rather than letting it escape into a React handler.
    handlers.onError('already-started');
    return null;
  }

  return {
    stop() {
      try {
        recognition.stop();
      } catch {
        // Already stopped; nothing to do.
      }
    },
  };
}

/**
 * Read text aloud in the farmer's language.
 *
 * Any utterance already playing is cancelled first: two answers spoken over
 * each other is worse than the second one simply replacing the first, and a
 * farmer tapping the speaker twice expects the second tap to restart it.
 *
 * A missing voice for the locale is not treated as an error. Browsers fall back
 * to a default voice, which reads Devanagari or Bengali imperfectly but
 * audibly — better than silence with no explanation.
 */
export function speak(text: string, locale: string): void {
  if (!speechOutputSupported()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  // Slightly slower than default: this is agronomic advice with numbers in it,
  // often heard once, sometimes over the noise of a field.
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

/** Stop any speech in progress. Called when the panel closes. */
export function stopSpeaking(): void {
  if (!speechOutputSupported()) return;
  window.speechSynthesis.cancel();
}
