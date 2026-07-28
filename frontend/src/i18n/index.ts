import type {
  AreaUnit,
  ConfidenceLevel,
  CropName,
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

/** BCP-47 locale for date formatting in the farmer's language. */
export function localeFor(language: Language): string {
  switch (language) {
    case 'hi':
      return 'hi-IN';
    case 'bn':
      return 'bn-IN';
    default:
      return 'en-IN';
  }
}
