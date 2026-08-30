import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AppNotification,
  Farm,
  Farmer,
  FertilizerSelection,
  HistoryRecord,
  Recommendation,
  SoilNutrientReading,
  SoilSensorReading,
  WaterLedgerEntry,
} from '../types';
import {
  cropRepository,
  depletionStateRepository,
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
  assessDiseaseRisk,
  buildCustomReminder,
  creditedSaving,
  dueNotifications,
  farmAreaM2,
  fetchMeasuredSoil,
  fetchTerrain,
  fireBrowserNotification,
  flowLitersPerMinute,
  generateRecommendation,
  getWeatherForFarm,
  historyToPrune,
  intakeFactor,
  isSameLocalDay,
  localDayString,
  type MeasuredSoilOutcome,
  notificationText,
  orphanedRecommendationIds,
  planNotifications,
  profileCarriesEveryReadProperty,
  remindersToPrune,
  sameCoordinate,
} from '../services';
import { translate, type TranslateFn } from '../i18n';
import type { Settings } from '../types';
import type {
  AppData,
  FarmDraft,
  FarmProfile,
  FarmSummary,
  RecommendationView,
  SoilFetchStatus,
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
  /**
   * Measured-soil fetch state, keyed by soil record id. A key is absent once the
   * profile has landed — presence means "there is something to explain".
   */
  soilFetchStatus: Readonly<Record<string, SoilFetchStatus>>;
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
  /**
   * Persist a Soil Health Card N/P/K reading entered on the Fertilizer page,
   * against the soil record a specific farm currently resolves to. Replaces
   * any prior reading for that soil record — this is the farmer's current
   * best answer for their field, not a log of every number they have ever
   * typed.
   */
  saveNutrientReading(farmId: string, reading: SoilNutrientReading): Promise<void>;
  saveFertilizerSelection(farmId: string, selection: FertilizerSelection): Promise<void>;
  saveSensorReading(farmId: string, reading: SoilSensorReading): Promise<void>;
}

