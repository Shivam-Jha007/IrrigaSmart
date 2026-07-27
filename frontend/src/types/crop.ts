import type { CropCategory, CropName, GrowthStage } from './enums';

/**
 * Crop — the crop currently cultivated on a farm (docs/03_Data_Models.md).
 *
 * Detailed agronomic values (Kc, water requirements) are NOT stored here; they
 * live in the Knowledge Base (docs/10_Knowledge_Base.md) and are looked up by
 * the Decision Engine. This entity holds only the farm-specific selection.
 *
 * `growthStage` is a farmer-provided input (docs/11_Decision_Logic.md §10).
 */
export interface Crop {
  id: string;
  name: CropName;
  growthStage: GrowthStage;
  /**
   * Qualitative typical water requirement label for display only. Authoritative
   * agronomic values remain in the Knowledge Base.
   */
  typicalWaterRequirement: 'Low' | 'Moderate' | 'High';
  category: CropCategory;
}
