import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { CropName } from '../../types';
import { SUPPORTED_CROPS } from '../knowledgeBase';
import { CROP_DISEASES } from '../diseaseKnowledge';
import {
  COVERED_CROPS,
  MIN_CONFIDENCE,
  VISION_CLASSES,
  lookupVisionClass,
  verdictFor,
  visionCoversCrop,
} from '../diseaseVisionMap';
import { argmax, centreCrop, preprocess, VisionError } from '../diseaseVision';

/**
 * Photo model — mapping and preprocessing (V1.7 item 16).
 *
 * Written BEFORE the UI, deliberately. The assistant work in item 17 shipped two
 * bugs that were invisible to manual testing and were caught only by assertions
 * (see HANDOVER_SESSION.md §5.5); this feature has the same shape of risk, only
 * worse. A channel-order mistake or a missing /255 does not throw and does not
 * look wrong — it produces a confident, plausible, incorrect disease name in
 * front of a farmer. Every number below is derived by hand rather than recorded
 * from a run, because a snapshot of a wrong tensor is just a wrong tensor with
 * a green tick.
 */

const MANIFEST_PATH = fileURLToPath(
  new URL('../../../public/models/plant-disease-labels.json', import.meta.url),
);

interface Manifest {
  imageSize: number;
  normalisation: { mean: number[]; std: number[] };
  classes: string[];
}

function readManifest(): Manifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
}

describe('the class map matches the shipped manifest', () => {
  /**
   * The most important test in this file. The map's keys are transcribed
   * PlantVillage folder names with inconsistent underscores; a single character
   * of drift unmaps a class, and the farmer-visible symptom is a blank result
   * rather than an error. This makes the manifest the source of truth.
   */
  it('covers every class in the manifest, and invents none', () => {
    const manifest = readManifest();
    expect(Object.keys(VISION_CLASSES).sort()).toEqual([...manifest.classes].sort());
  });

  it('has 23 classes', () => {
    expect(Object.keys(VISION_CLASSES)).toHaveLength(23);
  });

  it('preserves the manifest quirks exactly — do not tidy these', () => {
    // Spelled out so that "fixing" one in the map fails here with an
    // explanation, rather than silently in the field.
    expect(VISION_CLASSES['Corn_(maize)___Common_rust_']).toBeDefined(); // trailing _
    expect(VISION_CLASSES['Tomato__Target_Spot']).toBeDefined(); // double __
    expect(VISION_CLASSES['Potato___Early_blight']).toBeDefined(); // triple ___
    expect(VISION_CLASSES['Tomato_Early_blight']).toBeDefined(); // single _
    expect(VISION_CLASSES['Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot']).toBeDefined(); // space
  });

  it('maps every class to a plant, and every overlapping class to a real app crop', () => {
    for (const [raw, entry] of Object.entries(VISION_CLASSES)) {
      expect(entry.plant, raw).toBeTruthy();
      if (entry.appCrop !== null) {
        expect(SUPPORTED_CROPS, raw).toContain(entry.appCrop);
      }
    }
  });
});

describe('reuse of the weather knowledge base', () => {
  /**
   * A `known` finding renders using the existing disease.name/where/what keys.
   * If it named a DiseaseId that the crop's CROP_DISEASES entry does not list,
   * the photo path and the weather path would disagree about what can affect
   * that crop, and the five-language text might not exist at all.
   */
  it('only reuses a DiseaseId that the same crop actually has in CROP_DISEASES', () => {
    for (const [raw, entry] of Object.entries(VISION_CLASSES)) {
      if (entry.finding.kind !== 'known') continue;
      expect(entry.appCrop, `${raw} reuses a DiseaseId but has no app crop`).not.toBeNull();
      const crop = entry.appCrop as CropName;
      const ids = CROP_DISEASES[crop].map((profile) => profile.id);
      expect(ids, `${raw} -> ${entry.finding.disease} is not a ${crop} disease`).toContain(
        entry.finding.disease,
      );
    }
  });

  it('maps the four overlapping blights and rusts as expected', () => {
    expect(VISION_CLASSES['Potato___Early_blight']?.finding).toEqual({
      kind: 'known',
      disease: 'earlyBlight',
    });
    expect(VISION_CLASSES['Potato___Late_blight']?.finding).toEqual({
      kind: 'known',
      disease: 'lateBlight',
    });
    expect(VISION_CLASSES['Tomato_Early_blight']?.finding).toEqual({
      kind: 'known',
      disease: 'earlyBlight',
    });
    expect(VISION_CLASSES['Tomato_Late_blight']?.finding).toEqual({
      kind: 'known',
      disease: 'lateBlight',
    });
  });

  it('treats northern leaf blight as turcicum leaf blight — the same organism', () => {
    expect(VISION_CLASSES['Corn_(maize)___Northern_Leaf_Blight']?.finding).toEqual({
      kind: 'known',
      disease: 'maizeTurcicumLeafBlight',
    });
  });

  it('keeps gray leaf spot vision-only rather than folding it into blight or rust', () => {
    // Cercospora is a different organism with no CROP_DISEASES entry. Forcing
    // it onto turcicum would state, in five languages, that the farmer has a
    // disease the model did not report.
    expect(VISION_CLASSES['Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot']?.finding).toEqual({
      kind: 'visionOnly',
      label: 'grayLeafSpot',
    });
  });

  it('keeps spider mites vision-only, because a mite is not a disease', () => {
    expect(VISION_CLASSES['Tomato_Spider_mites_Two_spotted_spider_mite']?.finding).toEqual({
      kind: 'visionOnly',
      label: 'spiderMites',
    });
  });

  it('gives every *___healthy class the healthy finding and nothing else', () => {
    const healthy = Object.entries(VISION_CLASSES).filter(([raw]) =>
      raw.toLowerCase().endsWith('healthy'),
    );
    expect(healthy).toHaveLength(5); // apple, maize, pepper, potato, tomato
    for (const [raw, entry] of healthy) {
      expect(entry.finding, raw).toEqual({ kind: 'healthy' });
    }
  });
});

