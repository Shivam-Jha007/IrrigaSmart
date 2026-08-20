import type { Language } from '../types';

/**
 * Detect which of the app's languages a piece of text is actually written in,
 * from its script (item 17 follow-up).
 *
 * WHY THIS EXISTS
 * The assistant always replied in Settings → Language, never in the language
 * the farmer actually typed or spoke. `recognition.lang` is only a HINT to the
 * speech engine about what to expect, not a report of what it heard — the Web
 * Speech API returns text, never a language code. So if Settings is English
 * and a farmer speaks Hindi, the transcript comes back as correct Hindi text,
 * but everything downstream (`FarmerAssistant`'s `t`, the context sent to the
 * backend) was still bound to English, and the reply came back in English —
 * the exact bug reported: "it registers the line but replies in English."
 *
 * WHY SCRIPT, NOT A LANGUAGE-ID MODEL
 * A general-purpose language identifier is unnecessary weight for a five-way
 * choice where four of the five languages each use one distinct Unicode script
 * in this app's supported set. Reading which script a string is written in is
 * exact, needs no model, no network, and no training data — the same "small,
 * certain, and offline" bar every other rule in this codebase holds itself to.
 *
 * THE ONE CASE THIS CANNOT RESOLVE, AND WHY IT RETURNS null RATHER THAN GUESS
 * Latin script is shared by English and by every language's ROMANISED form —
 * "kitna pani" and "how much water" are both Latin script, and nothing about
 * the letters themselves says which. Guessing here would be worse than not
 * guessing: a Bengali farmer typing romanised Bengali would be answered in
 * whatever language the guess landed on, unpredictably. `null` means "stay on
 * Settings language", which is the one answer that was always at least
 * consistent, even before this fix existed.
 *
 * ASSAMESE AND BENGALI SHARE ONE SCRIPT
 * They are not a solved case by script alone. `ৰ` (RA, U+09F0) and `ৱ` (VA,
 * U+09F1) are the two letters that exist in the Assamese alphabet and do not
 * appear in standard Bengali orthography, so their presence is treated as a
 * reliable Assamese signal. Their absence is NOT reliable evidence of Bengali —
 * a short Assamese sentence may simply not use either letter — so
 * Bengali-script text without them defaults to Bengali, the more commonly
 * typed of the two in this app's install base, rather than claiming certainty
 * neither script fact supports.
 */
export function detectSpokenLanguage(text: string): Language | null {
  // Devanagari block (Hindi, plus Marathi/Nepali/Sanskrit — all treated as
  // Hindi here since Hindi is this app's only Devanagari language).
  if (/[\u0900-\u097F]/.test(text)) return 'hi';

  // Bengali/Assamese share the Bengali script block. Check the two
  // Assamese-only letters first; their presence is decisive.
  if (/[\u0980-\u09FF]/.test(text)) {
    return /[\u09F0\u09F1]/.test(text) ? 'as' : 'bn';
  }

  // Arabic script block, used here for Urdu. (Arabic itself is not a
  // supported app language, so any Arabic-script text is treated as Urdu.)
  if (/[\u0600-\u06FF]/.test(text)) return 'ur';

  // Latin script (English, or romanised Hindi/Bengali/Assamese/Urdu) — see
  // the module note above for why this is deliberately not guessed.
  return null;
}
