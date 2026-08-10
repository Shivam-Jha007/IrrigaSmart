/**
 * Terrain fetch (item 10) — the frontend half of `backend/src/terrain.ts`.
 *
 * Nothing here throws for the caller to handle. A farm with no terrain record
 * is a fully supported state — `slopeAdjustment` returns the identity for it and
 * every number matches the pre-terrain behaviour (item 0, item 18) — so a
 * failure resolves to `null` and the app carries on.
 */

import { apiGet } from './apiClient';
import type { Aspect, FarmTerrain } from '../types';

interface TerrainResponse {
  slopePercent: number | null;
  aspect: Aspect | null;
  aspectDegrees: number | null;
  elevationM: number | null;
  sampleSpacingM: number;
  confidence: 'approximate';
  source: 'dem' | 'unavailable';
  fallbackReason: string | null;
  provider: string;
}

/**
 * Fetch approximate terrain for a coordinate.
 *
 * Returns `null` when the provider had nothing usable. Storing a record with a
 * null slope instead would be worse than storing nothing: every consumer would
 * then have to re-check for the null that the record's own absence already
 * states, and one that forgot would multiply by it.
 */
export async function fetchTerrain(
  latitude: number,
  longitude: number,
): Promise<FarmTerrain | null> {
  let response: TerrainResponse;
  try {
    response = await apiGet<TerrainResponse>('/api/terrain', { lat: latitude, lon: longitude });
  } catch {
    return null;
  }

  if (response.source !== 'dem') return null;
  // Both must be present and finite. `slopePercent` drives the water balance and
  // `elevationM` drives FAO-56 Eq. 7, so a NaN in either would spread silently
  // through the engine rather than failing anywhere visible.
  if (
    typeof response.slopePercent !== 'number' ||
    !Number.isFinite(response.slopePercent) ||
    typeof response.elevationM !== 'number' ||
    !Number.isFinite(response.elevationM)
  ) {
    return null;
  }

  return {
    slopePercent: response.slopePercent,
    aspect: response.aspect,
    aspectDegrees: response.aspectDegrees,
    elevationM: response.elevationM,
    sampleSpacingM: response.sampleSpacingM,
    confidence: 'approximate',
    provider: response.provider,
    fetchedAt: new Date().toISOString(),
    latitude,
    longitude,
  };
}
