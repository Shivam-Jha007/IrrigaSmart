import type {
  CropName,
  GrowthStage,
  IrrigationMethod,
  Language,
  RecommendationStatus,
  SoilType,
} from '../types';
import { METHOD_LABELS, SOIL_PROFILES } from './knowledgeBase';

/**
 * Explanation text for the Decision Engine's Stage 9
 * (docs/11_Decision_Logic.md §9), localized per roadmap Feature 2.
 *
 * The engine decides *what* drove the recommendation; this module only turns
 * those factors into plain farmer-facing sentences. Language is an explicit
 * input so the engine stays deterministic (same input → same output,
 * docs/07_Engineering_Rules.md: Decision Engine Rules). English wording is
 * unchanged from the MVP; Hindi/Bengali use the same sentence structure with
 * localized crop/soil/stage/method vocabulary. Numeric internals (Kc,
 * multipliers) are never shown.
 */

export interface ExplanationParts {
  status: RecommendationStatus;
  cropName: CropName;
  growthStage: GrowthStage;
  soilName: SoilType;
  method: IrrigationMethod;
  /** True when forecast rain contributed to the outcome. */
  rainMeaningful: boolean;
  /** True when temperature exceeded the reference baseline. */
  hot: boolean;
}

/** Sentence-level vocabulary for one language. */
interface SentenceVocab {
  crops: Record<CropName, string>;
  stages: Record<GrowthStage, string>;
  soils: Record<SoilType, string>;
  /** How often the soil typically needs watering, as used inside a sentence. */
  soilFrequency: Record<SoilType, string>;
  methods: Record<IrrigationMethod, string>;
}

const EN_VOCAB: SentenceVocab = {
  crops: { Rice: 'rice', Wheat: 'wheat', Maize: 'maize' },
  stages: {
    Initial: 'initial',
    Development: 'development',
    'Mid Season': 'mid season',
    'Late Season': 'late season',
  },
  soils: { Sandy: 'sandy', Loamy: 'loamy', Clay: 'clay' },
  soilFrequency: {
    Sandy: SOIL_PROFILES.Sandy.frequency.toLowerCase(),
    Loamy: SOIL_PROFILES.Loamy.frequency.toLowerCase(),
    Clay: SOIL_PROFILES.Clay.frequency.toLowerCase(),
  },
  methods: METHOD_LABELS,
};

const HI_VOCAB: SentenceVocab = {
  crops: { Rice: 'धान', Wheat: 'गेहूं', Maize: 'मक्का' },
  stages: {
    Initial: 'प्रारंभिक',
    Development: 'विकास',
    'Mid Season': 'मध्य मौसम',
    'Late Season': 'अंतिम मौसम',
  },
  soils: { Sandy: 'रेतीली', Loamy: 'दोमट', Clay: 'चिकनी' },
  soilFrequency: { Sandy: 'बार-बार', Loamy: 'मध्यम', Clay: 'कम' },
  methods: {
    Drip: 'उच्च-दक्षता ड्रिप',
    Sprinkler: 'स्प्रिंकलर',
    Furrow: 'फ़रो',
    Flood: 'फ्लड',
  },
};

const BN_VOCAB: SentenceVocab = {
  crops: { Rice: 'ধান', Wheat: 'গম', Maize: 'ভুট্টা' },
  stages: {
    Initial: 'প্রাথমিক',
    Development: 'বৃদ্ধি',
    'Mid Season': 'মধ্য মৌসুম',
    'Late Season': 'শেষ মৌসুম',
  },
  soils: { Sandy: 'বালুকাময়', Loamy: 'দোঁআশ', Clay: 'এঁটেল' },
  soilFrequency: { Sandy: 'ঘন ঘন', Loamy: 'মাঝারি', Clay: 'কম' },
  methods: {
    Drip: 'উচ্চ-দক্ষতার ড্রিপ',
    Sprinkler: 'স্প্রিংকলার',
    Furrow: 'ফুরো',
    Flood: 'ফ্লাড',
  },
};

const VOCAB: Record<Language, SentenceVocab> = { en: EN_VOCAB, hi: HI_VOCAB, bn: BN_VOCAB };

interface SentenceTemplates {
  delay(v: SentenceVocab, parts: ExplanationParts): string;
  monitor(v: SentenceVocab, parts: ExplanationParts): string;
  irrigate(v: SentenceVocab, parts: ExplanationParts): string;
}

