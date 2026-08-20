/**
 * Terrain slope provider (docs/04_System_Interfaces.md Interface 7).
 *
 * WHY THIS EXISTS
 * Until now every farm was treated as a level plane. Slope changes two things a
 * farmer feels directly: rain runs off a slope instead of soaking in, so the
 * effective rainfall the engine credits is too generous; and flood or furrow
 * irrigation on a slope carries water (and topsoil) downhill rather than
 * wetting the root zone. Neither can be inferred from the soil type or the
 * weather, so without terrain the engine has no way to know.
 *
 * Provider: Open-Meteo Elevation API (https://api.open-meteo.com/v1/elevation),
 * which serves the Copernicus DEM GLO-90 (~90 m ground sample distance).
 * Free, no key, CC-BY 4.0. Measured latency at the reference coordinate:
 * ~1.3-1.8 s for the five-point query.
 *
 * HOW SLOPE IS DERIVED
 * One request carries five points: the farm centre and four neighbours at
 * ±SAMPLE_OFFSET_M north, south, east and west. Central differences over that
 * cross give the two gradient components, and their magnitude is the slope.
 * Five points in one request is the whole budget — a farm is sampled once, at
 * creation, and the answer is then stored on the device forever.
 *
 * WHY THE ANSWER IS LABELLED `approximate` AND NOT A NUMBER TO TRUST
 * Two effects were MEASURED against live provider responses, and both are
 * larger than they look:
 *
 *   1. There is a noise floor. On the Punjab plain at 30.90°N 75.85°E — ground
 *      that is flat to the eye for kilometres — the cross returns 250, 250,
 *      260, 250, 253 m. That 10 m spread is DEM error, not terrain, and it
 *      alone computes to ~3% slope. So a small reported slope means "flat, or
 *      close enough that this method cannot tell".
 *
 *   2. It under-reports real hills. At Manali (32.24°N 77.19°E), on a
 *      Himalayan valley side whose true grade is well over 30%, the same cross
 *      reports ~5.7%, because a 300 m baseline averages across the slope
 *      instead of measuring it.
 *
 * The consumer must therefore treat this as a coarse category, never as a
 * survey figure: a deadband below which slope is ignored, and a threshold above
 * which an advisory is offered. Those thresholds are agronomic policy and live
 * in the frontend engine, not here — this module reports the geometry it
 * measured and says how it was measured (the same split as `soil.ts`, which
 * returns raw layers and lets the root zone weight them).
 */

import { openMeteoFailureReason } from './openMeteo.js';

/** Downhill direction on an 8-point compass. */
export type Aspect = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface TerrainPayload {
  /**
   * Slope magnitude in percent (rise over run × 100), or null when the provider
   * gave nothing usable. Read together with `sampleSpacingM`: this is the mean
   * grade over that baseline, not the steepest pitch inside it.
   */
  slopePercent: number | null;
  /** Direction water runs downhill, or null when the ground is level or unknown. */
  aspect: Aspect | null;
  /** Downhill bearing in degrees clockwise from north. Null when level or unknown. */
  aspectDegrees: number | null;
  /** Elevation of the farm centre in metres above sea level. Null when unknown. */
  elevationM: number | null;
  /** Half-width of the sampling cross, in metres. The baseline is twice this. */
  sampleSpacingM: number;
  /**
   * Always `approximate`. This is a constant rather than a computed field on
   * purpose: there is no input for which a ~90 m DEM sampled over 300 m becomes
   * a survey, so no code path may ever raise it.
   */
  confidence: 'approximate';
  /**
   * `dem` — `slopePercent` and `elevationM` are usable.
   * `unavailable` — nothing usable came back; the caller must carry on without
   * terrain, exactly as every farm did before this module existed (item 0).
   */
  source: 'dem' | 'unavailable';
  /** Why `source` is `unavailable`, for the UI and for debugging. Null on success. */
  fallbackReason: string | null;
  provider: string;
}

export class TerrainProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'TerrainProviderError';
  }
}

const ELEVATION_URL = 'https://api.open-meteo.com/v1/elevation';
const PROVIDER_USER_AGENT = 'IrrigaSmart/1.1 (+https://github.com/Shivam-Jha007/IrrigaSmart)';

