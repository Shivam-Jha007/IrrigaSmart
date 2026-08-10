import type { DrainageCategory, SoilType, WaterRetentionCategory } from './enums';

/**
 * Where a single water-content value came from (backend `soil.ts`).
 * `soilgrids` — the measured value passed the pedotransfer cross-check.
 * `saxton-rawls` — the measured value erred the unsafe way, so the Saxton &
 *   Rawls (2006) prediction was substituted for it.
 */
export type ThetaSource = 'soilgrids' | 'saxton-rawls';

/**
 * One measured depth interval from ISRIC SoilGrids v2.0, in the units the water
 * balance uses. Mirrors the backend `SoilLayer` exactly — the backend owns the
 * unit conversions and the cross-check so this side never re-derives them.
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
}

/**
 * Measured soil profile for a farm's own coordinate (V1.7, item 1).
 *
 * OPTIONAL BY DESIGN. Every farm created before V1.7 has none, and a farm
 * created while SoilGrids is unreachable has none either. `computeTAW` falls
 * back to `SOIL_HYDRAULIC_PROPERTIES` in both cases, so the six-row table
 * remains the offline and failure path (item 18) rather than dead code.
 *
 * THIS RECORD ONLY EXISTS WHEN THE MEASUREMENT SUCCEEDED. The backend's
 * `source: 'table'` / `fallbackReason` fields are deliberately not stored: the
 * absence of the record already says "no measurement", and carrying a second
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
 * Soil — dominant soil characteristics of a farm (docs/03_Data_Models.md).
 *
 * Categories mirror the qualitative classifications in the Knowledge Base
 * (docs/10_Knowledge_Base.md §4). `measured` adds the per-coordinate profile
 * introduced in V1.7; `name`, `waterRetention` and `drainage` remain the
 * farmer-confirmed classification and the offline fallback.
 */
export interface Soil {
  id: string;
  name: SoilType;
  waterRetention: WaterRetentionCategory;
  drainage: DrainageCategory;
  measured?: MeasuredSoilProfile;
}
