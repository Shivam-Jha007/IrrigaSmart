import type {
  Aspect,
  ConfidenceLevel,
  CropCategory,
  CropName,
  DailyWeather,
  DiseaseRiskLevel,
  DrainageCategory,
  GrowthStage,
  IrrigationMethod,
  RecommendationStatus,
  SoilType,
  WaterRetentionCategory,
  WeatherData,
} from '../types';
import type { AreaUnit } from '../types/enums';
import type { DiseaseId } from './diseaseKnowledge';
import type { FarmProfile, RecommendationView, WaterProgress } from '../app/appTypes';
import { ORIGIN, sourced, unknown, type Provenance, type Sourced } from './provenance';
import { topsoilOrganicCarbon, topsoilPh, textureDisagreement } from './soilProfile';
import { CROP_PH_RANGE, phSuitability, type PhSuitability } from './cropPhKnowledge';
import { classifySoilFertility, type FertilityLevel } from './fertilizerKnowledge';

/**
 * FarmContext — the single canonical picture of one farm (PRD §6).
 *
 * WHY THIS EXISTS
 * Before this module, "what the app knows about this farm" was assembled twice
 * and differently: `assistantContext.ts` built a flat bag of translated strings
 * for the Copilot, and each card reached into `FarmProfile` / `RecommendationView`
 * for whatever it needed. Nothing named the *source* of any of it, which is how
 * a 250 m soil-map prediction came to be rendered to farmers as "Soil pH: 6.4"
 * (PRD §28 Guardrail 1). This is the one object every consumer reads, and every
 * uncertain value in it carries where it came from.
 *
 * IT IS A PURE PROJECTION — IT NEVER COMPUTES AGRONOMY
 * Every number here is copied from the decision engine, the weather provider,
 * the stored soil profile or the water ledger. The only functions it calls are
 * existing lookups (`topsoilPh`, `topsoilOrganicCarbon`, `phSuitability`,
 * `textureDisagreement`, `CROP_PH_RANGE`), and it performs no arithmetic of its
 * own — not even rounding. That is deliberate: `decisionEngine`, `waterSavings`
 * and `irrigationTiming` own the arithmetic and are covered by 52 golden
 * snapshots, and a projection that quietly re-derived a figure would be a second
 * source of truth for irrigation numbers. Rounding for display stays where it
 * already lives, at the assistant/UI boundary.
 *
 * EVERY FIELD IS PRESENT; ABSENCE IS A LABEL, NOT A MISSING KEY
 * Fields are `Sourced<T | null>` and always set. When the app does not have a
 * value the field is `UNKNOWN` with the *reason* in `origin`. Two reasons for
 * this over optional properties. First, `exactOptionalPropertyTypes` is on, so
 * optional fields make every spread-and-override a `delete` dance. Second, and
 * more important: a reader can distinguish "we have no pH" from "we forgot to
 * project pH", and a reason like "no water-quality data source exists" stops the
 * next contributor from "helpfully" defaulting the field. Consumers that need
 * the older omit-when-absent shape (the assistant context) filter on
 * `isKnown()`, which keeps that behaviour explicit and testable.
 *
 * ENUMS STAY IN ENGLISH HERE
 * This object holds data-model enum values (`'Irrigate Today'`, `'Clay Loam'`),
 * not display prose. Translation happens where the farmer is (`assistantContext`
 * translates for the Copilot; cards translate through the i18n mappers). The
 * improvement engine needs enums to branch on, and a Bengali string is not
 * something a detector can compare — so the canonical object is
 * language-independent by design.
 *
 * SECTIONS FOLLOW PRD §6
 * `farm, crop, soil, weather, irrigation, water, disease, fertility, history,
 * impact` — the ten names the PRD specifies, in that order. §6's `water` is the
 * water *resource*: this module reads it as both the root-zone balance (how much
 * water the crop actually has) and irrigation-water quality (PRD §22, for which
 * no data source or input form exists yet, so it is honestly `UNKNOWN`).
 */

