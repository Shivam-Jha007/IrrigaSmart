import { useCallback, useEffect, useState } from 'react';
import type { AppStore } from '../app/useAppStore';
import type { FarmSummary, RecommendationView } from '../app/appTypes';
import type { AppNotification, WeatherData } from '../types';
import { getCachedWeather } from '../storage';
import { RecommendationCard } from '../components/RecommendationCard';
import { WeatherSummary } from '../components/WeatherSummary';
import { FarmCard } from '../components/FarmCard';
import { PlanOutlook } from '../components/PlanOutlook';
import { RemindersCard } from '../components/RemindersCard';
import { SeasonalGuidance } from '../components/SeasonalGuidance';
import { ReminderPlanner } from '../components/ReminderPlanner';

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
  const { farmer, profiles, t, generateForFarm, loadFarmSummaries, loadPendingReminders } = store;
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [view, setView] = useState<RecommendationView | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [summaries, setSummaries] = useState<FarmSummary[]>([]);
  const [pendingReminders, setPendingReminders] = useState<AppNotification[]>([]);
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
          return;
        }
        setView(result);
        // Surface the weather that backed the recommendation for the summary.
        const cached = await getCachedWeather(farmId);
        setWeather(cached?.weather ?? null);
        // Reflect the fresh recommendation/weather on the farm cards.
        await loadSummaries();
        await loadPending(farmId);
      } catch {
        setError(t('dashboard.errorGeneric'));
      } finally {
        setLoading(false);
      }
    },
    [generateForFarm, t, loadSummaries, loadPending],
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
            {view?.recommendation.status === 'Irrigate Today' && (
              <ReminderPlanner
                reminders={pendingReminders}
                t={t}
                onAdd={async (time) => {
                  const result = await store.addCustomReminder(selectedFarmId, time);
                  if (result === 'ok') await loadPending(selectedFarmId);
                  return result;
                }}
                onRemove={async (id) => {
                  await store.removeReminder(id);
                  await loadPending(selectedFarmId);
                }}
              />
            )}
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
            {weather && (
              <WeatherSummary weather={weather} fromCache={view?.fromCache ?? false} t={t} />
            )}
            {view?.plan && (
              <PlanOutlook plan={view.plan} language={store.settings.preferredLanguage} t={t} />
            )}
            {selectedProfile && (
              <SeasonalGuidance crop={selectedProfile.crop} language={store.settings.preferredLanguage} t={t} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