export function useAppStore(): AppStore {
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [profiles, setProfiles] = useState<FarmProfile[]>([]);
  const [settings, setSettings] = useState<Settings>(SETTINGS_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(false);
  const [todaysReminders, setTodaysReminders] = useState<AppNotification[]>([]);
  const [soilFetchStatus, setSoilFetchStatus] = useState<Record<string, SoilFetchStatus>>({});
  /**
   * Soil records this session has already tried to backfill. A ref, not state:
   * it must not itself trigger a render, and it guards the backfill effect —
   * which depends on `profiles`, and so re-runs every time a fetch lands — from
   * retrying the same record forever when the provider is down.
   */
  const soilBackfillAttempted = useRef<Set<string>>(new Set());

  const loadProfiles = useCallback(async (farmerId: string): Promise<FarmProfile[]> => {
    const farms = await getFarmsByFarmer(farmerId);
    const soils = await soilRepository.getAll();
    const resolved = await Promise.all(
      farms.map(async (farm): Promise<FarmProfile | null> => {
        const crop = await cropRepository.getById(farm.primaryCropId);
        // A farm links to its soil by TYPE, not by id, and `saveFarm` writes one
        // record per farm — so two farms on the same soil type leave two records
        // with the same name and a plain `find` hands both farms the first one.
        // That would show one farm's measured profile, and its pH, under the
        // other farm's name: a measurement presented for ground it was not taken
        // on. Prefer the record actually measured at THIS farm's coordinate, then
        // an unmeasured record of the right type, and only then whatever is
        // there. (The real fix is a `soilId` on `Farm`, which needs a stored-data
        // migration and is tracked separately.)
        const candidates = soils.filter((s) => s.name === farm.soilType);
        const soil =
          candidates.find(
            (s) =>
              s.measured &&
              sameCoordinate(s.measured, farm.location.latitude, farm.location.longitude),
          ) ??
          candidates.find((s) => !s.measured) ??
          candidates[0];
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

  /**
   * Fetch a farm's measured soil profile in the background and store it.
   *
   * Shared by farm creation and the backfill below so both report status the
   * same way and neither can drift into a quieter failure than the other.
   *
   * Never awaited by anything the farmer is waiting on. The SoilGrids property
   * query takes tens of seconds and the farm works on the Knowledge Base table
   * until this lands — item 0's rule that a new feature must not be able to hold
   * up a working one.
   */
  const ensureMeasuredSoil = useCallback(
    async (soilId: string, latitude: number, longitude: number): Promise<void> => {
      setSoilFetchStatus((prev) => ({ ...prev, [soilId]: 'pending' }));

      // Retry the two failures a later request can actually clear, bounded so a
      // real outage cannot loop. Without this, the once-per-session backfill
      // guard below turns a passing failure into a pH card that stays blank
      // until the farmer manually reloads — the fetch gives up on the first miss
      // and nothing asks again. `pending` is left in place across the waits, so
      // the card keeps saying "reading the soil map" rather than flickering to
      // an error it is about to clear.
      //
      //   unreachable             — the backend is momentarily absent (a dev
      //     restart, a cold start, a network blip). A refused connection fails
      //     fast, so a short wait catches it coming back.
      //   unavailable + retryable — SoilGrids timed out and the backend fell
      //     back to the table. That fallback is cached for the backend's
      //     CACHE_TTL_FAILURE_MS (60 s), so a retry sooner is served the same
      //     cached miss; the wait is deliberately past that window so the retry
      //     re-hits the provider. (Coupled to that backend constant on purpose —
      //     a shorter wait here would just burn attempts on the cache.)
      //
      // A non-retryable `unavailable` (a 4xx, or values that failed the
      // cross-check) is left to settle: that coordinate returns the same answer
      // however many times it is asked, which is the distinction the backend's
      // `retryable` flag draws and `fetchMeasuredSoil` carries through.
      const MAX_RETRIES = 3;
      const UNREACHABLE_DELAY_MS = 5_000;
      const UNAVAILABLE_RETRY_DELAY_MS = 70_000;
      const retryDelayMs = (o: MeasuredSoilOutcome): number | null => {
        if (o.kind === 'unreachable') return UNREACHABLE_DELAY_MS;
        if (o.kind === 'unavailable' && o.retryable) return UNAVAILABLE_RETRY_DELAY_MS;
        return null;
      };

      let outcome = await fetchMeasuredSoil(latitude, longitude);
      for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
        const delayMs = retryDelayMs(outcome);
        if (delayMs === null) break;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        // The farmer may have deleted the farm while we waited; stop if so.
        if (!(await soilRepository.getById(soilId))) return;
        outcome = await fetchMeasuredSoil(latitude, longitude);
      }

      if (outcome.kind !== 'measured') {
        // The stored profile, if there is one, is deliberately left alone: an
        // older reading for the right coordinate beats no reading, and a farm
        // that was working offline must not get worse because a refresh failed.
        setSoilFetchStatus((prev) => ({
          ...prev,
          [soilId]: outcome.kind === 'unreachable' ? 'unreachable' : 'noData',
        }));
        return;
      }

      // Re-read rather than reusing a captured record: the farmer may have
      // edited or deleted the farm during those tens of seconds.
      const current = await soilRepository.getById(soilId);
      if (!current) return;
      await soilRepository.save({ ...current, measured: outcome.profile });
      setSoilFetchStatus((prev) => {
        const next = { ...prev };
        delete next[soilId];
        return next;
      });
      await refresh();
    },
    [refresh],
  );

  /**
   * Backfill measured soil for farms that are missing it, or whose stored record
   * predates a property the app now reads.
   *
   * WHY THIS EXISTS AT ALL
   * Fetching only at farm creation looked sufficient while the profile's shape
   * was fixed. It is not: `phH2O` was added for the pH card, and every farm
   * created before it kept a pH-less profile forever, so its pH card stayed
   * blank with nothing wrong at the coordinate and nothing wrong with the
   * provider. A farmer has no reason to re-save a farm to fix that, and should
   * not have to.
   *
   * Sequential, and once per soil record per session — a `Set` in a ref rather
   * than state, because the effect depends on `profiles` and every landed fetch
   * refreshes them. Without the guard a provider outage would loop.
   */
  useEffect(() => {
    if (loading || !farmer) return;

    const due = profiles.filter((p) => {
      if (soilBackfillAttempted.current.has(p.soil.id)) return false;
      const measured = p.soil.measured;
      if (!measured) return true;
      // A profile for the wrong coordinate is not this farm's soil at all.
      if (!sameCoordinate(measured, p.farm.location.latitude, p.farm.location.longitude)) {
        return true;
      }
      // Present, right place, but written before a property the app now reads.
      return !profileCarriesEveryReadProperty(measured);
    });
    if (due.length === 0) return;

    for (const p of due) soilBackfillAttempted.current.add(p.soil.id);

    let cancelled = false;
    void (async () => {
      for (const p of due) {
        if (cancelled) return;
        await ensureMeasuredSoil(
          p.soil.id,
          p.farm.location.latitude,
          p.farm.location.longitude,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, farmer, profiles, ensureMeasuredSoil]);

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
      // Carry a profile already measured for this same coordinate. Soil does not
      // change, so re-editing a farm's name or area must not discard it — nor
      // refetch it. A moved pin does invalidate it: a 250 m cell from the old
      // location would be quietly wrong.
      const reusable =
        existing?.soil.measured &&
        sameCoordinate(existing.soil.measured, draft.latitude, draft.longitude)
          ? existing.soil.measured
          : undefined;
      const soil = buildSoil(soilId, draft.soilType, reusable);
      // Terrain is reused on the same terms and for the same reason: the ground
      // does not tilt because a farmer renamed their field, but a moved pin puts
      // the farm on a different hillside.
      const reusableTerrain =
        existing?.farm.terrain &&
        sameCoordinate(existing.farm.terrain, draft.latitude, draft.longitude)
          ? existing.farm.terrain
          : undefined;
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
        ...(reusableTerrain ? { terrain: reusableTerrain } : {}),
      };

      await cropRepository.save(crop);
      await soilRepository.save(soil);
      await farmRepository.save(farm);
      await refresh();

      // The measured profile is fetched AFTER the farm is saved and shown, never
      // before. The SoilGrids property query takes tens of seconds, and making
      // farm creation wait on a provider the farmer may not even be able to
      // reach would trade a working feature for a better one — item 0. The farm
      // works on the Knowledge Base table meanwhile; when this lands, the soil
      // record is updated in place and the next recommendation picks it up.
      //
      // TWO DECISIONS, NOT ONE. What to STORE is `reusable` above — a profile
      // measured at this coordinate is kept whatever else is true of it, so a
      // farmer never loses a working water balance to a refresh. Whether to
      // REFETCH is the separate question below, and it is also yes when the kept
      // profile predates a property the app now reads. Collapsing the two is
      // what left older farms permanently without pH.
      if (!reusable || !profileCarriesEveryReadProperty(reusable)) {
        // Not awaited, and its failure is reported through `soilFetchStatus`
        // rather than thrown: the farm is already saved and usable.
        soilBackfillAttempted.current.add(soilId);
        void ensureMeasuredSoil(soilId, draft.latitude, draft.longitude);
      }

      // Terrain follows the same background pattern, in a SEPARATE request that
      // is deliberately not awaited alongside the soil one. The elevation
      // endpoint answers in ~1.5 s against SoilGrids' tens of seconds, so
      // chaining them would make the fast one wait on the slow one for no
      // reason, and a SoilGrids timeout would take the slope down with it.
      if (!reusableTerrain) {
        void fetchTerrain(draft.latitude, draft.longitude).then(async (terrain) => {
          if (!terrain) return;
          // Re-read for the same reason as the soil path: the farm may have been
          // edited or deleted while this was in flight. Writing `farm` back
          // wholesale would silently revert whatever the farmer just changed.
          const current = await farmRepository.getById(farmId);
          if (!current) return;
          await farmRepository.save({ ...current, terrain });
          await refresh();
        });
      }
    },
    [farmer, profiles, refresh, ensureMeasuredSoil],
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
      //
      // The slope intake factor MUST be the same one the recommendation used
      // (item 10). The engine advises a longer run at a lower flow on a slope, so
      // converting the logged minutes at the flat-ground rate would credit more
      // litres than were actually delivered and show the farmer over-applying a
      // run they performed exactly as advised.
      const flow = flowLitersPerMinute(
        profile.farm.irrigationMethod,
        farmAreaM2(profile.farm),
        intakeFactor(profile.farm.terrain),
      );
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

  const saveNutrientReading = useCallback(
    async (farmId: string, reading: SoilNutrientReading): Promise<void> => {
      const profile = profiles.find((p) => p.farm.id === farmId);
      if (!profile) return;
      // Re-read rather than reusing the captured `profile.soil`: nothing else
      // awaits this call, and a slow tap sequence could otherwise overwrite a
      // `measured` profile that landed from the SoilGrids backfill in between.
      const current = await soilRepository.getById(profile.soil.id);
      if (!current) return;
      await soilRepository.save({ ...current, nutrientReading: reading });
      await refresh();
    },
    [profiles, refresh],
  );

  const saveFertilizerSelection = useCallback(
    async (farmId: string, selection: FertilizerSelection): Promise<void> => {
      const profile = profiles.find((p) => p.farm.id === farmId);
      if (!profile) return;
      // Same re-read discipline as saveNutrientReading above, for the same
      // reason: a stale write here would clobber a nutrientReading or measured
      // profile that arrived while the farmer was on the Fertilizer page.
      const current = await soilRepository.getById(profile.soil.id);
      if (!current) return;
      await soilRepository.save({ ...current, fertilizerSelection: selection });
      await refresh();
    },
    [profiles, refresh],
  );

  const saveSensorReading = useCallback(
    async (farmId: string, reading: SoilSensorReading): Promise<void> => {
      const profile = profiles.find((p) => p.farm.id === farmId);
      if (!profile) return;
      const current = await soilRepository.getById(profile.soil.id);
      if (!current) return;
      await soilRepository.save({ ...current, sensorReading: reading });
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

      // Root-zone water balance inputs (Decision Logic §4b). The persisted
      // depletion is the ledger's starting point; the water ledger supplies the
      // irrigation actually applied on the days being replayed. Either being
      // absent is normal — the engine seeds and falls back accordingly.
      const [depletionState, waterLedger] = await Promise.all([
        depletionStateRepository.getById(farmId),
        getLedgerByFarm(farmId),
      ]);

      const result = generateRecommendation({
        farm: profile.farm,
        crop: profile.crop,
        soil: profile.soil,
        weather,
        daily: weatherResult?.daily ?? null,
        depletionState: depletionState ?? null,
        waterLedger,
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

      // Water ledger and reminders are bookkeeping ATOP the advice, not part of
      // it. The recommendation and its history entry are already saved by this
      // point, so a failure here must not discard advice the farmer can act on
      // — it degrades the checklist and reminders, and nothing else. Each block
      // logs rather than swallowing, so a real fault is still diagnosable.
      try {
        // Keep today's advised figures current without disturbing anything the
        // farmer has already logged (deterministic id, so no double-counting
        // however often this runs).
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
      } catch (err) {
        console.error('[IrrigaSmart] water ledger update failed', err);
      }

      try {
        // Advance the depletion ledger (Decision Logic §4b.4). Only the carry
        // point is stored, never today's depletion: the farmer may still log
        // irrigation for today, so today has to stay replayable from the last
        // completed day. Written only when it moves the ledger forward, so a
        // stale weather cache cannot rewind a farm that is already further along.
        const wb = result.waterBalance;
        if (wb && (!depletionState || wb.carryValidAsOfDate >= depletionState.validAsOfDate)) {
          await depletionStateRepository.save({
            farmId,
            depletionMm: wb.carryDepletionMm,
            validAsOfDate: wb.carryValidAsOfDate,
            updatedAt: now,
          });
        }
      } catch (err) {
        console.error('[IrrigaSmart] depletion ledger update failed', err);
      }

      try {
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
      } catch (err) {
        console.error('[IrrigaSmart] reminder scheduling failed', err);
      }

      // Disease risk (roadmap Version 1.3 Feature 9) is computed from the same
      // cached daily series but is deliberately NOT part of the recommendation:
      // it is read-only, never persisted, and cannot alter the advice above
      // (docs/11 §12). Returns null when there is no daily series to assess.
      const diseaseRisk = assessDiseaseRisk(
        profile.crop.name,
        weatherResult?.daily ?? null,
        day,
        profile.farm.location.latitude,
      );

      return {
        recommendation: result.recommendation,
        fromCache: weatherResult?.fromCache ?? false,
        weatherMissing: weather === null,
        plan: result.plan,
        diseaseRisk,
        waterBalance: result.waterBalance,
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
    soilFetchStatus,
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
    saveNutrientReading,
    saveFertilizerSelection,
    saveSensorReading,
  };
}
