import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppStore } from '../app/useAppStore';
import type { FarmSummary, RecommendationView, WaterProgress } from '../app/appTypes';
import type { AppNotification, DailyWeather, WeatherData } from '../types';
import type { AssistantContext } from '../services/assistantContext';
import { DbBlockedError, getCachedWeather } from '../storage';
import {
  localDayString,
  type AssistantEngineInputs,
  type VisionResult,
} from '../services';
import { RecommendationCard } from '../components/RecommendationCard';
import { WeatherSummary } from '../components/WeatherSummary';
import { FarmCard } from '../components/FarmCard';
import { PlanOutlook } from '../components/PlanOutlook';
import { RemindersCard } from '../components/RemindersCard';
import { SeasonalGuidance } from '../components/SeasonalGuidance';
import { DiseaseRiskCard } from '../components/DiseaseRiskCard';
import { DiseasePhotoCard } from '../components/DiseasePhotoCard';
import { SoilMoistureCard } from '../components/SoilMoistureCard';
import { PhSuitabilityCard } from '../components/PhSuitabilityCard';
import { ReminderPlanner } from '../components/ReminderPlanner';
import { WaterChecklist } from '../components/WaterChecklist';
import { TodayBriefingCard } from '../components/TodayBriefingCard';
import {
  daysOfWaterLeftSentence,
  diseaseSpeech,
  irrigationSpeech,
  moistureSpeech,
  phSpeech,
  seasonalSpeech,
  weatherSpeech,
} from '../services/briefingFragments';

/**
 * Dashboard — answers "what should I do today?" immediately
 * (docs/05_UI_UX_Spec.md Dashboard; primary user journey).
 *
 * Enhanced for multi-farm use (docs/12_Product_Roadmap_v2.md Feature 3): a
 * horizontally scrollable row of farm cards shows each farm's latest stored
 * recommendation and weather update, and tapping a card switches the active
 * farm. Cards read stored data only; a live recommendation is generated only
 * for the selected farm.
 */

interface Props {
  store: AppStore;
  onGoToFarms(): void;
  /**
   * Receives the engine outputs for the shell-level chat panel (V2.2). The
   * shell builds the assistant's context from these plus the live store, so
   * facts changed on other tabs reach the bot without a visit back here.
   */
  onAssistantInputs(inputs: AssistantEngineInputs): void;
  /**
   * The shell-built assistant context (V2.3) — the same object the chat
   * panel answers from. The briefing card renders its fragments, so the
   * spoken bulletin, the chat answers and the cards quote one source; the
   * Dashboard does not build a second context of its own.
   */
  briefingContext: AssistantContext | undefined;
}

