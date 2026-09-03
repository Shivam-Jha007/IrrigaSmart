import type {
  ConfidenceLevel,
  Crop,
  CropName,
  DailyWeather,
  DepletionState,
  EstimatedWaterAmount,
  Farm,
  IrrigationMethod,
  IrrigationWindow,
  Language,
  Recommendation,
  RecommendationFactor,
  RecommendationStatus,
  Soil,
  WeatherData,
  WaterLedgerEntry,
} from '../types';
import { getKc, getZr, getDepletionFraction } from './knowledgeBase';
import { rootZoneWater, type RootZoneWater } from './soilProfile';
import { buildExplanation, leachingSentence } from './explanationText';
import { leachingRequirement } from './waterQuality';
import { estimateEto } from './evapotranspiration';
import { getSeasonForDate } from './regionalKnowledge';
import { localDayString, previousDayString } from './dateUtils';
import { chooseIrrigationWindow, flowLitersPerMinute, runMinutes } from './irrigationTiming';
import { dryingPotential } from './sunshine';
import { intakeFactor, runoffFactor } from './slopeAdjustment';
import { computeWaterSavings } from './waterSavings';
import {
  AREA_TO_M2,
  clamp,
  ETO_REF,
  FRESH_MAX_HOURS,
  HUM_STRONG_DELTA,
  KC_HIGH,
  KC_LOW,
  METHOD_EFFICIENCY,
  METHOD_LOW_EFFICIENCY,
  PLAN_DAYS_AHEAD,
  PLAN_MEDIUM_MAX_OFFSET,
  RAIN_EFF_FACTOR,
  SEASONAL_ETO_FACTOR,
  SKIP_THRESHOLD_MM,
  STALE_MAX_HOURS,
  TEMP_STRONG_DELTA,
  WEATHER,
  WIND_STRONG_DELTA,
} from './decisionParameters';

/**
 * Decision Engine (docs/02_Decision_Engine.md, docs/11_Decision_Logic.md).
 *
 * Deterministic and framework-independent (docs/07_Engineering_Rules.md:
 * Decision Engine Rules). Identical inputs always produce identical output.
 * `now` is injected rather than read from the clock so results are reproducible
 * and testable. `language` selects the explanation wording (roadmap Feature 2)
 * and is likewise an explicit input, keeping determinism.
 *
 * V1.2 additions (docs/11_Decision_Logic.md §10–§11): decision factors with
 * relative influence (roadmap Feature 4), a soil-moisture carryover deficit
 * from recent days' rainfall (Feature 6), and a multi-day irrigation plan
 * (Feature 5). When `daily` is null the engine reproduces the V1.1 formula
 * exactly, so offline use with an old cache is unchanged.
 */

export interface DecisionInput {
  farm: Farm;
  crop: Crop;
  soil: Soil;
  /** Latest available weather, or null when none exists (Decision Logic §8). */
  weather: WeatherData | null;
  /**
   * Past + forecast daily series (Decision Logic §11), or null when
   * unavailable. Past days feed the root-zone water balance; future days feed
   * the irrigation plan.
   */
  daily: DailyWeather[] | null;
  /**
   * Persisted root-zone depletion state (Decision Logic §4b, V1.6), or null
   * when unavailable (new farm, first run after V1.6 upgrade). When provided,
   * the engine rolls it forward to today using the daily series.
   */
  depletionState: DepletionState | null;
  /**
   * Water ledger entries for this farm (Decision Logic §4b, V1.6), used to
   * determine the net irrigation actually applied on past days when rolling the
   * depletion ledger forward. May be null or empty.
   */
  waterLedger: WaterLedgerEntry[] | null;
  /** Current time as an ISO-8601 string, injected for determinism. */
  now: string;
  /** Language for the farmer-facing explanation (roadmap Feature 2). */
  language: Language;
}

/** A missing required field prevents recommendation (Decision Engine Stage 1). */
export interface ValidationFailure {
  ok: false;
  missingFields: string[];
}

/** One day of the multi-day irrigation plan (Decision Logic §11). */
export interface IrrigationPlanDay {
  /** Calendar date (YYYY-MM-DD, farm-local). */
  date: string;
  /** Days from today (0 = today). */
  offsetDays: number;
  /** Effective rainfall expected that day in mm. */
  rainfallMm: number;
  /** Crop water demand for that day in mm. */
  demandMm: number;
  action: RecommendationStatus;
  confidence: ConfidenceLevel;
}

export interface IrrigationPlan {
  days: IrrigationPlanDay[];
  /** First day (including today) advised for irrigation, if any. */
  recommendedIrrigationDate: string | null;
  /** First day where forecast rain covers demand, if any. */
  nextRainCoveredDate: string | null;
}

