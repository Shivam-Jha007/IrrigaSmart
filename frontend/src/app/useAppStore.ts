import { useCallback, useEffect, useState } from 'react';
import type {
  AppNotification,
  Farm,
  Farmer,
  HistoryRecord,
  Recommendation,
  WaterLedgerEntry,
} from '../types';
import {
  cropRepository,
  farmRepository,
  farmerRepository,
  getCachedWeather,
  getFarmsByFarmer,
  getHistoryByFarm,
  getLedgerByFarm,
  getNotificationsByFarm,
  getRecommendationsByFarm,
  getSettings,
  historyRepository,
  notificationRepository,
  recommendationRepository,
  saveSettings as persistSettings,
  soilRepository,
  waterLedgerRepository,
} from '../storage';
import {
  buildCustomReminder,
  creditedSaving,
  dueNotifications,
  farmAreaM2,
  fireBrowserNotification,
  flowLitersPerMinute,
  generateRecommendation,
  getWeatherForFarm,
  historyToPrune,
  isSameLocalDay,
  localDayString,
  notificationText,
  orphanedRecommendationIds,
  planNotifications,
  remindersToPrune,
} from '../services';
import { translate, type TranslateFn } from '../i18n';
import type { Settings } from '../types';
import type {
  AppData,
  FarmDraft,
  FarmProfile,
  FarmSummary,
  RecommendationView,
  WaterProgress,
} from './appTypes';
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
  /**
   * Set when the initial local-data load failed (e.g. the IndexedDB upgrade
   * was blocked by another tab). The shell shows an actionable error instead
   * of hanging on "Loading…" (docs/07_Engineering_Rules.md: Error Handling).
   */
  initError: boolean;
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
  /** Pending (undelivered) reminders for a farm, soonest first. */
  loadPendingReminders(farmId: string): Promise<AppNotification[]>;
  /**
   * Add a farmer-chosen irrigation reminder at "HH:MM" (Feature 7 custom
   * timings). Reports which day it landed on: a time that has already passed
   * today is scheduled for tomorrow rather than refused.
   */
  addCustomReminder(farmId: string, time: string): Promise<'today' | 'tomorrow' | 'error'>;
  /** Remove a pending reminder. */
  removeReminder(notificationId: string): Promise<void>;
  /** Today's irrigation checklist and lifetime savings for a farm. */
  loadWaterProgress(farmId: string): Promise<WaterProgress | null>;
  /** Record that the farmer irrigated for `minutes`; returns the updated progress. */
  logIrrigation(farmId: string, minutes: number): Promise<WaterProgress | null>;
  /** Clear today's logged irrigation for a farm (undo a mis-tap). */
  resetTodayIrrigation(farmId: string): Promise<WaterProgress | null>;
}

