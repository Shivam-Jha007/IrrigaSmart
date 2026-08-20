import { useCallback, useEffect, useState } from 'react';
import type { AppStore } from '../app/useAppStore';
import type { FarmSummary, RecommendationView, WaterProgress } from '../app/appTypes';
import type { AppNotification, DailyWeather, WeatherData } from '../types';
import { DbBlockedError, getCachedWeather } from '../storage';
import {
  buildAssistantContext,
  buildFarmContext,
  detectFarmIssues,
  localDayString,
  TOP_ISSUE_COUNT,
} from '../services';
import { FarmerAssistant } from '../components/FarmerAssistant';
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
import { ImprovementPlanCard } from '../components/ImprovementPlanCard';
import { ReminderPlanner } from '../components/ReminderPlanner';
import { WaterChecklist } from '../components/WaterChecklist';

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
}

export function Dashboard({ store, onGoToFarms }: Props) {
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
  }, [selectedFarmId, refresh]);

  // Load card overviews whenever the farm list changes.
  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries, profiles]);

  const greeting = t('dashboard.greeting', { name: farmer?.name ?? 'Farmer' });
  const selectedProfile = profiles.find((p) => p.farm.id === selectedFarmId);

  // The improvement plan (PRD §15). Derived, never stored: it is a reading of the
  // same context the assistant gets, so the card and the Copilot cannot disagree
  // about what this farm's problems are. Empty until a farm is selected, and
  // empty again for a farm whose detectors all lack the data they need.
  const farmIssues = detectFarmIssues(
    buildFarmContext({ profile: selectedProfile, view, weather, today, waterProgress }),
  );

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
        {/* Offered before the first farm exists too: "what can you do?" and
            "which spray should I use?" are both answerable with no farm data,
            and the second one especially should never wait for onboarding. */}
        <FarmerAssistant
          context={undefined}
          language={store.settings.preferredLanguage}
          t={t}
        />
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
            {view && (
              <RecommendationCard
                recommendation={view.recommendation}
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
            {/* Seasonal guidance, soil pH suitability and the weather-based
                disease watch live here rather than in the aside column below.
                On desktop the aside is narrower (1fr vs 1.55fr) and was
                carrying most of the supporting cards, which left the two
                columns visibly unbalanced — a tall left column and a much
                taller right one. Moving these three across evens out both
                columns' length without changing what any card shows or how
                it gets its data; every prop below is identical to before. */}
            {selectedProfile && (
              <SeasonalGuidance crop={selectedProfile.crop} language={store.settings.preferredLanguage} t={t} />
            )}
            {selectedProfile && (
              <PhSuitabilityCard
                crop={selectedProfile.crop}
                soil={selectedProfile.soil}
                fetchStatus={store.soilFetchStatus[selectedProfile.soil.id] ?? null}
                t={t}
              />
            )}
            {selectedProfile && view && (
              <DiseaseRiskCard
                risk={view.diseaseRisk}
                crop={selectedProfile.crop}
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
            {/* First: it answers "what should I fix about this farm", which is
                the question a farmer has left over once the recommendation
                above has answered "what should I do today". Only shown for a
                selected farm, because there is nothing to assess without one. */}
            {selectedProfile && (
              <ImprovementPlanCard issues={farmIssues} topCount={TOP_ISSUE_COUNT} t={t} />
            )}
            {weather && selectedProfile && (
              <WeatherSummary
                weather={weather}
                today={today}
                latitude={selectedProfile.farm.location.latitude}
                fromCache={view?.fromCache ?? false}
                t={t}
              />
            )}
            {view && <SoilMoistureCard balance={view.waterBalance} t={t} />}
            {view?.plan && (
              <PlanOutlook plan={view.plan} language={store.settings.preferredLanguage} t={t} />
            )}
            {/* Beside the weather-based watch (now in the left column), not
                instead of it: the two answer different questions. Disease
                watch says the weather favours something; this says what a
                leaf in front of you looks like. It needs no weather series, so
                it renders whenever a farm is selected — including for the
                seven crops the model was never trained on, which it says
                plainly rather than hiding. */}
            {selectedProfile && (
              <DiseasePhotoCard
                crop={selectedProfile.crop.name}
                language={store.settings.preferredLanguage}
                t={t}
              />
            )}
          </div>
        </div>
      )}

      {/* The assistant knows what this farm is doing: its context is the same
          engine output the cards above render. It floats because a farmer must
          be able to ask without losing their place in the decision. */}
      <FarmerAssistant
        context={buildAssistantContext({
          profile: selectedProfile,
          view,
          weather,
          today,
          waterProgress,
          language: store.settings.preferredLanguage,
          t,
        })}
        language={store.settings.preferredLanguage}
        t={t}
      />
    </div>
  );
}
