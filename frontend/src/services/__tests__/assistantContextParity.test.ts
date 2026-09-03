import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * `AssistantContext` is declared twice, and the two copies must not drift.
 *
 * WHY THERE ARE TWO COPIES AT ALL
 * One object serves both answer paths. `assistantRules.ts` reads it on the device
 * to answer offline; if the rules cannot answer, the very same object is POSTed to
 * the backend and `assistant.ts` turns it into prompt lines. The frontend cannot
 * import the backend type — separate workspaces, separate tsconfigs, and the
 * backend is not a published package — so the shape is written out in both places.
 *
 * WHY A TEST AND NOT A COMMENT
 * A comment asking two files to stay in step is a comment that will eventually be
 * wrong. The failure mode is quiet and expensive: add `soilPh` to the frontend and
 * forget the backend, and the field is dropped silently on the wire. The offline
 * answer then states the pH with its estimate caveat while the model, never having
 * been told the figure exists, answers the same question from nothing — or worse,
 * obliges with a number of its own. The farmer sees two different answers to one
 * question and has no way to tell which was working from the truth. That is a
 * §28 Guardrail 1 breach reached purely by omission, so it is asserted.
 *
 * WHY IT READS SOURCE TEXT
 * TypeScript interfaces do not exist at runtime, and there is no shared build step
 * that could compare them. Reading the two declarations as text is crude but it is
 * checkable, cheap, and it fails loudly on exactly the mistake it is guarding —
 * which a structural type test cannot do, because a missing optional field is
 * assignable in both directions.
 */

const FRONTEND_SOURCE = fileURLToPath(new URL('../assistantRules.ts', import.meta.url));
const BACKEND_SOURCE = fileURLToPath(
  new URL('../../../../backend/src/assistant.ts', import.meta.url),
);

const DECLARATION = 'export interface AssistantContext {';

/**
 * Read the `AssistantContext` declaration and return field name → `?: type`.
 *
 * The type is part of the key comparison, not just the name: `soilPh?: number`
 * on one side and `soilPh?: string` on the other would serialise happily and
 * then format differently in the two answers.
 *
 * Both bodies are flat lists of optional primitives, so the first line-initial
 * `}` ends the interface. If either ever gains a nested object literal this
 * throws rather than reading half the fields — a parity test that quietly stops
 * covering half the shape is worse than no test at all.
 */
function signatures(path: string): Map<string, string> {
  const source = readFileSync(path, 'utf8');
  const start = source.indexOf(DECLARATION);
  if (start < 0) throw new Error(`${path}: no ${DECLARATION.trim()} found`);
  const end = source.indexOf('\n}', start);
  if (end < 0) throw new Error(`${path}: AssistantContext declaration is unterminated`);

  const body = source
    .slice(start + DECLARATION.length, end)
    // Comments go first. The docblocks in here quote field names in prose
    // ('`soilPhProvenance` says MEASURED'), and a commented-out field would
    // otherwise be scraped as a real one.
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');

  if (/[{}]/.test(body)) {
    throw new Error(`${path}: AssistantContext gained a nested type — update this test`);
  }

  const out = new Map<string, string>();
  for (const match of body.matchAll(/^\s*(\w+)(\?)?:\s*([^;]+);/gm)) {
    const name = match[1] as string;
    const type = (match[3] as string).trim();
    out.set(name, `${match[2] === '?' ? '?' : ''}: ${type}`);
  }
  return out;
}

describe('AssistantContext — the wire contract is identical on both sides', () => {
  const frontend = signatures(FRONTEND_SOURCE);
  const backend = signatures(BACKEND_SOURCE);

  it('actually parsed both declarations', () => {
    // A regex that matched nothing would make every assertion below vacuous.
    expect(frontend.size).toBeGreaterThan(30);
    expect(backend.size).toBe(frontend.size);
  });

  it('declares the same field names in both copies', () => {
    // Sorted so a failure reads as a diff of names rather than a complaint about
    // declaration order, which does not matter.
    expect([...backend.keys()].sort()).toEqual([...frontend.keys()].sort());
  });

  it('gives every field the same type in both copies', () => {
    for (const [name, signature] of frontend) {
      expect(backend.get(name), `${name} differs between the two copies`).toBe(signature);
    }
  });

  it('keeps every field optional in both copies', () => {
    // Not cosmetic. The farmer may ask before a farm exists, mid-onboarding, or
    // offline with no cached weather, so every field genuinely can be absent —
    // and a required field on the backend copy would reject those questions
    // rather than answering from what little the app does have.
    for (const [source, map] of [
      ['frontend', frontend],
      ['backend', backend],
    ] as const) {
      for (const [name, signature] of map) {
        expect(signature.startsWith('?'), `${source} ${name} is not optional`).toBe(true);
      }
    }
  });

  it('carries the provenance fields the guardrails are built on', () => {
    // Named explicitly rather than left to the parity check alone: parity would
    // still pass if both copies dropped them together, and these are the fields
    // that stop a 250 m map prediction being spoken as a field measurement.
    for (const name of [
      'soilPh',
      'soilPhProvenance',
      'soilPhOrigin',
      'phSuitability',
      'phOptimalMin',
      'phOptimalMax',
      'soilTextureClass',
      'soilTextureProvenance',
      'organicCarbonPct',
      'soilTypeProvenance',
      'weatherProvenance',
      'soilMoistureProvenance',
      'topIssues',
    ]) {
      expect(frontend.has(name), `frontend lost ${name}`).toBe(true);
      expect(backend.has(name), `backend lost ${name}`).toBe(true);
    }
  });
});