// --- Section shapes ---

/** The farm itself: what the farmer told us, plus the coarse DEM terrain. */
export interface FarmContextFarm {
  name: Sourced<string | null>;
  /** Village or landmark label. Absent on farms saved without one. */
  locationLabel: Sourced<string | null>;
  latitude: Sourced<number | null>;
  longitude: Sourced<number | null>;
  area: Sourced<number | null>;
  areaUnit: Sourced<AreaUnit | null>;
  irrigationMethod: Sourced<IrrigationMethod | null>;
  /**
   * Mean grade in percent from a ~90 m DEM. `REGIONAL_ESTIMATE`, never
   * `MEASURED`: `types/terrain.ts` records that on flat ground the DEM's own
   * error can fabricate ~3% slope, so this figure may warn a farmer and must
   * never reassure one.
   */
  slopePercent: Sourced<number | null>;
  aspect: Sourced<Aspect | null>;
  elevationM: Sourced<number | null>;
}

/** The crop, entirely as the farmer selected it. */
export interface FarmContextCrop {
  name: Sourced<CropName | null>;
  growthStage: Sourced<GrowthStage | null>;
  category: Sourced<CropCategory | null>;
  typicalWaterRequirement: Sourced<'Low' | 'Moderate' | 'High' | null>;
}

/**
 * The soil. The split down the middle of this section is the whole point of
 * PRD §7: `type`, `waterRetention` and `drainage` are the farmer's own answers
 * and outrank any model; `ph`, `textureClass` and `organicCarbonPct` are ISRIC
 * SoilGrids v2.0 predictions for the 250 m cell the farm sits in and must never
 * be spoken of as a test of this field.
 */
export interface FarmContextSoil {
  type: Sourced<SoilType | null>;
  waterRetention: Sourced<WaterRetentionCategory | null>;
  drainage: Sourced<DrainageCategory | null>;
  /** Thickness-weighted topsoil pH (0-15 cm) from the stored profile. */
  ph: Sourced<number | null>;
  /** Verdict of that pH against the crop's optimum band. */
  phSuitability: Sourced<PhSuitability | null>;
  phOptimalMin: Sourced<number | null>;
  phOptimalMax: Sourced<number | null>;
  /** USDA textural class predicted for the topsoil, e.g. "clay loam". */
  textureClass: Sourced<string | null>;
  /**
   * The predicted class, but only when it maps to a different soil type than
   * the farmer chose — i.e. only when there is a disagreement worth raising.
   * Advisory: the farmer has stood in the field and a grid cell has not.
   */
  textureDisagreement: Sourced<string | null>;
  organicCarbonPct: Sourced<number | null>;
}

/** Today's weather. Everything here is a forecast or a recent observation. */
export interface FarmContextWeather {
  temperatureC: Sourced<number | null>;
  humidityPercent: Sourced<number | null>;
  windSpeedMs: Sourced<number | null>;
  /**
   * Rain expected today, mm. Prefers the daily series — that is the figure the
   * decision engine actually used, so quoting the current-conditions snapshot
   * instead would let the app explain its advice with a number that did not
   * produce it.
   */
  rainfallTodayMm: Sourced<number | null>;
}

/** The engine's advice. `CALCULATED` throughout — this is rule-engine output. */
export interface FarmContextIrrigation {
  status: Sourced<RecommendationStatus | null>;
  depthMm: Sourced<number | null>;
  volumeLiters: Sourced<number | null>;
  durationMinutes: Sourced<number | null>;
  windowStart: Sourced<string | null>;
  windowEnd: Sourced<string | null>;
  confidence: Sourced<ConfidenceLevel | null>;
  /** The engine's own farmer-facing sentence, already assembled. */
  explanation: Sourced<string | null>;
  /** Tomorrow's action from the multi-day plan. */
  tomorrowStatus: Sourced<RecommendationStatus | null>;
  nextIrrigationDate: Sourced<string | null>;
  nextRainCoveredDate: Sourced<string | null>;
  /** True when the advice was built from cached rather than live weather. */
  fromCache: boolean;
  /** True when no weather at all was available. */
  weatherMissing: boolean;
}