/**
 * Root-zone water balance for this run (Decision Logic §4b, V1.6).
 *
 * Present only when the balance path actually ran (a daily series was
 * available). Two audiences: the storage layer persists `carryDepletionMm` /
 * `carryValidAsOfDate` as the next run's starting point, and the UI reads
 * `depletionMm` against `tawMm`/`rawMm` to show how much water the root zone is
 * holding.
 */
export interface WaterBalanceState {
  /** Total available water between field capacity and wilting point, mm. */
  tawMm: number;
  /** Readily available water — the depletion at which stress begins, mm. */
  rawMm: number;
  /** Root-zone depletion at the end of today, mm. */
  depletionMm: number;
  /** Effective rooting depth used for TAW, metres. */
  rootDepthM: number;
  /** Depletion to persist, valid as of `carryValidAsOfDate` (not today). */
  carryDepletionMm: number;
  carryValidAsOfDate: string;
  /**
   * Where the θFC/θPWP behind `tawMm` came from (V1.7, item 1). The moisture
   * gauge shows this so a farmer can tell advice built on their own field's
   * measurements from advice built on a six-row textbook table — the difference
   * between the two is exactly what item 1 set out to close.
   */
  thetaSource: 'measured' | 'table';
  /** Fraction of the root zone covered by measured layers, 0-1. */
  thetaCoverage: number;
}

export interface DecisionSuccess {
  ok: true;
  recommendation: Recommendation;
  /** Multi-day plan (Decision Logic §11), or null without daily data. */
  plan: IrrigationPlan | null;
  /**
   * Water balance for this run (Decision Logic §4b), or null when the engine
   * fell back to the V1.2 carryover deficit because no daily series existed.
   */
  waterBalance: WaterBalanceState | null;
}

export type DecisionResult = ValidationFailure | DecisionSuccess;

/** Stage 1 — Validation. Ensures a complete profile before proceeding. */
function validate(input: DecisionInput): string[] {
  const missing: string[] = [];
  const { farm, crop } = input;
  if (!crop.name) missing.push('Crop');
  if (!farm.soilType) missing.push('Soil Type');
  if (!(farm.area > 0)) missing.push('Field Size');
  if (!farm.irrigationMethod) missing.push('Irrigation Method');
  if (!farm.location) missing.push('Location');
  if (!crop.growthStage) missing.push('Growth Stage');
  return missing;
}

/** Weather signals the multiplier reads (shared by current and daily data). */
interface WeatherSignals {
  temperature: number;
  humidity: number;
  windSpeed: number;
}

/**
 * Where the farm is, for the equations that need it (V1.7).
 *
 * Latitude drives extraterrestrial radiation, and elevation drives atmospheric
 * pressure — both are required by FAO-56 and neither is weather. They travel
 * together so the ETo fallback can be called from anywhere in the engine.
 */
interface SiteContext {
  latitude: number;
  elevationM?: number;
  /**
   * Slope runoff multiplier on effective rainfall, in (0, 1]. Exactly 1 for a
   * farm with no terrain record or a slope inside the deadband, which is what
   * keeps every pre-V1.7 farm byte-identical (item 0). See `slopeAdjustment`.
   *
   * It lives on the site rather than being passed separately because there are
   * FOUR places that compute effective rainfall — today's decision, the ledger
   * replay, and both plan branches — and a farm whose plan credited more rain
   * than its decision did would be visibly self-contradictory. Travelling with
   * the context that already reaches all four is what stops them drifting.
   */
  runoff?: number;
}

/**
 * Effective rainfall reaching the root zone, mm (Decision Logic §3).
 *
 * Two independent losses, multiplied: the soil's infiltration fraction decides
 * how much of the rain that lands actually soaks in, and the slope runoff factor
 * decides how much lands rather than running off. THE SINGLE PLACE this is
 * computed — every caller goes through here so today's decision, the replayed
 * ledger and both plan branches can never disagree about the same day's rain.
 */
function effectiveRain(rainfallMm: number, soil: Soil, site: SiteContext): number {
  return rainfallMm * RAIN_EFF_FACTOR[soil.name] * (site.runoff ?? 1);
}

/** Stage 3 helper — bounded weather multiplier (Decision Logic §2). */
function weatherMultiplier(weather: WeatherSignals): number {
  const adjTemp = clamp(
    1 + (weather.temperature - WEATHER.T_BASE) * WEATHER.TEMP_SENS,
    WEATHER.TEMP_MIN,
    WEATHER.TEMP_MAX,
  );
  const adjHum = clamp(
    1 + (WEATHER.H_BASE - weather.humidity) * WEATHER.HUM_SENS,
    WEATHER.HUM_MIN,
    WEATHER.HUM_MAX,
  );
  const adjWind = clamp(
    1 + (weather.windSpeed - WEATHER.W_BASE) * WEATHER.WIND_SENS,
    WEATHER.WIND_MIN,
    WEATHER.WIND_MAX,
  );
  return clamp(adjTemp * adjHum * adjWind, WEATHER.WMULT_MIN, WEATHER.WMULT_MAX);
}