export function useAppStore(): AppStore {
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [profiles, setProfiles] = useState<FarmProfile[]>([]);
  const [settings, setSettings] = useState<Settings>(SETTINGS_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(false);
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
      try {
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
      } catch {
        // Never hang on "Loading…": surface the failure (e.g. a blocked
        // IndexedDB upgrade) so the user gets an actionable message.
        if (!cancelled) setInitError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProfiles]);

  const refresh = useCallback(async () => {
    if (!farmer) return;
    setProfiles(await loadProfiles(farmer.id));
  }, [farmer, loadProfiles]);

  // --- Automatic local cleanup ---

  /**
   * Prune aged local data once per launch: history beyond the retention window
   * plus same-day duplicates, the recommendations those rows referenced, and
   * long-delivered reminders. Nothing here is recoverable elsewhere, and the
   * water ledger — which holds the lifetime savings total — is never touched.
   */
  useEffect(() => {
    if (loading || initError) return;
    let cancelled = false;
    void (async () => {
      const now = new Date().toISOString();
      const stale = historyToPrune(await historyRepository.getAll(), now);
      if (stale.length > 0 && !cancelled) {
        await Promise.all(stale.map((h) => historyRepository.remove(h.id)));
        // Only recommendations referenced by the rows just deleted are
        // candidates, so a recommendation saved concurrently by a dashboard
        // refresh can never be mistaken for an orphan.
        const candidates = [...new Set(stale.map((h) => h.recommendationId))];
        const orphans = orphanedRecommendationIds(candidates, await historyRepository.getAll());
        await Promise.all(orphans.map((id) => recommendationRepository.remove(id)));
      }
      const expired = remindersToPrune(await notificationRepository.getAll(), now);
      if (cancelled) return;
      await Promise.all(expired.map((n) => notificationRepository.remove(n.id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, initError]);

  // --- Smart Notifications (roadmap Feature 7) ---

  const refreshTodaysReminders = useCallback(async () => {
    const all = await notificationRepository.getAll();
    const now = new Date().toISOString();
    const next = all
      .filter((n) => n.deliveredAt !== null && isSameLocalDay(n.deliveredAt, now))
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    // Keep the previous array when content is unchanged — a new reference
    // would re-render the whole app after every generate/interval check.
    setTodaysReminders((prev) =>
      prev.length === next.length &&
      prev.every((p, i) => p.id === next[i]!.id && p.deliveredAt === next[i]!.deliveredAt)
        ? prev
        : next,
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
      const notifications = await getNotificationsByFarm(farmId);
      await Promise.all(notifications.map((n) => notificationRepository.remove(n.id)));
      const ledger = await getLedgerByFarm(farmId);
      await Promise.all(ledger.map((row) => waterLedgerRepository.remove(row.id)));
      await refresh();
    },
    [profiles, refresh],
  );

  // --- Water checklist (advised vs applied vs saved) ---

  /** Read a farm's ledger and fold it into today's progress view. */
  const buildProgress = useCallback(
    async (farmId: string, day: string): Promise<WaterProgress> => {
      const rows = await getLedgerByFarm(farmId);
      const today = rows.find((row) => row.date === day);
      return {
        date: day,
        targetLiters: today?.targetLiters ?? 0,
        targetMinutes: today?.targetMinutes ?? 0,
        appliedLiters: today?.appliedLiters ?? 0,
        appliedMinutes: today?.appliedMinutes ?? 0,
        savedTodayLiters: today?.savedLiters ?? 0,
        savedLifetimeLiters: rows.reduce((sum, row) => sum + row.savedLiters, 0),
        daysTracked: rows.length,
      };
    },
    [],
  );

  const loadWaterProgress = useCallback(
    async (farmId: string): Promise<WaterProgress | null> => {
      if (!profiles.some((p) => p.farm.id === farmId)) return null;
      return buildProgress(farmId, localDayString(new Date().toISOString()));
    },
    [profiles, buildProgress],
  );

  const logIrrigation = useCallback(
    async (farmId: string, minutes: number): Promise<WaterProgress | null> => {
      const profile = profiles.find((p) => p.farm.id === farmId);
      if (!profile || minutes <= 0) return null;
      const now = new Date().toISOString();
      const day = localDayString(now);
      const id = `${farmId}:${day}`;
      const row = await waterLedgerRepository.getById(id);

      // Minutes are what a farmer actually knows ("the pump ran half an hour");
      // litres are derived from the method's delivery rate over the field.
      const flow = flowLitersPerMinute(profile.farm.irrigationMethod, farmAreaM2(profile.farm));
      const appliedLiters = (row?.appliedLiters ?? 0) + Math.round(minutes * flow);
      const advisedSavingLiters = row?.advisedSavingLiters ?? 0;
      const targetLiters = row?.targetLiters ?? 0;

      const next: WaterLedgerEntry = {
        id,
        farmId,
        date: day,
        targetLiters,
        targetMinutes: row?.targetMinutes ?? 0,
        appliedLiters,
        appliedMinutes: (row?.appliedMinutes ?? 0) + minutes,
        advisedSavingLiters,
        savedLiters: creditedSaving(advisedSavingLiters, targetLiters, appliedLiters),
        updatedAt: now,
      };
      await waterLedgerRepository.save(next);
      return buildProgress(farmId, day);
    },
    [profiles, buildProgress],
  );

  const resetTodayIrrigation = useCallback(
    async (farmId: string): Promise<WaterProgress | null> => {
      const now = new Date().toISOString();
      const day = localDayString(now);
      const row = await waterLedgerRepository.getById(`${farmId}:${day}`);
      if (!row) return buildProgress(farmId, day);
      await waterLedgerRepository.save({
        ...row,
        appliedLiters: 0,
        appliedMinutes: 0,
        savedLiters: creditedSaving(row.advisedSavingLiters, row.targetLiters, 0),
        updatedAt: now,
      });
      return buildProgress(farmId, day);
    },
    [buildProgress],
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

      // One history entry per calendar day. The dashboard regenerates on every
      // visit and every farm switch, so appending unconditionally used to fill
      // History with near-identical rows; today's entry is replaced instead.
      const day = localDayString(now);
      const priorToday = (await getHistoryByFarm(farmId)).find(
        (h) => localDayString(h.generatedDate) === day,
      );
      const historyRecord: HistoryRecord = {
        id: priorToday?.id ?? newId('history'),
        farmId,
        recommendationId: result.recommendation.id,
        generatedDate: now,
      };
      await historyRepository.save(historyRecord);
      if (priorToday && priorToday.recommendationId !== result.recommendation.id) {
        await recommendationRepository.remove(priorToday.recommendationId);
      }

      // Water ledger: keep today's advised figures current without disturbing
      // anything the farmer has already logged (deterministic id, so no
      // double-counting however often this runs).
      const water = result.recommendation.estimatedWaterAmount;
      const ledgerId = `${farmId}:${day}`;
      const priorLedger = await waterLedgerRepository.getById(ledgerId);
      const appliedLiters = priorLedger?.appliedLiters ?? 0;
      const advisedSavingLiters = result.recommendation.waterSavings?.todayLiters ?? 0;
      await waterLedgerRepository.save({
        id: ledgerId,
        farmId,
        date: day,
        targetLiters: water.volumeLiters,
        targetMinutes: water.durationMinutes ?? 0,
        appliedLiters,
        appliedMinutes: priorLedger?.appliedMinutes ?? 0,
        advisedSavingLiters,
        savedLiters: creditedSaving(advisedSavingLiters, water.volumeLiters, appliedLiters),
        updatedAt: now,
      });

      // Schedule reminders from the recommendation (roadmap Feature 7).
      // Pending AUTO reminders are replaced so a fresh plan supersedes them;
      // farmer-added custom reminders are preserved.
      const planned = planNotifications({
        farm: profile.farm,
        recommendation: result.recommendation,
        plan: result.plan,
        now,
        newId,
      });
      const existing = await getNotificationsByFarm(farmId);
      await Promise.all(
        existing
          .filter((n) => n.deliveredAt === null && n.source !== 'custom')
          .map((n) => notificationRepository.remove(n.id)),
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

  const loadPendingReminders = useCallback(async (farmId: string): Promise<AppNotification[]> => {
    const all = await getNotificationsByFarm(farmId);
    return all
      .filter((n) => n.deliveredAt === null)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }, []);

  const addCustomReminder = useCallback(
    async (farmId: string, time: string): Promise<'today' | 'tomorrow' | 'error'> => {
      const profile = profiles.find((p) => p.farm.id === farmId);
      if (!profile) return 'error';
      const now = new Date().toISOString();
      const latest = (await getRecommendationsByFarm(farmId)).sort((a, b) =>
        b.generatedTime.localeCompare(a.generatedTime),
      )[0];
      const { notification, nextDay } = buildCustomReminder(
        profile.farm,
        time,
        {
          volumeLiters: latest?.estimatedWaterAmount.volumeLiters,
          durationMinutes: latest?.estimatedWaterAmount.durationMinutes,
        },
        now,
        newId('notif'),
      );
      await notificationRepository.save(notification);
      return nextDay ? 'tomorrow' : 'today';
    },
    [profiles],
  );

  const removeReminder = useCallback(async (notificationId: string): Promise<void> => {
    await notificationRepository.remove(notificationId);
  }, []);

  const t: TranslateFn = useCallback(
    (key, vars) => translate(settings.preferredLanguage, key, vars),
    [settings.preferredLanguage],
  );

  return {
    farmer,
    profiles,
    settings,
    loading,
    initError,
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
    loadPendingReminders,
    addCustomReminder,
    removeReminder,
    loadWaterProgress,
    logIrrigation,
    resetTodayIrrigation,
  };
}
