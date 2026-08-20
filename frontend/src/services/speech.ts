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

/**
 * Same-language regional voice-pack alternates to try when the requested
 * BCP-47 locale has no exact match, most-preferred first.
 *
 * WHY THIS TABLE EXISTS — THE BENGALI BUG
 * `localeFor('bn')` (frontend/src/i18n/index.ts) returns 'bn-IN', the correct
 * tag for Bengali as spoken in India. But the Bengali voice pack Chrome and
 * Android actually ship is commonly labelled 'bn-BD' (Bangladesh) — a real,
 * reported Chromium bug (issue 40739658) shows the DEFAULT Bengali voice
 * reporting itself as `{lang: 'bn_BD', name: 'Bengali Bangladesh'}` even on a
 * device set to India. Hindi has no equivalent gap — a dedicated 'hi-IN' voice
 * ships everywhere Bengali does not — which is exactly why Hindi "just works"
 * and Bengali did not: with no voice-picking logic at all, `speak()` set
 * `utterance.lang = 'bn-IN'`, found no voice reporting that exact tag, and the
 * browser silently substituted its own default voice (usually English)
 * reading Bengali script, rather than the Bengali voice that was present all
 * along under a different regional tag. Recognition (`startListening`) can
 * fail the same way in reverse: some engines report 'language-not-supported'
 * for 'bn-IN' while 'bn-BD' would have worked.
 *
 * ONLY SAME-LANGUAGE VARIANTS ARE LISTED, NEVER A DIFFERENT LANGUAGE
 * Assamese and Bengali share a script and much vocabulary, but they are not
 * interchangeable to a farmer's ear, and this table exists to find the RIGHT
 * voice, not a plausible-sounding one. A locale with no listed alternate falls
 * through to its own single-element list below.
 */
const LOCALE_ALTERNATES: Record<string, readonly string[]> = {
  'bn-IN': ['bn-IN', 'bn-BD'],
  'ur-IN': ['ur-IN', 'ur-PK'],
};

/** Alternates to try for a locale, always including the locale itself first. */
export function alternatesFor(locale: string): readonly string[] {
  return LOCALE_ALTERNATES[locale] ?? [locale];
}

/**
 * Normalise a voice/locale tag for comparison.
 *
 * Vendors do not agree on separator or case: the Chromium bug above reports
 * `bn_BD` (underscore) where BCP-47 requires `bn-BD` (hyphen), and some
 * platforms report all-lowercase or all-uppercase region codes. Comparing
 * normalised forms means 'bn-BD', 'bn_BD' and 'BN-bd' are all recognised as the
 * same tag rather than three different ones that all fail to match.
 */
function normaliseLang(lang: string): string {
  return lang.toLowerCase().replace(/_/g, '-');
}

/**
 * Pick the best available voice for a locale from a browser's voice list, or
 * null if nothing usable exists at all.
 *
 * Exported and given a plain array rather than reading `speechSynthesis`
 * itself so the selection logic — the part actually worth getting right — is
 * testable without mocking the whole Web Speech API.
 *
 * Three passes, in order: an exact tag match against each alternate in turn
 * (handles the common case where the right voice IS present under its own
 * tag); then a same-base-language match against ANY voice (handles the
 * Bengali case: 'bn_BD' does not exactly equal 'bn-BD' as a raw string before
 * normalising, and normalising still leaves the vendor free to report the
 * region differently than expected, so matching on just the language subtag
 * is the safety net). Returns null only when no voice for the language exists
 * at all, in which case the caller leaves `utterance.lang` set and accepts the
 * browser's own default-voice fallback — never worse than before this existed.
 */
export function chooseVoice<T extends { lang: string }>(
  voices: readonly T[],
  locale: string,
): T | null {
  if (voices.length === 0) return null;
  const alternates = alternatesFor(locale);

  for (const alt of alternates) {
    const exact = voices.find((v) => normaliseLang(v.lang) === normaliseLang(alt));
    if (exact) return exact;
  }

  const baseLanguage = normaliseLang(alternates[0]!).split('-')[0]!;
  return voices.find((v) => normaliseLang(v.lang).startsWith(baseLanguage)) ?? null;
}