describe('crop coverage — the seven crops the model cannot help', () => {
  it('covers exactly Maize, Potato and Tomato', () => {
    expect([...COVERED_CROPS].sort()).toEqual(['Maize', 'Potato', 'Tomato']);
  });

  it('reports no coverage for the other seven, including Rice', () => {
    // Rice matters specifically: it is the crop of the app's design persona, so
    // the "not trained on your crop" state is the COMMON path, not an edge case.
    expect(visionCoversCrop('Rice')).toBe(false);
    for (const crop of SUPPORTED_CROPS) {
      expect(visionCoversCrop(crop), crop).toBe(COVERED_CROPS.includes(crop));
    }
    expect(SUPPORTED_CROPS.filter((crop) => !visionCoversCrop(crop))).toHaveLength(7);
  });

  it('derives coverage from the map, so a new model cannot leave it stale', () => {
    const derived = new Set(
      Object.values(VISION_CLASSES)
        .map((entry) => entry.appCrop)
        .filter((crop): crop is CropName => crop !== null),
    );
    expect(new Set(COVERED_CROPS)).toEqual(derived);
  });
});

describe('lookupVisionClass', () => {
  it('returns null rather than throwing for a class the manifest does not have', () => {
    // A swapped model must degrade to "cannot read this photo", not crash the
    // dashboard mid-render.
    expect(lookupVisionClass('Rice___Blast')).toBeNull();
    expect(lookupVisionClass('')).toBeNull();
  });

  it('is not fooled by a near-miss key', () => {
    expect(lookupVisionClass('Corn_(maize)___Common_rust')).toBeNull(); // missing trailing _
    expect(lookupVisionClass('Tomato_Target_Spot')).toBeNull(); // single _
  });

  it('does not resolve inherited Object properties as classes', () => {
    // VISION_CLASSES is an object literal, so `constructor` and `toString` are
    // reachable through the prototype. Returning one of those as a VisionClass
    // would put an object with no `.finding` into the render path.
    expect(lookupVisionClass('constructor')).toBeNull();
    expect(lookupVisionClass('toString')).toBeNull();
    expect(lookupVisionClass('__proto__')).toBeNull();
  });
});

