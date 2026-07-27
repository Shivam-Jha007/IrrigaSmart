/**
 * Location provider integration (docs/12_Product_Roadmap_v2.md Feature 1 —
 * Smart Farm Location).
 *
 * The backend owns external providers so the frontend depends only on a stable
 * internal shape (docs/07_Engineering_Rules.md: API Rules). Providers used:
 *
 * - Reverse geocoding: Nominatim / OpenStreetMap (free, no key; usage policy
 *   requires an identifying User-Agent, which we send).
 * - Soil suggestion: ISRIC SoilGrids WRB classification (free, no key), mapped
 *   conservatively into the three soil types the Knowledge Base supports
 *   (docs/10_Knowledge_Base.md §4). This is a *suggestion* only — the farmer
 *   must always confirm it in the UI (roadmap Feature 1 Optional Enhancement).
 */

export type SuggestedSoilType = 'Sandy' | 'Loamy' | 'Clay';

export interface LocationPayload {
  village: string | null;
  district: string | null;
  state: string | null;
  /** Combined human-readable label, e.g. "Bolpur, Birbhum, West Bengal". */
  label: string;
  suggestedSoilType: SuggestedSoilType | null;
}

/** Provider-specific error carrying an HTTP status for the API layer. */
export class LocationProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'LocationProviderError';
  }
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const SOILGRIDS_CLASSIFICATION_URL = 'https://rest.isric.org/soilgrids/v2.0/classification/query';

/** Nominatim's usage policy requires an identifying User-Agent. */
const PROVIDER_USER_AGENT = 'IrrigaSmart/1.1 (+https://github.com/Shivam-Jha007/IrrigaSmart)';

/**
 * WRB Reference Soil Groups with a well-established texture leaning, mapped to
 * the three supported soil types (Knowledge Base §4). Groups listed under clay
 * are defined by clay accumulation or waterlogging; groups under sand are
 * coarse-textured by definition. Any other recognized group suggests Loamy —
 * the neutral middle — and an unrecognized name yields no suggestion at all.
 * This heuristic only ever produces a *suggestion* the farmer must confirm.
 */
const WRB_SANDY_GROUPS: ReadonlySet<string> = new Set(['Arenosols', 'Podzols']);
const WRB_CLAY_GROUPS: ReadonlySet<string> = new Set([
  'Acrisols',
  'Alisols',
  'Ferralsols',
  'Gleysols',
  'Lixisols',
  'Luvisols',
  'Nitisols',
  'Planosols',
  'Retisols',
  'Stagnosols',
  'Vertisols',
]);
/** Recognized groups without a strong texture lean → suggest Loamy. */
const WRB_LOAMY_GROUPS: ReadonlySet<string> = new Set([
  'Andosols',
  'Anthrosols',
  'Calcisols',
  'Cambisols',
  'Chernozems',
  'Cryosols',
  'Durisols',
  'Fluvisols',
  'Gypsisols',
  'Histosols',
  'Kastanozems',
  'Leptosols',
  'Phaeozems',
  'Plinthosols',
  'Regosols',
  'Solonchaks',
  'Solonetz',
  'Technosols',
  'Umbrisols',
]);

interface NominatimReverseResponse {
  address?: {
    village?: string;
    town?: string;
    city?: string;
    hamlet?: string;
    county?: string;
    state_district?: string;
    district?: string;
    state?: string;
  };
}

interface SoilGridsClassificationResponse {
  wrb_class_name?: string;
}

async function reverseGeocode(latitude: number, longitude: number): Promise<NominatimReverseResponse> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
    'accept-language': 'en',
  });

  let response: globalThis.Response;
  try {
    response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { 'User-Agent': PROVIDER_USER_AGENT },
    });
  } catch {
    throw new LocationProviderError('geocoding provider is unreachable', 502);
  }
  if (!response.ok) {
    throw new LocationProviderError(`geocoding provider returned ${response.status}`, 502);
  }
  return (await response.json()) as NominatimReverseResponse;
}

/** Map a WRB soil group name to a supported soil type suggestion, or null. */
function soilTypeFromWrbClass(wrbClassName: string | undefined): SuggestedSoilType | null {
  if (!wrbClassName) return null;
  if (WRB_CLAY_GROUPS.has(wrbClassName)) return 'Clay';
  if (WRB_SANDY_GROUPS.has(wrbClassName)) return 'Sandy';
  if (WRB_LOAMY_GROUPS.has(wrbClassName)) return 'Loamy';
  return null;
}

/**
 * Look up the WRB soil classification for a coordinate and map it to a
 * supported soil type. Best-effort: any failure or missing data resolves to
 * null rather than an error, since the suggestion is an optional enhancement.
 */
async function suggestSoilType(latitude: number, longitude: number): Promise<SuggestedSoilType | null> {
  try {
    const params = new URLSearchParams({
      lon: String(longitude),
      lat: String(latitude),
      number_classes: '1',
    });
    const response = await fetch(`${SOILGRIDS_CLASSIFICATION_URL}?${params.toString()}`, {
      headers: { 'User-Agent': PROVIDER_USER_AGENT },
    });
    if (!response.ok) return null;

    const body = (await response.json()) as SoilGridsClassificationResponse;
    return soilTypeFromWrbClass(body.wrb_class_name);
  } catch {
    return null;
  }
}

/**
 * Resolve a coordinate to place names (village/district/state) and an optional
 * soil suggestion. Throws LocationProviderError on invalid input or when the
 * geocoding provider fails; soil lookup failures degrade to null.
 */
export async function fetchLocationInfo(latitude: number, longitude: number): Promise<LocationPayload> {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new LocationProviderError('latitude must be between -90 and 90', 400);
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new LocationProviderError('longitude must be between -180 and 180', 400);
  }

  const [geo, suggestedSoilType] = await Promise.all([
    reverseGeocode(latitude, longitude),
    suggestSoilType(latitude, longitude),
  ]);

  const address = geo.address ?? {};
  const village = address.village ?? address.town ?? address.city ?? address.hamlet ?? address.county ?? null;
  const district = address.state_district ?? address.district ?? null;
  const state = address.state ?? null;
  const label = [village, district, state].filter((part) => part !== null).join(', ');

  return { village, district, state, label, suggestedSoilType };
}
