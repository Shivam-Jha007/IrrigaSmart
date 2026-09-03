import type { DrainageCategory, SoilType, WaterRetentionCategory } from './enums';

/**
 * Where a single water-content value came from (backend `soil.ts`).
 * `soilgrids` — the provider's own predicted value passed the pedotransfer
 *   cross-check.
 * `saxton-rawls` — the provider's value erred the unsafe way, so the Saxton &
 *   Rawls (2006) prediction was substituted for it.
 */
export type ThetaSource = 'soilgrids' | 'saxton-rawls';

/**
 * One depth interval predicted by ISRIC SoilGrids v2.0 for this farm's
 * coordinate, in the units the water balance uses. Mirrors the backend
 * `SoilLayer` exactly — the backend owns the unit conversions and the
 * cross-check so this side never re-derives them.
 */
export interface SoilLayer {
  /** Interval top in centimetres below the surface. */
  topCm: number;
  /** Interval bottom in centimetres below the surface. */
  bottomCm: number;
  clayPct: number;
  sandPct: number;
  siltPct: number;
  /** Volumetric water content at field capacity, m³/m³. */
  thetaFC: number;
  /** Volumetric water content at wilting point, m³/m³. */
  thetaPWP: number;
  thetaFCSource: ThetaSource;
  thetaPWPSource: ThetaSource;
  /** Bulk density of the fine earth fraction, kg/dm³. */
  bulkDensity: number;
  organicCarbonPct: number;
  /**
   * Predicted soil pH, pH-in-water method (backend `soil.ts`, ISRIC SoilGrids
   * `phh2o`). `null` when the provider had no usable value for this depth — pH
   * plays no part in the water balance, so its absence never drops the layer.
   */
  phH2O: number | null;
}

/**
 * Per-coordinate soil profile for a farm (V1.7, item 1).
 *
 * NAMED `Measured` FOR "FROM THE PROVIDER, NOT FROM THE TABLE" — the values in
 * it are ISRIC SoilGrids v2.0 predictions for the 250 m cell the farm sits in,
 * NOT a test of this field. Anything derived from it is labelled
 * `REGIONAL_ESTIMATE` at the boundary (`services/provenance.ts`), and no screen
 * may call it a measurement (PRD §7, §28 Guardrail 1). The type name is kept
 * because it is written into stored IndexedDB records; see the naming note in
 * the backend `soil.ts` header.
 *
 * OPTIONAL BY DESIGN. Every farm created before V1.7 has none, and a farm
 * created while SoilGrids is unreachable has none either. `computeTAW` falls
 * back to `SOIL_HYDRAULIC_PROPERTIES` in both cases, so the six-row table
 * remains the offline and failure path (item 18) rather than dead code.
 *
 * THIS RECORD ONLY EXISTS WHEN THE FETCH SUCCEEDED. The backend's
 * `source: 'table'` / `fallbackReason` fields are deliberately not stored: the
 * absence of the record already says "nothing came back", and carrying a second
 * way to say the same thing invites the two disagreeing.
 */
export interface MeasuredSoilProfile {
  /** Depth intervals, shallowest first. Never empty. */
  layers: SoilLayer[];
  /** USDA textural class of the topsoil, e.g. "clay loam". */
  usdaTextureClass: string | null;
  provider: string;
  /** When this was fetched, so the UI can show its age. ISO 8601. */
  fetchedAt: string;
  /**
   * The coordinate this describes. Stored because a farmer can move the farm
   * pin after creation, and a 250 m grid cell from the old location would then
   * be quietly wrong — the UI can compare against the farm's current location
   * and refetch.
   */
  latitude: number;
  longitude: number;
}