/**
 * Prime the browser's async voice list before the farmer's first tap.
 *
 * Chrome commonly returns an empty array from `getVoices()` until the first
 * call has triggered it to load the list in the background — a well-documented
 * quirk, not a bug in this module. Calling it once early, from
 * `speechOutputSupported()` (already invoked when the panel opens, to decide
 * whether to show the speaker button at all), means the list is very likely
 * populated by the time the farmer actually taps to hear an answer, without
 * making `speak()` itself asynchronous or ever delaying it.
 */
let voicesWarmed = false;
function warmVoices(): void {
  if (voicesWarmed || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  voicesWarmed = true;
  window.speechSynthesis.getVoices();
}

/** True when this browser can listen. Checked before showing the mic button. */
export function speechInputSupported(): boolean {
  return recognitionCtor() !== null;
}

/** True when this browser can speak. Checked before showing the speaker button. */
export function speechOutputSupported(): boolean {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  // Called here, not only inside speak(), so the voice list has as much time as
  // possible to finish loading before the farmer's first tap — see warmVoices().
  if (supported) warmVoices();
  return supported;
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
  /**
   * Fired when the session ends with no result and no error at all.
   *
   * WHY THIS EXISTS
   * Not every browser fires `onerror` for a timeout with no speech detected —
   * some (observed on Android WebView and some Edge builds) simply end the
   * session silently. Without this, the farmer sees the mic icon light up,
   * says something, and watches it turn off again with no explanation at
   * all — indistinguishable from a broken microphone. This handler is the
   * difference between that silence and "I did not hear anything, try again."
   */
  onSilentEnd(): void;
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
 * `locale` is the FIRST of `alternatesFor(locale)` tried — recognition engines
 * (unlike synthesis, see `speak`) give no list to choose from up front, only a
 * pass/fail per attempt, so `FarmerAssistant` retries with the next alternate
 * itself on a `language-not-supported` error rather than this function trying
 * several silently. Kept as a single, explicit-locale function so a retry is a
 * visible second call the caller controls, not a hidden loop in here.
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

  // Tracks whether ANYTHING was reported before the session ended — a final
  // transcript, a partial one, or an explicit error. If `onend` fires with
  // none of those having happened, the session failed silently (see
  // `onSilentEnd` above), and the caller needs to be told so explicitly.
  let reported = false;

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
      reported = true;
      handlers.onFinal(final.trim());
    } else if (interim.trim()) {
      // A non-empty interim result is real progress, even before any final
      // transcript arrives — it proves the engine is hearing something, so a
      // session that later ends without a final result is not "silent" in
      // the sense `onSilentEnd` cares about (that case reads as "try
      // speaking louder / check your connection", not "the mic is dead").
      reported = true;
      handlers.onPartial(interim.trim());
    }
  };

  recognition.onerror = (event) => {
    reported = true;
    handlers.onError(event.error);
  };

  recognition.onend = () => {
    if (!reported) handlers.onSilentEnd();
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
 * `utterance.voice` is set explicitly via `chooseVoice`, not left for the
 * browser to pick from `utterance.lang` alone — see the Bengali note on
 * `LOCALE_ALTERNATES` above for why that distinction matters. Setting `.lang`
 * as well, even once a voice is chosen, is not redundant: it is what the
 * browser falls back to correctly if no voice matched at all, which is still a
 * real case for a browser with no Indic voices installed at all.
 *
 * That "no voice for the locale" case is still not treated as an error.
 * Browsers fall back to a default voice, which reads Devanagari or Bengali
 * imperfectly but audibly — better than silence with no explanation.
 */
export function speak(text: string, locale: string): void {
  if (!speechOutputSupported()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  const voice = chooseVoice(window.speechSynthesis.getVoices(), locale);
  if (voice) utterance.voice = voice;
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
