import type { FarmProfile, FarmSummary } from '../app/appTypes';
import {
  confidenceBadgeKey,
  cropLabelKey,
  soilLabelKey,
  stageLabelKey,
  statusLabelKey,
  type TranslateFn,
} from '../i18n';
import { formatTime, statusColor } from './format';

/**
 * FarmCard — one farm's at-a-glance status on the enhanced dashboard
 * (docs/12_Product_Roadmap_v2.md Feature 3). Purely presentational: shows the
 * farm's identity plus its latest *stored* recommendation and weather-cache
 * time. Tapping a card switches the active farm (quick farm switching).
 */

interface Props {
  profile: FarmProfile;
  summary: FarmSummary | undefined;
  active: boolean;
  onSelect(): void;
  t: TranslateFn;
}

/** True when the ISO timestamp falls on the same local calendar day as now. */
function isFromToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export function FarmCard({ profile, summary, active, onSelect, t }: Props) {
  const { farm, crop, soil } = profile;
  const todayRec =
    summary?.latestRecommendation && isFromToday(summary.latestRecommendation.generatedTime)
      ? summary.latestRecommendation
      : null;

  return (
    <button
      type="button"
      className={`farm-card${active ? ' farm-card--active' : ''}`}
      onClick={onSelect}
      aria-pressed={active}
    >
      <span className="farm-card__name">{farm.name}</span>
      <span className="farm-card__meta">
        {t(cropLabelKey(crop.name))} · {t(stageLabelKey(crop.growthStage))}
      </span>
      <span className="farm-card__meta">
        {t(soilLabelKey(soil.name))} {t('farms.soilSuffix')}
      </span>
      {todayRec ? (
        <span className="farm-card__status" style={{ color: statusColor(todayRec.status) }}>
          {t(statusLabelKey(todayRec.status))} · {t(confidenceBadgeKey(todayRec.confidence))}
        </span>
      ) : (
        <span className="farm-card__status farm-card__status--none">{t('farmcard.noRecToday')}</span>
      )}
      <span className="farm-card__weather">
        {summary?.weatherCachedAt
          ? t('farmcard.lastWeather', { time: formatTime(summary.weatherCachedAt) })
          : t('farmcard.noWeather')}
      </span>
    </button>
  );
}
