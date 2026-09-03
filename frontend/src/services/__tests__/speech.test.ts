import { describe, expect, it } from 'vitest';
import { alternatesFor, chooseVoice } from '../speech';

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
