/**
 * Speech output for the audio briefing and card speakers (V2.3).
 *
 * WHY VOICE IS PART OF THIS APP AND NOT A NICETY
 * The farmer this app is built for may read slowly, may be holding a spade, and
 * may be looking at a phone in bright sunlight. The briefing and every card's
 * speaker button turn the dashboard's own sentences into something a farmer can
 * hear in their own language, offline, at no cost.
 *
 * WHAT SURVIVED THE CHATBOT REMOVAL
 * The chat panel (item 17) was removed in V2.3 — its answers drifted from the
 * dashboard, and speech RECOGNITION (its mic) is online-only in every browser,
 * which contradicted the offline-first product. Synthesis is the opposite: it
 * is on-device on every browser that ships Indic voices, works with no network,
 * needs no key, and its output text is built by deterministic code. So the
 * output half of the old voice module survives, now serving the briefing
 * fragment library, and the input half is gone with the chat.
 *
 * WHAT IS DELIBERATELY NOT ASSUMED
 * No browser guarantees any particular voice, so `chooseVoice` picks the best
 * available match and `speak` still works (via the engine's default-voice
 * fallback) when none matches at all. Capability is checked before a speaker
 * button renders, so a browser without synthesis shows no dead button.
 */

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
 * along under a different regional tag.
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
 * `speechOutputSupported()` (already invoked when a briefing card or speaker
 * button first renders, to decide whether to show the button at all), means
 * the list is very likely populated by the time the farmer actually taps to
 * hear the briefing, without making `speak()` itself asynchronous or ever
 * delaying it.
 */
let voicesWarmed = false;
function warmVoices(): void {
  if (voicesWarmed || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  voicesWarmed = true;
  window.speechSynthesis.getVoices();
}

/** True when this browser can speak. Checked before showing a speaker button. */
export function speechOutputSupported(): boolean {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  // Called here, not only inside speak(), so the voice list has as much time as
  // possible to finish loading before the farmer's first tap — see warmVoices().
  if (supported) warmVoices();
  return supported;
}

/**
 * Wait for the browser's async voice list to load, once per session.
 *
 * Chrome returns an EMPTY array from `getVoices()` until the voiceschanged
 * event fires — and on a cold low-end device that can take a second or more.
 * A farmer who taps play in that window used to fall through `chooseVoice`
 * with an empty list, get no voice, and hear the browser's DEFAULT voice read
 * their language: the gibberish case (see `speak`). Waiting briefly here is
 * the difference between "spoke correctly" and "spoke garbage on the first
 * tap" for the very first utterance of a session.
 *
 * Resolves (rather than rejecting) on timeout: the caller then treats an
 * empty list as "no voice" and says so instead of guessing.
 */
let voicesOnce: Promise<void> | null = null;
function waitForVoices(timeoutMs = 2000): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve();
  const synth = window.speechSynthesis;
  if (synth.getVoices().length > 0) return Promise.resolve();
  voicesOnce ??= new Promise<void>((resolve) => {
    const finish = (): void => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    synth.addEventListener('voiceschanged', finish, { once: true });
  });
  return voicesOnce;
}

/** Chunk length for `speak` — below the point where Chrome desktop's
 *  speechSynthesis is known to cut long utterances off mid-sentence. */
export const SPEAK_CHUNK_MAX = 200;

/**
 * Split text into speakable chunks at sentence boundaries (V2.3).
 *
 * WHY CHUNKS AT ALL
 * Chrome desktop's speechSynthesis is widely reported to stop speaking an
 * utterance after roughly 15 seconds — a full spoken briefing runs well past
 * that, so unchunked speech could die halfway with the button still showing
 * "playing". Queuing sentence-sized utterances sidesteps the cutoff entirely:
 * each chunk is short, and the browser queues them seamlessly.
 *
 * Sentence enders cover every script this app speaks: Latin `.!?`, the danda
 * `।`/`॥` shared by Bengali, Assamese and Devanagari, the Arabic question
 * mark `؟` used in Urdu, and newlines. A sentence longer than `maxLen`
 * (a long URL-less chemical line, say) is hard-split — being cut at an
 * arbitrary word beats not being spoken at all.
 */
export function chunkSentences(text: string, maxLen = SPEAK_CHUNK_MAX): string[] {
  const trimmed = text.trim();
  if (trimmed === '') return [];
  const parts = trimmed.match(/[^.!?\u0964\u0965\u061F\n]+[.!?\u0964\u0965\u061F\n]*/g) ?? [trimmed];
  const chunks: string[] = [];
  let current = '';
  for (const part of parts) {
    let rest = part;
    while (current.length + rest.length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = '';
      if (rest.length > maxLen) {
        chunks.push(rest.slice(0, maxLen).trim());
        rest = rest.slice(maxLen);
      } else {
        break;
      }
    }
    current += rest;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((chunk) => chunk.length > 0);
}

/** What `speak` did, so the caller can react to the one failure a farmer can
 *  actually do something about: the missing voice. */
export type SpeakOutcome = 'spoken' | 'noVoice';

/**
 * Read text aloud in the farmer's language.
 *
 * THE GIBBERISH GATE (V2.3) — written after a demo where Bengali speech came
 * out as garbage. Root cause: this function used to set `utterance.lang`,
 * find no matching voice, and speak anyway — and the browser, given no voice
 * but a language tag, substitutes its DEFAULT voice. An English default voice
 * reading Bengali script produces phonetic gibberish. Hindi happened to work
 * on that machine only because a Hindi voice happened to be installed; the
 * app had no way to know either fact.
 *
 * Now: wait for the voice list, and if NO voice exists for the language
 * (including the regional alternates), DO NOT SPEAK AT ALL — return
 * 'noVoice' and let the caller tell the farmer, in text, that the device
 * needs the voice installed. Silence with an explanation is recoverable;
 * gibberish reads as a broken app.
 *
 * When a voice does exist, the text is queued as sentence chunks (see
 * `chunkSentences`) so a long briefing cannot trip Chrome's long-utterance
 * cutoff. `utterance.voice` is still set explicitly — see the Bengali
 * bn-IN/bn-BD note on `LOCALE_ALTERNATES`.
 */
export async function speak(text: string, locale: string): Promise<SpeakOutcome> {
  if (!speechOutputSupported()) return 'noVoice';
  await waitForVoices();
  const synth = window.speechSynthesis;
  const voice = chooseVoice(synth.getVoices(), locale);
  if (!voice) return 'noVoice';

  synth.cancel();
  for (const chunk of chunkSentences(text)) {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = locale;
    utterance.voice = voice;
    // Slightly slower than default: this is agronomic advice with numbers in
    // it, often heard once, sometimes over the noise of a field.
    utterance.rate = 0.95;
    synth.speak(utterance);
  }
  return 'spoken';
}

/** Stop any speech in progress. Called when a card unmounts or a stop is tapped. */
export function stopSpeaking(): void {
  if (!speechOutputSupported()) return;
  window.speechSynthesis.cancel();
}
