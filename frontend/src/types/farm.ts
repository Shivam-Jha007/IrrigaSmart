import type { AreaUnit, IrrigationMethod, SoilType } from './enums';
import type { FarmTerrain } from './terrain';

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
 * Optional irrigation-water test results a farmer may hold from a water lab
 * (V2.2). ECw gates the decision engine's leaching-requirement step together
 * with the soil's ECe; the rest (SAR, boron, bicarbonate, water pH) are
 * management constraints the improvement plan and the assistant surface as
 * flagged issues — none of them has a defensible path to a millimetre, so
 * none of them computes one.
 *
 * USER_PROVIDED. Every field optional: a water report may carry any subset.
 */
export interface WaterQualityReading {
  /** Electrical conductivity of the irrigation water (ECw), dS/m. */
  ecwDsm?: number;
  /** Sodium adsorption ratio of the water (SAR), (mmol/L)^0.5. */
  sar?: number;
  /** Boron, mg/L. */
  boronMgl?: number;
  /** Bicarbonate, meq/L. */
  bicarbonateMeql?: number;
  /** pH of the water itself. */
  ph?: number;
  /** When the farmer entered this reading. ISO 8601. */
  recordedAt: string;
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
  /**
   * Approximate terrain, fetched once at farm creation (V1.7, item 10).
   * Absent on every farm created before it existed and whenever the elevation
   * provider was unreachable; consumers must behave identically without it.
   */
  terrain?: FarmTerrain;
  /** Optional irrigation-water lab test (V2.2). Absent unless the farmer entered one. */
  waterQuality?: WaterQualityReading;
}
