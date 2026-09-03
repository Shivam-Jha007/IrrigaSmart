/**
 * Knowledge corpus for the assistant route (V2.2 RAG foundation).
 *
 * WHY THIS IS A SEPARATE MODULE AND NOT "MORE PROMPT"
 * The model answers well only from facts placed in front of it. Until now the
 * route sent the FARM'S figures but almost none of the app's own agricultural
 * knowledge, so questions about a crop's water needs, a soil's behaviour or a
 * disease's signs — all of which the app knows from its vetted sources — were
 * answered from the model's general memory or not at all. This corpus is the
 * app's knowledge, transcribed once, retrieved per question, and injected into
 * the prompt with its source named.
 *
 * THE CORPUS IS THE APP'S OWN VETTED SOURCES, NOTHING ELSE
 * Every entry is a transcription of data the app already ships and defends:
 *   - Crop water behaviour: frontend/src/services/knowledgeBase.ts (FAO-56
 *     Tables 12/22 Kc and root-zone values, the same numbers the engine uses).
 *   - Crop pH optima: frontend/src/services/cropPhKnowledge.ts (university
 *     extension / USDA ranges, cited per crop there).
 *   - Disease profiles: frontend/src/services/diseaseKnowledge.ts windows plus
 *     the English scouting text from translations.ts (docs/10 §10.4–10.5).
 *   - Soil behaviour: knowledgeBase.ts SOIL_PROFILES (Knowledge Base §4.1).
 * Nothing here may state a chemical, dose or spray — docs/10 §10.2 binds this
 * corpus exactly as it binds every other path, and no future entry may add one.
 * To extend the corpus, add the source to the app's own vetted data FIRST, then
 * transcribe it here; this module invents nothing.
 *
 * RETRIEVAL IS DETERMINISTIC
 * `retrieve` scores entries by keyword overlap with the question and returns a
 * fixed cap of the best matches. No embeddings, no external service: the corpus
 * is small (tens of entries), the keyword vocabulary is curated per entry in the
 * same five-script mix farmers actually type, and deterministic retrieval means
 * the same question always grounds the same answer — which a farmer can be told
 * when they ask why.
 */

/** One retrievable knowledge entry. */
export interface KnowledgeEntry {
  /** Stable id, e.g. 'crop.rice.water'. */
  id: string;
  /** The fact, in plain English (the model answers in the farmer's language). */
  text: string;
  /** Where the fact comes from, shown to the farmer when cited. */
  source: string;
  /**
   * Keywords that make a question about this entry. Roman, Devanagari, Bengali,
   * Assamese and Urdu forms of the same idea — a corpus entry that can only be
   * retrieved by its English name does not exist for three of this app's five
   * languages.
   */
  keywords: readonly string[];
}

/**
 * The corpus. Grouped by kind only for the reader; retrieval is flat.
 *
 * Texts are written to be quoted: each states its fact completely, names its
 * numbers, and never editorialises.
 */
