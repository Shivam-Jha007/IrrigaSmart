import { describe, expect, it } from 'vitest';
import { KNOWLEDGE_CORPUS, MAX_RETRIEVED, retrieve } from '../knowledgeCorpus.js';

/**
 * The knowledge corpus and its retriever (V2.2 RAG foundation).
 *
 * WHAT THESE TESTS GUARD
 * The corpus is the app's own vetted knowledge handed to the model, so two
 * failure modes matter more than coverage:
 *   1. A NO-CHEMICAL invariant — docs/10 §10.2 binds the corpus exactly as it
 *      binds every other path, and a corpus entry drifting into treatment
 *      advice would reach the model with the app's own endorsement.
 *   2. Determinism and honesty of retrieval — the same question must always
 *      ground the same entries, multi-script questions must actually match,
 *      and an unmatched question must retrieve NOTHING rather than
 *      nearest-neighbour guesses the model would then present as sourced.
 */

describe('KNOWLEDGE_CORPUS — invariants', () => {
  it('names a source on every entry', () => {
    for (const entry of KNOWLEDGE_CORPUS) {
      expect(entry.source.length, entry.id).toBeGreaterThan(0);
      expect(entry.text.length, entry.id).toBeGreaterThan(0);
    }
  });

  it('carries multi-script keywords so the corpus exists beyond English', () => {
    // An entry retrievable only by English keywords does not exist for most of
    // this app's farmers. Spot-check one entry per script family.
    const rice = KNOWLEDGE_CORPUS.find((entry) => entry.id === 'crop.rice.water');
    expect(rice?.keywords.some((keyword) => /[\u0900-\u097F]/.test(keyword))).toBe(true); // Devanagari
    expect(rice?.keywords.some((keyword) => /[\u0980-\u09FF]/.test(keyword))).toBe(true); // Bengali/Assamese
  });

  it('contains no plant-protection chemical or dose in any entry', () => {
    // The §10.2 restriction, applied to the corpus itself. The list mirrors
    // FORBIDDEN_TERMS in assistant.ts (kept shorter here to the agronomic
    // families; the sanitizer still guards the model's reply separately).
    const banned =
      /\b(fungicide|pesticide|insecticide|mancozeb|captan|chlorothalonil|carbendazim|tebuconazole|propiconazole|azoxystrobin|streptomycin|bordeaux)\b/i;
    for (const entry of KNOWLEDGE_CORPUS) {
      expect(banned.test(entry.text), `${entry.id} names a chemical`).toBe(false);
    }
  });
});

describe('retrieve — deterministic and honest', () => {
  it('grounds a rice question in the rice entries', () => {
    const entries = retrieve('how much water does my rice need?');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]!.id).toBe('crop.rice.water');
  });

  it('retrieves identically for the same question', () => {
    expect(retrieve('does my onion soil pH matter?')).toEqual(retrieve('does my onion soil pH matter?'));
  });

  it('matches a native-script question', () => {
    // A Bengali farmer asking about rice must ground the same entry as the
    // English one — the keywords carry the scripts, not the question.
    const entries = retrieve('ধানের পানির প্রয়োজন কত?');
    expect(entries.map((entry) => entry.id)).toContain('crop.rice.water');
  });

  it('returns nothing for a question about none of the corpus', () => {
    expect(retrieve('what is the mandi price of gold?')).toEqual([]);
  });

  it('caps the number of retrieved entries', () => {
    // A kitchen-sink question that matches many entries still grounds a
    // bounded prompt.
    const entries = retrieve('rice potato onion tomato clay sandy loam pH water disease');
    expect(entries.length).toBeLessThanOrEqual(MAX_RETRIEVED);
  });

  it('injects into the prompt only when something matched', () => {
    // buildSystemPrompt omits the section header for an empty list; retrieve
    // returns [] for unmatched questions — together, no empty header ever
    // reaches the model. Asserted here at the seam this file owns.
    expect(retrieve('zzz unmatched zzz')).toEqual([]);
  });
});