export function Dashboard({ store, onGoToFarms, onAssistantInputs, briefingContext }: Props) {
  const {
    farmer,
    profiles,
    t,
    generateForFarm,
    loadFarmSummaries,
    loadPendingReminders,
    loadWaterProgress,
  } = store;
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [view, setView] = useState<RecommendationView | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  // The latest leaf-photo check, kept so the assistant can answer "what did
  // the photo show?" from the same result the card just displayed. Session
  // state, deliberately not persisted: a photo verdict is about a leaf in the
  // farmer's hand today, and a stored one would be quietly stale tomorrow.
  // Cleared when the selected farm changes — a photo of one farm's leaf must
  // not be quoted as another farm's.
  const [lastPhoto, setLastPhoto] = useState<{ result: VisionResult; checkedAt: string } | null>(
    null,
  );
  // Today's daily record, held beside the weather because the sunshine figure
  // lives only in the daily series — WeatherData carries the current snapshot.
  const [today, setToday] = useState<DailyWeather | null>(null);
  const [summaries, setSummaries] = useState<FarmSummary[]>([]);
  const [pendingReminders, setPendingReminders] = useState<AppNotification[]>([]);
  const [waterProgress, setWaterProgress] = useState<WaterProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a valid selection as farms load/change.
  useEffect(() => {
    if (profiles.length === 0) {
      setSelectedFarmId('');
      return;
    }
    const stillExists = profiles.some((p) => p.farm.id === selectedFarmId);
    if (!stillExists) {
      setSelectedFarmId(profiles[0]!.farm.id);
    }
  }, [profiles, selectedFarmId]);

  // NOTE: effects depend on the store's stable useCallback'd methods, never on
  // the `store` object itself — that object is re-created on every App render,
  // and depending on it re-fires the generate effect after any app-level state
  // update (e.g. reminder delivery), causing an infinite generate loop.
  const loadSummaries = useCallback(async () => {
    setSummaries(await loadFarmSummaries());
  }, [loadFarmSummaries]);

  const loadPending = useCallback(
    async (farmId: string) => {
      if (!farmId) return;
      setPendingReminders(await loadPendingReminders(farmId));
    },
    [loadPendingReminders],
  );

  const loadWater = useCallback(
    async (farmId: string) => {
      if (!farmId) return;
      setWaterProgress(await loadWaterProgress(farmId));
    },
    [loadWaterProgress],
  );

  const refresh = useCallback(
    async (farmId: string) => {
      if (!farmId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await generateForFarm(farmId);
        if (!result) {
          setError(t('dashboard.errorMissing'));
          setView(null);
          setWeather(null);
          setToday(null);
          return;
        }
        setView(result);
        // Surface the weather that backed the recommendation for the summary.
        // Today's daily record comes from the same cache entry so the sunshine
        // figure shown is the one the engine and the disease assessment used —
        // reading it from anywhere else could show a farmer a number that
        // disagrees with the advice above it.
        const cached = await getCachedWeather(farmId);
        setWeather(cached?.weather ?? null);
        const day = localDayString(new Date().toISOString());
        setToday(cached?.daily?.find((d) => d.date === day) ?? null);
      } catch (err) {
        // Never swallow the cause: without this the farmer sees a dead end and
        // nobody can tell whether the database, the engine or a repository
        // failed.
        console.error('[IrrigaSmart] recommendation generation failed', err);
        setError(
          err instanceof DbBlockedError ? t('dashboard.errorTabs') : t('dashboard.errorGeneric'),
        );
        return;
      } finally {
        setLoading(false);
      }

      // Secondary panels: the advice is already on screen, so a failure while
      // refreshing the cards, reminders or checklist must not replace it with a
      // generic error. Those panels simply keep their previous contents.
      try {
        await loadSummaries();
        await loadPending(farmId);
        // Read the ledger AFTER generating: today's target is written there.
        await loadWater(farmId);
      } catch (err) {
        console.error('[IrrigaSmart] dashboard panel refresh failed', err);
      }
    },
    [generateForFarm, t, loadSummaries, loadPending, loadWater],
  );

  // Auto-generate when the selected farm changes.
  useEffect(() => {
    if (selectedFarmId) {
      void refresh(selectedFarmId);
    }
    // The photo belongs to the farm it was taken on. Not conditional on the
    // id CHANGING (initial selection must clear the null state too, and an
    // effect keyed on selectedFarmId is the one place both cases meet).
    setLastPhoto(null);
  }, [selectedFarmId, refresh]);

  // Load card overviews whenever the farm list changes.
  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries, profiles]);

  const greeting = t('dashboard.greeting', { name: farmer?.name ?? 'Farmer' });
  const selectedProfile = profiles.find((p) => p.farm.id === selectedFarmId);

  // What the shell-level chat panel needs from this screen (V2.2): the
  // selected farm and the engine outputs, MEMOIZED so the report effect fires
  // only when one of them actually changed. The profile itself is deliberately
  // NOT sent — the shell reads it from the live store, so a fertilizer
  // selection saved on the Fertilizer tab is in the bot's context immediately.
  const assistantInputs = useMemo<AssistantEngineInputs>(
    () => ({
      farmId: selectedProfile?.farm.id ?? null,
      view,
      weather,
      today,
      waterProgress,
      photoCheck: lastPhoto,
    }),
    [selectedProfile, view, weather, today, waterProgress, lastPhoto],
  );

  useEffect(() => {
    onAssistantInputs(assistantInputs);
  }, [assistantInputs, onAssistantInputs]);

  if (profiles.length === 0) {
    return (
      <div className="page dashboard">
        <p className="dashboard__greeting">{greeting}</p>
        <div className="empty-state empty-state--cta">
          <p>{t('dashboard.addFirstFarm')}</p>
          <button type="button" className="btn btn--primary" onClick={onGoToFarms}>
            {t('dashboard.addFarm')}
          </button>
        </div>
        {/* The chat panel itself now lives at the app-shell level (V2.2), so
            the pre-onboarding questions it used to answer here are still
            answerable — the floating circle is present on this screen too. */}
      </div>
    );
  }

  return (
    <div className="page dashboard">
      <p className="dashboard__greeting">{greeting}</p>

      <RemindersCard
        reminders={store.todaysReminders}
        language={store.settings.preferredLanguage}
        t={t}
      />

      <div className="farm-cards" role="list">
        {profiles.map((profile) => (
          <FarmCard
            key={profile.farm.id}
            profile={profile}
            summary={summaries.find((s) => s.farmId === profile.farm.id)}
            active={profile.farm.id === selectedFarmId}
            onSelect={() => setSelectedFarmId(profile.farm.id)}
            t={t}
          />
        ))}
      </div>

      {loading && <p className="dashboard__loading">{t('dashboard.checking')}</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && (
        <div className="dashboard__grid">
          {/* Primary zone: the decision */}
          <div className="dashboard__primary">
            {/* First, above the recommendation itself (V2.3): the audio
                briefing is the "summarise" surface — what to do, how much,
                when, and what to watch, in one speakable paragraph built from
                the same context the cards below render. It renders nothing
                until the engine has produced figures worth hearing. */}
            <TodayBriefingCard
              context={briefingContext}
              language={store.settings.preferredLanguage}
              crop={selectedProfile?.crop}
              t={t}
            />
            {view && (
              <RecommendationCard
                recommendation={view.recommendation}
                speech={irrigationSpeech(briefingContext, t)}
                language={store.settings.preferredLanguage}
                t={t}
                note={
                  view.weatherMissing
                    ? t('dashboard.noteNoWeather')
                    : view.fromCache
                      ? t('dashboard.noteCached')
                      : undefined
                }
              />
            )}
            {waterProgress && (
              <WaterChecklist
                progress={waterProgress}
                savings={view?.recommendation.waterSavings}
                t={t}
                onLog={async (minutes) => {
                  setWaterProgress(await store.logIrrigation(selectedFarmId, minutes));
                }}
                onReset={async () => {
                  setWaterProgress(await store.resetTodayIrrigation(selectedFarmId));
                }}
              />
            )}
            {/* Seasonal guidance and soil pH suitability live here rather than
                in the aside column below. On desktop the aside is narrower
                (1fr vs 1.55fr) and was carrying most of the supporting cards,
                which left the two columns visibly unbalanced — a tall left
                column and a much taller right one. Moving these two across
                evens out both columns' length without changing what any card
                shows or how it gets its data; every prop below is identical
                to before. */}
            {selectedProfile && (
              <SeasonalGuidance
                crop={selectedProfile.crop}
                language={store.settings.preferredLanguage}
                speech={seasonalSpeech(
                  selectedProfile.crop.name,
                  store.settings.preferredLanguage,
                  t,
                )}
                t={t}
              />
            )}
            {selectedProfile && (
              <PhSuitabilityCard
                crop={selectedProfile.crop}
                soil={selectedProfile.soil}
                fetchStatus={store.soilFetchStatus[selectedProfile.soil.id] ?? null}
                speech={phSpeech(briefingContext, t)}
                language={store.settings.preferredLanguage}
                t={t}
              />
            )}
            {/* Reminders are useful on every outcome, not only when irrigating:
                a "monitor tomorrow" day is exactly when a farmer wants a nudge. */}
            <ReminderPlanner
              reminders={pendingReminders}
              t={t}
              onAdd={async (time) => {
                const result = await store.addCustomReminder(selectedFarmId, time);
                if (result !== 'error') await loadPending(selectedFarmId);
                return result;
              }}
              onRemove={async (id) => {
                await store.removeReminder(id);
                await loadPending(selectedFarmId);
              }}
            />
            <button
              type="button"
              className="btn btn--ghost btn--block"
              onClick={() => void refresh(selectedFarmId)}
            >
              {t('dashboard.refresh')}
            </button>
          </div>

          {/* Aside zone: supporting context */}
          <div className="dashboard__aside">
            {/* The improvement plan card was removed here (V2.3): the issues
                it listed were its most text-heavy surface, and the top issue
                now travels in the audio briefing's "also worth a look" line
                and the chat's topIssues context — one line spoken instead of
                a wall of text read. detectFarmIssues still runs in the
                assistant context, so the knowledge is not lost. */}
            {weather && selectedProfile && (
              <WeatherSummary
                weather={weather}
                today={today}
                latitude={selectedProfile.farm.location.latitude}
                fromCache={view?.fromCache ?? false}
                speech={weatherSpeech(briefingContext, t)}
                language={store.settings.preferredLanguage}
                t={t}
              />
            )}
            {view && (
              <SoilMoistureCard
                balance={view.waterBalance}
                speech={moistureSpeech(briefingContext, t)}
                daysNote={daysOfWaterLeftSentence(briefingContext, t)}
                language={store.settings.preferredLanguage}
                sensorReading={selectedProfile?.soil.sensorReading ?? null}
                onSensorReading={
                  selectedProfile
                    ? async (moisturePct) => {
                        // The reading anchors the engine's whole water model
                        // (V2.3); saving it and regenerating is what makes the
                        // gauge above move to the farmer's own observation.
                        await store.saveSensorReading(selectedProfile.farm.id, {
                          moisturePct,
                          recordedAt: new Date().toISOString(),
                        });
                        await refresh(selectedFarmId);
                      }
                    : undefined
                }
                t={t}
              />
            )}
            {view?.plan && (
              <PlanOutlook plan={view.plan} language={store.settings.preferredLanguage} t={t} />
            )}
            {/* The photo check and the weather-based watch sit together, photo
                first: the two answer different questions but the same worry —
                DiseasePhotoCard says what a leaf in front of you looks like,
                DiseaseRiskCard below says the weather favours something. A
                farmer who photographs a worrying leaf sees the risk level
                that explains it directly beneath. The photo card needs no
                weather series, so it renders whenever a farm is selected. */}
            {selectedProfile && (
              <DiseasePhotoCard
                crop={selectedProfile.crop.name}
                t={t}
                onResult={(result) =>
                  setLastPhoto(
                    result ? { result, checkedAt: new Date().toISOString() } : null,
                  )
                }
              />
            )}
            {selectedProfile && view && (
              <DiseaseRiskCard
                risk={view.diseaseRisk}
                crop={selectedProfile.crop}
                language={store.settings.preferredLanguage}
                speech={diseaseSpeech(briefingContext, t)}
                t={t}
              />
            )}
          </div>
        </div>
      )}
      {/* The chat assistant panel was removed with the chatbot (V2.3); the
          shell still collects the engine inputs that feed the briefing. */}
    </div>
  );
}