export const KNOWLEDGE_CORPUS: readonly KnowledgeEntry[] = [
  // --- Crop water behaviour (FAO-56 via knowledgeBase.ts) ---
  {
    id: 'crop.rice.water',
    text: 'Rice (paddy) has one of the highest crop water demands of the app\'s crops: its crop coefficient (Kc) is 1.05 at establishment, 1.2 in mid season and 0.9 at late season, and its managed root zone is shallow (about 0.2-0.3 m). Rice is normally grown under ponded water, so standing water is expected practice rather than a sign of over-irrigation.',
    source: 'FAO-56 Tables 12 and 22, as used by the app\'s decision engine',
    keywords: ['rice', 'paddy', 'धान', 'dhan', 'चावल', 'ভাত', 'ধান'.normalize(), 'পান্তি', 'شالی', 'چاول', 'water need', 'पानी की ज़रूरत', 'जल की ज़रूरत', 'পানির প্রয়োজন', 'کھیت'],
  },
  {
    id: 'crop.wheat.water',
    text: 'Wheat (spring type, as grown in Indian rabi) has a crop coefficient of 0.3 at establishment, 1.15 in mid season and 0.25 at late season, with deep roots (1.0-1.1 m at mid-to-late season). Because the roots reach deep, wheat tolerates longer gaps between waterings than shallow-rooted crops.',
    source: 'FAO-56 Tables 12 and 22, as used by the app\'s decision engine',
    keywords: ['wheat', 'gehun', 'गेहूँ', 'গম', 'গहু', 'کڻک', 'کnow', 'گندم', 'water need', 'पानी की ज़रूरत', 'জলের প্রয়োজন'],
  },
  {
    id: 'crop.maize.water',
    text: 'Maize has a crop coefficient of 0.3 at establishment, 1.2 in mid season and 0.35 at late season, with deep roots (1.0-1.1 m). Mid-season maize is among the most water-sensitive stages of any crop in the app: tasselling and silking fail quickly under water stress.',
    source: 'FAO-56 Tables 12 and 22, as used by the app\'s decision engine',
    keywords: ['maize', 'corn', 'makka', 'मक्का', 'ভুট্টা', 'মকা', 'مکئی', 'چڻا', 'water need', 'पानी की ज़रूरত'],
  },
  {
    id: 'crop.cotton.water',
    text: 'Cotton has a crop coefficient of 0.35 at establishment, 1.15 in mid season and 0.7 at late season, with very deep roots (1.2 m). Deep roots let cotton draw on stored soil water, but boll formation suffers badly if the crop is stressed then.',
    source: 'FAO-56 Tables 12 and 22, as used by the app\'s decision engine',
    keywords: ['cotton', 'kapas', 'कपास', 'কপাস', 'কপাহ', 'کپاس', 'water need', 'পানীৰ প্ৰয়োজন'],
  },
  {
    id: 'crop.potato.water',
    text: 'Potato has a crop coefficient of 0.5 at establishment, 1.15 in mid season and 0.75 at late season, with shallow roots (0.25-0.5 m). Shallow roots mean the crop cannot reach deep water: potato needs frequent, light watering rather than rare heavy ones, and tuber quality drops with water stress.',
    source: 'FAO-56 Tables 12 and 22, as used by the app\'s decision engine',
    keywords: ['potato', 'aloo', 'आलू', 'আলু', 'বিলাহী', 'آلو', 'بطاطہ', 'water need', 'পানির প্রয়োজন'],
  },
  {
    id: 'crop.onion.water',
    text: 'Onion has a crop coefficient of 0.7 at establishment, 1.05 in mid season and 0.75 at late season, with very shallow roots (0.2-0.4 m). Of the app\'s crops, onion is among the least able to tolerate a missed watering: shallow roots and thin leaves mean the soil must stay evenly moist during bulb formation.',
    source: 'FAO-56 Tables 12 and 22, as used by the app\'s decision engine',
    keywords: ['onion', 'pyaz', 'प्याज़', 'পেঁয়াজ', 'পিঁয়াজ', 'پیاز', 'water need', 'পানীৰ প্ৰয়োজন'],
  },

  // --- Crop pH optima (cropPhKnowledge.ts) ---
  {
    id: 'crop.rice.ph',
    text: 'Rice grows best at soil pH 5.5 to 6.5 and tolerates mildly acidic soils; paddy flooding naturally moves soil pH toward neutral over the season.',
    source: 'Paddy rice agronomy reviews (optimal range 5.5-6.5), as used by the app',
    keywords: ['rice', 'paddy', 'धान', 'ধান', 'شالی', 'ph', 'पीएच', 'পিএইচ', 'acidic', 'अम्लीय', 'কটু', 'مٹی'],
  },
  {
    id: 'crop.potato.ph',
    text: 'Potato prefers acidic to neutral soil, pH 5.0 to 6.5 — the widest acidic-side tolerance of the app\'s crops. Part of the reason is common scab, which is suppressed in acidic soil; on alkaline soil potatoes suffer more scab.',
    source: 'University of Minnesota / UMaine Extension (potato, pH 5.0-6.5), as used by the app',
    keywords: ['potato', 'aloo', 'आलू', 'আলু', 'آلو', 'ph', 'acidic soil', 'अम्लीय मिट्टी', 'scab'],
  },
  {
    id: 'crop.onion.ph',
    text: 'Onion is sensitive to acid soils and grows best at pH 6.0 to 6.8; on more acidic soil its growth and bulb quality decline noticeably.',
    source: 'NC State / Ohio State Extension (onion, pH 6.0-6.8), as used by the app',
    keywords: ['onion', 'pyaz', 'प्याज़', 'পেঁয়াজ', 'پیاز', 'ph', 'acidic', 'acid soil'],
  },

  // --- Disease scouting (diseaseKnowledge.ts + translations.ts, docs/10) ---
  {
    id: 'disease.riceBlast',
    text: 'Rice blast: favoured by daily maxima of 25-33 °C with humidity at/above 80%. Look on leaves first, then the nodes and the neck of the panicle, for spindle-shaped spots with grey centres and brown borders. A neck of the panicle infected at heading can blank the whole grain head.',
    source: 'App Knowledge Base (docs/10 §10.4-10.5)',
    keywords: ['blast', 'rice blast', 'झोंका', 'ब्लास्ट', 'ব্লাস্ট', 'ধান পোড়া', '블', 'جھونکا', 'spindle', 'panicle'],
  },
  {
    id: 'disease.lateBlight',
    text: 'Late blight (tomato and potato): favoured by daily maxima of 16-26 °C with humidity at/above 80%. Look on lower leaves first, then stems and the crop itself, for dark water-soaked patches with a white fungal ring on the underside in the morning. It spreads fastest in cool, wet weather and can destroy a field in days.',
    source: 'App Knowledge Base (docs/10 §10.4-10.5)',
    keywords: ['late blight', 'pata jhulsano', 'পচে যাওয়া রোগ', 'लेट ब्लाइट', 'অংগমারী', 'धब्बा', 'pata', 'tomato', 'potato', 'टमाटर', 'আলু'],
  },
  {
    id: 'disease.onionPurpleBlotch',
    text: 'Onion purple blotch: favoured by daily maxima of 25-34 °C with humidity at/above 75%. Look on older leaves for small purple spots with yellow halos that enlarge into target-like rings; leaves can bend and die back from the tip.',
    source: 'App Knowledge Base (docs/10 §10.4-10.5)',
    keywords: ['purple blotch', 'बैंगनी धब्बा', 'বেগুনি দাগ', 'onion', 'प्याज़', 'পেঁয়াজ', 'پیاز', 'purple spot'],
  },

  // --- Soil behaviour (knowledgeBase.ts SOIL_PROFILES, docs/10 §4) ---
  {
    id: 'soil.sandy.behaviour',
    text: 'Sandy soil holds little water (low water holding) and drains fast, so crops on it need frequent light watering; a long gap between waterings stresses the crop quickly. Rain soaks in quickly rather than pooling.',
    source: 'App Knowledge Base soil profiles (docs/10 §4)',
    keywords: ['sandy', 'sand', 'रेतीली', 'বালুকাময়', 'বালিময়', 'ریتلی', 'drains', 'जल्दी सूख', 'quick dry', 'মাটি'],
  },
  {
    id: 'soil.clay.behaviour',
    text: 'Clay soil holds the most water but drains slowly, so it needs less frequent but well-managed watering; waterlogging after heavy rain is the main risk, especially for young crops.',
    source: 'App Knowledge Base soil profiles (docs/10 §4)',
    keywords: ['clay', 'चिकनी', 'ভারী মাটি', 'کم', 'کہی', 'waterlogging', 'जल भराव', 'পানি জমা', 'মাটি ৰোকে'],
  },
  {
    id: 'soil.loamy.behaviour',
    text: 'Loamy soil is the middle ground: moderate water holding and moderate drainage, needing watering at moderate intervals. It is the easiest of the soil types to manage for most crops.',
    source: 'App Knowledge Base soil profiles (docs/10 §4)',
    keywords: ['loam', 'loamy', 'दोमट', 'দোআঁশ', 'দোমাট', 'دوامی', 'मध्यम', 'moderate'],
  },
];

