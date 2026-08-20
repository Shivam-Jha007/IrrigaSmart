import type {
  AreaUnit,
  ConfidenceLevel,
  CropName,
  DiseaseRiskLevel,
  FactorInfluence,
  FactorName,
  FactorStrength,
  GrowthStage,
  IrrigationMethod,
  Language,
  RecommendationStatus,
  SoilType,
  TimingReason,
} from '../types';
import type { DiseaseId, Provenance, VisionErrorCode, VisionLabelId, VisionPlant } from '../services';
import { TRANSLATIONS, type TranslationKey } from './translations';

/**
 * Translation entry point (docs/12_Product_Roadmap_v2.md Feature 2).
 *
 * The app store binds translate() to the language from Settings and exposes it
 * as `t`, so every screen renders in the farmer's chosen language. Enum values
 * are stored in English in the data model (docs/03_Data_Models.md) and mapped
 * to translation keys here for display only.
 */
export type { TranslationKey } from './translations';

/** Signature of the language-bound translate function passed through the UI. */
export type TranslateFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/** Translate a key, interpolating {placeholders} with the given values. */
export function translate(
  language: Language,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const table = TRANSLATIONS[language] ?? TRANSLATIONS.en;
  let text: string = table[key] ?? TRANSLATIONS.en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

// --- Enum value → translation key mappers (display layer only) ---

export function statusLabelKey(status: RecommendationStatus): TranslationKey {
  return `enum.status.${status}`;
}

export function cropLabelKey(crop: CropName): TranslationKey {
  return `enum.crop.${crop}`;
}

export function stageLabelKey(stage: GrowthStage): TranslationKey {
  return `enum.stage.${stage}`;
}

export function soilLabelKey(soil: SoilType): TranslationKey {
  return `enum.soil.${soil}`;
}

export function methodLabelKey(method: IrrigationMethod): TranslationKey {
  return `enum.method.${method}`;
}

export function areaUnitLabelKey(unit: AreaUnit): TranslationKey {
  return `enum.area.${unit}`;
}

export function confidenceBadgeKey(confidence: ConfidenceLevel): TranslationKey {
  switch (confidence) {
    case 'High':
      return 'rec.confidenceBadge.high';
    case 'Medium':
      return 'rec.confidenceBadge.medium';
    case 'Low':
      return 'rec.confidenceBadge.low';
  }
}

export function confidenceHelpKey(confidence: ConfidenceLevel): TranslationKey {
  switch (confidence) {
    case 'High':
      return 'rec.help.high';
    case 'Medium':
      return 'rec.help.medium';
    case 'Low':
      return 'rec.help.low';
  }
}

// --- V1.2 mappers (factors, plan) ---

export function factorNameKey(name: FactorName): TranslationKey {
  return `factors.name.${name}`;
}

export function factorInfluenceKey(influence: FactorInfluence): TranslationKey {
  return `factors.influence.${influence}`;
}

export function factorStrengthKey(strength: FactorStrength): TranslationKey {
  return `factors.strength.${strength}`;
}

/** Why the engine chose a given irrigation window (Decision Logic §7). */
export function timingReasonKey(reason: TimingReason): TranslationKey {
  return `rec.why.${reason}`;
}

export function planActionKey(status: RecommendationStatus): TranslationKey {
  return `plan.action.${status}`;
}

// --- V1.3 mappers (disease risk, roadmap Version 1.3 Feature 9) ---

export function diseaseLevelKey(level: DiseaseRiskLevel): TranslationKey {
  return `disease.level.${level}`;
}

/** The disease's local name (docs/10 §10.4). */
export function diseaseNameKey(disease: DiseaseId): TranslationKey {
  return `disease.name.${disease}`;
}

/** Where on the plant to look for it (docs/10 §10.5). */
export function diseaseWhereKey(disease: DiseaseId): TranslationKey {
  return `disease.where.${disease}`;
}

/** What the signs look like (docs/10 §10.5). */
export function diseaseWhatKey(disease: DiseaseId): TranslationKey {
  return `disease.what.${disease}`;
}

// --- V1.7 mappers (photo model, item 16) ---

/**
 * The name of a condition only the photo model knows.
 *
 * Separate from `diseaseNameKey` because these have no weather infection window
 * and therefore no `DiseaseId` — see the note at the top of diseaseVisionMap.ts.
 */
export function visionLabelNameKey(label: VisionLabelId): TranslationKey {
  return `vision.name.${label}`;
}

/** The plant a photo class belongs to, for the cross-plant warning. */
export function visionPlantKey(plant: VisionPlant): TranslationKey {
  return `vision.plant.${plant}`;
}

/** Farmer-readable text for a failure of the photo path. */
export function visionErrorKey(code: VisionErrorCode): TranslationKey {
  return `vision.error.${code}`;
}

// --- Provenance mappers (PRD §7) ---

/**
 * The farmer-facing name of a data source label.
 *
 * A chip reading "REGIONAL_ESTIMATE" means nothing to anyone; the translation
 * behind this key is the short human phrase ("area estimate", "you told us")
 * that lets a farmer see at a glance which numbers on a screen are measurements
 * of their own field and which are predictions for the area around it.
 */
export function provenanceLabelKey(provenance: Provenance): TranslationKey {
  return `provenance.${provenance}`;
}

/** BCP-47 locale for date formatting in the farmer's language. */
export function localeFor(language: Language): string {  switch (language) {
    case 'hi':
      return 'hi-IN';
    case 'bn':
      return 'bn-IN';
    case 'as':
      return 'as-IN';
    case 'ur':
      return 'ur-IN';
    default:
      return 'en-IN';
  }
}
