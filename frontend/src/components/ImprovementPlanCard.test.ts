import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '../types';
import type { CropName, GrowthStage, MeasuredSoilProfile, SoilLayer, SoilType } from '../types';
import type { FarmProfile } from '../app/appTypes';
import { translate, type TranslateFn } from '../i18n';
import {
  buildFarmContext,
  detectFarmIssues,
  resolveIssueVars,
  TOP_ISSUE_COUNT,
  type FarmIssue,
} from '../services';
import { ImprovementPlanCard } from './ImprovementPlanCard';

/**
 * The improvement plan as a farmer sees it (PRD §15).
 *
 * WHAT THIS FILE OWNS
 * Only what the card decides: the empty state, how many items stay open before
 * the rest fold away, and that each item carries its severity, its confidence
 * and at least one thing to do. Which issues exist and in what order is the
 * detectors' judgement and is tested in `services/__tests__/farmImprovement.test.ts`.
 *
 * MOST FIXTURES HERE ARE HAND-WRITTEN `FarmIssue`s
 * The card is presentational; its contract is the `FarmIssue` shape, not the nine
 * detectors. Building the issues by hand is what lets the item-count tests choose
 * a count — no real farm reliably produces five. The last block then renders
 * genuine `detectFarmIssues` output so the two halves are proven to meet.
 */

const t: TranslateFn = (key, vars) => translate('en', key, vars);

function render(issues: readonly FarmIssue[], topCount = TOP_ISSUE_COUNT): string {
  return renderToStaticMarkup(createElement(ImprovementPlanCard, { issues, topCount, t }));
}

/** Each rendered `<li>` for an issue carries both the base class and a modifier. */
function itemCount(markup: string): number {
  return (markup.match(/improve-plan__item improve-plan__item--/g) ?? []).length;
}

/** Split the markup at the expander, so "open" and "folded away" can be counted. */
function aroundDetails(markup: string): { open: string; folded: string } {
  const at = markup.indexOf('<details');
  if (at < 0) return { open: markup, folded: '' };
  return { open: markup.slice(0, at), folded: markup.slice(at) };
}

/**
 * Five issues in ranked order, mirroring what the detectors emit — same keys,
 * same var bags. Two HIGH, one MEDIUM, two LOW, so the top-three cut falls
 * inside the list rather than at a severity boundary.
 */
const FIVE_ISSUES: readonly FarmIssue[] = [
  {
    id: 'ph-mismatch',
    category: 'SOIL',
    severity: 'HIGH',
    confidence: 'Medium',
    titleKey: 'improve.ph.title',
    explanationKey: 'improve.ph.explain',
    actionKeys: ['improve.ph.actionTest', 'improve.ph.actionKvk'],
    vars: { ph: '4.9', min: '6.0', max: '6.8' },
    labelVars: { crop: 'enum.crop.Onion' },
  },
  {
    id: 'disease-pressure',
    category: 'DISEASE',
    severity: 'HIGH',
    confidence: 'High',
    titleKey: 'improve.disease.title',
    explanationKey: 'improve.disease.explain',
    actionKeys: [
      'improve.disease.actionLook',
      'improve.disease.actionPhoto',
      'improve.disease.actionKvk',
    ],
    vars: {},
    labelVars: { disease: 'disease.name.lateBlight' },
  },
  {
    id: 'stale-advice',
    category: 'CLIMATE',
    severity: 'MEDIUM',
    confidence: 'High',
    titleKey: 'improve.weatherData.titleCached',
    explanationKey: 'improve.weatherData.explainCached',
    actionKeys: ['improve.weatherData.action'],
    vars: {},
    labelVars: {},
  },
  {
    id: 'soil-profile-missing',
    category: 'SOIL',
    severity: 'LOW',
    confidence: 'High',
    titleKey: 'improve.soilProfile.title',
    explanationKey: 'improve.soilProfile.explain',
    actionKeys: ['improve.soilProfile.action'],
    vars: {},
    labelVars: { soil: 'enum.soil.Sandy Loam' },
  },
  {
    id: 'fertilizer-table-missing',
    category: 'CROP',
    severity: 'LOW',
    confidence: 'High',
    titleKey: 'improve.fertTable.title',
    explanationKey: 'improve.fertTable.explain',
    actionKeys: ['improve.fertTable.action'],
    vars: {},
    labelVars: { crop: 'enum.crop.Onion' },
  },
];