/**
 * How many entries a single question retrieves. Small on purpose: the corpus
 * is tightly curated, and beyond the best two or three matches the rest is
 * noise that spends the reply budget on context the model will not use.
 */
export const MAX_RETRIEVED = 3;

/** Normalise a question for matching: lowercase, punctuation to spaces. */
function normaliseQuestion(question: string): string {
  return ` ${question.toLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ').trim()} `;
}

/**
 * Retrieve the most relevant entries for a question.
 *
 * Matching is SPACE-PADDED, never bare substring: 'rice' must not match
 * inside 'price', exactly the trap the offline rules' PH_TERMS documents for
 * 'ph' (assistantRules.ts). Both sides of the comparison are padded — the
 * question by `normaliseQuestion`, each keyword here — so a keyword matches
 * only as whole words (single- or multi-word phrases). The id-stem bonus is
 * padded the same way.
 *
 * Scoring: one point per keyword matched, plus a half point when the entry's
 * id stem (e.g. 'rice' of 'crop.rice.water') appears as its own word. Ties
 * break by corpus order, so retrieval is deterministic.
 */
export function retrieve(question: string, limit = MAX_RETRIEVED): readonly KnowledgeEntry[] {
  const q = normaliseQuestion(question);
  if (q.trim().length === 0) return [];
  const scored = KNOWLEDGE_CORPUS.map((entry, index) => {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (q.includes(` ${keyword.toLowerCase()} `)) score += 1;
    }
    const stem = entry.id.split('.')[1] ?? '';
    if (stem.length >= 4 && q.includes(` ${stem} `)) score += 0.5;
    return { entry, score, index };
  })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit);
  return scored.map((candidate) => candidate.entry);
}