describe('verdictFor — the presentation decision', () => {
  const TOMATO_LATE = 'Tomato_Late_blight';

  it('shows a confident, on-crop reading as a match', () => {
    const verdict = verdictFor(TOMATO_LATE, 0.94, 'Tomato');
    expect(verdict.kind).toBe('match');
    if (verdict.kind !== 'match') throw new Error('unreachable');
    expect(verdict.entry.finding).toEqual({ kind: 'known', disease: 'lateBlight' });
    expect(verdict.confidence).toBe(0.94);
  });

  it('withholds anything below the threshold', () => {
    // The safety property: an unconfident reading must never be shown as a
    // resemblance, because a confidently wrong name is worse than no name.
    const verdict = verdictFor(TOMATO_LATE, MIN_CONFIDENCE - 0.001, 'Tomato');
    expect(verdict.kind).toBe('unsure');
  });

  it('admits a reading exactly at the threshold', () => {
    expect(verdictFor(TOMATO_LATE, MIN_CONFIDENCE, 'Tomato').kind).toBe('match');
  });

  it('treats NaN and Infinity as unsure rather than confident', () => {
    // A NaN confidence reaching the UI would render "NaN% similar"; an Infinity
    // would sail past the threshold and be shown as certain.
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const verdict = verdictFor(TOMATO_LATE, bad, 'Tomato');
      expect(verdict.kind, String(bad)).toBe('unsure');
      if (verdict.kind !== 'unsure') throw new Error('unreachable');
      expect(Number.isFinite(verdict.confidence)).toBe(true);
    }
  });

  it('flags a confident reading that belongs to a different plant', () => {
    // Photographing a tomato leaf while the maize field is selected. Reported,
    // not hidden — suppressing a reading the model produced would be dishonest.
    const verdict = verdictFor(TOMATO_LATE, 0.98, 'Maize');
    expect(verdict.kind).toBe('otherPlant');
  });

  it('flags an apple reading for every supported crop, since apple is none of them', () => {
    for (const crop of SUPPORTED_CROPS) {
      expect(verdictFor('Apple___Apple_scab', 0.99, crop).kind, crop).toBe('otherPlant');
    }
  });

  it('does not flag a cross-plant warning when no farm is selected', () => {
    expect(verdictFor(TOMATO_LATE, 0.98, null).kind).toBe('match');
  });

  it('checks confidence before crop, so a weak off-crop reading reads as unsure', () => {
    // Ordering matters: "we are not sure" is the honest message, and telling a
    // maize farmer about a tomato disease the model barely recognised would be
    // noise on top of an error.
    expect(verdictFor(TOMATO_LATE, 0.2, 'Maize').kind).toBe('unsure');
  });

  it('reports an unmapped class distinctly from an unsure one', () => {
    const verdict = verdictFor('Rice___Blast', 0.99, 'Rice');
    expect(verdict.kind).toBe('unknownClass');
  });
});

describe('preprocess — where a silent, confident-looking bug lives', () => {
  const MEAN = [0.485, 0.456, 0.406];
  const STD = [0.229, 0.224, 0.225];

  /** A size*size RGBA buffer whose every pixel is the same colour. */
  function solid(size: number, r: number, g: number, b: number): Uint8ClampedArray {
    const data = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < size * size; i += 1) {
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = 255;
    }
    return data;
  }

  it('emits 3 channels, not 4 — alpha is dropped', () => {
    expect(preprocess(solid(2, 10, 20, 30), 2, MEAN, STD)).toHaveLength(2 * 2 * 3);
  });

  it('scales to 0..1 before normalising', () => {
    // Black: (0/255 - mean) / std. Getting the /255 wrong gives ~-2 vs ~-1100,
    // which is not an error, just garbage the model will confidently classify.
    const out = preprocess(solid(1, 0, 0, 0), 1, MEAN, STD);
    expect(out[0]).toBeCloseTo(-0.485 / 0.229, 6);
    expect(out[1]).toBeCloseTo(-0.456 / 0.224, 6);
    expect(out[2]).toBeCloseTo(-0.406 / 0.225, 6);
  });

  it('normalises white to the expected positive values', () => {
    const out = preprocess(solid(1, 255, 255, 255), 1, MEAN, STD);
    expect(out[0]).toBeCloseTo((1 - 0.485) / 0.229, 6);
    expect(out[1]).toBeCloseTo((1 - 0.456) / 0.224, 6);
    expect(out[2]).toBeCloseTo((1 - 0.406) / 0.225, 6);
  });

  it('applies the mean and std PER CHANNEL, not as one scalar', () => {
    // A grey pixel must NOT produce three equal outputs — that is the signature
    // of a scalar normalisation, and it is invisible in any test that only
    // checks the tensor's shape.
    const out = preprocess(solid(1, 128, 128, 128), 1, MEAN, STD);
    expect(out[0]).not.toBeCloseTo(out[1] as number, 3);
    expect(out[1]).not.toBeCloseTo(out[2] as number, 3);
  });

  it('lays the tensor out channel-major (NCHW), not pixel-interleaved', () => {
    // The transpose. Canvas gives RGBARGBA...; the model wants RRR...GGG...BBB.
    // Interleaved input is the right size and dtype and completely meaningless.
    const size = 2;
    const pixels = size * size;
    const out = preprocess(solid(size, 255, 0, 0), size, MEAN, STD);

    const red = (1 - 0.485) / 0.229;
    const green = -0.456 / 0.224;
    const blue = -0.406 / 0.225;

    for (let i = 0; i < pixels; i += 1) {
      expect(out[i], `R plane index ${i}`).toBeCloseTo(red, 6);
      expect(out[pixels + i], `G plane index ${i}`).toBeCloseTo(green, 6);
      expect(out[2 * pixels + i], `B plane index ${i}`).toBeCloseTo(blue, 6);
    }
  });

  it('keeps per-pixel position within a plane', () => {
    // Distinct pixels, so a plane filled from the wrong pixel is detectable.
    const size = 2;
    const data = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < 4; i += 1) {
      data[i * 4] = i * 10; // R varies per pixel
      data[i * 4 + 1] = 0;
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 255;
    }
    const out = preprocess(data, size, MEAN, STD);
    for (let i = 0; i < 4; i += 1) {
      expect(out[i], `pixel ${i}`).toBeCloseTo(((i * 10) / 255 - 0.485) / 0.229, 6);
    }
  });

  it('uses the manifest normalisation rather than a hard-coded one', () => {
    const identity = preprocess(solid(1, 255, 0, 0), 1, [0, 0, 0], [1, 1, 1]);
    expect(identity[0]).toBeCloseTo(1, 6);
    expect(identity[1]).toBeCloseTo(0, 6);
  });

  it('agrees with the shipped manifest values', () => {
    const manifest = readManifest();
    expect(manifest.normalisation.mean).toEqual(MEAN);
    expect(manifest.normalisation.std).toEqual(STD);
    expect(manifest.imageSize).toBe(224);
  });

  it('rejects a buffer whose length does not match the declared size', () => {
    // Better to fail loudly than to read past the end and normalise zeros into
    // the bottom of the image.
    expect(() => preprocess(solid(2, 0, 0, 0), 3, MEAN, STD)).toThrow(VisionError);
  });

  it('rejects a malformed manifest normalisation', () => {
    expect(() => preprocess(solid(1, 0, 0, 0), 1, [0.5, 0.5], STD)).toThrow(VisionError);
  });
});

