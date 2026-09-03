import type {
  Crop,
  CropName,
  DailyWeather,
  DepletionState,
  Farm,
  GrowthStage,
  Soil,
  SoilNutrientReading,
  SoilQualityReading,
  SoilType,
  WaterQualityReading,
  WeatherData,
} from '../../types';

/**
 * Deterministic fixtures for the golden regression suite.
 *
 * Every value here is fixed. Nothing reads the clock, nothing is random, and no
 * fixture depends on another test having run first — the snapshots are only
 * meaningful if the inputs that produced them are reproducible byte for byte.
 */

/**
 * The pinned "now" for the whole matrix: 15 June 2026, 08:30 IST.
 *
 * Chosen deliberately:
 *  - June falls in Kharif (regionalKnowledge.getSeasonForMonth: 6–9), the season
 *    most Indian farms irrigate in.
 *  - 08:30 is after the 06:00 default irrigation window, so the timing module's
 *    "never advise a time that has already gone" branch is exercised rather than
 *    skipped.
 */
export const NOW = '2026-06-15T08:30:00+05:30';
export const TODAY = '2026-06-15';

/** A "now" in each season, so the seasonal ETo factor and timing shifts are covered. */
export const SEASON_NOWS = {
  Kharif: '2026-06-15T08:30:00+05:30',
  Rabi: '2026-01-15T08:30:00+05:30',
  Zaid: '2026-04-15T08:30:00+05:30',
} as const;

export function makeFarm(overrides: Partial<Farm> = {}): Farm {
  return {
    id: 'farm-1',
    farmerId: 'farmer-1',
    name: 'Test Field',
    location: { latitude: 23.677, longitude: 87.685, label: 'Test Village' },
    area: 1,
    areaUnit: 'Acre',
    soilType: 'Loamy',
    irrigationMethod: 'Drip',
    primaryCropId: 'crop-1',
    ...overrides,
  };
}

/** An irrigation-water test report, for the V2.2 leaching tests. */
export function makeWaterQuality(overrides: Partial<WaterQualityReading> = {}): WaterQualityReading {
  return { recordedAt: NOW, ...overrides };
}

export function makeCrop(name: CropName, stage: GrowthStage): Crop {
  return {
    id: 'crop-1',
    name,
    growthStage: stage,
    typicalWaterRequirement: 'Moderate',
    category: 'Cereal',
  };
}

export function makeSoil(
  name: SoilType,
  qualityReading?: SoilQualityReading,
  nutrientReading?: SoilNutrientReading,
): Soil {
  return {
    id: 'soil-1',
    name,
    waterRetention: 'Moderate',
    drainage: 'Moderate',
    ...(qualityReading ? { qualityReading } : {}),
    ...(nutrientReading ? { nutrientReading } : {}),
  };
}

export function makeWeather(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    temperature: 32,
    humidity: 60,
    rainfallForecast: 0,
    windSpeed: 2,
    cloudCover: 40,
    // 30 minutes before NOW, so freshness lands in the "High" confidence band.
    observationTime: '2026-06-15T08:00:00+05:30',
    dataSource: 'test',
    ...overrides,
  };
}

/**
 * Build a daily series centred on TODAY.
 *
 * Mirrors the shape the backend actually returns: `past_days: 2` and
 * `forecast_days: 5`, i.e. two days behind, today, and four ahead.
 */
export function makeDaily(
  perDay: (offset: number, date: string) => Partial<DailyWeather>,
  from = -2,
  to = 4,
): DailyWeather[] {
  const days: DailyWeather[] = [];
  for (let offset = from; offset <= to; offset += 1) {
    const date = shiftDay(TODAY, offset);
    days.push({
      date,
      precipitationSum: 0,
      temperatureMax: 34,
      humidityMean: 62,
      windSpeedMax: 2.5,
      et0FaoMm: 5.2,
      ...perDay(offset, date),
    });
  }
  return days;
}