/**
 * Half-width of the sampling cross. 150 m is a compromise measured against the
 * two failure modes above: a shorter baseline (say 90 m, one DEM cell) makes
 * the metre-scale quantisation noise dominate, while a longer one smooths real
 * terrain away even faster than 300 m already does.
 */
const SAMPLE_OFFSET_M = 150;

/**
 * Metres per degree of latitude. A sphere is accurate enough here — the error
 * against the WGS-84 ellipsoid is under 0.3%, which is nothing beside a DEM
 * noise floor that can fabricate 3% slope on level ground.
 */
const METRES_PER_DEGREE_LAT = 111_320;

/** Unlike SoilGrids this endpoint answers in ~1.5 s, so the budget is short. */
const REQUEST_TIMEOUT_MS = 15_000;

/** Number of points in the cross: centre, N, S, E, W. */
const SAMPLE_COUNT = 5;

interface ElevationResponse {
  elevation?: Array<number | null>;
}

/**
 * The five sampling points, centre first, then N, S, E, W.
 *
 * The longitude offset is divided by cos(latitude) because a degree of
 * longitude shrinks towards the poles; without it the east-west arm would be
 * shorter than the north-south one and the two gradient components would be
 * measured over different baselines. At the reference latitude of 23.677°N the
 * correction is already ~9%, and by 60° it would be a factor of two.
 *
 * Near the poles cos(latitude) collapses and the longitude offset would explode
 * past the meridian, so the east-west arm is clamped; `buildPoints` reports when
 * it had to, and the caller then works from the north-south arm alone.
 */
export function buildPoints(
  latitude: number,
  longitude: number,
): { latitudes: number[]; longitudes: number[]; eastWestUsable: boolean } {
  const dLat = SAMPLE_OFFSET_M / METRES_PER_DEGREE_LAT;
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  // 0.05 rad of cos ≈ 87° of latitude, past every inhabited farm on Earth.
  const eastWestUsable = cosLat > 0.05;
  const dLon = eastWestUsable ? dLat / cosLat : 0;

  // Clamp so a farm within 150 m of a pole cannot produce a latitude past ±90,
  // which the provider rejects outright with a 400.
  const north = Math.min(90, latitude + dLat);
  const south = Math.max(-90, latitude - dLat);
  // Longitude wraps rather than clamps: a farm on the antimeridian is a real
  // place, and 180.001 is the same ground as -179.999.
  const east = wrapLongitude(longitude + dLon);
  const west = wrapLongitude(longitude - dLon);

  return {
    latitudes: [latitude, north, south, latitude, latitude],
    longitudes: [longitude, longitude, longitude, east, west],
    eastWestUsable,
  };
}

function wrapLongitude(lon: number): number {
  let out = lon;
  while (out > 180) out -= 360;
  while (out < -180) out += 360;
  return out;
}

