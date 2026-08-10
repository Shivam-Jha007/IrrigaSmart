/** Downhill direction on an 8-point compass. Mirrors the backend `Aspect`. */
export type Aspect = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

/**
 * Approximate terrain for a farm's own coordinate (V1.7, item 10).
 *
 * OPTIONAL BY DESIGN, exactly like `MeasuredSoilProfile`. Every farm created
 * before this landed has none, and a farm created while the elevation provider
 * was unreachable has none either. Every consumer must therefore produce the
 * same numbers it produced before terrain existed when this record is absent
 * (item 0), which is what the golden snapshots hold it to.
 *
 * THIS RECORD ONLY EXISTS WHEN THE MEASUREMENT SUCCEEDED. The backend's
 * `source: 'unavailable'` / `fallbackReason` fields are deliberately not
 * stored: the absence of the record already says "no measurement".
 *
 * WHAT THIS IS NOT. It is a ~90 m DEM sampled over a 300 m cross, so it is a
 * coarse category and never a survey. Two limits are measured and documented in
 * the backend module: on genuinely flat ground the DEM's own error can fabricate
 * ~3% slope, and on a genuinely steep hillside the 300 m baseline reads well
 * under the true grade. So `slopePercent` may be used to warn a farmer, and must
 * never be used to reassure one — there is no reading from this source that
 * proves a field is level.
 */
export interface FarmTerrain {
  /** Mean grade over the sampling baseline, in percent. */
  slopePercent: number;
  /** Direction water runs downhill. Null when the sampled cross was level. */
  aspect: Aspect | null;
  /** Downhill bearing, degrees clockwise from north. Null when level. */
  aspectDegrees: number | null;
  /**
   * Elevation of the farm centre, metres above sea level. Feeds FAO-56 Eq. 7
   * (atmospheric pressure) in the ETo calculation as well as the slope logic.
   */
  elevationM: number;
  /** Half-width of the sampling cross in metres; the baseline is twice this. */
  sampleSpacingM: number;
  /** Always `approximate`. See the note above — nothing may raise this. */
  confidence: 'approximate';
  provider: string;
  /** When this was fetched, so the UI can show its age. ISO 8601. */
  fetchedAt: string;
  /**
   * The coordinate this describes. Stored for the same reason the soil profile
   * stores one: a farmer can move the farm pin after creation, and a slope from
   * the old location would then be quietly wrong.
   */
  latitude: number;
  longitude: number;
}