/**
 * Water available to the crop, and water quality.
 *
 * THE ROOT-ZONE FIGURES ARE ESTIMATES, BOTH WAYS ROUND. `WaterBalanceState`
 * reports `thetaSource: 'measured' | 'table'`, where `'measured'` means "from
 * SoilGrids rather than from the six-row Knowledge Base table". Neither is a
 * measurement of this field, so both are labelled `REGIONAL_ESTIMATE` and only
 * their `origin` differs. Labelling the SoilGrids path `MEASURED` here would
 * reintroduce the exact Guardrail-1 error this phase exists to remove, one layer
 * deeper and out of sight — the naming note in `backend/src/soil.ts` explains why
 * the identifier itself is not renamed.
 */
export interface FarmContextWater {
  /** Total available water in the root zone, mm (FAO-56 TAW). */
  totalAvailableMm: Sourced<number | null>;
  /** Readily available water — the depletion at which stress begins, mm. */
  readilyAvailableMm: Sourced<number | null>;
  depletionMm: Sourced<number | null>;
  rootDepthM: Sourced<number | null>;
  /** What θFC/θPWP rested on: the farm's SoilGrids profile, or the table. */
  soilWaterBasis: Sourced<'soilgrids' | 'table' | null>;
  /** Fraction of the root zone covered by profile layers, 0-1. */
  soilWaterCoverage: Sourced<number | null>;
  /** Electrical conductivity of the irrigation water, dS/m (PRD §22). */
  qualityEc: Sourced<null>;
  /** pH of the irrigation water (PRD §22). */
  qualityPh: Sourced<null>;
  /** Sodium adsorption ratio of the irrigation water (PRD §22). */
  qualitySar: Sourced<null>;
}

/**
 * Weather-based disease risk. `CALCULATED` risk, never a diagnosis — PRD §28
 * Guardrail 4 and the permanent product boundary in
 * docs/12_Product_Roadmap_v2.md. `disease` is named only when the weather
 * actually favours one; on a `None` day, naming the crop's most likely disease
 * would put a disease name in front of a farmer with nothing behind it.
 */
export interface FarmContextDisease {
  level: Sourced<DiseaseRiskLevel | null>;
  disease: Sourced<DiseaseId | null>;
  score: Sourced<number | null>;
  observedRun: Sourced<number | null>;
  forecastRun: Sourced<number | null>;
  overcastDays: Sourced<number | null>;
  confidence: Sourced<ConfidenceLevel | null>;
}

/**
 * Soil fertility — a Soil Health Card N/P/K reading, when the farmer has
 * entered one on the Fertilizer page.
 *
 * `USER_PROVIDED`, LIKE `soil.type` — NOT `MEASURED`. The app cannot confirm a
 * farmer typed the number off an actual lab slip rather than a guess, the same
 * reason `soil.type` is `USER_PROVIDED` even though the farmer stood on the
 * field and the ISRIC prediction did not. `UNKNOWN` when no reading has ever
 * been entered for this farm's soil record — still named, not defaulted, so a
 * missing reading is never mistaken for a soil confirmed free of a nutrient.
 */
export interface FarmContextFertility {
  nitrogen: Sourced<number | null>;
  phosphorus: Sourced<number | null>;
  potassium: Sourced<number | null>;
  ph: Sourced<number | null>;
  ec: Sourced<number | null>;
  organicCarbonPct: Sourced<number | null>;
  sulphur: Sourced<number | null>;
  zinc: Sourced<number | null>;
  boron: Sourced<number | null>;
  iron: Sourced<number | null>;
  manganese: Sourced<number | null>;
  copper: Sourced<number | null>;
  /** The booklet's Low/Medium/High band the reading classifies into. */
  band: Sourced<FertilityLevel | null>;
  /** When the farmer entered this reading. */
  recordedAt: Sourced<string | null>;
}