/**
 * Reference ETo for a day from a real source, mm (Decision Logic §2, §2a).
 *
 * Two tiers, best first, and null when neither is possible:
 *  1. `et0FaoMm` — the provider's own FAO-56 Penman-Monteith value, computed
 *     hourly from full data. Always preferred; never overridden.
 *  2. A local FAO-56 estimate from whatever the day actually carries (V1.7).
 *     Measured against tier 1 at 0.20 mm/day mean absolute error with the
 *     provider's radiation, 0.39 without it, and 0.51 on temperature alone
 *     (see `evapotranspiration.test.ts`).
 *
 * Null means the day is too thin even for Hargreaves-Samani — no minimum
 * temperature, i.e. a cache written before V1.7. The caller then chooses its own
 * last resort, because what that should be depends on where it is called from.
 */
function sourcedEto(day: DailyWeather, site: SiteContext): number | null {
  if (day.et0FaoMm != null) return day.et0FaoMm;

  const estimated = estimateEto({
    date: day.date,
    latitude: site.latitude,
    temperatureMax: day.temperatureMax,
    ...(day.temperatureMin != null ? { temperatureMin: day.temperatureMin } : {}),
    humidityMean: day.humidityMean,
    windSpeedMax: day.windSpeedMax,
    ...(day.radiationMj != null ? { radiationMj: day.radiationMj } : {}),
    ...(site.elevationM != null ? { elevationM: site.elevationM } : {}),
  });
  return estimated ? estimated.etoMm : null;
}

/**
 * Last-resort ETo, mm — the pre-V1.7 `ETO_REF × season × multiplier` guess.
 *
 * Kept ONLY for caches too old to carry a minimum temperature, because a farmer
 * offline with such a cache must still receive advice (item 0). The constant has
 * no published source; it is an engineering guess, and it is precisely why the
 * two tiers above it exist. Nothing new should be routed here.
 */
function fallbackEto(signals: WeatherSignals | null, dateForSeason: string): number {
  const multiplier = signals ? weatherMultiplier(signals) : 1;
  return ETO_REF * SEASONAL_ETO_FACTOR[getSeasonForDate(dateForSeason)] * multiplier;
}

/** Crop water demand for one daily-series day in mm (Decision Logic §2, §11). */
function dailyDemand(kc: number, day: DailyWeather, site: SiteContext): number {
  // ETc = Kc × ETo. The weather multiplier lives inside `fallbackEto` alone —
  // applying it to a real ETo would double-count, since ETo already accounts for
  // temperature, humidity, wind and radiation.
  const eto =
    sourcedEto(day, site) ??
    fallbackEto(
      { temperature: day.temperatureMax, humidity: day.humidityMean, windSpeed: day.windSpeedMax },
      day.date,
    );
  return kc * eto;
}

/** Ascending date comparator for DailyWeather entries. */
function byDate(a: DailyWeather, b: DailyWeather): number {
  return a.date.localeCompare(b.date);
}

/**
 * Compute total available water (TAW) for the root zone (Decision Logic §4b.1, V1.6).
 * TAW = 1000 × (θ_FC − θ_PWP) × Zr, in millimetres.
 *
 * V1.7 (item 1): θ comes from the farm's own measured SoilGrids profile when it
 * has one, weighted over this crop's actual root depth by `rootZoneWater`, and
 * from the six-row Knowledge Base table otherwise. The table is not legacy — it
 * is the offline and provider-failure path, and `rootZoneWater` returns it
 * unasked whenever the measurement cannot be trusted for this root zone.
 */
function computeTAW(soil: Soil, zr: number): { tawMm: number; water: RootZoneWater } {
  const water = rootZoneWater(soil.name, soil.measured, zr);
  return { tawMm: 1000 * (water.thetaFC - water.thetaPWP) * zr, water };
}

/**
 * Compute readily available water (RAW) for the root zone (Decision Logic §4b.2, V1.6).
 * RAW = p × TAW, in millimetres. This is the irrigation trigger threshold.
 *
 * `p` is adjusted for the day's evaporative demand per FAO-56 Chapter 8 (V1.7)
 * rather than taken as a constant — see `getDepletionFraction`. Passing the
 * day's own ETc is what makes the trigger tighten in a heatwave and relax in
 * cool weather instead of assuming 5 mm/day all year.
 */
