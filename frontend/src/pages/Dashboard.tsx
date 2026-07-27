import { useCallback, useEffect, useState } from 'react';
import type { AppStore } from '../app/useAppStore';
import type { FarmSummary, RecommendationView } from '../app/appTypes';
import type { WeatherData } from '../types';
import { getCachedWeather } from '../storage';
import { RecommendationCard } from '../components/RecommendationCard';
import { WeatherSummary } from '../components/WeatherSummary';
import { FarmCard } from '../components/FarmCard';

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
  const { farmer, profiles, t } = store;
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [view, setView] = useState<RecommendationView | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [summaries, setSummaries] = useState<FarmSummary[]>([]);
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

  const loadSummaries = useCallback(async () => {
    setSummaries(await store.loadFarmSummaries());
  }, [store]);

  const refresh = useCallback(
    async (farmId: string) => {
      if (!farmId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await store.generateForFarm(farmId);
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
      } catch {
        setError(t('dashboard.errorGeneric'));
      } finally {
        setLoading(false);
      }
    },
    [store, t, loadSummaries],
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

  if (profiles.length === 0) {
    return (
      <div className="page">
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
    <div className="page">
      <p className="dashboard__greeting">{greeting}</p>

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

      {!loading && view && (
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

      {!loading && weather && (
        <WeatherSummary weather={weather} fromCache={view?.fromCache ?? false} t={t} />
      )}

      {!loading && (
        <button
          type="button"
          className="btn btn--ghost btn--block"
          onClick={() => void refresh(selectedFarmId)}
        >
          {t('dashboard.refresh')}
        </button>
      )}
    </div>
  );
}