/** What this farm has actually done, from its own irrigation log. */
export interface FarmContextHistory {
  /** Days the ledger holds for this farm. */
  daysTracked: Sourced<number | null>;
  appliedTodayLiters: Sourced<number | null>;
  appliedTodayMinutes: Sourced<number | null>;
}

/**
 * Measured-against-baseline impact.
 *
 * Litres are `CALCULATED` — `waterSavings.ts` attributes them to credited
 * rainfall and application efficiency against an explicit baseline practice.
 * Energy and emissions stay `UNKNOWN` because converting litres to kWh needs the
 * pump's power, efficiency and head, none of which the app collects; PRD §26-27
 * itself asks for "energy savings unavailable — pump information required"
 * rather than an invented conversion factor.
 */
export interface FarmContextImpact {
  savedTodayLiters: Sourced<number | null>;
  savedLifetimeLiters: Sourced<number | null>;
  energySavedKwh: Sourced<null>;
  co2AvoidedKg: Sourced<null>;
}

/** The ten PRD §6 sections. */
export interface FarmContext {
  farm: FarmContextFarm;
  crop: FarmContextCrop;
  soil: FarmContextSoil;
  weather: FarmContextWeather;
  irrigation: FarmContextIrrigation;
  water: FarmContextWater;
  disease: FarmContextDisease;
  fertility: FarmContextFertility;
  history: FarmContextHistory;
  impact: FarmContextImpact;
}

/** Everything the projection reads. Exactly what the Dashboard already holds. */
export interface FarmContextInput {
  profile: FarmProfile | undefined;
  view: RecommendationView | null;
  weather: WeatherData | null;
  /** Today's row of the daily series, when one was available. */
  today: DailyWeather | null;
  waterProgress: WaterProgress | null;
}

// --- Reasons recorded on UNKNOWN fields ---
//
// Spelled out rather than left as a bare null, because each one is a different
// kind of gap and the difference matters to whoever reads it next: "the farmer
// has not been onboarded" is a state that resolves itself, "no data source
// exists" is a product decision, and "the provider was unreachable" is a
// transient failure that a retry may fix.
const NO_PROFILE = 'no farm profile is loaded';
const NO_RECOMMENDATION = 'no recommendation has been generated yet';
const NO_WEATHER = 'no weather data was available';
const NO_BALANCE = 'the engine had no daily series, so it used the carryover deficit path';
const NO_DISEASE = 'no daily weather series was available to assess disease risk';
const NO_SOIL_PROFILE = 'no soil map profile is stored for this farm';
const NO_PH = 'the soil map has no usable pH value for this location';
const NO_TERRAIN = 'no elevation data is stored for this farm';
const NO_LEDGER = 'this farm has no irrigation log yet';
const NO_PLAN = 'no multi-day plan was available';
const NO_WINDOW = 'irrigation is not advised today, so there is no window';

/**
 * PRD §22 water quality. One shared reason: none of the three has a source, and
 * the fix for all three is the same missing input form.
 */
const NO_WATER_QUALITY =
  'the app has no irrigation-water test input, so quality is unmeasured (PRD §22)';

/** PRD §26-27 energy and emissions. */
const NO_PUMP =
  'pump power, efficiency and head are not collected, so litres cannot be converted to energy';

/** No Soil Health Card reading has been entered for this farm. */
const NO_FERTILITY = 'no soil nutrient reading has been entered for this farm';

// --- Helpers ---

/**
 * Whether a field carries a usable value.
 *
 * The type guard is what lets consumers keep an omit-when-absent shape without
 * repeating the null check: `if (isKnown(fc.soil.ph)) use(fc.soil.ph.value)`
 * narrows to `Sourced<number>`. Both halves of the test are load-bearing — an
 * `UNKNOWN` field always has a null value, but a future non-null field must not
 * be trusted merely because it is non-null.
 */
export function isKnown<T>(field: Sourced<T | null>): field is Sourced<T> {
  return field.provenance !== 'UNKNOWN' && field.value !== null;
}