describe('ImprovementPlanCard — nothing to report', () => {
  const markup = render([]);

  it('says so in words, rather than disappearing', () => {
    // A hidden card leaves the farmer unable to tell "checked, all well" from
    // "broken", so the empty state is rendered as the answer it is.
    expect(markup).toContain(t('improve.title'));
    expect(markup).toContain(t('improve.none'));
    expect(markup).toContain(t('improve.noneHint'));
  });

  it('renders no list, no expander and no provenance disclaimer', () => {
    expect(itemCount(markup)).toBe(0);
    expect(markup).not.toContain('<ol');
    expect(markup).not.toContain('<details');
    expect(markup).not.toContain(t('improve.disclaimer'));
  });

  it('is the only state that shows green', () => {
    // 🟢 means "nothing to do" everywhere else in the app; no severity marker
    // may reuse it, or the list stops reading as a list of things to attend to.
    expect(markup).toContain('🟢');
    expect(render(FIVE_ISSUES)).not.toContain('🟢');
  });
});

describe('ImprovementPlanCard — how much is shown at once', () => {
  it('leaves the top three open and folds the rest behind one expander', () => {
    const { open, folded } = aroundDetails(render(FIVE_ISSUES, 3));
    expect(itemCount(open)).toBe(3);
    expect(itemCount(folded)).toBe(2);
    expect(folded).toContain(t('improve.moreCount', { count: 2 }));
  });

  it('omits the expander entirely when everything fits', () => {
    const markup = render(FIVE_ISSUES.slice(0, 2), 3);
    expect(itemCount(markup)).toBe(2);
    expect(markup).not.toContain('<details');
  });

  it('honours a topCount of one without losing the other four', () => {
    const { open, folded } = aroundDetails(render(FIVE_ISSUES, 1));
    expect(itemCount(open)).toBe(1);
    expect(itemCount(folded)).toBe(4);
  });

  it('keeps the order the detectors ranked', () => {
    const markup = render(FIVE_ISSUES, 5);
    const positions = FIVE_ISSUES.map((issue) =>
      markup.indexOf(t(issue.titleKey, resolveIssueVars(issue, t))),
    );
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('shows the same number of items the Copilot is told about', () => {
    // `assistantContext.topIssues` uses TOP_ISSUE_COUNT too, so "what should I
    // fix?" cannot answer with a different list from the one on screen.
    expect(itemCount(aroundDetails(render(FIVE_ISSUES)).open)).toBe(TOP_ISSUE_COUNT);
  });
});

describe('ImprovementPlanCard — what each item carries', () => {
  const markup = render(FIVE_ISSUES, 5);

  it('marks every item with its severity, in words and not by colour alone', () => {
    expect((markup.match(/🔴/g) ?? []).length).toBe(2);
    expect((markup.match(/🟡/g) ?? []).length).toBe(1);
    expect((markup.match(/🔵/g) ?? []).length).toBe(2);
    expect(markup).toContain(t('improve.severity.HIGH'));
    expect(markup).toContain(t('improve.severity.MEDIUM'));
    expect(markup).toContain(t('improve.severity.LOW'));
    // The icon is decoration on top of the word, so it must not be read out.
    expect(markup).toContain('aria-hidden="true">🔴');
  });

  it('states how sure it is on every single item (Guardrail 6)', () => {
    expect((markup.match(/provenance-chip/g) ?? []).length).toBe(FIVE_ISSUES.length);
    // Same vocabulary as the recommendation card, so the words mean one thing.
    expect(markup).toContain(t('rec.confidenceBadge.medium'));
    expect(markup).toContain(t('rec.confidenceBadge.high'));
  });

  it('gives every item at least one thing the farmer could do', () => {
    const actions = FIVE_ISSUES.reduce((total, issue) => total + issue.actionKeys.length, 0);
    expect((markup.match(/<li>/g) ?? []).length).toBe(actions);
    expect((markup.match(new RegExp(t('improve.actions'), 'g')) ?? []).length).toBe(
      FIVE_ISSUES.length,
    );
  });

  it('closes with what the plan rests on', () => {
    expect(markup).toContain(t('improve.disclaimer'));
    expect(markup.indexOf(t('improve.disclaimer'))).toBeGreaterThan(
      markup.indexOf(t('improve.fertTable.title', { crop: 'Onion' })),
    );
  });
});

describe('ImprovementPlanCard — in every language the app speaks', () => {
  it('leaves no placeholder unfilled and no string empty', () => {
    for (const language of LANGUAGES) {
      const markup = renderToStaticMarkup(
        createElement(ImprovementPlanCard, {
          issues: FIVE_ISSUES,
          topCount: 3,
          t: (key, vars) => translate(language, key, vars),
        }),
      );
      // Covers the card's own chrome as well as the issues — `{count}` in the
      // expander is the one placeholder no detector supplies.
      expect(markup, language).not.toContain('{');
      expect(markup, language).not.toContain('}');
      expect(itemCount(markup), language).toBe(5);
    }
  });

  it('renders the empty state in every language too', () => {
    for (const language of LANGUAGES) {
      const markup = renderToStaticMarkup(
        createElement(ImprovementPlanCard, {
          issues: [],
          topCount: 3,
          t: (key, vars) => translate(language, key, vars),
        }),
      );
      expect(markup, language).not.toContain('{');
      expect(markup, language).toContain(translate(language, 'improve.none'));
    }
  });

  it('translates the enum values inside the sentence, not around it', () => {
    // A Bengali sentence with "Clay Loam" in the middle of it is the failure
    // this guards: the label vars go through the same table as the sentence.
    const bn: TranslateFn = (key, vars) => translate('bn', key, vars);
    const markup = renderToStaticMarkup(
      createElement(ImprovementPlanCard, { issues: FIVE_ISSUES, topCount: 5, t: bn }),
    );
    expect(markup).toContain(translate('bn', 'enum.soil.Sandy Loam'));
    expect(markup).not.toContain('Sandy Loam');
  });
});

// --- Against real detector output ---

function layer(topCm: number, bottomCm: number, phH2O: number): SoilLayer {
  return {
    topCm,
    bottomCm,
    clayPct: 31.2,
    sandPct: 27.4,
    siltPct: 41.4,
    thetaFC: 0.341,
    thetaPWP: 0.192,
    thetaFCSource: 'soilgrids',
    thetaPWPSource: 'saxton-rawls',
    bulkDensity: 1.29,
    organicCarbonPct: 1.6,
    phH2O,
  };
}

function profileFor(crop: CropName, stage: GrowthStage, soil: SoilType): FarmProfile {
  const measured: MeasuredSoilProfile = {
    layers: [layer(0, 5, 4.9), layer(5, 15, 4.9), layer(15, 30, 5.1)],
    usdaTextureClass: 'clay loam',
    provider: 'isric-soilgrids-v2',
    fetchedAt: '2026-08-09T12:00:00+05:30',
    latitude: 23.677,
    longitude: 87.685,
  };
  return {
    farm: {
      id: 'farm-1',
      farmerId: 'farmer-1',
      name: 'Test Field',
      location: { latitude: 23.677, longitude: 87.685, label: 'Test Village' },
      area: 1,
      areaUnit: 'Acre',
      soilType: soil,
      irrigationMethod: 'Drip',
      primaryCropId: 'crop-1',
    },
    crop: {
      id: 'crop-1',
      name: crop,
      growthStage: stage,
      typicalWaterRequirement: 'Moderate',
      category: 'Vegetable',
    },
    soil: { id: 'soil-1', name: soil, waterRetention: 'Moderate', drainage: 'Moderate', measured },
  };
}

describe('ImprovementPlanCard on real detector output', () => {
  const issues = detectFarmIssues(
    buildFarmContext({
      profile: profileFor('Onion', 'Mid Season', 'Loamy'),
      view: null,
      weather: null,
      today: null,
      waterProgress: null,
    }),
  );

  it('renders what the detectors found, in their order and fully interpolated', () => {
    expect(issues.length).toBeGreaterThan(0);
    const markup = render(issues);

    expect(itemCount(markup)).toBe(issues.length);
    expect(markup).not.toContain('{');
    // The projection's own numbers reach the screen intact.
    expect(markup).toContain('4.9');
    expect(markup).toContain('Onion');

    const positions = issues.map((issue) =>
      markup.indexOf(t(issue.titleKey, resolveIssueVars(issue, t))),
    );
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('shows the empty state for a farm with nothing wrong with it', () => {
    const clean = detectFarmIssues(
      buildFarmContext({
        profile: {
          ...profileFor('Rice', 'Mid Season', 'Clay Loam'),
          soil: {
            id: 'soil-1',
            name: 'Clay Loam',
            waterRetention: 'Moderate',
            drainage: 'Moderate',
            measured: {
              layers: [layer(0, 5, 6.2), layer(5, 15, 6.2), layer(15, 30, 6.3)],
              usdaTextureClass: 'clay loam',
              provider: 'isric-soilgrids-v2',
              fetchedAt: '2026-08-09T12:00:00+05:30',
              latitude: 23.677,
              longitude: 87.685,
            },
          },
        },
        view: null,
        weather: null,
        today: null,
        waterProgress: null,
      }),
    );
    expect(clean).toEqual([]);
    expect(render(clean)).toContain(t('improve.none'));
  });
});
