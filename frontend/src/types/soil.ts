import type { DrainageCategory, SoilType, WaterRetentionCategory } from './enums';

/**
 * Soil — dominant soil characteristics of a farm (docs/03_Data_Models.md).
 *
 * Categories mirror the qualitative classifications in the Knowledge Base
 * (docs/10_Knowledge_Base.md §4). The MVP does not model field capacity,
 * moisture percentage, or AWC.
 */
export interface Soil {
  id: string;
  name: SoilType;
  waterRetention: WaterRetentionCategory;
  drainage: DrainageCategory;
}