/**
 * Drop `et0FaoMm` from a day entirely.
 *
 * The engine branches on `day.et0FaoMm != null`, and a cached payload written
 * before V1.5 simply has no such key. Deleting it reproduces that shape exactly,
 * which setting it to `undefined` cannot do under `exactOptionalPropertyTypes`.
 */
export function withoutEto(day: DailyWeather): DailyWeather {
  const copy = { ...day };
  delete copy.et0FaoMm;
  return copy;
}

/** Shift a YYYY-MM-DD date by whole calendar days, UTC-anchored to avoid DST drift. */
export function shiftDay(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const base = Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const shifted = new Date(base + days * 86_400_000);
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(shifted.getUTCDate()).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${mm}-${dd}`;
}

export function makeDepletion(depletionMm: number, validAsOfDate = shiftDay(TODAY, -1)): DepletionState {
  return {
    farmId: 'farm-1',
    depletionMm,
    validAsOfDate,
    updatedAt: `${validAsOfDate}T18:00:00+05:30`,
  };
}

/**
 * The weather scenarios every crop×soil×stage combination is run through.
 *
 * These are the branches that actually decide the outcome, so a change in any of
 * them shows up in the snapshot:
 *  - dry:       no rain, ETo present — the ordinary irrigate/monitor path
 *  - rain:      rain exceeding demand — the "Delay Irrigation" branch
 *  - heatwave:  high temperature and low humidity — the multiplier ceiling
 *  - noEto:     pre-V1.7 cache, no ETo and no Tmin — the ETO_REF last resort
 *  - noEtoV17:  V1.7 cache, no ETo but full inputs — the local FAO-56 estimate
 *  - noDaily:   no series at all — the pre-V1.6 single-day requirement path
 *
 * Appended, never reordered: `decisionEngine.golden.test.ts` selects scenarios by
 * index for its full-object snapshots.
 */
export interface Scenario {
  key: string;
  weather: WeatherData | null;
  daily: DailyWeather[] | null;
  depletionState: DepletionState | null;
}

export const SCENARIOS: readonly Scenario[] = [
  {
    key: 'dry',
    weather: makeWeather(),
    daily: makeDaily(() => ({})),
    depletionState: makeDepletion(12),
  },
  {
    key: 'rain',
    weather: makeWeather({ rainfallForecast: 25, humidity: 88, temperature: 27 }),
    daily: makeDaily((offset) => ({
      precipitationSum: offset >= 0 ? 25 : 0,
      humidityMean: 88,
      temperatureMax: 27,
      et0FaoMm: 3.1,
    })),
    depletionState: makeDepletion(12),
  },
  {
    key: 'heatwave',
    weather: makeWeather({ temperature: 44, humidity: 18, windSpeed: 7 }),
    daily: makeDaily(() => ({
      temperatureMax: 45,
      humidityMean: 18,
      windSpeedMax: 7,
      et0FaoMm: 9.4,
    })),
    depletionState: makeDepletion(20),
  },
  {
    key: 'noEto',
    // A cache written before V1.7: no ETo AND no minimum temperature, so not even
    // Hargreaves-Samani can run. This is the ONLY shape that still reaches the
    // invented ETO_REF constant, and it is kept reachable on purpose — a farmer
    // offline with an old cache must still get advice (item 0).
    weather: makeWeather(),
    daily: makeDaily(() => ({})).map(withoutEto),
    depletionState: makeDepletion(12),
  },
  {
    key: 'noDaily',
    weather: makeWeather(),
    daily: null,
    depletionState: null,
  },
  {
    key: 'noEtoV17',
    // A V1.7 cache during a provider gap: `et0_fao_evapotranspiration` is absent
    // for the day but everything the FAO-56 equation needs is present. This is
    // the path that replaced the ETO_REF guess, so the matrix must cover it.
    weather: makeWeather(),
    daily: makeDaily(() => ({
      temperatureMin: 25.4,
      sunshineHours: 8.4,
      daylightHours: 13.4,
      radiationMj: 20.5,
    })).map(withoutEto),
    depletionState: makeDepletion(12),
  },
] as const;
