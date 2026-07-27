import type {
  Crop,
  Farm,
  Farmer,
  HistoryRecord,
  Recommendation,
  Settings,
  Soil,
  WeatherData,
} from '../types';

/**
 * Mock data for development and Phase 1 verification (docs/06_Development_Roadmap.md
 * Phase 1 Definition of Done: "Mock data can be created").
 *
 * The values model the "Rajesh" persona from docs/00_Master_PRD_Part1.md §9:
 * 2 acres of rice on clay soil with drip irrigation. This module is deterministic
 * (fixed ids and timestamps) so it can be reused safely in tests and demos.
 *
 * Not wired into any runtime flow — it exists purely as sample data.
 */

export const mockFarmer: Farmer = {
  id: 'farmer-rajesh',
  name: 'Rajesh',
  preferredLanguage: 'en',
  createdDate: '2026-01-01T00:00:00.000Z',
};

export const mockCrop: Crop = {
  id: 'crop-rice-mid',
  name: 'Rice',
  growthStage: 'Mid Season',
  typicalWaterRequirement: 'High',
  category: 'Cereal',
};

export const mockSoil: Soil = {
  id: 'soil-clay',
  name: 'Clay',
  waterRetention: 'High',
  drainage: 'Slow',
};

export const mockFarm: Farm = {
  id: 'farm-bolpur',
  farmerId: mockFarmer.id,
  name: 'Bolpur Field',
  location: { latitude: 23.6693, longitude: 87.6912, label: 'Bolpur' },
  area: 2,
  areaUnit: 'Acre',
  soilType: mockSoil.name,
  irrigationMethod: 'Drip',
  primaryCropId: mockCrop.id,
};

export const mockWeather: WeatherData = {
  temperature: 34,
  humidity: 50,
  rainfallForecast: 2,
  windSpeed: 3,
  cloudCover: 40,
  observationTime: '2026-07-27T00:30:00.000Z',
  dataSource: 'mock',
};

export const mockRecommendation: Recommendation = {
  id: 'rec-0001',
  farmId: mockFarm.id,
  status: 'Irrigate Today',
  recommendedTime: '06:00',
  estimatedWaterAmount: { depthMm: 5.6, volumeLiters: 45325 },
  explanation:
    'Your rice is at its peak water-demand stage and today is hot. The small ' +
    'forecast rain is not enough to meet its needs, so irrigate this morning.',
  confidence: 'High',
  generatedTime: '2026-07-27T00:35:00.000Z',
};

export const mockHistoryRecord: HistoryRecord = {
  id: 'history-0001',
  farmId: mockFarm.id,
  recommendationId: mockRecommendation.id,
  generatedDate: mockRecommendation.generatedTime,
};

export const mockSettings: Settings = {
  preferredLanguage: 'en',
  notificationsEnabled: false,
  offlineSyncEnabled: false,
  units: 'metric',
};
