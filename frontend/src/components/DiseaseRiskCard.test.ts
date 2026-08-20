import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Crop } from '../types';
import { translate } from '../i18n';
import {
  WEATHER_REFERENCE_IMAGES,
  weatherReferenceImagesFor,
  type DiseaseRiskAssessment,
} from '../services';
import { DiseaseRiskCard } from './DiseaseRiskCard';

/**
 * Disease watch reference photographs.
 *
 * WHY "ONE OR TWO" AND NOT "EXACTLY TWO"
 * Both cards used to render the reference block only when a disease had exactly
 * two images, which reads as a sensible invariant until you notice what it does
 * to a disease with one: the block disappears entirely and the farmer is shown no
 * picture at all, for a disease the app has a perfectly good picture of. That is
 * how rice bacterial blight and rice tungro ended up picture-less — the images
 * were bundled and attributed, and the count check hid them.
 *
 * The invariant that actually matters is that every image is real, distinct and
 * correctly identified, so that is what is asserted here. The singleton list is
 * spelled out so a pair silently losing an image still fails.
 */

const soybean: Crop = {
  id: 'crop-soybean',
  name: 'Soybean',
  growthStage: 'Mid Season',
  typicalWaterRequirement: 'Moderate',
  category: 'Grain',
};

const rice: Crop = {
  id: 'crop-rice',
  name: 'Rice',
  growthStage: 'Mid Season',
  typicalWaterRequirement: 'High',
  category: 'Cereal',
};

/**
 * The diseases that have exactly one freely licensed, correctly identified
 * photograph. Kept as data so adding a second image to one of these is a
 * deliberate edit here rather than a silent change in rendering. Both entries
 * are documented gaps, not oversights — `ATTRIBUTION.md` lists the candidates
 * that were found and rejected, and why.
 */
const SINGLE_IMAGE_KEYS: readonly string[] = [
  'Rice:riceBlast',
  'Rice:riceBacterialLeafBlight',
  'Sugarcane:sugarcaneRust',
];

function risk(overrides: Partial<DiseaseRiskAssessment>): DiseaseRiskAssessment {
  return {
    crop: 'Soybean',
    disease: 'soybeanRust',
    level: 'High',
    score: 4,
    observedRun: 2,
    forecastRun: 4,
    overcastDays: 0,
    trigger: {
      date: '2026-08-13',
      temperatureMax: 28,
      humidityMean: 85,
      precipitationSum: 4.8,
      drying: null,
    },
    confidence: 'High',
    ...overrides,
  };
}

function render(crop: Crop, assessment: DiseaseRiskAssessment): string {
  return renderToStaticMarkup(
    createElement(DiseaseRiskCard, {
      crop,
      language: 'en',
      t: (key, vars) => translate('en', key, vars),
      risk: assessment,
    }),
  );
}

describe('DiseaseRiskCard reference images', () => {
  it('backs every mapped disease with one or two distinct, non-empty local assets', () => {
    for (const [key, images] of Object.entries(WEATHER_REFERENCE_IMAGES)) {
      expect(images.length, key).toBeGreaterThanOrEqual(1);
      expect(images.length, key).toBeLessThanOrEqual(2);
      expect(new Set(images.map((image) => image.src)).size, key).toBe(images.length);
      for (const image of images) {
        const assetPath = fileURLToPath(new URL(`../../public${image.src}`, import.meta.url));
        expect(readFileSync(assetPath).byteLength, `${key}: ${image.src}`).toBeGreaterThan(0);
      }
    }
  });

  it('has a pair for every disease except the known singletons', () => {
    // The other half of the relaxed count check: "one or two" must not become a
    // licence for a pair to quietly drop to one.
    for (const [key, images] of Object.entries(WEATHER_REFERENCE_IMAGES)) {
      expect(images.length, key).toBe(SINGLE_IMAGE_KEYS.includes(key) ? 1 : 2);
    }
  });

  it('maps every currently supported PlantVillage weather result', () => {
    for (const [crop, disease] of [
      ['Maize', 'maizeTurcicumLeafBlight'],
      ['Maize', 'maizeCommonRust'],
      ['Tomato', 'lateBlight'],
      ['Tomato', 'earlyBlight'],
      ['Potato', 'lateBlight'],
      ['Potato', 'earlyBlight'],
    ] as const) {
      expect(weatherReferenceImagesFor(crop, disease), `${crop}:${disease}`).toHaveLength(2);
    }
  });

  it('shows the photo path and the weather path the same rice pictures', () => {
    // Both cards describe the same disease on the same host. A farmer who checks
    // the watch and then photographs a leaf must not be shown a picture by one
    // and nothing by the other — and must not be shown a DIFFERENT picture,
    // which is why these read from the same arrays rather than parallel copies.
    expect(weatherReferenceImagesFor('Rice', 'riceBlast')).toHaveLength(1);
    expect(weatherReferenceImagesFor('Rice', 'riceBacterialLeafBlight')).toHaveLength(1);
  });

  it('renders both local soybean-rust references for a probable weather risk', () => {
    const markup = render(soybean, risk({}));

    expect(markup).toContain('/disease-reference/soybean-rust/1.jpg');
    expect(markup).toContain('/disease-reference/soybean-rust/2.jpg');
    expect(markup.match(/<img/g) ?? []).toHaveLength(2);
    // A pair says nothing about being a pair.
    expect(markup).not.toContain(translate('en', 'vision.referenceSingle'));
  });

  it('shows the one photo, and says it is one, when only one exists', () => {
    // The case the old `=== 2` gate blanked. Rice bacterial blight has a single
    // CC-licensed, host-verified photograph; showing it beats showing nothing,
    // and the farmer is told they are comparing against one example.
    const markup = render(
      rice,
      risk({ crop: 'Rice', disease: 'riceBacterialLeafBlight', level: 'Moderate', score: 2 }),
    );

    expect(markup).toContain('/disease-reference/rice-bacterial-blight/1.jpg');
    expect(markup.match(/<img/g) ?? []).toHaveLength(1);
    expect(markup).toContain(translate('en', 'vision.referenceSingle'));
    expect(markup).toContain(translate('en', 'vision.referenceTitle'));
  });

  it('credits the photographer of the image it is actually showing', () => {
    // This card used to print "USDA reference images · Public domain / CC BY 3.0"
    // beside every photograph it displayed, including LandCare's CC BY-SA 3.0
    // groundnut images and PlantVillage's CC BY-SA 3.0 tomato images. Both those
    // licences require the author and the licence to be named, so the constant
    // was a licence breach as well as a false statement.
    const groundnut: Crop = { ...soybean, id: 'crop-groundnut', name: 'Groundnut' };
    const markup = render(groundnut, risk({ crop: 'Groundnut', disease: 'groundnutRust' }));

    expect(markup).toContain('LandCare Ltd. New Zealand (EcoPort)');
    expect(markup).toContain('CC BY-SA 3.0');
    // The two images share one source, so the credit appears once, not twice.
    expect(markup.match(/LandCare/g) ?? []).toHaveLength(1);
    expect(markup).not.toContain('USDA');
  });

  it('credits each source separately when a pair has two', () => {
    const onion: Crop = { ...soybean, id: 'crop-onion', name: 'Onion' };
    const markup = render(onion, risk({ crop: 'Onion', disease: 'onionDownyMildew' }));

    expect(markup).toContain('Howard F. Schwartz, Colorado State University (Bugwood.org)');
    expect(markup).toContain('Jochen Kreiselmaier, DLR Rheinpfalz');
    expect(markup).toContain('CC BY 4.0');
  });
});