/**
 * A farmer's own Soil Health Card / lab N-P-K reading, entered on the
 * Fertilizer page (new feature).
 *
 * WHY THIS EXISTS
 * `FertilizerPage` used to collect this into local component state and
 * discard it on navigation — every visit re-asked a question the farmer had
 * already answered, and the reading never reached anywhere else in the app
 * (not the pH card, not the assistant), even though it is exactly the kind of
 * fact `FarmContextFertility` was built to carry and left `UNKNOWN` for lack
 * of a source. Persisting it here is what makes that section real.
 *
 * `USER_PROVIDED`, LIKE `soil.name` — NOT `MEASURED`
 * The app has no way to confirm a farmer typed the number off an actual lab
 * slip rather than a guess, the same reason `Soil.name` (farmer-declared soil
 * type) is `USER_PROVIDED` rather than `MEASURED` even though the farmer is
 * standing on the field and the ISRIC prediction is not. It still outranks a
 * regional estimate: the farmer is the better source for their own plot,
 * whatever the two disagree on (docs/07 Provenance rules).
 */
export interface SoilSensorReading {
  /** Farmer-entered latest sensor reading; moisture is volumetric percentage. */
  moisturePct?: number;
  temperatureC?: number;
  ec?: number;
  recordedAt: string;
}

export interface SoilNutrientReading {
  /** Available nitrogen, kg/ha. */
  n: number;
  /** Available phosphorus as P₂O₅, kg/ha. */
  p2o5: number;
  /** Available potassium as K₂O, kg/ha. */
  k2o: number;
  /** Optional Soil Health Card values. */
  ph?: number;
  ec?: number;
  organicCarbonPct?: number;
  sulphur?: number;
  zinc?: number;
  boron?: number;
  iron?: number;
  manganese?: number;
  copper?: number;
  /** When the farmer entered this reading. ISO 8601. */
  recordedAt: string;
}

/**
 * The fertilizer-tool selection the farmer last made on the Fertilizer page
 * (crop variety + soil zone), persisted so the assistant can resolve the same
 * official State schedule the farmer sees on that page.
 *
 * USER_PROVIDED, like `nutrientReading`: the farmer tapped these buttons
 * themselves. Crop is NOT stored — it is always the farm's current crop, so a
 * crop change cannot leave a stale schedule attached to the new crop.
 */
export interface FertilizerSelection {
  /** `varietyId` from fertilizerKnowledge, e.g. 'kharif' or 'default'. */
  varietyId: string;
  /** Soil zone key, e.g. 'Terai'. */
  zone: string;
  /** When the farmer last confirmed this selection. ISO 8601. */
  recordedAt: string;
}

/**
 * Optional lab-test soil chemistry a farmer may hold beyond the Soil Health
 * Card's N-P-K: saturation-extract salinity (ECe) and exchangeable sodium
 * percentage (ESP). ECe gates the decision engine's leaching-requirement step;
 * ESP raises the sodicity warning (V2.2). The Soil Health Card's own EC figure
 * (`nutrientReading.ec`) is the same quantity and is read as a fallback.
 *
 * USER_PROVIDED, like `nutrientReading`. Every field optional — a lab slip may
 * carry only one of the two.
 */
export interface SoilQualityReading {
  /** Saturation-extract electrical conductivity (ECe), dS/m. */
  eceDsm?: number;
  /** Exchangeable sodium percentage, %. */
  espPct?: number;
  /** When the farmer entered this reading. ISO 8601. */
  recordedAt: string;
}

/**
 * Soil — dominant soil characteristics of a farm (docs/03_Data_Models.md).
 *
 * Categories mirror the qualitative classifications in the Knowledge Base
 * (docs/10_Knowledge_Base.md §4). `measured` adds the per-coordinate profile
 * introduced in V1.7; `name`, `waterRetention` and `drainage` remain the
 * farmer-confirmed classification and the offline fallback. `nutrientReading`
 * adds the farmer's own Soil Health Card reading, when one has been entered.
 */
export interface Soil {
  id: string;
  name: SoilType;
  waterRetention: WaterRetentionCategory;
  drainage: DrainageCategory;
  measured?: MeasuredSoilProfile;
  nutrientReading?: SoilNutrientReading;
  fertilizerSelection?: FertilizerSelection;
  qualityReading?: SoilQualityReading;
  sensorReading?: SoilSensorReading;
}
