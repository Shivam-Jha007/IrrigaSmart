import { useEffect, useState } from 'react';
import type { AppStore } from '../app/useAppStore';
import type { HistoryRecord, Recommendation } from '../types';
import { formatDateTime, formatLiters, statusColor } from '../components/format';

/**
 * History page — review previous recommendations
 * (docs/05_UI_UX_Spec.md History Screen): date, recommendation, water, explanation.
 */

interface Props {
  store: AppStore;
}

interface Entry {
  record: HistoryRecord;
  recommendation: Recommendation | undefined;
}

export function HistoryPage({ store }: Props) {
  const { profiles } = store;
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profiles.length === 0) {
      setSelectedFarmId('');
      return;
    }
    const stillExists = profiles.some((p) => p.farm.id === selectedFarmId);
    if (!stillExists) setSelectedFarmId(profiles[0]!.farm.id);
  }, [profiles, selectedFarmId]);

  useEffect(() => {
    if (!selectedFarmId) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const loaded = await store.loadHistory(selectedFarmId);
      if (!cancelled) {
        setEntries(loaded);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedFarmId, store]);

  if (profiles.length === 0) {
    return (
      <div className="page">
        <h2 className="page__title">History</h2>
        <p className="empty-state">No farms yet. Add a farm to start building history.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h2 className="page__title">History</h2>

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

      {loading && <p className="dashboard__loading">Loading history…</p>}

      {!loading && entries.length === 0 && (
        <p className="empty-state">
          No recommendations yet for this farm. Open the Today tab to generate one.
        </p>
      )}

      {!loading && entries.length > 0 && (
        <ul className="history-list">
          {entries.map(({ record, recommendation }) => (
            <li key={record.id} className="history-item">
              <div className="history-item__head">
                <span className="history-item__date">{formatDateTime(record.generatedDate)}</span>
                {recommendation && (
                  <span
                    className="history-item__status"
                    style={{ color: statusColor(recommendation.status) }}
                  >
                    {recommendation.status}
                  </span>
                )}
              </div>
              {recommendation ? (
                <>
                  {recommendation.status === 'Irrigate Today' && (
                    <p className="history-item__water">
                      {formatLiters(recommendation.estimatedWaterAmount.volumeLiters)} ·{' '}
                      {recommendation.estimatedWaterAmount.depthMm.toFixed(1)} mm
                      {recommendation.recommendedTime ? ` · at ${recommendation.recommendedTime}` : ''}
                    </p>
                  )}
                  <p className="history-item__explanation">{recommendation.explanation}</p>
                </>
              ) : (
                <p className="history-item__explanation">Recommendation details unavailable.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