const EN_TEMPLATES: SentenceTemplates = {
  delay: (v, p) =>
    `Rain expected today is enough to meet your ${v.crops[p.cropName]}'s needs, so you can delay irrigation. On ${v.soils[p.soilName]} soil this moisture stays available longer.`,
  monitor: (v, p) =>
    `Your ${v.crops[p.cropName]} in the ${v.stages[p.growthStage]} stage needs only a little water today, and your ${v.soils[p.soilName]} soil (${v.soilFrequency[p.soilName]} watering) can hold it. Check again tomorrow.`,
  irrigate: (v, p) => {
    const rainClause = p.rainMeaningful
      ? 'The forecast rain is not enough to meet its needs, so'
      : 'With little rain expected,';
    const heatClause = p.hot ? ' Today is hot, which raises water demand.' : '';
    return `Your ${v.crops[p.cropName]} is in the ${v.stages[p.growthStage]} stage.${heatClause} ${rainClause} irrigate this morning using your ${v.methods[p.method]} system.`;
  },
};

const HI_TEMPLATES: SentenceTemplates = {
  delay: (v, p) =>
    `आज अनुमानित बारिश आपकी ${v.crops[p.cropName]} फ़सल की ज़रूरत के लिए काफ़ी है, इसलिए आप सिंचाई टाल सकते हैं। ${v.soils[p.soilName]} मिट्टी में यह नमी ज़्यादा देर तक बनी रहती है।`,
  monitor: (v, p) =>
    `${v.stages[p.growthStage]} अवस्था में आपकी ${v.crops[p.cropName]} फ़सल को आज बहुत कम पानी चाहिए, और आपकी ${v.soils[p.soilName]} मिट्टी (${v.soilFrequency[p.soilName]} सिंचाई) इसे संभाल सकती है। कल फिर जाँचें।`,
  irrigate: (v, p) => {
    const rainClause = p.rainMeaningful
      ? 'अनुमानित बारिश इसकी ज़रूरत पूरी करने के लिए काफ़ी नहीं है, इसलिए'
      : 'बारिश की संभावना कम है, इसलिए';
    const heatClause = p.hot ? ' आज गर्मी ज़्यादा है, जिससे पानी की माँग बढ़ जाती है।' : '';
    return `आपकी ${v.crops[p.cropName]} फ़सल ${v.stages[p.growthStage]} अवस्था में है।${heatClause} ${rainClause} आज सुबह अपनी ${v.methods[p.method]} प्रणाली से सिंचाई करें।`;
  },
};

const BN_TEMPLATES: SentenceTemplates = {
  delay: (v, p) =>
    `আজকের পূর্বাভাসিত বৃষ্টি আপনার ${v.crops[p.cropName]} ফসলের প্রয়োজন মেটাতে যথেষ্ট, তাই আপনি সেচ পিছিয়ে দিতে পারেন। ${v.soils[p.soilName]} মাটিতে এই আর্দ্রতা বেশি দিন ধরে থাকে।`,
  monitor: (v, p) =>
    `${v.stages[p.growthStage]} পর্যায়ে আপনার ${v.crops[p.cropName]} ফসলের আজ খুব অল্প জল প্রয়োজন, আর আপনার ${v.soils[p.soilName]} মাটি (${v.soilFrequency[p.soilName]} সেচ) তা ধরে রাখতে পারে। আগামীকাল আবার দেখুন।`,
  irrigate: (v, p) => {
    const rainClause = p.rainMeaningful
      ? 'পূর্বাভাসিত বৃষ্টি এর প্রয়োজন মেটাতে যথেষ্ট নয়, তাই'
      : 'বৃষ্টির সম্ভাবনা কম, তাই';
    const heatClause = p.hot ? ' আজ বেশি গরম, ফলে জলের চাহিদা বেড়ে যায়।' : '';
    return `আপনার ${v.crops[p.cropName]} ফসল ${v.stages[p.growthStage]} পর্যায়ে আছে।${heatClause} ${rainClause} আজ সকালে আপনার ${v.methods[p.method]} পদ্ধতিতে সেচ দিন।`;
  },
};

const TEMPLATES: Record<Language, SentenceTemplates> = {
  en: EN_TEMPLATES,
  hi: HI_TEMPLATES,
  bn: BN_TEMPLATES,
};

/** Build the farmer-facing explanation for a recommendation. */
export function buildExplanation(parts: ExplanationParts, language: Language): string {
  const vocab = VOCAB[language] ?? EN_VOCAB;
  const templates = TEMPLATES[language] ?? EN_TEMPLATES;
  switch (parts.status) {
    case 'Delay Irrigation':
      return templates.delay(vocab, parts);
    case 'Monitor Tomorrow':
      return templates.monitor(vocab, parts);
    case 'Irrigate Today':
      return templates.irrigate(vocab, parts);
  }
}
