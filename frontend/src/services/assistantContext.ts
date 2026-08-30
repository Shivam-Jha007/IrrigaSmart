import type { DailyWeather, WeatherData } from '../types';
import type { FarmProfile, RecommendationView, WaterProgress } from '../app/appTypes';
import {
  confidenceBadgeKey,
  cropLabelKey,
  diseaseNameKey,
  diseaseWhatKey,
  diseaseWhereKey,
  methodLabelKey,
  soilLabelKey,
  stageLabelKey,
  statusLabelKey,
  type TranslateFn,
} from '../i18n';
import { buildFarmContext, isKnown } from './farmContext';
import { detectFarmIssues, resolveIssueVars, TOP_ISSUE_COUNT } from './farmImprovement';
import { summarizePhotoCheck } from './photoCheckSummary';
import type { VisionResult } from './diseaseVision';
import {
  CROP_PH_RANGE,
  phSuitability,
} from './cropPhKnowledge';
import {
  fertilizerVarietiesFor,
  getFertilizerRecommendation,
  type FertilizerSoilZone,
  type FertilityLevel,
} from './fertilizerKnowledge';
import type { CropName } from '../types';
import type { AssistantContext } from './assistantRules';

/**
 * Build the assistant's view of the farm (item 17).
 *
 * WHY THIS IS ITS OWN MODULE
 * Both answer paths — the offline rules and the model — read the same
 * AssistantContext, so this is the single place where "what the assistant knows"
 * is defined. If the Dashboard assembled it inline, the rules and the prompt
 * could drift apart the moment either changed, and the farmer would get two
 * different answers to the same question depending on their signal strength.
 *
 * IT IS A PROJECTION OF `FarmContext`, NOT A SECOND SOURCE OF TRUTH
 * The facts come from `buildFarmContext` (PRD §6), which is the canonical
 * picture of the farm and the only place provenance is decided. This module's
 * job is narrower and unchanged: flatten that object, translate its enums, round
 * for display, and drop what the app does not have. Before the split, this file
 * and each dashboard card reached into `FarmProfile`/`RecommendationView`
 * independently, so "what the assistant knows" and "what the pH card shows"
 * could disagree about the same farm.
 *
 * EVERY FIGURE IS COPIED, NEVER COMPUTED
 * This module reads the decision engine's output and the water ledger; it does
 * no irrigation arithmetic of its own (docs/07_Engineering_Rules.md: the UI
 * layer performs no calculations). Rounding for display is the only change made
 * to any number, and it is applied once, here, so the rules and the model quote
 * identical figures. `FarmContext` deliberately carries unrounded values so that
 * this stays the single rounding point.
 *
 * ENUM VALUES ARE TRANSLATED HERE
 * The data model stores enums in English (docs/03_Data_Models.md), and
 * `FarmContext` keeps them that way so detectors can branch on them. They are
 * translated at this boundary rather than at each use so that a Bengali farmer's
 * answer reads entirely in Bengali — interpolating "Irrigate Today" into a
 * Bengali sentence is the kind of half-localised output that makes an app feel
 * like it was not built for its user. The model reads the translated value
 * equally well.
 *
 * ABSENT IS ABSENT
 * A field the app does not have is omitted, never defaulted. The prompt builder
 * on the backend skips missing fields for the same reason: a substituted value
 * is a number a farmer can act on that nothing in the app can reproduce. In
 * `FarmContext` a gap is an explicit `UNKNOWN` with a reason attached; `isKnown`
 * is what turns that back into an omitted key here.
 */