/** A `Sourced` that is present when `value` is non-null and UNKNOWN otherwise. */
function maybe<T>(
  value: T | null | undefined,
  provenance: Provenance,
  reason: string,
  origin: string | null = null,
  asOf: string | null = null,
): Sourced<T | null> {
  return value === null || value === undefined
    ? unknown(reason)
    : sourced<T | null>(value, provenance, origin, asOf);
}

// --- The projection ---

/**
 * Project the app's current state into the canonical §6 object.
 *
 * Total and synchronous: given any combination of missing inputs it returns a
 * complete object whose gaps are labelled. It reads no storage and makes no
 * network call, so it is safe to call on every render and inside tests without
 * fixtures beyond these five values.
 */
export function buildFarmContext({
  profile,
  view,
  weather,
  today,
  waterProgress,
}: FarmContextInput): FarmContext {
  const farmer = ORIGIN.farmer;
  const engine = ORIGIN.engine;

  // --- farm ---
  const terrain = profile?.farm.terrain;
  const farm: FarmContextFarm = {
    name: maybe(profile?.farm.name, 'USER_PROVIDED', NO_PROFILE, farmer),
    // Truthiness, not null-check, and deliberately so: `label` is an optional
    // free-text field that older records hold as an empty string, and an empty
    // label is nothing to show a farmer. This reproduces the check
    // `assistantContext` has always made.
    locationLabel: maybe(
      profile?.farm.location.label ? profile.farm.location.label : null,
      'USER_PROVIDED',
      'this farm was saved without a place name',
      farmer,
    ),
    latitude: maybe(profile?.farm.location.latitude, 'USER_PROVIDED', NO_PROFILE, farmer),
    longitude: maybe(profile?.farm.location.longitude, 'USER_PROVIDED', NO_PROFILE, farmer),
    area: maybe(profile?.farm.area, 'USER_PROVIDED', NO_PROFILE, farmer),
    areaUnit: maybe(profile?.farm.areaUnit, 'USER_PROVIDED', NO_PROFILE, farmer),
    irrigationMethod: maybe(profile?.farm.irrigationMethod, 'USER_PROVIDED', NO_PROFILE, farmer),
    slopePercent: maybe(
      terrain?.slopePercent,
      'REGIONAL_ESTIMATE',
      NO_TERRAIN,
      ORIGIN.demSlope,
      terrain?.fetchedAt ?? null,
    ),
    aspect: maybe(
      terrain?.aspect,
      'REGIONAL_ESTIMATE',
      terrain ? 'the sampled ground was level, so there is no downhill direction' : NO_TERRAIN,
      ORIGIN.demSlope,
      terrain?.fetchedAt ?? null,
    ),
    elevationM: maybe(
      terrain?.elevationM,
      'REGIONAL_ESTIMATE',
      NO_TERRAIN,
      ORIGIN.demSlope,
      terrain?.fetchedAt ?? null,
    ),
  };

  // --- crop ---
  const crop: FarmContextCrop = {
    name: maybe(profile?.crop.name, 'USER_PROVIDED', NO_PROFILE, farmer),
    growthStage: maybe(profile?.crop.growthStage, 'USER_PROVIDED', NO_PROFILE, farmer),
    category: maybe(profile?.crop.category, 'USER_PROVIDED', NO_PROFILE, farmer),
    typicalWaterRequirement: maybe(
      profile?.crop.typicalWaterRequirement,
      'USER_PROVIDED',
      NO_PROFILE,
      farmer,
    ),
  };

  // --- soil ---
  const measured = profile?.soil.measured;
  const soilMapOrigin = ORIGIN.soilGrids;
  const fetchedAt = measured?.fetchedAt ?? null;
  const ph = topsoilPh(measured);
  const range = profile ? CROP_PH_RANGE[profile.crop.name] : null;
  const soil: FarmContextSoil = {
    type: maybe(profile?.soil.name, 'USER_PROVIDED', NO_PROFILE, farmer),
    waterRetention: maybe(profile?.soil.waterRetention, 'USER_PROVIDED', NO_PROFILE, farmer),
    drainage: maybe(profile?.soil.drainage, 'USER_PROVIDED', NO_PROFILE, farmer),
    ph: maybe(
      ph,
      'REGIONAL_ESTIMATE',
      measured ? NO_PH : NO_SOIL_PROFILE,
      soilMapOrigin,
      fetchedAt,
    ),
    // CALCULATED, not REGIONAL_ESTIMATE: the verdict is a comparison this app
    // performs against a cited extension range. It is only as good as the pH
    // it rests on, which is why the improvement engine caps the confidence of
    // anything built on it rather than dressing the comparison up as certainty.
    phSuitability: maybe(
      ph !== null && profile ? phSuitability(profile.crop.name, ph) : null,
      'CALCULATED',
      ph === null ? (measured ? NO_PH : NO_SOIL_PROFILE) : NO_PROFILE,
      engine,
      fetchedAt,
    ),
    phOptimalMin: maybe(range?.min, 'REGIONAL_ESTIMATE', NO_PROFILE, range?.source ?? null),
    phOptimalMax: maybe(range?.max, 'REGIONAL_ESTIMATE', NO_PROFILE, range?.source ?? null),
    textureClass: maybe(
      measured?.usdaTextureClass,
      'REGIONAL_ESTIMATE',
      measured ? 'the soil map returned no texture class for this location' : NO_SOIL_PROFILE,
      soilMapOrigin,
      fetchedAt,
    ),
    textureDisagreement: maybe(
      profile ? textureDisagreement(profile.soil.name, measured) : null,
      'REGIONAL_ESTIMATE',
      measured
        ? 'the soil map agrees with the soil type on record'
        : NO_SOIL_PROFILE,
      soilMapOrigin,
      fetchedAt,
    ),
    organicCarbonPct: maybe(
      topsoilOrganicCarbon(measured),
      'REGIONAL_ESTIMATE',
      NO_SOIL_PROFILE,
      soilMapOrigin,
      fetchedAt,
    ),
  };

  // --- weather ---
  const observedAt = weather?.observationTime ?? null;
  const forecast = ORIGIN.forecast;
  const weatherSection: FarmContextWeather = {
    temperatureC: maybe(weather?.temperature, 'FORECAST', NO_WEATHER, forecast, observedAt),
    humidityPercent: maybe(weather?.humidity, 'FORECAST', NO_WEATHER, forecast, observedAt),
    windSpeedMs: maybe(weather?.windSpeed, 'FORECAST', NO_WEATHER, forecast, observedAt),
    rainfallTodayMm: today
      ? sourced<number | null>(today.precipitationSum, 'FORECAST', forecast, today.date)
      : maybe(weather?.rainfallForecast, 'FORECAST', NO_WEATHER, forecast, observedAt),
  };

  // --- irrigation ---
  const rec = view?.recommendation;
  const window = rec?.irrigationWindow;
  const generatedAt = rec?.generatedTime ?? null;
  const irrigation: FarmContextIrrigation = {
    status: maybe(rec?.status, 'CALCULATED', NO_RECOMMENDATION, engine, generatedAt),
    depthMm: maybe(
      rec?.estimatedWaterAmount.depthMm,
      'CALCULATED',
      NO_RECOMMENDATION,
      engine,
      generatedAt,
    ),
    volumeLiters: maybe(
      rec?.estimatedWaterAmount.volumeLiters,
      'CALCULATED',
      NO_RECOMMENDATION,
      engine,
      generatedAt,
    ),
    durationMinutes: maybe(
      rec?.estimatedWaterAmount.durationMinutes,
      'CALCULATED',
      rec
        ? 'this advice was saved before run times were estimated'
        : NO_RECOMMENDATION,
      engine,
      generatedAt,
    ),
    windowStart: maybe(
      window?.start,
      'CALCULATED',
      rec ? NO_WINDOW : NO_RECOMMENDATION,
      engine,
      generatedAt,
    ),
    windowEnd: maybe(
      window?.end,
      'CALCULATED',
      rec ? NO_WINDOW : NO_RECOMMENDATION,
      engine,
      generatedAt,
    ),
    confidence: maybe(rec?.confidence, 'CALCULATED', NO_RECOMMENDATION, engine, generatedAt),
    explanation: maybe(rec?.explanation, 'CALCULATED', NO_RECOMMENDATION, engine, generatedAt),
    // Index 1 is tomorrow because the plan starts at today; a single-day plan
    // has no tomorrow to report.
    tomorrowStatus: maybe(
      view?.plan?.days[1]?.action,
      'CALCULATED',
      NO_PLAN,
      engine,
      generatedAt,
    ),
    nextIrrigationDate: maybe(
      view?.plan?.recommendedIrrigationDate,
      'CALCULATED',
      view?.plan ? 'no day in the plan window needs irrigation' : NO_PLAN,
      engine,
      generatedAt,
    ),
    nextRainCoveredDate: maybe(
      view?.plan?.nextRainCoveredDate,
      'CALCULATED',
      view?.plan ? 'no day in the plan window has rain covering demand' : NO_PLAN,
      engine,
      generatedAt,
    ),
    fromCache: view?.fromCache ?? false,
    weatherMissing: view?.weatherMissing ?? false,
  };

  // --- water ---
  const balance = view?.waterBalance;
  // Which estimate won, not measurement versus guess. See the section docblock.
  const basisOrigin =
    balance === null || balance === undefined
      ? null
      : balance.thetaSource === 'measured'
        ? soilMapOrigin
        : ORIGIN.soilTable;
  const water: FarmContextWater = {
    totalAvailableMm: maybe(balance?.tawMm, 'CALCULATED', NO_BALANCE, engine, generatedAt),
    readilyAvailableMm: maybe(balance?.rawMm, 'CALCULATED', NO_BALANCE, engine, generatedAt),
    depletionMm: maybe(balance?.depletionMm, 'CALCULATED', NO_BALANCE, engine, generatedAt),
    rootDepthM: maybe(balance?.rootDepthM, 'CALCULATED', NO_BALANCE, engine, generatedAt),
    soilWaterBasis: maybe(
      balance ? (balance.thetaSource === 'measured' ? 'soilgrids' : 'table') : null,
      'REGIONAL_ESTIMATE',
      NO_BALANCE,
      basisOrigin,
      balance?.thetaSource === 'measured' ? fetchedAt : null,
    ),
    soilWaterCoverage: maybe(
      balance?.thetaCoverage,
      'REGIONAL_ESTIMATE',
      NO_BALANCE,
      basisOrigin,
      null,
    ),
    qualityEc: unknown(NO_WATER_QUALITY),
    qualityPh: unknown(NO_WATER_QUALITY),
    qualitySar: unknown(NO_WATER_QUALITY),
  };

  // --- disease ---
  const risk = view?.diseaseRisk;
  const disease: FarmContextDisease = {
    level: maybe(risk?.level, 'CALCULATED', NO_DISEASE, engine, generatedAt),
    disease: maybe(
      risk && risk.level !== 'None' ? risk.disease : null,
      'CALCULATED',
      risk ? 'the weather does not currently favour any disease of this crop' : NO_DISEASE,
      engine,
      generatedAt,
    ),
    score: maybe(risk?.score, 'CALCULATED', NO_DISEASE, engine, generatedAt),
    observedRun: maybe(risk?.observedRun, 'CALCULATED', NO_DISEASE, engine, generatedAt),
    forecastRun: maybe(risk?.forecastRun, 'CALCULATED', NO_DISEASE, engine, generatedAt),
    overcastDays: maybe(risk?.overcastDays, 'CALCULATED', NO_DISEASE, engine, generatedAt),
    confidence: maybe(risk?.confidence, 'CALCULATED', NO_DISEASE, engine, generatedAt),
  };

  // --- fertility ---
  const reading = profile?.soil.nutrientReading;
  const fertility: FarmContextFertility = {
    nitrogen: maybe(reading?.n, 'USER_PROVIDED', NO_FERTILITY, farmer, reading?.recordedAt ?? null),
    phosphorus: maybe(
      reading?.p2o5,
      'USER_PROVIDED',
      NO_FERTILITY,
      farmer,
      reading?.recordedAt ?? null,
    ),
    potassium: maybe(
      reading?.k2o,
      'USER_PROVIDED',
      NO_FERTILITY,
      farmer,
      reading?.recordedAt ?? null,
    ),
    ph: maybe(reading?.ph, 'USER_PROVIDED', NO_FERTILITY, farmer, reading?.recordedAt ?? null),
    ec: maybe(reading?.ec, 'USER_PROVIDED', NO_FERTILITY, farmer, reading?.recordedAt ?? null),
    organicCarbonPct: maybe(
      reading?.organicCarbonPct,
      'USER_PROVIDED',
      NO_FERTILITY,
      farmer,
      reading?.recordedAt ?? null,
    ),
    sulphur: maybe(reading?.sulphur, 'USER_PROVIDED', NO_FERTILITY, farmer, reading?.recordedAt ?? null),
    zinc: maybe(reading?.zinc, 'USER_PROVIDED', NO_FERTILITY, farmer, reading?.recordedAt ?? null),
    boron: maybe(reading?.boron, 'USER_PROVIDED', NO_FERTILITY, farmer, reading?.recordedAt ?? null),
    iron: maybe(reading?.iron, 'USER_PROVIDED', NO_FERTILITY, farmer, reading?.recordedAt ?? null),
    manganese: maybe(reading?.manganese, 'USER_PROVIDED', NO_FERTILITY, farmer, reading?.recordedAt ?? null),
    copper: maybe(reading?.copper, 'USER_PROVIDED', NO_FERTILITY, farmer, reading?.recordedAt ?? null),
    // CALCULATED, not USER_PROVIDED: the band is this app's own classification
    // of the reading against the standard Soil Health Card bands
    // (`classifySoilFertility`), the same distinction `soil.phSuitability`
    // draws against `soil.ph` above — the farmer supplied the numbers, the app
    // supplied the verdict.
    band: maybe(
      reading ? classifySoilFertility(reading) : null,
      'CALCULATED',
      NO_FERTILITY,
      engine,
      reading?.recordedAt ?? null,
    ),
    recordedAt: maybe(reading?.recordedAt, 'USER_PROVIDED', NO_FERTILITY, farmer),
  };

  // --- history, impact ---

  const ledger = ORIGIN.ledger;
  const history: FarmContextHistory = {
    daysTracked: maybe(waterProgress?.daysTracked, 'USER_PROVIDED', NO_LEDGER, ledger),
    appliedTodayLiters: maybe(
      waterProgress?.appliedLiters,
      'USER_PROVIDED',
      NO_LEDGER,
      ledger,
      waterProgress?.date ?? null,
    ),
    appliedTodayMinutes: maybe(
      waterProgress?.appliedMinutes,
      'USER_PROVIDED',
      NO_LEDGER,
      ledger,
      waterProgress?.date ?? null,
    ),
  };

  const impact: FarmContextImpact = {
    savedTodayLiters: maybe(
      waterProgress?.savedTodayLiters,
      'CALCULATED',
      NO_LEDGER,
      engine,
      waterProgress?.date ?? null,
    ),
    savedLifetimeLiters: maybe(
      waterProgress?.savedLifetimeLiters,
      'CALCULATED',
      NO_LEDGER,
      engine,
      waterProgress?.date ?? null,
    ),
    energySavedKwh: unknown(NO_PUMP),
    co2AvoidedKg: unknown(NO_PUMP),
  };

  return {
    farm,
    crop,
    soil,
    weather: weatherSection,
    irrigation,
    water,
    disease,
    fertility,
    history,
    impact,
  };
}
