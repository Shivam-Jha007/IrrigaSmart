import { useCallback, useEffect, useState } from 'react';
import type { Farm, Farmer, HistoryRecord, Recommendation } from '../types';
import {
  cropRepository,
  farmRepository,
  farmerRepository,
  getFarmsByFarmer,
  getHistoryByFarm,
  getSettings,
  historyRepository,
  recommendationRepository,
  saveSettings as persistSettings,
  soilRepository,
} from '../storage';
import { generateRecommendation, getWeatherForFarm } from '../services';
import type { Settings } from '../types';
import type { AppData, FarmDraft, FarmProfile, RecommendationView } from './appTypes';
import { buildCrop, buildSoil } from './entityFactories';
import { DEFAULT_FARMER, SETTINGS_FALLBACK } from './defaults';

/**
 * Central application store (docs/06_Development_Roadmap.md Phase 6:
 * Integration). Owns all orchestration between storage, the weather service,
 * and the decision engine so UI components stay presentational
 * (docs/07_Engineering_Rules.md: business logic never lives in the UI).
 *
 * A single implicit farmer is used in the MVP (no authentication —
 * docs/06_Development_Roadmap.md Deferred Features); the profile is created on
 * first run.
 */

/** Deterministic-ish id generator. Uses crypto.randomUUID when available. */
function newId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${rand}`;
}

export interface AppStore extends AppData {
  loading: boolean;
  /** Create or update a farm (with its crop and soil) from a form draft. */
  saveFarm(draft: FarmDraft): Promise<void>;
  /** Delete a farm and its associated crop, soil, recommendations, history. */
  deleteFarm(farmId: string): Promise<void>;
  /** Generate a fresh recommendation for a farm, persisting it to history. */
  generateForFarm(farmId: string): Promise<RecommendationView | null>;
  /** History records for a farm, newest first, with their recommendations. */
  loadHistory(farmId: string): Promise<Array<{ record: HistoryRecord; recommendation: Recommendation | undefined }>>;
  /** Update user settings. */
  updateSettings(next: Settings): Promise<void>;
  /** Update the farmer profile. */
  updateFarmer(next: Farmer): Promise<void>;
}

export function useAppStore(): AppStore {
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [profiles, setProfiles] = useState<FarmProfile[]>([]);
  const [settings, setSettings] = useState<Settings>(SETTINGS_FALLBACK);
  const [loading, setLoading] = useState(true);

  const loadProfiles = useCallback(async (farmerId: string): Promise<FarmProfile[]> => {
    const farms = await getFarmsByFarmer(farmerId);
    const resolved = await Promise.all(
      farms.map(async (farm): Promise<FarmProfile | null> => {
        const crop = await cropRepository.getById(farm.primaryCropId);
        const soil = (await soilRepository.getAll()).find((s) => s.name === farm.soilType);
        if (!crop || !soil) return null;
        return { farm, crop, soil };
      }),
    );
    return resolved.filter((p): p is FarmProfile => p !== null);
  }, []);

  // Initial load: farmer profile (create on first run), farms, settings.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const existing = await farmerRepository.getAll();
      let current = existing[0];
      if (!current) {
        current = { ...DEFAULT_FARMER, createdDate: new Date().toISOString() };
        await farmerRepository.save(current);
      }
      const [loadedProfiles, loadedSettings] = await Promise.all([
        loadProfiles(current.id),
        getSettings(),
      ]);
      if (cancelled) return;
      setFarmer(current);
      setProfiles(loadedProfiles);
      setSettings(loadedSettings);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProfiles]);

  const refresh = useCallback(async () => {
    if (!farmer) return;
    setProfiles(await loadProfiles(farmer.id));
  }, [farmer, loadProfiles]);

  const saveFarm = useCallback(
    async (draft: FarmDraft) => {
      if (!farmer) return;
      const isEdit = Boolean(draft.id);
      const existing = isEdit ? profiles.find((p) => p.farm.id === draft.id) : undefined;

      const cropId = existing?.crop.id ?? newId('crop');
      const soilId = existing?.soil.id ?? newId('soil');
      const farmId = draft.id ?? newId('farm');

      const crop = buildCrop(cropId, draft.cropName, draft.growthStage);
      const soil = buildSoil(soilId, draft.soilType);
      const farm: Farm = {
        id: farmId,
        farmerId: farmer.id,
        name: draft.name,
        location: { latitude: draft.latitude, longitude: draft.longitude, label: draft.locationLabel },
        area: draft.area,
        areaUnit: draft.areaUnit,
        soilType: draft.soilType,
        irrigationMethod: draft.irrigationMethod,
        primaryCropId: cropId,
      };

      await cropRepository.save(crop);
      await soilRepository.save(soil);
      await farmRepository.save(farm);
      await refresh();
    },
    [farmer, profiles, refresh],
  );

  const deleteFarm = useCallback(
    async (farmId: string) => {
      const profile = profiles.find((p) => p.farm.id === farmId);
      if (!profile) return;
      await farmRepository.remove(farmId);
      await cropRepository.remove(profile.crop.id);
      const recs = await recommendationRepository.getAllByIndex('byFarm', farmId);
      await Promise.all(recs.map((r) => recommendationRepository.remove(r.id)));
      const hist = await getHistoryByFarm(farmId);
      await Promise.all(hist.map((h) => historyRepository.remove(h.id)));
      await refresh();
    },
    [profiles, refresh],
  );

  const generateForFarm = useCallback(
    async (farmId: string): Promise<RecommendationView | null> => {
      const profile = profiles.find((p) => p.farm.id === farmId);
      if (!profile) return null;
      const now = new Date().toISOString();

      const weatherResult = await getWeatherForFarm(profile.farm, now);
      const weather = weatherResult?.weather ?? null;

      const result = generateRecommendation({
        farm: profile.farm,
        crop: profile.crop,
        soil: profile.soil,
        weather,
        now,
      });

      if (!result.ok) {
        // Should not happen for a saved farm (form enforces completeness), but
        // guard defensively rather than crash the UI.
        return null;
      }

      await recommendationRepository.save(result.recommendation);
      const historyRecord: HistoryRecord = {
        id: newId('history'),
        farmId,
        recommendationId: result.recommendation.id,
        generatedDate: now,
      };
      await historyRepository.save(historyRecord);

      return {
        recommendation: result.recommendation,
        fromCache: weatherResult?.fromCache ?? false,
        weatherMissing: weather === null,
      };
    },
    [profiles],
  );

  const loadHistory = useCallback(async (farmId: string) => {
    const records = await getHistoryByFarm(farmId);
    records.sort((a, b) => b.generatedDate.localeCompare(a.generatedDate));
    return Promise.all(
      records.map(async (record) => ({
        record,
        recommendation: await recommendationRepository.getById(record.recommendationId),
      })),
    );
  }, []);

  const updateSettings = useCallback(async (next: Settings) => {
    await persistSettings(next);
    setSettings(next);
  }, []);

  const updateFarmer = useCallback(async (next: Farmer) => {
    await farmerRepository.save(next);
    setFarmer(next);
  }, []);

  return {
    farmer,
    profiles,
    settings,
    loading,
    saveFarm,
    deleteFarm,
    generateForFarm,
    loadHistory,
    updateSettings,
    updateFarmer,
  };
}