/** Compass point nearest a bearing in degrees clockwise from north. */
export function aspectFor(bearingDegrees: number): Aspect {
  const names: Aspect[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const normalised = ((bearingDegrees % 360) + 360) % 360;
  const index = Math.round(normalised / 45) % 8;
  return names[index]!;
}

/**
 * Derive slope and aspect from the five elevations, in the order `buildPoints`
 * emitted them: centre, north, south, east, west.
 *
 * Central differences: the north-south gradient is (north − south) over the
 * full 300 m baseline, and likewise east-west. Slope is the magnitude of that
 * gradient vector, which is the steepest grade of the plane fitted through the
 * cross — not the average of the two arms, and not the larger of them.
 *
 * Aspect points DOWNHILL, because that is the direction water runs, which is
 * the only reason this module exists. The gradient vector points uphill, so the
 * bearing is negated. atan2(east, north) — not the usual atan2(y, x) — because
 * compass bearings are measured clockwise from north rather than
 * counter-clockwise from east.
 *
 * Exported separately from the fetch so the arithmetic can be checked against
 * hand-computed geometry with no network involved.
 */
export function slopeFrom(
  elevations: Array<number | null | undefined>,
  eastWestUsable: boolean,
): { slopePercent: number; aspectDegrees: number | null; centreM: number } | null {
  const [centre, north, south, east, west] = elevations;
  if (typeof centre !== 'number' || !Number.isFinite(centre)) return null;

  const baseline = 2 * SAMPLE_OFFSET_M;
  const usable = (v: number | null | undefined): v is number =>
    typeof v === 'number' && Number.isFinite(v);

  // Each arm degrades independently. A cross that lost its east point still
  // measures the north-south grade, and reporting that is far better than
  // reporting nothing — but a lost arm must not be read as zero gradient,
  // which would understate the slope rather than admit the gap.
  let dzdy: number | null = null;
  if (usable(north) && usable(south)) {
    dzdy = (north - south) / baseline;
  } else if (usable(north)) {
    dzdy = (north - centre) / SAMPLE_OFFSET_M;
  } else if (usable(south)) {
    dzdy = (centre - south) / SAMPLE_OFFSET_M;
  }

  let dzdx: number | null = null;
  if (eastWestUsable) {
    if (usable(east) && usable(west)) {
      dzdx = (east - west) / baseline;
    } else if (usable(east)) {
      dzdx = (east - centre) / SAMPLE_OFFSET_M;
    } else if (usable(west)) {
      dzdx = (centre - west) / SAMPLE_OFFSET_M;
    }
  }

  if (dzdy === null && dzdx === null) return null;

  const gy = dzdy ?? 0;
  const gx = dzdx ?? 0;
  const slopePercent = Math.hypot(gx, gy) * 100;

  // A perfectly level cross has no downhill direction. Reporting 'N' for it —
  // which atan2(0, 0) would — invents a direction out of nothing.
  const aspectDegrees =
    gx === 0 && gy === 0 ? null : ((Math.atan2(-gx, -gy) * 180) / Math.PI + 360) % 360;

  return { slopePercent, aspectDegrees, centreM: centre };
}

function buildUrl(latitudes: number[], longitudes: number[]): string {
  const params = new URLSearchParams({
    latitude: latitudes.join(','),
    longitude: longitudes.join(','),
  });
  return `${ELEVATION_URL}?${params.toString()}`;
}

/**
 * Fetch approximate terrain slope for a coordinate.
 *
 * Throws only on invalid input. Every provider failure resolves to a payload
 * with `source: 'unavailable'` and a reason, because a farm without terrain is
 * a fully supported state — it is what every existing farm already is, and the
 * engine must produce byte-identical advice for it (item 0 / item 18).
 */
export async function fetchTerrain(
  latitude: number,
  longitude: number,
): Promise<TerrainPayload> {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new TerrainProviderError('latitude must be between -90 and 90', 400);
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new TerrainProviderError('longitude must be between -180 and 180', 400);
  }

  const unavailable = (reason: string): TerrainPayload => ({
    slopePercent: null,
    aspect: null,
    aspectDegrees: null,
    elevationM: null,
    sampleSpacingM: SAMPLE_OFFSET_M,
    confidence: 'approximate',
    source: 'unavailable',
    fallbackReason: reason,
    provider: 'open-meteo-elevation-copernicus-dem-glo-90',
  });

  const points = buildPoints(latitude, longitude);

  let response: globalThis.Response;
  try {
    response = await fetch(buildUrl(points.latitudes, points.longitudes), {
      headers: { 'User-Agent': PROVIDER_USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return unavailable('terrain provider is unreachable');
  }
  if (!response.ok) {
    return unavailable(`terrain provider returned ${response.status}${await openMeteoFailureReason(response)}`);
  }

  let body: ElevationResponse;
  try {
    body = (await response.json()) as ElevationResponse;
  } catch {
    return unavailable('terrain provider returned an unreadable response');
  }

  const elevations = body.elevation;
  if (!Array.isArray(elevations) || elevations.length < SAMPLE_COUNT) {
    // Fewer points back than were asked for means the array indices no longer
    // mean what this code assumes, and reading N as S would flip the aspect.
    return unavailable('terrain provider returned an incomplete elevation set');
  }

  const derived = slopeFrom(elevations, points.eastWestUsable);
  if (!derived) {
    return unavailable('terrain provider returned no usable elevation');
  }

  return {
    slopePercent: round(derived.slopePercent, 2),
    aspect: derived.aspectDegrees === null ? null : aspectFor(derived.aspectDegrees),
    aspectDegrees: derived.aspectDegrees === null ? null : round(derived.aspectDegrees, 1),
    elevationM: round(derived.centreM, 1),
    sampleSpacingM: SAMPLE_OFFSET_M,
    confidence: 'approximate',
    source: 'dem',
    fallbackReason: null,
    provider: 'open-meteo-elevation-copernicus-dem-glo-90',
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
