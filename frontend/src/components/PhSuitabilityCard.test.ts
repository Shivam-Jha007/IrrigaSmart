import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '../types';
import type { Crop, MeasuredSoilProfile, Soil, SoilLayer } from '../types';
import { translate, type TranslateFn } from '../i18n';
import type { SoilFetchStatus } from '../app/appTypes';
import { PhSuitabilityCard } from './PhSuitabilityCard';

/**
 * The pH card as a farmer sees it.
 *
 * WHAT THIS FILE OWNS
 * The four states the card can be in, and one guardrail. Whether a given pH is
 * suitable for a given crop is `cropPhKnowledge`'s judgement and is tested in
 * `services/__tests__/cropPhKnowledge.test.ts`; whether a profile yields a pH at
 * all is `topsoilPh`'s and is tested in `services/__tests__/soilProfile.test.ts`.
 *
 * WHY THE EMPTY STATES ARE THE INTERESTING PART
 * The card was reported as "the pH scale isn't working" while nothing about the
 * scale was wrong: the soil profile behind it had stopped arriving, and the card
 * had exactly one thing to say about that — "not available" — which reads as a
 * broken feature rather than as a fetch in progress. The three assertions below
 * are what keep those three situations distinguishable on screen.
 */

const t: TranslateFn = (key, vars) => translate('en', key, vars);

function layer(topCm: number, bottomCm: number, phH2O: number | null): SoilLayer {
  return {
    topCm,
    bottomCm,
    clayPct: 28.3,
    sandPct: 28.4,
    siltPct: 43.3,
    thetaFC: 0.332,
    thetaPWP: 0.184,
    thetaFCSource: 'soilgrids',
    thetaPWPSource: 'saxton-rawls',
    bulkDensity: 1.31,
    organicCarbonPct: 1.82,
    phH2O,
  };
}

function measured(phH2O: number | null): MeasuredSoilProfile {
  return {
    layers: [layer(0, 5, phH2O), layer(5, 15, phH2O)],
    usdaTextureClass: 'clay loam',
    provider: 'isric-soilgrids-v2',
    fetchedAt: '2026-08-09T12:00:00+05:30',
    latitude: 23.677,
    longitude: 87.685,
  };
}

/** Rice, whose optimal band is well documented and comfortably wide. */
const CROP: Crop = {
  id: 'c1',
  name: 'Rice',
  growthStage: 'Development',
  typicalWaterRequirement: 'High',
  category: 'Cereal',
};

function soil(profile: MeasuredSoilProfile | undefined): Soil {
  const base: Soil = {
    id: 's1',
    name: 'Clay Loam',
    waterRetention: 'High',
    drainage: 'Moderate',
  };
  // `exactOptionalPropertyTypes`: spreading `measured: undefined` is not
  // assignable to `measured?`, so the key is added or it is not.
  return profile ? { ...base, measured: profile } : base;
}

function render(
  profile: MeasuredSoilProfile | undefined,
  fetchStatus: SoilFetchStatus | null,
): string {
  return renderToStaticMarkup(
    createElement(PhSuitabilityCard, { crop: CROP, soil: soil(profile), fetchStatus, t }),
  );
}

describe('PhSuitabilityCard — the reading', () => {
  it('shows the pH with its provenance chip, never as a bare measurement', () => {
    // PRD §28 Guardrail 1. The number is an ISRIC SoilGrids prediction for a
    // 250 m cell, and a farmer who reads it as a lab result may lime a field on
    // the strength of a figure describing their neighbours' land as much as
    // their own — so the chip and the caveat sentence are load-bearing, not
    // decoration.
    const markup = render(measured(6.4), null);
    expect(markup).toContain('Estimated soil pH: 6.4');
    expect(markup).toContain(translate('en', 'provenance.REGIONAL_ESTIMATE'));
    expect(markup).toContain('not a test of your field');
    expect(markup).not.toContain('Measured');
  });

  it('names the crop and its optimal band alongside the verdict', () => {
    const markup = render(measured(6.4), null);
    expect(markup).toContain('Optimal for Rice');
    expect(markup).toContain(translate('en', 'ph.level.suitable'));
  });
});

describe('PhSuitabilityCard — which empty state', () => {
  it('says the soil map is still being read while a fetch is in flight', () => {
    // The common case, and the one that looked like a bug: the profile is
    // fetched in the background and the query takes tens of seconds.
    const markup = render(undefined, 'pending');
    expect(markup).toContain(translate('en', 'ph.pending'));
    expect(markup).not.toContain(translate('en', 'ph.unavailable'));
  });

  it('says the soil map could not be reached when the backend is unreachable', () => {
    const markup = render(undefined, 'unreachable');
    expect(markup).toContain(translate('en', 'ph.unreachable'));
    expect(markup).not.toContain(translate('en', 'ph.unavailable'));
  });

  it('falls back to the settled message for no data and for no status at all', () => {
    // Both mean the app asked and got nothing usable, which retrying will not
    // change — so they read the same, deliberately.
    expect(render(undefined, 'noData')).toContain(translate('en', 'ph.unavailable'));
    expect(render(undefined, null)).toContain(translate('en', 'ph.unavailable'));
  });

  it('prefers a real reading over any fetch status', () => {
    // A background refetch for a farm that already has a profile must not blank
    // the verdict it is already showing.
    const markup = render(measured(6.4), 'pending');
    expect(markup).toContain('Estimated soil pH: 6.4');
    expect(markup).not.toContain(translate('en', 'ph.pending'));
  });

  it('shows the settled message when the profile has no pH at any topsoil depth', () => {
    // A measured profile whose pH values are all null: the fetch succeeded, so
    // there is no status, and there is still nothing to compare.
    expect(render(measured(null), null)).toContain(translate('en', 'ph.unavailable'));
  });
});

describe('PhSuitabilityCard — every language', () => {
  it('renders each state in all five languages with no unfilled placeholder', () => {
    for (const language of LANGUAGES) {
      const localised: TranslateFn = (key, vars) => translate(language, key, vars);
      for (const state of [
        { profile: measured(6.4), status: null },
        { profile: undefined, status: 'pending' as const },
        { profile: undefined, status: 'unreachable' as const },
        { profile: undefined, status: 'noData' as const },
      ]) {
        const markup = renderToStaticMarkup(
          createElement(PhSuitabilityCard, {
            crop: CROP,
            soil: soil(state.profile),
            fetchStatus: state.status,
            t: localised,
          }),
        );
        // A `{crop}` or `{ph}` left in the output means a translation dropped a
        // placeholder — the failure mode that only shows up in one language.
        expect(markup, `${language} / ${state.status ?? 'reading'}`).not.toMatch(/\{[a-zA-Z]+\}/);
        expect(markup.length).toBeGreaterThan(0);
      }
    }
  });
});
