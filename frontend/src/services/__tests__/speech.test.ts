import { describe, expect, it } from 'vitest';
import { alternatesFor, chooseVoice, chunkSentences, SPEAK_CHUNK_MAX } from '../speech';

/**
 * Voice selection (Bengali voice-quality fix).
 *
 * The bug: Hindi and English speech sounded fine, Bengali did not. Root cause
 * — `speak()` set `utterance.lang = 'bn-IN'` and left the browser to pick a
 * voice from that tag alone. Chrome/Android's actual Bengali voice pack is
 * commonly reported as 'bn-BD' (a documented Chromium quirk, issue 40739658),
 * so the exact-tag lookup silently missed it and the browser fell back to a
 * default (often English) voice reading Bengali text. These tests pin the
 * fix's selection logic without needing a real `speechSynthesis` — the
 * fixture voices below are exactly the kind of list a real browser reports.
 */

interface FakeVoice {
  lang: string;
  name: string;
}

function voice(lang: string, name = lang): FakeVoice {
  return { lang, name };
}

describe('alternatesFor', () => {
  it('lists bn-IN before its bn-BD alternate', () => {
    expect(alternatesFor('bn-IN')).toEqual(['bn-IN', 'bn-BD']);
  });

  it('lists ur-IN before its ur-PK alternate', () => {
    expect(alternatesFor('ur-IN')).toEqual(['ur-IN', 'ur-PK']);
  });

  it('returns a single-element list for a locale with no known alternate', () => {
    expect(alternatesFor('hi-IN')).toEqual(['hi-IN']);
    expect(alternatesFor('en-IN')).toEqual(['en-IN']);
    expect(alternatesFor('as-IN')).toEqual(['as-IN']);
  });
});

describe('chooseVoice — the exact case that was silently broken', () => {
  it('picks the bn-BD voice for a bn-IN request when no bn-IN voice exists', () => {
    // This is literally the observed Chromium report: a Bengali voice present
    // only under the Bangladesh tag, on a browser asked for the India tag.
    const voices = [voice('en-US', 'Default'), voice('hi-IN', 'Hindi India'), voice('bn-BD', 'Bengali Bangladesh')];
    const chosen = chooseVoice(voices, 'bn-IN');
    expect(chosen?.name).toBe('Bengali Bangladesh');
  });

  it('prefers an exact bn-IN voice over bn-BD when both exist', () => {
    const voices = [voice('bn-BD', 'Bengali Bangladesh'), voice('bn-IN', 'Bengali India')];
    const chosen = chooseVoice(voices, 'bn-IN');
    expect(chosen?.name).toBe('Bengali India');
  });

  it('matches despite underscore-vs-hyphen and case differences', () => {
    // The Chromium bug report itself: lang reported as 'bn_BD', not 'bn-BD'.
    const voices = [voice('BN_bd', 'Bengali Bangladesh (raw report)')];
    const chosen = chooseVoice(voices, 'bn-IN');
    expect(chosen?.name).toBe('Bengali Bangladesh (raw report)');
  });
});

describe('chooseVoice — languages with no known regional gap keep working', () => {
  it('picks the exact hi-IN voice when present', () => {
    const voices = [voice('en-US'), voice('hi-IN', 'Hindi India'), voice('bn-BD')];
    expect(chooseVoice(voices, 'hi-IN')?.name).toBe('Hindi India');
  });

  it('picks the exact en-IN voice when present', () => {
    const voices = [voice('en-IN', 'English India'), voice('hi-IN')];
    expect(chooseVoice(voices, 'en-IN')?.name).toBe('English India');
  });
});

describe('chooseVoice — same-base-language fallback', () => {
  it('falls back to any bn-* voice if neither bn-IN nor bn-BD is present verbatim', () => {
    // e.g. a platform that only ships a generic 'bn' voice with no region.
    const voices = [voice('en-US'), voice('bn', 'Bengali (generic)')];
    expect(chooseVoice(voices, 'bn-IN')?.name).toBe('Bengali (generic)');
  });

  it('never crosses into a different language for the fallback', () => {
    // No Bengali voice of any kind — must not return the Hindi voice just
    // because both are Indic languages sharing a market.
    const voices = [voice('en-US'), voice('hi-IN', 'Hindi India')];
    expect(chooseVoice(voices, 'bn-IN')).toBeNull();
  });
});

describe('chooseVoice — no usable voice at all', () => {
  it('returns null for an empty voice list', () => {
    expect(chooseVoice([], 'bn-IN')).toBeNull();
  });

  it('returns null when nothing matches the language at all', () => {
    const voices = [voice('fr-FR'), voice('de-DE')];
    expect(chooseVoice(voices, 'as-IN')).toBeNull();
  });
});

describe('chunkSentences — long speech is queued, never gibberish-truncated (V2.3)', () => {
  // The incident this suite guards: a long briefing died halfway (Chrome's
  // ~15 s utterance cutoff), and a missing voice played garbage. Chunking
  // fixes the first; the gibberish gate in speak() fixes the second — these
  // tests pin the chunking half.

  it('splits at the danda, so Bengali/Assamese sentences stay whole', () => {
    const text = 'আজ সেচ দিন। প্রায় 12 মিমি জল দিন। বিকেলে আবার দেখুন।';
    // maxLen 25: no two adjacent sentences fit together, each fits alone —
    // the split must land on the danda, never inside a word.
    expect(chunkSentences(text, 25)).toEqual([
      'আজ সেচ দিন।',
      'প্রায় 12 মিমি জল দিন।',
      'বিকেলে আবার দেখুন।',
    ]);
  });

  it('splits at Latin sentence enders and keeps the punctuation attached', () => {
    expect(chunkSentences('Irrigate today. About 12 mm. Done!', 17)).toEqual([
      'Irrigate today.',
      'About 12 mm.',
      'Done!',
    ]);
  });

  it('packs sentences that fit together, never splitting mid-sentence', () => {
    // 10 + 17 = 27 ≤ 30: both sentences ride in ONE chunk — the cutoff is
    // dodged with the fewest possible utterances, and a short text (any
    // briefing line) is spoken as a single utterance, not shredded.
    expect(chunkSentences('Ten chars. More chars here.', 30)).toEqual([
      'Ten chars. More chars here.',
    ]);
    // And when they do NOT fit together, the boundary — not the word — breaks.
    expect(chunkSentences('Ten chars. More chars here.', 20)).toEqual([
      'Ten chars.',
      'More chars here.',
    ]);
  });

  it('never emits a chunk longer than the limit, even without enders', () => {
    const long = 'x'.repeat(500);
    for (const chunk of chunkSentences(long)) {
      expect(chunk.length).toBeLessThanOrEqual(SPEAK_CHUNK_MAX);
    }
  });

  it('hard-splits a single over-long sentence at the limit', () => {
    const chunks = chunkSentences('a'.repeat(450) + '.', 200);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(200);
    expect(chunks[2]).toBe('a'.repeat(50) + '.');
  });

  it('returns nothing for empty or whitespace-only text', () => {
    expect(chunkSentences('')).toEqual([]);
    expect(chunkSentences('   ')).toEqual([]);
  });

  it('joins back to the original text (nothing lost, nothing reordered)', () => {
    const text =
      'আজ সেচ দিন। Give 12.4 mm today — about 18,500 litres. کیا حال ہے؟؟';
    const rejoined = chunkSentences(text).join(' ');
    expect(rejoined.replace(/\s+/g, ' ')).toBe(text.trim().replace(/\s+/g, ' '));
  });
});
