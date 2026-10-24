import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  COVERED_CROPS,
  MIN_CONFIDENCE,
  PLANTS_WITH_HEALTHY_CLASS,
  VISION_CLASSES,
  VISION_ENABLED_CROPS,
  lookupVisionClass,
  plantHasHealthyClass,
  verdictFor,
  visionCoversCrop,
} from '../diseaseVisionMap';
import { REFERENCE_IMAGES, referenceImagesFor } from '../diseaseReference';
import {
  argmax,
  centreCrop,
  preprocess,
  VisionError,
} from '../diseaseVision';

const MANIFEST_PATH = fileURLToPath(
  new URL('../../../public/models/rice-leaf-model-manifest.json', import.meta.url),
);
const MODEL_PATH = fileURLToPath(
  new URL('../../../public/models/rice-leaf-mobilenetv3-large.onnx', import.meta.url),
);
const GATE_PATH = fileURLToPath(
  new URL('../../../public/models/rice-leaf-ood-gate.json', import.meta.url),
);

interface Manifest {
  architecture: string;
  imageSize: number;
  normalisation: { mean: number[]; std: number[] };
  outputs: { logits: string; features: string };
  diagnosisConfidenceThreshold: number;
  classes: string[];
}

function readManifest(): Manifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
}

describe('the Final_Model manifest and class map', () => {
  it('uses the exported MobileNetV3-Large model and exact three-class order', () => {
    const manifest = readManifest();
    expect(manifest.architecture).toBe('mobilenet_v3_large');
    expect(manifest.classes).toEqual(['healthy', 'brown_spot', 'sheath_blight']);
    expect(Object.keys(VISION_CLASSES).sort()).toEqual([...manifest.classes].sort());
    expect(manifest.outputs).toEqual({ logits: 'logits', features: 'features' });
    expect(manifest.imageSize).toBe(224);
    expect(readFileSync(MODEL_PATH).byteLength).toBeGreaterThan(1_000_000);
    const gate = JSON.parse(readFileSync(GATE_PATH, 'utf8')) as {
      classes: string[];
      centroids: number[][];
      similarityThreshold: number;
    };
    expect(gate.classes).toEqual(manifest.classes);
    expect(gate.centroids).toHaveLength(3);
    expect(gate.centroids[0]?.length).toBe(960);
    expect(gate.similarityThreshold).toBeCloseTo(0.3720585, 6);
  });

  it('maps every model output to rice and preserves the diagnosis meanings', () => {
    expect(VISION_CLASSES.healthy?.finding).toEqual({ kind: 'healthy' });
    expect(VISION_CLASSES.brown_spot?.finding).toEqual({
      kind: 'visionOnly',
      label: 'riceBrownSpot',
    });
    expect(VISION_CLASSES.sheath_blight?.finding).toEqual({
      kind: 'visionOnly',
      label: 'riceSheathBlight',
    });
    for (const entry of Object.values(VISION_CLASSES)) {
      expect(entry.plant).toBe('Rice');
      expect(entry.appCrop).toBe('Rice');
    }
  });

  it('offers photo detection for rice only', () => {
    expect(COVERED_CROPS).toEqual(['Rice']);
    expect(VISION_ENABLED_CROPS).toEqual(['Rice']);
    expect(PLANTS_WITH_HEALTHY_CLASS).toEqual(['Rice']);
    expect(visionCoversCrop('Rice')).toBe(true);
    expect(visionCoversCrop('Maize')).toBe(false);
    expect(plantHasHealthyClass('Rice')).toBe(true);
  });
});

describe('lookupVisionClass and verdictFor', () => {
  it('rejects labels that are not in the replacement checkpoint', () => {
    expect(lookupVisionClass('Rice___Leaf_blast')).toBeNull();
    expect(lookupVisionClass('constructor')).toBeNull();
  });

  it('shows the model top class as a match after both gates pass', () => {
    const verdict = verdictFor('brown_spot', 0.9, 'Rice', {
      similarity: 0.8,
      similarityThreshold: 0.3720585,
    });
    expect(verdict.kind).toBe('match');
    if (verdict.kind !== 'match') throw new Error('unreachable');
    expect(verdict.entry.finding).toEqual({ kind: 'visionOnly', label: 'riceBrownSpot' });
  });

  it('rejects an image before diagnosis when the rice-leaf gate fails', () => {
    const verdict = verdictFor('brown_spot', 0.99, 'Rice', {
      similarity: 0.2,
      similarityThreshold: 0.3720585,
    });
    expect(verdict.kind).toBe('notRiceLeaf');
  });

  it('withholds the top class when the supported-condition gate fails', () => {
    expect(verdictFor('sheath_blight', MIN_CONFIDENCE - 0.001, 'Rice').kind).toBe(
      'unsupportedCondition',
    );
  });

  it('treats invalid confidence as unsure', () => {
    for (const confidence of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(verdictFor('healthy', confidence, 'Rice').kind).toBe('unsure');
    }
  });
});

describe('preprocess and image geometry', () => {
  const mean: [number, number, number] = [0.485, 0.456, 0.406];
  const std: [number, number, number] = [0.229, 0.224, 0.225];

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

  it('emits channel-major RGB values with ImageNet normalization', () => {
    const out = preprocess(solid(1, 255, 0, 0), 1, mean, std);
    expect(out[0]).toBeCloseTo((1 - mean[0]) / std[0], 6);
    expect(out[1]).toBeCloseTo(-mean[1] / std[1], 6);
    expect(out[2]).toBeCloseTo(-mean[2] / std[2], 6);
  });

  it('rejects malformed image buffers and manifests', () => {
    expect(() => preprocess(solid(2, 0, 0, 0), 3, mean, std)).toThrow(VisionError);
    expect(() => preprocess(solid(1, 0, 0, 0), 1, [0.5, 0.5], std)).toThrow(VisionError);
  });

  it('centre-crops landscape and portrait images without distortion', () => {
    expect(centreCrop(4032, 3024)).toEqual({ sx: 504, sy: 0, side: 3024 });
    expect(centreCrop(3024, 4032)).toEqual({ sx: 0, sy: 504, side: 3024 });
  });
});

describe('argmax and references', () => {
  it('returns the top model class deterministically', () => {
    expect(argmax([0.01, 0.95, 0.04])).toEqual({ index: 1, value: 0.95 });
    expect(argmax([0.5, 0.5]).index).toBe(0);
    expect(() => argmax([])).toThrow(VisionError);
  });

  it('keeps reference images aligned with the replacement labels', () => {
    expect(referenceImagesFor('brown_spot', VISION_CLASSES.brown_spot!)).toHaveLength(2);
    expect(referenceImagesFor('sheath_blight', VISION_CLASSES.sheath_blight!)).toEqual([]);
    expect(referenceImagesFor('healthy', VISION_CLASSES.healthy!)).toEqual([]);
    expect(Object.keys(REFERENCE_IMAGES)).toContain('brown_spot');
    expect(Object.keys(REFERENCE_IMAGES)).toContain('sheath_blight');
  });
});
