import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { CropName } from '../../types';
import { SUPPORTED_CROPS } from '../knowledgeBase';
import { CROP_DISEASES } from '../diseaseKnowledge';
import {
  COVERED_CROPS,
  MIN_CONFIDENCE,
  PLANTS_WITH_HEALTHY_CLASS,
  VISION_CLASSES,
  lookupVisionClass,
  plantHasHealthyClass,
  verdictFor,
  visionCoversCrop,
} from '../diseaseVisionMap';
import {
  creditLineFor,
  REFERENCE_IMAGES,
  referenceImagesFor,
  WEATHER_REFERENCE_IMAGES,
} from '../diseaseReference';
import { TRANSLATIONS } from '../../i18n/translations';
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
  new URL('../../../public/models/plant-disease-labels-v2.json', import.meta.url),
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

  it('has 27 classes', () => {
    expect(Object.keys(VISION_CLASSES)).toHaveLength(27);
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

  it('has the four rice classes, named with the same Plant___Disease convention', () => {
    expect(VISION_CLASSES['Rice___Bacterial_blight']).toBeDefined();
    expect(VISION_CLASSES['Rice___Blast']).toBeDefined();
    expect(VISION_CLASSES['Rice___Brown_spot']).toBeDefined();
    expect(VISION_CLASSES['Rice___Tungro']).toBeDefined();
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

  it('maps rice blast and bacterial blight onto the existing weather-path DiseaseIds', () => {
    expect(VISION_CLASSES['Rice___Blast']?.finding).toEqual({
      kind: 'known',
      disease: 'riceBlast',
    });
    expect(VISION_CLASSES['Rice___Bacterial_blight']?.finding).toEqual({
      kind: 'known',
      disease: 'riceBacterialLeafBlight',
    });
  });

  it('keeps rice brown spot and tungro vision-only — neither has a CROP_DISEASES entry', () => {
    // Brown spot (Bipolaris oryzae) has no published daily-aggregate infection
    // window, and tungro is a leafhopper-transmitted virus rather than a
    // weather-triggered condition — forcing either onto a DiseaseId would
    // invent a temperature/humidity band CROP_DISEASES.Rice does not have.
    expect(VISION_CLASSES['Rice___Brown_spot']?.finding).toEqual({
      kind: 'visionOnly',
      label: 'riceBrownSpot',
    });
    expect(VISION_CLASSES['Rice___Tungro']?.finding).toEqual({
      kind: 'visionOnly',
      label: 'riceTungro',
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
    // apple, maize, pepper, potato, tomato — still 5, not 6: the rice dataset
    // this model was retrained on has no healthy-rice folder, so there is no
    // Rice___healthy class.
    expect(healthy).toHaveLength(5);
    for (const [raw, entry] of healthy) {
      expect(entry.finding, raw).toEqual({ kind: 'healthy' });
    }
  });
});

describe('crop coverage — the six crops the model cannot help', () => {
  it('covers exactly Maize, Potato, Rice and Tomato', () => {
    expect([...COVERED_CROPS].sort()).toEqual(['Maize', 'Potato', 'Rice', 'Tomato']);
  });

  it('reports coverage for Rice now that it has classes, and none for the other six', () => {
    // Rice matters specifically: it is the crop of the app's design persona, so
    // its coverage state was the COMMON path, not an edge case, before this
    // retrain — and remains worth asserting explicitly now that it is covered.
    expect(visionCoversCrop('Rice')).toBe(true);
    for (const crop of SUPPORTED_CROPS) {
      expect(visionCoversCrop(crop), crop).toBe(COVERED_CROPS.includes(crop));
    }
    expect(SUPPORTED_CROPS.filter((crop) => !visionCoversCrop(crop))).toHaveLength(6);
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

describe('the plants the model can call healthy — five of six', () => {
  /**
   * Rice is the exception and it is not a small one. The retrain that added rice
   * used a dataset with four disease folders and no healthy folder, so "this rice
   * leaf is fine" is not a representable output: the probability mass has nowhere
   * to go but blast, bacterial blight, brown spot, tungro — or another plant.
   *
   * Measured, not assumed: over six field photographs of diseased rice from
   * Wikimedia this model put three in `Corn_(maize)___healthy` and named a rice
   * condition for the other three. The UI's only honest response is to say what
   * the model cannot do, which is why the flag rides on the verdict.
   */
  it('is exactly the five plants that have a healthy class, and excludes Rice', () => {
    expect([...PLANTS_WITH_HEALTHY_CLASS].sort()).toEqual([
      'Apple',
      'Maize',
      'PepperBell',
      'Potato',
      'Tomato',
    ]);
    expect(PLANTS_WITH_HEALTHY_CLASS).not.toContain('Rice');
  });

  it('is derived from the class map, so a retrain cannot leave it stale', () => {
    // The same discipline as COVERED_CROPS: a retrain that adds a healthy-rice
    // folder must silence the caveat by itself, and one that loses a healthy
    // folder must raise it. A hard-coded list is how vision.coveredCrops came to
    // name three crops for two months after rice made it four.
    const derived = new Set(
      Object.values(VISION_CLASSES)
        .filter((entry) => entry.finding.kind === 'healthy')
        .map((entry) => entry.plant),
    );
    expect(new Set(PLANTS_WITH_HEALTHY_CLASS)).toEqual(derived);
  });

  it('lists each plant once, however many healthy classes it has', () => {
    expect(new Set(PLANTS_WITH_HEALTHY_CLASS).size).toBe(PLANTS_WITH_HEALTHY_CLASS.length);
  });

  it('answers per plant, and says no for Rice', () => {
    expect(plantHasHealthyClass('Rice')).toBe(false);
    for (const plant of ['Apple', 'Maize', 'PepperBell', 'Potato', 'Tomato'] as const) {
      expect(plantHasHealthyClass(plant), plant).toBe(true);
    }
  });
});

describe('lookupVisionClass', () => {
  it('returns null rather than throwing for a class the manifest does not have', () => {
    // A swapped model must degrade to "cannot read this photo", not crash the
    // dashboard mid-render. 'Rice___Blast' is a real class now that rice is
    // covered, so a still-unmapped rice condition stands in for it here.
    expect(lookupVisionClass('Rice___Sheath_Blight')).toBeNull();
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
    // 'Rice___Blast' is now a real, mapped class — use a still-unmapped rice
    // condition instead.
    const verdict = verdictFor('Rice___Sheath_Blight', 0.99, 'Rice');
    expect(verdict.kind).toBe('unknownClass');
  });

  /**
   * The worst output this feature is capable of, and the reason
   * `otherPlantHealthy` exists as its own kind.
   *
   * `Corn_(maize)___healthy` is where this model puts leaves it does not
   * recognise. Measured: over ten field photographs of plants it was never
   * trained on, it chose that class for both onion photographs, at 0.8864 and
   * 0.9630 — comfortably past MIN_CONFIDENCE. Rendered through the shared healthy
   * branch, a farmer holding a visibly diseased leaf read "looks similar to
   * healthy leaves (96% similar)" with a small mismatch note above it. That is a
   * confident all-clear on a sick plant, which is worse than a wrong disease name
   * because it ends the investigation instead of misdirecting it.
   */
  describe('a healthy class for a plant the farmer is not growing', () => {
    const MAIZE_HEALTHY = 'Corn_(maize)___healthy';

    it('is never a match and never a plain otherPlant', () => {
      const verdict = verdictFor(MAIZE_HEALTHY, 0.96, 'Rice');
      expect(verdict.kind).toBe('otherPlantHealthy');
      expect(verdict.kind).not.toBe('match');
      expect(verdict.kind).not.toBe('otherPlant');
    });

    it('holds for the measured onion confidences, on every covered crop but maize', () => {
      // Those two readings only reach a farmer whose own crop is covered by the
      // model, so the maize case is excluded here — for a maize farmer this class
      // IS their crop and a healthy reading is a legitimate answer.
      for (const confidence of [0.8864, 0.963]) {
        for (const crop of ['Potato', 'Rice', 'Tomato'] as const) {
          expect(verdictFor(MAIZE_HEALTHY, confidence, crop).kind, `${crop} @${confidence}`).toBe(
            'otherPlantHealthy',
          );
        }
      }
    });

    it('still reads as a match when maize is the crop', () => {
      const verdict = verdictFor(MAIZE_HEALTHY, 0.96, 'Maize');
      expect(verdict.kind).toBe('match');
    });

    it('still reads as a match when no farm is selected', () => {
      // Nothing to contradict, so nothing to warn about.
      expect(verdictFor(MAIZE_HEALTHY, 0.96, null).kind).toBe('match');
    });

    it('leaves a NAMED off-crop class on the old otherPlant path', () => {
      // The split is about health claims, not about crop mismatch. "Looks like
      // maize common rust, and you grow rice" is still worth reporting.
      expect(verdictFor('Corn_(maize)___Common_rust_', 0.9, 'Rice').kind).toBe('otherPlant');
    });

    it('checks confidence first, so the three weak rice misfires read as unsure', () => {
      // The measured rice failures: 0.2109, 0.1621 and 0.309, all into
      // Corn_(maize)___healthy. MIN_CONFIDENCE catches these before the crop
      // check ever runs.
      for (const confidence of [0.2109, 0.1621, 0.309]) {
        expect(verdictFor(MAIZE_HEALTHY, confidence, 'Rice').kind, String(confidence)).toBe(
          'unsure',
        );
      }
    });
  });

  describe('the no-healthy-class flag carried on a match', () => {
    it('is false for every rice class, because the model cannot say "healthy rice"', () => {
      const riceClasses = Object.keys(VISION_CLASSES).filter((raw) => raw.startsWith('Rice___'));
      expect(riceClasses).toHaveLength(4);

      for (const raw of riceClasses) {
        const verdict = verdictFor(raw, 0.9, 'Rice');
        expect(verdict.kind, raw).toBe('match');
        if (verdict.kind !== 'match') throw new Error('unreachable');
        expect(verdict.plantHasHealthyClass, raw).toBe(false);
      }
    });

    it('is true for every maize, potato and tomato class', () => {
      for (const [raw, entry] of Object.entries(VISION_CLASSES)) {
        if (entry.appCrop === null || entry.appCrop === 'Rice') continue;
        const verdict = verdictFor(raw, 0.9, entry.appCrop);
        expect(verdict.kind, raw).toBe('match');
        if (verdict.kind !== 'match') throw new Error('unreachable');
        expect(verdict.plantHasHealthyClass, raw).toBe(true);
      }
    });

    it('agrees with plantHasHealthyClass for the entry it resolved', () => {
      // The flag exists so the card cannot forget to ask; this pins it to the
      // single source of truth rather than to a list repeated here.
      for (const [raw, entry] of Object.entries(VISION_CLASSES)) {
        const verdict = verdictFor(raw, 0.9, null);
        if (verdict.kind !== 'match') continue;
        expect(verdict.plantHasHealthyClass, raw).toBe(plantHasHealthyClass(entry.plant));
      }
    });
  });
});

describe('reference images for probable findings', () => {
  const PUBLIC_PATH = fileURLToPath(new URL('../../../public', import.meta.url));

  it('provides at least one bundled image for every named supported-crop class', () => {
    // 14 PlantVillage classes always ship exactly 2 (bundled with the model
    // export, both same-licensed and easy to source in pairs). The 4 rice
    // classes are sourced individually, and two of them — blast and bacterial
    // blight — have a single usable freely licensed photograph of the right
    // disease on the right host, so the count check is per-class rather than a
    // flat 2. The singletons are named below so a pair silently dropping to one
    // still fails. Every image must be a real, non-empty file with a distinct src.
    const namedSupportedClasses = Object.entries(VISION_CLASSES).filter(
      ([, entry]) => entry.appCrop !== null && entry.finding.kind !== 'healthy',
    );

    expect(namedSupportedClasses).toHaveLength(18); // 14 PlantVillage + 4 rice
    expect(Object.keys(REFERENCE_IMAGES)).toHaveLength(18);

    /** Classes with exactly one image. See ATTRIBUTION.md for why, per class. */
    const singletons: readonly string[] = ['Rice___Blast', 'Rice___Bacterial_blight'];

    for (const [rawClass, entry] of namedSupportedClasses) {
      const images = referenceImagesFor(rawClass, entry);
      expect(images.length, rawClass).toBe(singletons.includes(rawClass) ? 1 : 2);
      expect(new Set(images.map((image) => image.src)).size, rawClass).toBe(images.length);

      for (const image of images) {
        const assetPath = fileURLToPath(new URL(`../../../public${image.src}`, import.meta.url));
        expect(assetPath.startsWith(PUBLIC_PATH), image.src).toBe(true);
        expect(readFileSync(assetPath).byteLength, image.src).toBeGreaterThan(0);
        expect(image.sourceFile, image.src).toMatch(/\.(?:JPG|jpg|jpeg)$/i);
      }
    }
  });

  it('does not show reference images for healthy findings', () => {
    for (const [rawClass, entry] of Object.entries(VISION_CLASSES)) {
      if (entry.finding.kind === 'healthy') {
        expect(referenceImagesFor(rawClass, entry), rawClass).toEqual([]);
      }
    }
  });

  it('does not invent references for an unmapped raw class', () => {
    const knownEntry = VISION_CLASSES.Tomato_Late_blight;
    if (!knownEntry) throw new Error('test fixture is missing');
    expect(referenceImagesFor('Rice___Sheath_Blight', knownEntry)).toEqual([]);
  });
});

/**
 * Attribution.
 *
 * WHY THIS SUITE EXISTS
 * Both cards used to print one hardcoded credit line each, and both lines were
 * false for a large share of the images beside them. The weather card said "USDA
 * reference images · Public domain / CC BY 3.0" while displaying photographs from
 * PlantVillage, EcoPort, DLR Rheinpfalz, Bugwood and Wikimedia under five
 * different licences; the photo card said "PlantVillage examples · CC BY-SA 3.0"
 * over every rice photograph, none of which is a PlantVillage image. CC BY-SA
 * 3.0, CC BY-SA 4.0, CC BY 4.0, CC BY 2.0 and CC BY 3.0 US all require the author
 * and the licence to be named, so those lines were a licence breach and not just
 * a wrong caption — and nothing in 429 passing tests noticed, because no test
 * looked at the credit at all.
 *
 * These assertions are deliberately about the *data*, so a new folder cannot be
 * added without a credit, and about the *rendered markup*, so a correct data
 * table cannot be undone by a card going back to a constant string.
 */
describe('reference image attribution', () => {
  /** Every image the app can display, from both cards' maps. */
  const allImages = [
    ...Object.values(REFERENCE_IMAGES).flat(),
    ...Object.values(WEATHER_REFERENCE_IMAGES).flat(),
  ];

  it('has a named holder and licence for every image on both paths', () => {
    expect(allImages.length).toBeGreaterThan(0);
    for (const image of allImages) {
      expect(image.credit.holder, image.src).toBeTruthy();
      expect(image.credit.licence, image.src).toBeTruthy();
    }
  });

  it('uses only licences that actually permit this use', () => {
    // A closed set. Anything else — non-commercial, no-derivatives, "fair use",
    // or an unstated licence — must be a deliberate edit here, not a quiet
    // addition to the image table.
    const permitted: readonly string[] = [
      'Public domain',
      'CC BY 2.0',
      'CC BY 3.0 US',
      'CC BY 4.0',
      'CC BY-SA 3.0',
      'CC BY-SA 4.0',
    ];
    for (const image of allImages) {
      expect(permitted, image.src).toContain(image.credit.licence);
    }
  });

  it('does not credit PlantVillage for anything outside the bundled export', () => {
    // The photo card's old constant claimed PlantVillage for all 18 classes.
    // Only the 14 that ship with the model export are PlantVillage images.
    const plantVillage = allImages.filter((i) => i.credit.holder === 'PlantVillage');
    for (const image of plantVillage) {
      expect(image.src, image.src).not.toMatch(/\/rice-|\/wheat-|\/soybean-|\/groundnut-|\/onion-|\/sugarcane-/);
    }
    for (const image of allImages.filter((i) => i.src.includes('/rice-'))) {
      expect(image.credit.holder, image.src).not.toBe('PlantVillage');
    }
  });

  it('does not credit USDA for work that is not USDA', () => {
    // The weather card's old constant named USDA for everything it showed. Only
    // Kolmer's wheat leaf rust and Frederick's soybean rust are USDA ARS.
    const usda = allImages.filter((i) => i.credit.holder.includes('USDA'));
    expect(usda.map((i) => i.src).sort()).toEqual([
      '/disease-reference/soybean-rust/1.jpg',
      '/disease-reference/wheat-leaf-rust/1.jpg',
      '/disease-reference/wheat-leaf-rust/2.jpg',
    ]);
  });

  it('builds one credit per distinct source, in order, without repeats', () => {
    // A PlantVillage pair shares a credit; printing it twice would read as two
    // independent sources.
    const pair = REFERENCE_IMAGES.Tomato_Late_blight;
    if (!pair) throw new Error('test fixture is missing');
    expect(creditLineFor(pair)).toBe('PlantVillage — CC BY-SA 3.0');

    // Two sources stay two, separated and in image order.
    const mixed = WEATHER_REFERENCE_IMAGES['Onion:onionDownyMildew'];
    if (!mixed) throw new Error('test fixture is missing');
    expect(creditLineFor(mixed)).toBe(
      'Howard F. Schwartz, Colorado State University (Bugwood.org) — CC BY 3.0 US · ' +
        'Jochen Kreiselmaier, DLR Rheinpfalz — CC BY 4.0',
    );
  });

  it('returns an empty line for no images, so the card can omit the label', () => {
    expect(creditLineFor([])).toBe('');
  });

  it('has dropped the false constant credit strings from every language', () => {
    // Not merely unused — gone from the table, so the next author cannot reach
    // for `disease.referenceCredit` and reintroduce the USDA claim.
    for (const language of ['en', 'hi', 'bn', 'as', 'ur'] as const) {
      const table: Record<string, string> = TRANSLATIONS[language];
      expect(Object.keys(table), language).not.toContain('disease.referenceCredit');
      expect(table['vision.referenceCredit'], language).toContain('{credits}');
      expect(table['vision.referenceCredit'], language).not.toContain('USDA');
      expect(table['vision.referenceCredit'], language).not.toContain('PlantVillage');
    }
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
