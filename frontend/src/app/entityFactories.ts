import type { Crop, Soil } from '../types';
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
};

const CROP_WATER_REQUIREMENT: Record<CropName, Crop['typicalWaterRequirement']> = {
  Rice: 'High',
  Wheat: 'Moderate',
  Maize: 'Moderate',
};

/** Build a Soil entity from just the soil type, using Knowledge Base profiles. */
export function buildSoil(id: string, soilType: SoilType): Soil {
  const profile = SOIL_PROFILES[soilType];
  return {
    id,
    name: soilType,
    waterRetention: profile.waterHolding,
    drainage: profile.drainage,
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
