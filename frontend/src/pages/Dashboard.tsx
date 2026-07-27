import { useCallback, useEffect, useState } from 'react';
import type { AppStore } from '../app/useAppStore';
import type { RecommendationView } from '../app/appTypes';
import type { WeatherData } from '../types';
import { getCachedWeather } from '../storage';
import { RecommendationCard } from '../components/RecommendationCard';
import { WeatherSummary } from '../components/WeatherSummary';

/**
 * Dashboard — answers "what should I do today?" immediately
 * (docs/05_UI_UX_Spec.md Dashboard; primary user journey).
 */

interface Props {
  store: AppStore;
  onGoToFarms(): void;
}

export function Dashboard({ store, onGoToFarms }: Props) {
  const { farmer, profiles } = store;
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [view, setView] = useState<RecommendationView | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
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

  const refresh = useCallback(
    async (farmId: string) => {
      if (!farmId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await store.generateForFarm(farmId);
        if (!result) {
          setError('This farm is missing some details. Please edit it and try again.');
          setView(null);
          setWeather(null);
          return;
        }
        setView(result);
        // Surface the weather that backed the recommendation for the summary.
        const cached = await getCachedWeather(farmId);
        setWeather(cached?.weather ?? null);
      } catch {
        setError('Something went wrong generating your recommendation.');
      } finally {
        setLoading(false);
      }
    },
    [store],
  );

  // Auto-generate when the selected farm changes.
  useEffect(() => {
    if (selectedFarmId) {
      void refresh(selectedFarmId);
    }
  }, [selectedFarmId, refresh]);

  const greeting = `Namaste, ${farmer?.name ?? 'Farmer'}`;

  if (profiles.length === 0) {
    return (
      <div className="page">
        <p className="dashboard__greeting">{greeting}</p>
        <div className="empty-state empty-state--cta">
          <p>Add your first farm to see today's irrigation recommendation.</p>
          <button type="button" className="btn btn--primary" onClick={onGoToFarms}>
            Add a farm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <p className="dashboard__greeting">{greeting}</p>

      <label className="field">
        <span className="field__label">Farm</span>
        <select
          className="field__input"
          value={selectedFarmId}
          onChange={(e) => setSelectedFarmId(e.target.value)}
        >
          {profiles.map(({ farm }) => (
            <option key={farm.id} value={farm.id}>
              {farm.name}
            </option>
          ))}
        </select>
      </label>

      {loading && <p className="dashboard__loading">Checking today's conditions…</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && view && (
        <RecommendationCard
          recommendation={view.recommendation}
          note={
            view.weatherMissing
              ? 'No weather data available yet. Connect to the internet once to enable weather-based advice.'
              : view.fromCache
                ? 'Unable to reach the weather service. Using your most recent saved weather.'
                : undefined
          }
        />
      )}

      {!loading && weather && <WeatherSummary weather={weather} fromCache={view?.fromCache ?? false} />}

      {!loading && (
        <button
          type="button"
          className="btn btn--ghost btn--block"
          onClick={() => void refresh(selectedFarmId)}
        >
          Refresh
        </button>
      )}
    </div>
  );
}
