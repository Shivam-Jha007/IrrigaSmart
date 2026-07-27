import type { SoilType } from '../types';
import { apiGet } from './apiClient';

/**
 * Location service (docs/12_Product_Roadmap_v2.md Feature 1 — Smart Farm
 * Location).
 *
 * Combines the browser Geolocation API with the backend's reverse-geocoding
 * and soil-lookup proxy so the farm form can auto-fill coordinates, place
 * names, and a soil suggestion. No location data is persisted here — the farm
 * form owns what gets saved.
 */

/** Place names + soil suggestion returned by GET /api/location. */
export interface LocationInfo {
  village: string | null;
  district: string | null;
  state: string | null;
  /** Combined human-readable label, e.g. "Bolpur, Birbhum, West Bengal". */
  label: string;
  suggestedSoilType: SoilType | null;
}

export async function fetchLocationInfo(latitude: number, longitude: number): Promise<LocationInfo> {
  return apiGet<LocationInfo>('/api/location', { lat: latitude, lon: longitude });
}

/** Why a device-position lookup failed, mapped to farmer-friendly UI copy. */
export type GeolocationErrorCode = 'UNSUPPORTED' | 'PERMISSION_DENIED' | 'UNAVAILABLE';

export class GeolocationError extends Error {
  constructor(readonly code: GeolocationErrorCode) {
    super(code);
    this.name = 'GeolocationError';
  }
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const POSITION_TIMEOUT_MS = 10_000;

/**
 * Read the device's current position. Rejects with GeolocationError so callers
 * can show a specific message (denied permission vs. unsupported device).
 */
export function detectCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GeolocationError('UNSUPPORTED'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(
          new GeolocationError(error.code === error.PERMISSION_DENIED ? 'PERMISSION_DENIED' : 'UNAVAILABLE'),
        );
      },
      { timeout: POSITION_TIMEOUT_MS, maximumAge: 60_000 },
    );
  });
}
