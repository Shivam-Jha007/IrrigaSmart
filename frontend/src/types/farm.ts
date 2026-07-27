import type { AreaUnit, IrrigationMethod, SoilType } from './enums';

/**
 * Geographic location of a farm. Weather data is associated with this location
 * (docs/03_Data_Models.md Ownership Rules).
 */
export interface FarmLocation {
  latitude: number;
  longitude: number;
  /** Optional human-readable label (e.g. village name). */
  label?: string;
}

/**
 * Farm — a physical agricultural field (docs/03_Data_Models.md).
 *
 * Each farm belongs to exactly one farmer and references its primary crop by id.
 * `growthStage` is stored on the crop the farm cultivates; see Crop.
 */
export interface Farm {
  id: string;
  farmerId: string;
  name: string;
  location: FarmLocation;
  area: number;
  areaUnit: AreaUnit;
  soilType: SoilType;
  irrigationMethod: IrrigationMethod;
  /** References the id of the Crop cultivated on this farm. */
  primaryCropId: string;
}
