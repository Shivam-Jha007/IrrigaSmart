import type { Crop, MeasuredSoilProfile, Soil, SoilQualityReading } from '../types';
import type { CropCategory, CropName, SoilType } from '../types';
import { SOIL_PROFILES } from '../services';

/**
 * Factory helpers that derive full entities from the minimal farmer inputs
 * captured by the farm form. Qualitative agronomic attributes come from the
 * Knowledge Base (docs/10_Knowledge_Base.md) rather than being entered by hand,
 * keeping the UI simple and the facts authoritative.
 */

const CROP_CATEGORY: Record<CropName, CropCategory> = {
  Rice: 'Cereal',
  Wheat: 'Cereal',
  Maize: 'Cereal',
  Cotton: 'Other',
  Sugarcane: 'Other',
  Soybean: 'Grain',
  Groundnut: 'Grain',
  Tomato: 'Vegetable',
  Potato: 'Vegetable',
  Onion: 'Vegetable',
};

const CROP_WATER_REQUIREMENT: Record<CropName, Crop['typicalWaterRequirement']> = {
  Rice: 'High',
  Wheat: 'Moderate',
  Maize: 'Moderate',
  Cotton: 'Moderate',
  Sugarcane: 'High',
  Soybean: 'Moderate',
  Groundnut: 'Moderate',
  Tomato: 'Moderate',
  Potato: 'Moderate',
  Onion: 'Moderate',
};

/**
 * Build a Soil entity from just the soil type, using Knowledge Base profiles.
 *
 * `measured` is optional and threaded through rather than fetched here: this
 * factory is pure and synchronous, and the profile arrives from the backend on
 * its own schedule (~15 s for the 7-property query). A farm saved before the
 * profile lands simply has none, and `rootZoneWater` uses the table until it
 * does — which is the same path a farm created offline takes.
 */
export function buildSoil(
  id: string,
  soilType: SoilType,
  measured?: MeasuredSoilProfile,
  qualityReading?: SoilQualityReading,
): Soil {
  const profile = SOIL_PROFILES[soilType];
  return {
    id,
    name: soilType,
    waterRetention: profile.waterHolding,
    drainage: profile.drainage,
    // exactOptionalPropertyTypes: the key must be absent, not present-undefined.
    ...(measured ? { measured } : {}),
    ...(qualityReading ? { qualityReading } : {}),
  };
}

/** Build a Crop entity from the crop name and farmer-provided growth stage. */
export function buildCrop(id: string, name: CropName, growthStage: Crop['growthStage']): Crop {
  return {
    id,
    name,
    growthStage,
    typicalWaterRequirement: CROP_WATER_REQUIREMENT[name],
    category: CROP_CATEGORY[name],
  };
}