describe('argmax', () => {
  it('returns the winning index and its value', () => {
    const { index, value } = argmax([0.01, 0.02, 0.95, 0.02]);
    expect(index).toBe(2);
    expect(value).toBeCloseTo(0.95, 6);
  });

  it('returns the probability unchanged — softmax is in-graph', () => {
    // The whole point. Re-applying softmax over 23 near-zero logits would
    // compress the winner towards 1/23 ~ 0.043, i.e. below MIN_CONFIDENCE, and
    // silently disable the feature for every photo.
    const scores = new Float32Array(23);
    scores[7] = 0.93;
    const { value } = argmax(scores);
    expect(value).toBeCloseTo(0.93, 6);
    expect(value).toBeGreaterThan(MIN_CONFIDENCE);
  });

  it('takes the first index on a tie, so the result is deterministic', () => {
    expect(argmax([0.5, 0.5, 0.0]).index).toBe(0);
  });

  it('handles an all-zero output without returning -Infinity', () => {
    const { index, value } = argmax(new Float32Array(23));
    expect(index).toBe(0);
    expect(value).toBe(0);
  });

  it('throws on an empty output rather than reporting index 0', () => {
    expect(() => argmax([])).toThrow(VisionError);
  });
});

describe('centreCrop', () => {
  it('is the identity for a square', () => {
    expect(centreCrop(224, 224)).toEqual({ sx: 0, sy: 0, side: 224 });
  });

  it('takes the middle square of a landscape photo', () => {
    // 4:3 phone photo. Squashing instead would distort every lesion's shape.
    expect(centreCrop(4032, 3024)).toEqual({ sx: 504, sy: 0, side: 3024 });
  });

  it('takes the middle square of a portrait photo', () => {
    expect(centreCrop(3024, 4032)).toEqual({ sx: 0, sy: 504, side: 3024 });
  });

  it('never produces a negative or fractional offset', () => {
    const { sx, sy, side } = centreCrop(101, 100);
    expect(Number.isInteger(sx)).toBe(true);
    expect(Number.isInteger(sy)).toBe(true);
    expect(sx).toBeGreaterThanOrEqual(0);
    expect(side).toBe(100);
  });
});

describe('the product boundary (docs/12 §Product Boundaries)', () => {
  /**
   * The restriction is permanent and explicitly extends to image features. This
   * asserts it over the identifiers this module can emit; the farmer-facing
   * strings are asserted in the i18n test.
   */
  const FORBIDDEN = [
    'captan',
    'myclobutanil',
    'mancozeb',
    'chlorothalonil',
    'copper',
    'streptomycin',
    'bordeaux',
    'fungicide',
    'pesticide',
    'spray',
    'dose',
  ];

  it('names no chemical or treatment in any class, label or plant identifier', () => {
    const identifiers = Object.entries(VISION_CLASSES).flatMap(([raw, entry]) => [
      raw,
      entry.plant,
      entry.finding.kind === 'known'
        ? entry.finding.disease
        : entry.finding.kind === 'visionOnly'
          ? entry.finding.label
          : 'healthy',
    ]);
    for (const identifier of identifiers) {
      for (const word of FORBIDDEN) {
        expect(identifier.toLowerCase(), identifier).not.toContain(word);
      }
    }
  });
});
