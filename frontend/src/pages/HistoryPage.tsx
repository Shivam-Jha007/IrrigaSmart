import { useEffect, useState } from 'react';
import type { AppStore } from '../app/useAppStore';
import type { HistoryRecord, Recommendation } from '../types';
import { statusLabelKey } from '../i18n';
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
  const { profiles, t, loadHistory } = store;
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
      // Depend on the stable loadHistory method, not the whole store object —
      // the store is re-created on every App render.
      const loaded = await loadHistory(selectedFarmId);
      if (!cancelled) {
        setEntries(loaded);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedFarmId, loadHistory]);

  if (profiles.length === 0) {
    return (
      <div className="page">
        <h2 className="page__title">{t('history.title')}</h2>
        <p className="empty-state">{t('history.noFarms')}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h2 className="page__title">{t('history.title')}</h2>

      <label className="field">
        <span className="field__label">{t('history.farmLabel')}</span>
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

      {loading && <p className="dashboard__loading">{t('history.loading')}</p>}

      {!loading && entries.length === 0 && <p className="empty-state">{t('history.empty')}</p>}

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
                    {t(statusLabelKey(recommendation.status))}
                  </span>
                )}
              </div>
              {recommendation ? (
                <>
                  {recommendation.status === 'Irrigate Today' && (
                    <p className="history-item__water">
                      {formatLiters(recommendation.estimatedWaterAmount.volumeLiters)} ·{' '}
                      {recommendation.estimatedWaterAmount.depthMm.toFixed(1)} mm
                      {recommendation.estimatedWaterAmount.durationMinutes
                        ? ` · ${t('rec.minutes', { n: recommendation.estimatedWaterAmount.durationMinutes })}`
                        : ''}
                      {recommendation.recommendedTime
                        ? ` · ${t('history.at')} ${recommendation.recommendedTime}`
                        : ''}
                    </p>
                  )}
                  <p className="history-item__explanation">{recommendation.explanation}</p>
                </>
              ) : (
                <p className="history-item__explanation">{t('history.unavailable')}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