export interface ContextInput {
  profile: FarmProfile | undefined;
  view: RecommendationView | null;
  weather: WeatherData | null;
  today: DailyWeather | null;
  waterProgress: WaterProgress | null;
  /** The most recent leaf-photo check on the Today screen, with its time. */
  photoCheck?: { result: VisionResult; checkedAt: string } | null;
  language: string;
  t: TranslateFn;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildAssistantContext({
  profile,
  view,
  weather,
  today,
  waterProgress,
  photoCheck,
  language,
  t,
}: ContextInput): AssistantContext {
  const fc = buildFarmContext({ profile, view, weather, today, waterProgress });
  const context: AssistantContext = { language };

  // Fields are assigned in the order they were before this became a projection.
  // Nothing downstream should depend on key order — the rules read by name and
  // the prompt builder has its own sequence — but preserving it keeps the
  // refactor provably shape-identical rather than probably so.
  if (isKnown(fc.farm.name)) context.farmName = fc.farm.name.value;
  if (isKnown(fc.farm.locationLabel)) context.locationLabel = fc.farm.locationLabel.value;
  if (isKnown(fc.crop.name)) context.cropName = t(cropLabelKey(fc.crop.name.value));
  if (isKnown(fc.crop.growthStage)) context.growthStage = t(stageLabelKey(fc.crop.growthStage.value));
  if (isKnown(fc.soil.type)) {
    context.soilType = t(soilLabelKey(fc.soil.type.value));
    // Assigned from the same node, in the same breath. Split apart, the label
    // could go stale against the value it describes — and a `USER_PROVIDED`
    // marker on a figure that is no longer the farmer's own answer is worse
    // than no marker at all.
    context.soilTypeProvenance = fc.soil.type.provenance;
  }
  if (isKnown(fc.farm.irrigationMethod)) {
    context.irrigationMethod = t(methodLabelKey(fc.farm.irrigationMethod.value));
  }
  if (isKnown(fc.farm.area) && isKnown(fc.farm.areaUnit)) {
    context.areaLabel = `${fc.farm.area.value} ${fc.farm.areaUnit.value}`;
  }
  // Slope exists only on farms created after item 10, and only when the DEM
  // provider answered. Absent everywhere else, and that is the honest state.
  if (isKnown(fc.farm.slopePercent)) context.slopePercent = round1(fc.farm.slopePercent.value);

  if (isKnown(fc.irrigation.status)) context.status = t(statusLabelKey(fc.irrigation.status.value));
  if (isKnown(fc.irrigation.explanation)) context.explanation = fc.irrigation.explanation.value;
  if (isKnown(fc.irrigation.confidence)) {
    context.confidence = t(confidenceBadgeKey(fc.irrigation.confidence.value));
  }
  if (isKnown(fc.irrigation.depthMm)) context.depthMm = fc.irrigation.depthMm.value;
  if (isKnown(fc.irrigation.volumeLiters)) context.volumeLiters = fc.irrigation.volumeLiters.value;
  if (isKnown(fc.irrigation.durationMinutes)) {
    context.durationMinutes = fc.irrigation.durationMinutes.value;
  }
  if (isKnown(fc.irrigation.windowStart)) context.windowStart = fc.irrigation.windowStart.value;
  if (isKnown(fc.irrigation.windowEnd)) context.windowEnd = fc.irrigation.windowEnd.value;

  if (isKnown(fc.water.depletionMm)) context.depletionMm = round1(fc.water.depletionMm.value);
  if (isKnown(fc.water.readilyAvailableMm)) {
    context.readilyAvailableMm = round1(fc.water.readilyAvailableMm.value);
  }
  if (isKnown(fc.water.totalAvailableMm)) {
    context.totalAvailableMm = round1(fc.water.totalAvailableMm.value);
  }
  // The label belongs to the BASIS of the holding figures, not to the depletion
  // number itself. Depletion is a running FAO-56 balance — arithmetic the app
  // can defend — but it is arithmetic on top of θFC/θPWP that came from a soil
  // map or a six-row texture table, never from this field. `soilWaterBasis`
  // carries that label for both paths, which is why it is the one read here
  // (see FarmContextWater's own note on why 'soilgrids' is not MEASURED).
  if (isKnown(fc.water.soilWaterBasis)) {
    context.soilMoistureProvenance = fc.water.soilWaterBasis.provenance;
  }

  if (isKnown(fc.disease.level)) context.diseaseRiskLevel = fc.disease.level.value;
  // Named only when the weather actually favours one. On a 'None' day, naming
  // the crop's most likely disease would put a disease name in front of a farmer
  // with nothing behind it — `FarmContext` withholds it for that reason.
  if (isKnown(fc.disease.disease)) {
    context.diseaseName = t(diseaseNameKey(fc.disease.disease.value));
    // Where to look and what the signs look like travel WITH the name: the
    // scouting answer is only useful attached to the disease it scouts for,
    // and both come from the same Knowledge Base profile (docs/10 §10.5).
    context.diseaseWhere = t(diseaseWhereKey(fc.disease.disease.value));
    context.diseaseWhat = t(diseaseWhatKey(fc.disease.disease.value));
  }

  if (isKnown(fc.irrigation.tomorrowStatus)) {
    context.tomorrowStatus = t(statusLabelKey(fc.irrigation.tomorrowStatus.value));
  }

  if (isKnown(fc.weather.temperatureC)) {
    context.temperatureC = Math.round(fc.weather.temperatureC.value);
  }
  if (isKnown(fc.weather.humidityPercent)) {
    context.humidityPercent = Math.round(fc.weather.humidityPercent.value);
  }
  // Today's rain: the daily forecast is the figure the engine used, so
  // `FarmContext` already prefers it over the current-conditions snapshot.
  if (isKnown(fc.weather.rainfallTodayMm)) {
    context.rainfallForecastMm = round1(fc.weather.rainfallTodayMm.value);
  }
  // ONE LABEL FOR THE WEATHER GROUP, TAKEN FROM WHICHEVER FIGURE SURVIVED.
  // All three carry the same `FORECAST` provenance in `FarmContext` because they
  // come from the same fetch, so this is not a shortcut — it is the same answer
  // whichever node is read. It is read from the first KNOWN one rather than
  // always from temperature because a cache can hold today's rain without a
  // current-conditions snapshot, and a labelled rain figure with no label
  // attached is exactly the state this field exists to prevent.
  const weatherNode = [
    fc.weather.temperatureC,
    fc.weather.humidityPercent,
    fc.weather.rainfallTodayMm,
  ].find(isKnown);
  if (weatherNode) context.weatherProvenance = weatherNode.provenance;

  // --- Soil chemistry (PRD §7, §28 Guardrail 1) ---
  //
  // These are the figures a farmer is most likely to mistake for a lab result,
  // so the label and the origin sentence travel WITH the number rather than
  // being left for the reader to look up. Both answer paths need them: the
  // offline rule builds its caveat from `soilPhProvenance`, and the backend
  // prompt welds `soilPhOrigin` into the same line as the value.
  if (isKnown(fc.soil.ph)) {
    context.soilPh = round1(fc.soil.ph.value);
    context.soilPhProvenance = fc.soil.ph.provenance;
    if (fc.soil.ph.origin !== null) context.soilPhOrigin = fc.soil.ph.origin;
  }
  // The verdict is translated here, unlike the provenance labels beside it: the
  // farmer reads this one in a sentence (`PhSuitabilityCard` renders the same
  // key), whereas the labels are a closed vocabulary the rules and the prompt
  // branch on. Same inline-template pattern as the card, so there is one place
  // the wording lives.
  if (isKnown(fc.soil.phSuitability)) {
    context.phSuitability = t(`ph.level.${fc.soil.phSuitability.value}`);
  }
  if (isKnown(fc.soil.phOptimalMin)) context.phOptimalMin = fc.soil.phOptimalMin.value;
  if (isKnown(fc.soil.phOptimalMax)) context.phOptimalMax = fc.soil.phOptimalMax.value;
  // Untranslated on purpose. "Clay loam" is a USDA class with no translation in
  // this app, and interpolating the English into a Bengali sentence would be the
  // half-localised output this module exists to avoid. So it goes to the model,
  // which is already instructed to answer in the farmer's language and can
  // render the class naturally — and never into an offline rule string.
  if (isKnown(fc.soil.textureClass)) {
    context.soilTextureClass = fc.soil.textureClass.value;
    context.soilTextureProvenance = fc.soil.textureClass.provenance;
  }
  if (isKnown(fc.soil.organicCarbonPct)) {
    context.organicCarbonPct = round1(fc.soil.organicCarbonPct.value);
  }

  if (isKnown(fc.fertility.nitrogen)) context.fertilityN = round1(fc.fertility.nitrogen.value);
  if (isKnown(fc.fertility.phosphorus)) context.fertilityP2O5 = round1(fc.fertility.phosphorus.value);
  if (isKnown(fc.fertility.potassium)) context.fertilityK2O = round1(fc.fertility.potassium.value);
  if (isKnown(fc.fertility.band)) context.fertilityBand = fc.fertility.band.value;
  if (isKnown(fc.fertility.recordedAt)) context.fertilityProvenance = fc.fertility.recordedAt.provenance;
  if (isKnown(fc.fertility.ph)) context.fertilityPh = round1(fc.fertility.ph.value);
  if (isKnown(fc.fertility.ec)) context.fertilityEc = round1(fc.fertility.ec.value);
  if (isKnown(fc.fertility.organicCarbonPct)) context.fertilityOrganicCarbonPct = round1(fc.fertility.organicCarbonPct.value);
  if (isKnown(fc.fertility.sulphur)) context.fertilitySulphur = round1(fc.fertility.sulphur.value);
  if (isKnown(fc.fertility.zinc)) context.fertilityZinc = round1(fc.fertility.zinc.value);
  if (isKnown(fc.fertility.boron)) context.fertilityBoron = round1(fc.fertility.boron.value);
  if (isKnown(fc.fertility.iron)) context.fertilityIron = round1(fc.fertility.iron.value);
  if (isKnown(fc.fertility.manganese)) context.fertilityManganese = round1(fc.fertility.manganese.value);
  if (isKnown(fc.fertility.copper)) context.fertilityCopper = round1(fc.fertility.copper.value);

  if (isKnown(fc.impact.savedTodayLiters)) {
    context.savedTodayLiters = Math.round(fc.impact.savedTodayLiters.value);
  }
  if (isKnown(fc.impact.savedLifetimeLiters)) {
    context.savedLifetimeLiters = Math.round(fc.impact.savedLifetimeLiters.value);
  }

  // --- Resolved official fertilizer schedule (State Agriculture Department) ---
  //
  // THE QUOTABLE EXCEPTION TO GUARDRAIL 2. The pH and carbon figures above are
  // map estimates the prompt forbids quoting as exact values. These figures are
  // different in kind: a transcription of the official State schedule the
  // Fertilizer tab itself displays, resolved to the crop/variety/zone/band the
  // farmer selected on that page. The lookup is deterministic — the same
  // `getFertilizerRecommendation` the page calls — so the model can be handed
  // these numbers and told to quote them verbatim with attribution, and the
  // worst it can do is paraphrase an official figure.
  //
  // BAND RESOLUTION ORDER: the farmer's own Soil Health Card reading
  // (USER_PROVIDED) first; without one, Medium — the booklet's own middle
  // column and the Fertilizer page's default tap. A map-derived band is never
  // invented here: the booklet's L/M/H key is a soil-test concept, and the
  // 250 m map has no N/P/K prediction to classify.
  //
  // STALENESS: the selection stores variety + zone only. The crop is always
  // the farm's CURRENT crop, so a crop change to an uncovered crop simply
  // finds no table and emits nothing — no stale schedule can follow a crop
  // change. A stored zone the new crop's table lacks likewise resolves to
  // null and emits nothing.
  if (profile && isKnown(fc.crop.name)) {
    const crop = fc.crop.name.value;
    const selection = profile.soil.fertilizerSelection;
    const zones = ['Hill', 'Terai', 'GangeticAlluvium', 'VindhyaAlluviumRedLateritic', 'Coastal'];
    const zone = selection && zones.includes(selection.zone) ? (selection.zone as FertilizerSoilZone) : undefined;
    const varietyId =
      selection && fertilizerVarietiesFor(crop).some((v) => v.varietyId === selection.varietyId)
        ? selection.varietyId
        : undefined;

    if (zone && varietyId) {
      const band: FertilityLevel = isKnown(fc.fertility.band)
        ? (fc.fertility.band.value as FertilityLevel)
        : 'Medium';
      const rec = getFertilizerRecommendation(crop, varietyId, zone);
      if (rec) {
        context.fertScheduleVariety = rec.variety;
        context.fertScheduleBand = t(`fert.fertility.${band}`);
        context.fertScheduleZone = t(`fert.zone.${zone}`);
        const dose = rec.zone.npk?.[band];
        if (dose) {
          context.fertScheduleNpk = `N ${dose.n}, P2O5 ${dose.p2o5}, K2O ${dose.k2o} kg/ha`;
        } else {
          context.fertScheduleNoDose = true;
        }
        if (rec.zone.manureOrBiofertilizer) context.fertScheduleManure = rec.zone.manureOrBiofertilizer;
        if (rec.zone.soilAmeliorant) context.fertScheduleAmeliorant = rec.zone.soilAmeliorant;
        if (rec.zone.sulphur) context.fertScheduleSulphur = rec.zone.sulphur;
        if (rec.zone.micronutrients) context.fertScheduleMicronutrients = rec.zone.micronutrients;
        if (rec.tableNote) context.fertScheduleTiming = rec.tableNote;
      }
    }
  }

  // --- Crop alternatives by pH suitability ---
  //
  // Deterministic ranking, same data the pH suitability card uses. Only built
  // when a pH figure exists (either the map estimate or the farmer's own card
  // reading — both beat guessing), and only including crops the pH data ranks
  // 'suitable'. The model presents this list as options; it never re-ranks.
  if (isKnown(fc.soil.ph)) {
    const ph = fc.soil.ph.value;
    const alts = (Object.keys(CROP_PH_RANGE) as CropName[])
      .filter((crop) => phSuitability(crop, ph) === 'suitable')
      .sort((a, b) => {
        // Centre-distance, closest first: how far the pH sits from the middle
        // of each crop's optimal band. Deterministic tie-break by band width
        // (narrower = more precisely suited), then by name for stability.
        const dist = (crop: CropName): number => {
          const { min, max } = CROP_PH_RANGE[crop];
          return ph < min ? min - ph : ph > max ? ph - max : 0;
        };
        const width = (crop: CropName): number => CROP_PH_RANGE[crop].max - CROP_PH_RANGE[crop].min;
        return dist(a) - dist(b) || width(a) - width(b) || a.localeCompare(b);
      })
      .map((crop) => t(cropLabelKey(crop)));
    // Capped: a near-neutral pH suits most crops, and "everything suits your
    // soil" is not a recommendation — the five best-fitting are, and a shorter
    // list is also a cheaper prompt.
    if (alts.length > 0) context.phAltCrops = alts.slice(0, 5);
  }

  // --- Latest leaf-photo check (V2.2) ---
  //
  // PRE-WORDED by summarizePhotoCheck: the verdict sentence the assistant
  // quotes is built from the same translation keys the card renders, so the
  // "similar to, never has" boundary holds by construction on both paths.
  // A check that produced no quotable reading (unsure, unknown class,
  // another plant's healthy class) contributes nothing — the assistant says
  // "no photo check yet" rather than paraphrasing a non-result.
  if (photoCheck && profile) {
    const summary = summarizePhotoCheck(photoCheck.result, profile.crop.name, t);
    if (summary) {
      context.photoVerdict = summary.verdict;
      if (summary.plant) context.photoPlant = summary.plant;
      context.photoCheckedAt = photoCheck.checkedAt;
    }
  }

  // Last, because it is a summary of everything above rather than another field.
  //
  // The titles only — not the explanations or the actions. The model's job is to
  // know what this farm's problems are so it can answer "what should I fix?" from
  // the same list the farmer is reading on the dashboard, and the backend prompt
  // tells it to stick to these and invent no others. The full text stays on the
  // card: those sentences were written to sit inside the product boundary
  // exactly as worded, and handing a model an action to paraphrase is how "ask
  // your KVK about organic matter" becomes a quantity.
  const issues = detectFarmIssues(fc);
  if (issues.length > 0) {
    context.topIssues = issues
      .slice(0, TOP_ISSUE_COUNT)
      .map((issue) => t(issue.titleKey, resolveIssueVars(issue, t)));
  }

  return context;
}

/** Re-exported so callers need only one import for the assistant's data shape. */
export type { AssistantContext };
