/**
 * Shared enumerations for IrrigaSmart core models.
 *
 * Values are constrained to the MVP scope defined in docs/10_Knowledge_Base.md §2.
 * Each union is paired with a readonly array so the same set can be iterated at
 * runtime (e.g. for selection lists) without duplicating the allowed values.
 */

// --- Crops (Knowledge Base §2 / §3) ---
export const CROP_NAMES = [
  'Rice',
  'Wheat',
  'Maize',
  'Cotton',
  'Sugarcane',
  'Soybean',
  'Groundnut',
  'Tomato',
  'Potato',
  'Onion',
] as const;
export type CropName = (typeof CROP_NAMES)[number];

// --- Crop growth stages (Knowledge Base §3.1, FAO-56 four-stage model) ---
export const GROWTH_STAGES = ['Initial', 'Development', 'Mid Season', 'Late Season'] as const;
export type GrowthStage = (typeof GROWTH_STAGES)[number];

// --- Crop category (Data Models: Crop.Crop Category) ---
export const CROP_CATEGORIES = ['Cereal', 'Grain', 'Vegetable', 'Other'] as const;
export type CropCategory = (typeof CROP_CATEGORIES)[number];

// --- Soil types (Knowledge Base §2 / §4), ordered light → heavy ---
export const SOIL_TYPES = ['Sandy', 'Sandy Loam', 'Loamy', 'Silty Loam', 'Clay Loam', 'Clay'] as const;
export type SoilType = (typeof SOIL_TYPES)[number];

// Qualitative soil categories (Knowledge Base §4.1).
export const WATER_RETENTION_CATEGORIES = ['Low', 'Moderate', 'High'] as const;
export type WaterRetentionCategory = (typeof WATER_RETENTION_CATEGORIES)[number];

export const DRAINAGE_CATEGORIES = ['Slow', 'Moderate', 'High'] as const;
export type DrainageCategory = (typeof DRAINAGE_CATEGORIES)[number];

// --- Irrigation methods (Knowledge Base §2 / §5) ---
export const IRRIGATION_METHODS = ['Drip', 'Sprinkler', 'Furrow', 'Flood'] as const;
export type IrrigationMethod = (typeof IRRIGATION_METHODS)[number];

// --- Area units (Decision Logic §9 area conversions) ---
export const AREA_UNITS = ['Square metre', 'Acre', 'Hectare'] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];

// --- Recommendation outcome (Decision Engine Stage 4 / Decision Logic §5) ---
export const RECOMMENDATION_STATUSES = [
  'Irrigate Today',
  'Delay Irrigation',
  'Monitor Tomorrow',
] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

// --- Confidence levels (Decision Engine "Confidence Levels" / Decision Logic §8) ---
export const CONFIDENCE_LEVELS = ['High', 'Medium', 'Low'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

/**
 * Supported interface languages (docs/12_Product_Roadmap_v2.md Feature 2 —
 * Multi-language Support): English, Hindi, Bengali. The preference is stored
 * in Settings and applied to all screens.
 */
export const LANGUAGES = ['en', 'hi', 'bn'] as const;
export type Language = (typeof LANGUAGES)[number];

/**
 * Measurement unit system. The MVP is metric-only (Data Models: Settings,
 * Decision Logic §10 Assumptions), but the field is modelled explicitly so the
 * assumption is visible rather than implied.
 */
export const UNIT_SYSTEMS = ['metric'] as const;
export type UnitSystem = (typeof UNIT_SYSTEMS)[number];

/**
 * Indian cropping seasons (docs/10_Knowledge_Base.md §9 — Regional Knowledge;
 * docs/12_Product_Roadmap_v2.md Feature 8).
 */
export const SEASONS = ['Kharif', 'Rabi', 'Zaid'] as const;
export type Season = (typeof SEASONS)[number];