function computeRAW(crop: CropName, taw: number, etcMm: number): number {
  return getDepletionFraction(crop, etcMm) * taw;
}

/** Inputs for rolling the depletion ledger forward (Decision Logic §4b.4). */
interface RollForwardInput {
  kc: number;
  soil: Soil;
  taw: number;
  method: IrrigationMethod;
  areaM2: number;
  /** Farm position, for the ETo fallback when a day lacks the provider's value. */
  site: SiteContext;
  /** Gross litres the farmer logged as applied, keyed by date. */
  appliedByDate: ReadonlyMap<string, number>;
}

/**
 * Advance the root-zone depletion by one day (Decision Logic §4b.3, V1.6).
 *
 * `Dr_after = clamp( Dr_before + ETc − Pe − I_net , 0 , TAW )`
 *
 * The lower clamp discards water beyond field capacity as percolation/runoff;
 * the upper clamp reflects that a root zone cannot deplete past wilting point.
 * Irrigation enters as NET depth: what the farmer logged is gross volume, and
 * only `efficiency(method)` of it reaches the root zone.
 */
function stepDepletion(dr: number, day: DailyWeather, input: RollForwardInput): number {
  const etc = dailyDemand(input.kc, day, input.site);
  const pe = effectiveRain(day.precipitationSum, input.soil, input.site);
  const grossMm = (input.appliedByDate.get(day.date) ?? 0) / input.areaM2;
  const netMm = grossMm * METHOD_EFFICIENCY[input.method];
  return clamp(dr + etc - pe - netMm, 0, input.taw);
}

/** Result of rolling the depletion ledger forward (Decision Logic §4b.4). */
interface RolledDepletion {
  /** Depletion in mm at the end of today — what today's decision reads. */
  todayMm: number;
  /**
   * Depletion in mm at the end of the last day before today that was accounted
   * for, and that day's date. This pair — never today's own value — is what gets
   * persisted: the farmer may log irrigation for today *after* this
   * recommendation is generated, so today must stay replayable rather than
   * frozen. Each run recomputes today from this carry point.
   */
  carryMm: number;
  carryDate: string;
}

/**
 * Bring the persisted depletion ledger up to today (Decision Logic §4b.4, V1.6).
 *
 * The stored value is valid for its own date; every day after it up to and
 * including today is replayed from that day's own weather record. Days absent
 * from the series are skipped rather than guessed — skipping under-states
 * depletion, which errs towards advising *less* water, the safer direction. The
 * carry date advances only over days actually replayed, so a gap that a later
 * fetch fills in is still picked up instead of being lost.
 *
 * `state` may be null (new farm, or first run after the V1.6 upgrade), in which
 * case the ledger is seeded at `RAW` per §4b.5 and rolled forward from the
 * oldest day available.
 */
function bringDepletionToToday(
  state: DepletionState | null,
  raw: number,
  daily: DailyWeather[],
  todayDate: string,
  input: RollForwardInput,
): RolledDepletion {
  // §4b.5 — no history: seed at the stress threshold and replay the whole
  // series. Seeding at RAW avoids telling a farmer whose field is genuinely dry
  // to wait, without inventing a soil-moisture profile the engine cannot know.
  const startDate = state?.validAsOfDate ?? '';
  let dr = state ? clamp(state.depletionMm, 0, input.taw) : clamp(raw, 0, input.taw);

  // A ledger dated today or later can only come from a clock change or legacy
  // data; replaying nothing and leaving the carry point alone is the safe
  // response.
  if (state && startDate >= todayDate) {
    return { todayMm: dr, carryMm: dr, carryDate: startDate };
  }

  const pastDays = daily.filter((d) => d.date > startDate && d.date < todayDate).sort(byDate);
  for (const day of pastDays) {
    dr = stepDepletion(dr, day, input);
  }

  const carryMm = dr;
  const lastReplayed = pastDays[pastDays.length - 1];
  // No day replayed: hold the stored carry date, or — with no stored state at
  // all (empty startDate) — anchor the freshly seeded ledger to yesterday.
  const carryDate = lastReplayed?.date ?? (startDate || previousDayString(todayDate));

  // Today is stepped separately so its value never becomes the carry point.
  const todayRecord = daily.find((d) => d.date === todayDate);
  const todayMm = todayRecord ? stepDepletion(dr, todayRecord, input) : dr;

  return { todayMm, carryMm, carryDate };
}

