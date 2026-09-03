import { describe, expect, it } from 'vitest';
import { detectSpokenLanguage } from '../languageDetection';

/**
 * detectSpokenLanguage (item 17 follow-up).
 *
 * The bug this exists to fix: the assistant always replied in Settings →
 * Language, so a farmer whose Settings happened to be English but who spoke or
 * typed Hindi/Bengali/Assamese/Urdu had their transcript recognised correctly
 * and their reply given back in English regardless. These tests pin the
 * script-detection logic that lets a single turn override Settings when the
 * question's own script says otherwise.
 */

describe('detectSpokenLanguage — Devanagari (Hindi)', () => {
  it('detects a plain Hindi sentence', () => {
    expect(detectSpokenLanguage('आज कितना पानी देना है')).toBe('hi');
  });

  it('detects Hindi mixed with Latin digits or English words', () => {
    expect(detectSpokenLanguage('आज 12 बजे पानी दें')).toBe('hi');
    expect(detectSpokenLanguage('मेरा crop maize है')).toBe('hi');
  });
});

describe('detectSpokenLanguage — Bengali script (Bengali vs Assamese)', () => {
  it('detects plain Bengali as bn', () => {
    expect(detectSpokenLanguage('আজ কত জল দিতে হবে')).toBe('bn');
  });

  it('detects Assamese as as when an Assamese-only letter is present', () => {
    // ৰ (RA, U+09F0) and ৱ (VA, U+09F1) exist in the Assamese alphabet and not
    // in standard Bengali orthography — their presence is the decisive signal.
    expect(detectSpokenLanguage('মোৰ পথাৰত পানী লাগে')).toBe('as');
    // Same sentence, using ৱ instead of ৰ, to prove either letter is enough.
    expect(detectSpokenLanguage('মোৱ পথাৱত পানী লাগে')).toBe('as');
  });

  it('falls back to Bengali when the Bengali-script text has no Assamese-only letter', () => {
    // Bengali-script text that happens not to contain র/ৰ or anything else
    // distinguishing at all defaults to the more commonly typed of the two,
    // since neither script fact supports a confident Assamese call.
    expect(detectSpokenLanguage('তোমার নাম কি')).toBe('bn');
  });
});

describe('detectSpokenLanguage — Arabic script (Urdu)', () => {
  it('detects Urdu written in Arabic script', () => {
    expect(detectSpokenLanguage('آج کتنا پانی دینا ہے')).toBe('ur');
  });
});

describe('detectSpokenLanguage — Latin script is deliberately ambiguous', () => {
  it('returns null for plain English', () => {
    expect(detectSpokenLanguage('how much water today?')).toBeNull();
  });

  it('returns null for romanised Hindi, rather than guessing hi', () => {
    // This is the case the module doc calls out explicitly: "kitna pani" is
    // Latin script, identical in kind to English, and guessing here would be
    // less predictable than just deferring to the farmer's own Settings choice.
    expect(detectSpokenLanguage('aaj kitna pani dena hoga')).toBeNull();
  });

  it('returns null for romanised Bengali and Urdu', () => {
    expect(detectSpokenLanguage('aaj koto pani debo')).toBeNull();
    expect(detectSpokenLanguage('aaj kitna pani chahiye')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(detectSpokenLanguage('')).toBeNull();
  });
});

describe('detectSpokenLanguage — mixed input picks up the first identifying script', () => {
  it('detects Hindi even when the sentence also contains Latin words', () => {
    expect(detectSpokenLanguage('मैं maize उगाता हूँ, कितना पानी दूँ?')).toBe('hi');
  });
});
