/**
 * Measured-soil fetch (item 1) — the frontend half of `backend/src/soil.ts`.
 *
 * Kept separate from `locationService` on purpose. The SoilGrids property query
 * takes tens of seconds, while farm creation needs a place name immediately, so
 * the two must not share a request: blocking the form on this would make
 * creating a farm feel broken.
 *
 * Nothing here throws for the caller to handle. A farm with no measured profile
 * is a fully supported state — `rootZoneWater` falls back to the Knowledge Base
 * table (item 18) — so a failure resolves to an outcome describing WHY, and the
 * app carries on either way.
 */

import { ApiError, apiGet } from './apiClient';
import type { MeasuredSoilProfile, SoilType } from '../types';

interface SoilResponse {
  layers: MeasuredSoilProfile['layers'];
  usdaTextureClass: string | null;
  suggestedSoilName: SoilType | null;
  source: 'measured' | 'table';
  fallbackReason: string | null;
  retryable: boolean;
  provider: string;
}

/**
 * What came back, and when nothing did, why.
 *
 * WHY THIS IS NOT JUST `MeasuredSoilProfile | null`
 * It was, and that was the defect: a bare `null` collapsed "you are offline",
 * "the soil map is down", and "this coordinate genuinely has no usable data"
 * into one silent outcome, so the pH card could only say "unavailable" and the
 * farmer had no way to tell a temporary outage from a permanent gap. The three
 * are different facts about the world and the UI says different things about
 * them.
 *
 * The `reason` string is the backend's own English wording, kept for diagnosis
 * only — it is deliberately NOT rendered. Interpolating "soil provider returned
 * 503" into a Bengali sentence is the half-localised output this codebase
 * refuses to produce, so the UI keys off `kind` and translates its own message.
 */
export type MeasuredSoilOutcome =
  /** A usable profile. */
  | { readonly kind: 'measured'; readonly profile: MeasuredSoilProfile }
  /**
   * The backend answered, but with no usable profile for this point. `retryable`
   * carries the backend's own distinction (`SoilResponse.retryable`): `true` when
   * the fallback was a transient provider failure — a timeout, a 5xx — that a
   * later request may get past, `false` when it was deterministic (a 4xx, or
   * values that failed the cross-check) and asking again returns the same. The
   * background caller retries only the transient ones, so a slow spell at the
   * provider heals itself without re-fetching a coordinate that has nothing.
   */
  | { readonly kind: 'unavailable'; readonly reason: string | null; readonly retryable: boolean }
  /**
   * The backend could not be reached at all: the farmer is offline, or the API
   * is down. Nothing is known about the soil either way, and this is worth
   * retrying later.
   */
  | { readonly kind: 'unreachable' };

/**
 * Fetch the measured profile for a coordinate.
 *
 * Never throws. A farm with no measured profile is a fully supported state —
 * `rootZoneWater` falls back to the Knowledge Base table (item 18) — so a
 * failure is reported as an outcome the caller can explain rather than as an
 * exception it must catch.
 *
 * A payload with zero layers is reported as `unavailable`, not as a profile:
 * storing an empty one would make `rootZoneWater` claim `source: 'measured'`
 * with no measurements behind it.
 */
export async function fetchMeasuredSoil(
  latitude: number,
  longitude: number,
): Promise<MeasuredSoilOutcome> {
  let response: SoilResponse;
  try {
    response = await apiGet<SoilResponse>('/api/soil', { lat: latitude, lon: longitude });
  } catch (error) {
    // NETWORK_ERROR is the code `apiClient` reserves for a request that never
    // reached the backend, which is the one failure that says nothing at all
    // about the soil. Anything else did reach it and came back refused.
    if (error instanceof ApiError && error.code === 'NETWORK_ERROR') {
      return { kind: 'unreachable' };
    }
    // A thrown error means the backend was reached and refused (a 4xx for bad
    // coordinates, a 5xx for an internal fault) or sent something unparseable —
    // none of which a background retry of the same request would clear, so it is
    // reported as settled rather than transient.
    return { kind: 'unavailable', reason: error instanceof Error ? error.message : null, retryable: false };
  }

  if (response.source !== 'measured' || response.layers.length === 0) {
    return { kind: 'unavailable', reason: response.fallbackReason, retryable: response.retryable };
  }

  return {
    kind: 'measured',
    profile: {
      layers: response.layers,
      usdaTextureClass: response.usdaTextureClass,
      provider: response.provider,
      fetchedAt: new Date().toISOString(),
      latitude,
      longitude,
    },
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