/** Stage 8 — Confidence from data freshness and completeness (Decision Logic §8). */
function computeConfidence(weather: WeatherData | null, now: string): ConfidenceLevel {
  if (!weather) return 'Low';
  const ageHours = (new Date(now).getTime() - new Date(weather.observationTime).getTime()) / 3_600_000;
  if (ageHours <= FRESH_MAX_HOURS) return 'High';
  if (ageHours <= STALE_MAX_HOURS) return 'Medium';
  return 'Low';
}

/**
 * Soil classes by drainage behaviour for the factor display (Decision Logic
 * §10): light soils drain fast and raise irrigation need; heavy soils buffer
 * water and lower it; middle soils are neutral.
 */
const LIGHT_SOILS: ReadonlySet<string> = new Set(['Sandy', 'Sandy Loam']);
const HEAVY_SOILS: ReadonlySet<string> = new Set(['Clay Loam', 'Clay']);

/**
 * Decision factors with relative influence (Decision Logic §10;
 * roadmap Feature 4). Classification is deterministic and uses only the
 * thresholds in decisionParameters.ts; factors never change the outcome.
 */
function buildFactors(
  kc: number,
  crop: Crop,
  soil: Soil,
  farm: Farm,
  weather: WeatherData | null,
  pe: number,
  etcAdj: number,
): RecommendationFactor[] {
  const factors: RecommendationFactor[] = [];

  factors.push({
    name: 'crop',
    value: crop.name,
    influence: kc >= KC_HIGH ? 'increases' : kc <= KC_LOW ? 'decreases' : 'neutral',
    strength: kc >= KC_HIGH ? 'strong' : kc <= KC_LOW ? 'moderate' : 'weak',
  });

  const stage = crop.growthStage;
  factors.push({
    name: 'growthStage',
    value: stage,
    influence:
      stage === 'Mid Season'
        ? 'increases'
        : stage === 'Initial' || stage === 'Late Season'
          ? 'decreases'
          : 'neutral',
    strength: stage === 'Mid Season' ? 'strong' : stage === 'Development' ? 'weak' : 'moderate',
  });

  if (weather) {
    const t = weather.temperature;
    factors.push({
      name: 'temperature',
      value: `${Math.round(t)}°C`,
      influence:
        t >= WEATHER.T_BASE + TEMP_STRONG_DELTA
          ? 'increases'
          : t <= WEATHER.T_BASE - TEMP_STRONG_DELTA
            ? 'decreases'
            : 'neutral',
      strength:
        Math.abs(t - WEATHER.T_BASE) >= TEMP_STRONG_DELTA
          ? 'strong'
          : t === WEATHER.T_BASE
            ? 'weak'
            : 'moderate',
    });

    factors.push({
      name: 'rainfall',
      value: `${weather.rainfallForecast.toFixed(1)} mm`,
      influence: pe > 0 ? 'decreases' : 'neutral',
      strength: pe >= etcAdj ? 'strong' : pe > 0 ? 'moderate' : 'weak',
    });

    const h = weather.humidity;
    factors.push({
      name: 'humidity',
      value: `${Math.round(h)}%`,
      influence:
        h <= WEATHER.H_BASE - HUM_STRONG_DELTA
          ? 'increases'
          : h >= WEATHER.H_BASE + HUM_STRONG_DELTA
            ? 'decreases'
            : 'neutral',
      strength: Math.abs(h - WEATHER.H_BASE) >= HUM_STRONG_DELTA ? 'strong' : 'weak',
    });

    const w = weather.windSpeed;
    factors.push({
      name: 'wind',
      value: `${w.toFixed(1)} m/s`,
      influence: w >= WEATHER.W_BASE + WIND_STRONG_DELTA ? 'increases' : 'neutral',
      strength: w >= WEATHER.W_BASE + WIND_STRONG_DELTA ? 'strong' : 'weak',
    });
  }

  factors.push({
    name: 'soil',
    value: soil.name,
    influence: LIGHT_SOILS.has(soil.name) ? 'increases' : HEAVY_SOILS.has(soil.name) ? 'decreases' : 'neutral',
    strength: soil.name === 'Loamy' || soil.name === 'Silty Loam' ? 'weak' : 'moderate',
  });

  const efficiency = METHOD_EFFICIENCY[farm.irrigationMethod];
  factors.push({
    name: 'irrigationMethod',
    value: farm.irrigationMethod,
    influence: efficiency <= METHOD_LOW_EFFICIENCY ? 'increases' : 'neutral',
    strength: efficiency <= METHOD_LOW_EFFICIENCY ? 'moderate' : 'weak',
  });

  return factors;
}

/**
 * Multi-day irrigation plan (Decision Logic §11; roadmap Feature 5).
 * Seeded with today's recommendation, then chains a simulated deficit (or
 * depletion for V1.6) over the forecast days, assuming advised irrigation is
 * performed.
 */
