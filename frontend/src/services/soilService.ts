/**
 * Measured-soil fetch (item 1) — the frontend half of `backend/src/soil.ts`.
 *
 * Kept separate from `locationService` on purpose. The SoilGrids 7-property
 * query takes roughly 15 seconds, while farm creation needs a place name
 * immediately, so the two must not share a request: blocking the form on this
 * would make creating a farm feel broken.
 *
 * Nothing here throws for the caller to handle. A farm with no measured profile
 * is a fully supported state — `rootZoneWater` falls back to the Knowledge Base
 * table (item 18) — so a failure resolves to `null` and the app carries on.
 */

import { apiGet } from './apiClient';
import type { MeasuredSoilProfile, SoilType } from '../types';

interface SoilResponse {
  layers: MeasuredSoilProfile['layers'];
  usdaTextureClass: string | null;
  suggestedSoilName: SoilType | null;
  source: 'measured' | 'table';
  fallbackReason: string | null;
  provider: string;
}

/**
 * Fetch the measured profile for a coordinate.
 *
 * Returns `null` when the provider had nothing usable — the caller stores
 * nothing and the engine uses the table. Returning a profile with zero layers
 * instead would be worse than returning nothing: `rootZoneWater` would report
 * `source: 'measured'` with no measurements behind it.
 */
export async function fetchMeasuredSoil(
  latitude: number,
  longitude: number,
): Promise<MeasuredSoilProfile | null> {
  let response: SoilResponse;
  try {
    response = await apiGet<SoilResponse>('/api/soil', { lat: latitude, lon: longitude });
  } catch {
    return null;
  }

  if (response.source !== 'measured' || response.layers.length === 0) return null;

  return {
    layers: response.layers,
    usdaTextureClass: response.usdaTextureClass,
    provider: response.provider,
    fetchedAt: new Date().toISOString(),
    latitude,
    longitude,
  };
}

/**
 * The soil name SoilGrids' texture triangle suggests, for the form's existing
 * suggestion chip. Separate from the profile because the suggestion is still
 * useful when the θ values failed validation — texture comes from
 * sand/silt/clay alone and does not depend on them.
 */
export async function fetchSoilSuggestion(
  latitude: number,
  longitude: number,
): Promise<{ soilName: SoilType | null; textureClass: string | null }> {
  try {
    const response = await apiGet<SoilResponse>('/api/soil', { lat: latitude, lon: longitude });
    return { soilName: response.suggestedSoilName, textureClass: response.usdaTextureClass };
  } catch {
    return { soilName: null, textureClass: null };
  }
}
