import { useCallback, useEffect, useState } from 'react';
import type { AppNotification, Farm, Farmer, HistoryRecord, Recommendation } from '../types';
import {
  cropRepository,
  farmRepository,
  farmerRepository,
  getCachedWeather,
  getFarmsByFarmer,
  getHistoryByFarm,
  getNotificationsByFarm,
  getRecommendationsByFarm,
  getSettings,
  historyRepository,
  notificationRepository,
  recommendationRepository,
  saveSettings as persistSettings,
  soilRepository,
} from '../storage';
import {
  dueNotifications,
  fireBrowserNotification,
  generateRecommendation,
  getWeatherForFarm,
  isSameLocalDay,
  notificationText,
  planNotifications,
} from '../services';
import { translate, type TranslateFn } from '../i18n';
import type { Settings } from '../types';
import type { AppData, FarmDraft, FarmProfile, FarmSummary, RecommendationView } from './appTypes';
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

/** How often due reminders are checked while the app is open (Feature 7). */
const REMINDER_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export interface AppStore extends AppData {
  loading: boolean;
  /** Translate a UI key using the language from Settings (roadmap Feature 2). */
  t: TranslateFn;
  /** Notifications delivered today, for the dashboard reminders card. */
  todaysReminders: AppNotification[];
  /** Create or update a farm (with its crop and soil) from a form draft. */
  saveFarm(draft: FarmDraft): Promise<void>;
  /** Delete a farm and its associated crop, soil, recommendations, history. */
  deleteFarm(farmId: string): Promise<void>;
  /** Generate a fresh recommendation for a farm, persisting it to history. */
  generateForFarm(farmId: string): Promise<RecommendationView | null>;
  /** History records for a farm, newest first, with their recommendations. */
  loadHistory(farmId: string): Promise<Array<{ record: HistoryRecord; recommendation: Recommendation | undefined }>>;
  /**
   * Per-farm overviews for the enhanced dashboard (roadmap Feature 3).
   * Reads stored recommendations and the weather cache only — never fetches.
   */
  loadFarmSummaries(): Promise<FarmSummary[]>;
  /** Update user settings. */
  updateSettings(next: Settings): Promise<void>;
  /** Update the farmer profile. */
  updateFarmer(next: Farmer): Promise<void>;
  /**
   * Request browser notification permission and enable reminders when
   * granted (roadmap Feature 7). Returns the outcome for UI feedback.
   */
  enableNotifications(): Promise<'granted' | 'denied' | 'unsupported'>;
}

export function useAppStore(): AppStore {
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [profiles, setProfiles] = useState<FarmProfile[]>([]);
  const [settings, setSettings] = useState<Settings>(SETTINGS_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [todaysReminders, setTodaysReminders] = useState<AppNotification[]>([]);

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

  // --- Smart Notifications (roadmap Feature 7) ---

  const refreshTodaysReminders = useCallback(async () => {
    const all = await notificationRepository.getAll();
    const now = new Date().toISOString();
    setTodaysReminders(
      all
        .filter((n) => n.deliveredAt !== null && isSameLocalDay(n.deliveredAt, now))
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    );
  }, []);

  /**
   * Deliver any due reminders: mark them delivered, fire a browser
   * notification when enabled, and refresh the dashboard list. Reminders due
   * while the app was closed are delivered on next open (offline-first).
   */
  const deliverDueReminders = useCallback(async () => {
    const now = new Date().toISOString();
    const due = dueNotifications(await notificationRepository.getAll(), now);
    for (const notification of due) {
      const delivered: AppNotification = { ...notification, deliveredAt: now };
      await notificationRepository.save(delivered);
      if (settings.notificationsEnabled) {
        const { title, body } = notificationText(
          delivered,
          (key, vars) => translate(settings.preferredLanguage, key, vars),
          settings.preferredLanguage,
        );
        fireBrowserNotification(title, body);
      }
    }
    await refreshTodaysReminders();
  }, [settings.notificationsEnabled, settings.preferredLanguage, refreshTodaysReminders]);

  // Check for due reminders on launch and periodically while the app is open.
  useEffect(() => {
    if (loading) return;
    void deliverDueReminders();
    const id = window.setInterval(() => void deliverDueReminders(), REMINDER_CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [loading, deliverDueReminders]);

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
        daily: weatherResult?.daily ?? null,
        now,
        language: settings.preferredLanguage,
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

      // Schedule reminders from the recommendation (roadmap Feature 7).
      // Pending reminders are replaced so a fresh plan always supersedes them.
      const planned = planNotifications({
        farm: profile.farm,
        recommendation: result.recommendation,
        plan: result.plan,
        now,
        newId,
      });
      const existing = await getNotificationsByFarm(farmId);
      await Promise.all(
        existing.filter((n) => n.deliveredAt === null).map((n) => notificationRepository.remove(n.id)),
      );
      await Promise.all(planned.map((n) => notificationRepository.save(n)));
      await deliverDueReminders();

      return {
        recommendation: result.recommendation,
        fromCache: weatherResult?.fromCache ?? false,
        weatherMissing: weather === null,
        plan: result.plan,
      };
    },
    [profiles, settings.preferredLanguage, deliverDueReminders],
  );

  const loadFarmSummaries = useCallback(async (): Promise<FarmSummary[]> => {
    return Promise.all(
      profiles.map(async ({ farm }) => {
        const recs = await getRecommendationsByFarm(farm.id);
        const latest = recs.sort((a, b) => b.generatedTime.localeCompare(a.generatedTime))[0] ?? null;
        const cached = await getCachedWeather(farm.id);
        return {
          farmId: farm.id,
          latestRecommendation: latest,
          weatherCachedAt: cached?.cachedAt ?? null,
        };
      }),
    );
  }, [profiles]);

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

  const enableNotifications = useCallback(async (): Promise<'granted' | 'denied' | 'unsupported'> => {
    if (!('Notification' in window)) return 'unsupported';
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    const next = { ...settings, notificationsEnabled: granted };
    await persistSettings(next);
    setSettings(next);
    return granted ? 'granted' : 'denied';
  }, [settings]);

  const t: TranslateFn = useCallback(
    (key, vars) => translate(settings.preferredLanguage, key, vars),
    [settings.preferredLanguage],
  );

  return {
    farmer,
    profiles,
    settings,
    loading,
    t,
    todaysReminders,
    saveFarm,
    deleteFarm,
    generateForFarm,
    loadFarmSummaries,
    loadHistory,
    updateSettings,
    updateFarmer,
    enableNotifications,
  };
}