function buildPlan(
  kc: number,
  crop: CropName,
  soil: Soil,
  site: SiteContext,
  daily: DailyWeather[],
  todayDate: string,
  today: {
    status: RecommendationStatus;
    confidence: ConfidenceLevel;
    pe: number;
    etcAdj: number;
    nir: number;
  },
  waterBalanceParams: { taw: number; useWaterBalance: boolean } | null,
): IrrigationPlan {
  const days: IrrigationPlanDay[] = [
    {
      date: todayDate,
      offsetDays: 0,
      rainfallMm: round(today.pe, 2),
      demandMm: round(today.etcAdj, 2),
      action: today.status,
      confidence: today.confidence,
    },
  ];

  const futureDays = daily
    .filter((d) => d.date > todayDate)
    .sort(byDate)
    .slice(0, PLAN_DAYS_AHEAD);

  if (waterBalanceParams && waterBalanceParams.useWaterBalance) {
    // V1.6 primary path: chain Dr over forecast days.
    const { taw } = waterBalanceParams;
    let dr = today.status === 'Irrigate Today' ? 0 : today.nir;

    futureDays.forEach((day, index) => {
      const demand = dailyDemand(kc, day, site);
      const pe = effectiveRain(day.precipitationSum, soil, site);
      dr = clamp(dr + demand - pe, 0, taw);
      // V1.7: each forecast day gets its OWN trigger, from its own demand.
      // Carrying today's RAW forward would apply today's weather to day+4 —
      // exactly the constant-p error `getDepletionFraction` exists to remove,
      // reintroduced through the back door. A cool forecast day may safely run
      // drier than today; a hotter one may not.
      const dayRaw = computeRAW(crop, taw, demand);

      let action: RecommendationStatus;
      if (pe >= demand) {
        action = 'Delay Irrigation';
      } else if (dr < dayRaw) {
        action = 'Monitor Tomorrow';
      } else {
        action = 'Irrigate Today';
      }
      if (action === 'Irrigate Today') dr = 0;

      const offsetDays = index + 1;
      days.push({
        date: day.date,
        offsetDays,
        rainfallMm: round(pe, 2),
        demandMm: round(demand, 2),
        action,
        confidence: offsetDays <= PLAN_MEDIUM_MAX_OFFSET ? 'Medium' : 'Low',
      });
    });
  } else {
    // Fallback path: V1.2 carryover deficit.
    let runningDeficit = today.status === 'Irrigate Today' ? 0 : today.nir;

    futureDays.forEach((day, index) => {
      const demand = dailyDemand(kc, day, site);
      const pe = effectiveRain(day.precipitationSum, soil, site);
      runningDeficit = Math.max(0, runningDeficit + demand - pe);

      let action: RecommendationStatus;
      if (pe >= demand) {
        action = 'Delay Irrigation';
      } else if (runningDeficit < SKIP_THRESHOLD_MM[soil.name]) {
        action = 'Monitor Tomorrow';
      } else {
        action = 'Irrigate Today';
      }
      if (action === 'Irrigate Today') runningDeficit = 0;

      const offsetDays = index + 1;
      days.push({
        date: day.date,
        offsetDays,
        rainfallMm: round(pe, 2),
        demandMm: round(demand, 2),
        action,
        confidence: offsetDays <= PLAN_MEDIUM_MAX_OFFSET ? 'Medium' : 'Low',
      });
    });
  }

  return {
    days,
    recommendedIrrigationDate: days.find((d) => d.action === 'Irrigate Today')?.date ?? null,
    nextRainCoveredDate: days.find((d) => d.action === 'Delay Irrigation')?.date ?? null,
  };
}

/**
 * Run the full decision pipeline for a single farm.
 * Returns either a validation failure (missing fields) or a recommendation.
 */
export function generateRecommendation(input: DecisionInput): DecisionResult {
  // Stage 1 — Validation
  const missingFields = validate(input);
  if (missingFields.length > 0) {
    return { ok: false, missingFields };
  }

  const { farm, crop, soil, weather, daily, depletionState, waterLedger, now, language } = input;
  const todayDate = localDayString(now);
  const season = getSeasonForDate(now);

  // Stage 2 — Knowledge retrieval
  const kc = getKc(crop.name, crop.growthStage);
  const zr = getZr(crop.name, crop.growthStage);

  // Stage 3/4 — Weather analysis + crop demand (Decision Logic §2, §2a).
  // Today is located by DATE rather than by index so a stale cache — whose
  // entries may all predate today — cannot silently supply another day's ETo.
  //
  // Primary (V1.5): the provider's own FAO-56 ETo for today.
  // Secondary (V1.7): a local FAO-56 estimate from whatever today's record
  //   carries. This is what replaced the invented ETO_REF constant.
  // Last resort: ETO_REF × season × multiplier, reached only when there is no
  //   daily record for today at all, or one too old to carry a minimum
  //   temperature. With no weather whatsoever the multiplier is neutral, so a
  //   recommendation still exists offline; confidence reflects the missing data.
  // Terrain (V1.7 item 10) supplies two of the three site fields. Both spreads
  // are conditional because `exactOptionalPropertyTypes` distinguishes an absent
  // key from a present `undefined`, and because an absent terrain record must
  // leave the context exactly as it was before terrain existed — elevation
  // unknown, runoff neutral.
  const runoff = runoffFactor(farm.terrain);
  const site: SiteContext = {
    latitude: farm.location.latitude,
    // Elevation was declared on SiteContext and threaded into the ETo fallback
    // from the start but never populated, so FAO-56 Eq. 7 has been assuming sea
    // level. The terrain fetch returns it anyway, so this costs nothing.
    ...(farm.terrain ? { elevationM: farm.terrain.elevationM } : {}),
    ...(runoff !== 1 ? { runoff } : {}),
  };
  const todayRecordForEto = daily?.find((d) => d.date === todayDate);
  const todayEto = todayRecordForEto ? sourcedEto(todayRecordForEto, site) : null;
  const etcAdj = kc * (todayEto ?? fallbackEto(weather, now));

  // Effective rainfall (Decision Logic §3)
  const rainfall = weather?.rainfallForecast ?? 0;
  const pe = effectiveRain(rainfall, soil, site);

  // Stage 4b — Root-zone water balance (Decision Logic V1.6).
  // Primary path: compute TAW, RAW, and roll the depletion ledger forward to
  // today using the daily series. Fallback: use the V1.2 carryover deficit.
  const areaM2 = farm.area * AREA_TO_M2[farm.areaUnit];
  const { tawMm: taw, water: rootZone } = computeTAW(soil, zr);
  const raw = computeRAW(crop.name, taw, etcAdj);

  let nir: number;
  let waterBalance: WaterBalanceState | null = null;

  if (daily && daily.length > 0) {
    // Net irrigation actually applied per day comes from the water ledger, which
    // records the gross litres the farmer logged.
    const appliedByDate = new Map<string, number>();
    if (waterLedger) {
      for (const entry of waterLedger) {
        appliedByDate.set(entry.date, entry.appliedLiters);
      }
    }

    const rolled = bringDepletionToToday(depletionState, raw, daily, todayDate, {
      kc,
      soil,
      taw,
      method: farm.irrigationMethod,
      areaM2,
      site,
      appliedByDate,
    });

    // §4 primary path: the net irrigation requirement is simply the depletion —
    // the depth needed to bring the root zone back to field capacity.
    nir = rolled.todayMm;
    waterBalance = {
      tawMm: round(taw, 2),
      rawMm: round(raw, 2),
      depletionMm: round(rolled.todayMm, 2),
      rootDepthM: zr,
      carryDepletionMm: round(rolled.carryMm, 3),
      carryValidAsOfDate: rolled.carryDate,
      thetaSource: rootZone.source,
      thetaCoverage: round(rootZone.coverage, 3),
    };
  } else {
    // Fallback: V1.2 single-day requirement when no daily series exists at all
    // (offline with a pre-V1.2 cache). carryoverDeficit needs the series too, so
    // there is nothing to carry over here.
    nir = Math.max(0, etcAdj - pe);
  }
  const useWaterBalance = waterBalance !== null;

  // Stage 5 — Decision outcome (Decision Logic §5)
  let status: RecommendationStatus;
  if (pe >= etcAdj) {
    status = 'Delay Irrigation';
  } else if (useWaterBalance) {
    // V1.6 primary path: trigger on Dr >= RAW.
    status = nir >= raw ? 'Irrigate Today' : 'Monitor Tomorrow';
  } else {
    // Fallback path: trigger on skipThreshold.
    status = nir < SKIP_THRESHOLD_MM[soil.name] ? 'Monitor Tomorrow' : 'Irrigate Today';
  }

  // Stage 6 — Water estimation (only meaningful when irrigating).
  // Depth and volume answer "how much"; run time and flow answer "for how
  // long", which is what a farmer standing at a valve actually needs.
  let water: EstimatedWaterAmount = {
    depthMm: 0,
    volumeLiters: 0,
    durationMinutes: 0,
    flowLitersPerMinute: 0,
  };
  // V2.2 — salinity leaching (FAO-29). When the farmer's water test gives an
  // ECw and the soil's own ECe confirms salts are actually accumulating, the
  // applied depth is raised by the crop-specific leaching requirement. The
  // ECe GATE matters: leaching is a response to a saline SOIL irrigated with
  // saline water, not to a water report alone — an ECw above zero on a
  // non-saline field is normal and needs no extra water. Null LR (water too
  // saline for the crop to be protected by leaching) adds no depth; it is
  // surfaced by the improvement detector and the explanation instead.
  let leachingNote: string | null = null;
  const eceDsm = soil.qualityReading?.eceDsm ?? soil.nutrientReading?.ec;
  const ecwDsm = farm.waterQuality?.ecwDsm;
  const SALINE_SOIL_ECE_DSM = 2.0;
  if (
    status === 'Irrigate Today' &&
    ecwDsm !== undefined &&
    ecwDsm > 0 &&
    eceDsm !== undefined &&
    eceDsm >= SALINE_SOIL_ECE_DSM
  ) {
    const lr = leachingRequirement(ecwDsm, crop.name);
    if (lr !== null && lr > 0) {
      const grossDepth = nir / METHOD_EFFICIENCY[farm.irrigationMethod];
      const leached = grossDepth / (1 - lr);
      const intake = intakeFactor(farm.terrain);
      water = {
        depthMm: round(leached, 2),
        volumeLiters: Math.round(leached * areaM2),
        durationMinutes: runMinutes(leached, farm.irrigationMethod, intake),
        flowLitersPerMinute: flowLitersPerMinute(farm.irrigationMethod, areaM2, intake),
      };
      leachingNote = leachingSentence(language, lr, leached - grossDepth);
    }
  }
  if (status === 'Irrigate Today' && water.depthMm === 0) {
    const grossDepth = nir / METHOD_EFFICIENCY[farm.irrigationMethod];
    // Slope slows how fast the soil can take water in, so the same depth is
    // applied over a longer run at a lower flow (item 10). Depth and volume are
    // untouched: the crop needs what it needs whatever the ground's tilt.
    const intake = intakeFactor(farm.terrain);
    water = {
      depthMm: round(grossDepth, 2),
      volumeLiters: Math.round(grossDepth * areaM2),
      durationMinutes: runMinutes(grossDepth, farm.irrigationMethod, intake),
      flowLitersPerMinute: flowLitersPerMinute(farm.irrigationMethod, areaM2, intake),
    };
  }

  // Stage 7 — Irrigation window (Decision Logic §7). Chosen from season, heat,
  // wind, run length, the current time and — for methods that wet the canopy —
  // whether today has the sunshine to dry the leaves before nightfall.
  const irrigationWindow: IrrigationWindow | null =
    status === 'Irrigate Today'
      ? chooseIrrigationWindow({
          season,
          weather,
          method: farm.irrigationMethod,
          durationMinutes: water.durationMinutes ?? 0,
          now,
          drying: todayRecordForEto ? dryingPotential(todayRecordForEto, site.latitude) : null,
        })
      : null;
  const recommendedTime = irrigationWindow?.start ?? null;

  // Water saved by following this advice instead of untimed flood irrigation
  // (Decision Logic §6). Computed for every outcome, because skipping a
  // watering the rain already covered is itself a saving.
  const waterSavings = computeWaterSavings({
    demandMm: etcAdj,
    effectiveRainMm: pe,
    method: farm.irrigationMethod,
    areaM2,
  });

  // Stage 8 — Confidence
  const confidence = computeConfidence(weather, now);

  // Stage 9 — Explanation
  const explanation =
    buildExplanation(
      {
        status,
        cropName: crop.name,
        growthStage: crop.growthStage,
        soilName: soil.name,
        method: farm.irrigationMethod,
        rainMeaningful: pe > 0,
        hot: weather ? weather.temperature > WEATHER.T_BASE : false,
      },
      language,
    ) + (leachingNote ?? '');

  // Stage 10 — Decision factors (roadmap Feature 4)
  const factors = buildFactors(kc, crop, soil, farm, weather, pe, etcAdj);

  // Stage 11 — Multi-day plan (roadmap Feature 5), only with daily data
  const plan = daily
    ? buildPlan(kc, crop.name, soil, site, daily, todayDate, { status, confidence, pe, etcAdj, nir }, { taw, useWaterBalance })
    : null;

  return {
    ok: true,
    recommendation: {
      id: `rec-${farm.id}-${now}`,
      farmId: farm.id,
      status,
      recommendedTime,
      irrigationWindow,
      estimatedWaterAmount: water,
      waterSavings,
      explanation,
      confidence,
      generatedTime: now,
      factors,
    },
    plan,
    waterBalance,
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
