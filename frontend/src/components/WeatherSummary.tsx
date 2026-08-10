import type { DailyWeather, WeatherData } from '../types';
import type { TranslateFn } from '../i18n';
import { dryingPotential, type DryingPotential } from '../services';

/**
 * WeatherSummary — shows only irrigation-relevant weather
 * (docs/05_UI_UX_Spec.md: temperature, rainfall forecast, humidity). Other
 * meteorological fields are intentionally omitted to reduce cognitive load.
 *
 * Sunshine joined that list in V1.7 (item 2) because it is not decoration here:
 * the same figure decides how heavily a favourable day counts towards disease
 * risk and whether a sprinkler run is pushed off a dull evening. Showing it
 * lets the farmer check the app's reasoning against the sky.
 */

interface Props {
  weather: WeatherData;
  /** Today's daily record, when the series has one — the source of sunshine. */
  today: DailyWeather | null;
  /** Farm latitude, for daylight hours when the provider omits them. */
  latitude: number;
  fromCache: boolean;
  t: TranslateFn;
}

/** The plain-language line for a drying potential. */
const DRYING_KEY = {
  poor: 'weather.dryingPoor',
  moderate: 'weather.dryingModerate',
  good: 'weather.dryingGood',
} as const satisfies Record<DryingPotential, string>;

export function WeatherSummary({ weather, today, latitude, fromCache, t }: Props) {
  // Absent sunshine is shown as absent, never as zero: a pre-V1.7 cache would
  // otherwise render every day as sunless and contradict what the farmer sees.
  const sunshineHours = today?.sunshineHours;
  const drying = today ? dryingPotential(today, latitude) : null;

  return (
    <section className="weather" aria-label="Weather summary">
      <div className="weather__items">
        <div className="weather__item">
          <span className="weather__value">{Math.round(weather.temperature)}°C</span>
          <span className="weather__label">{t('weather.temperature')}</span>
        </div>
        <div className="weather__item">
          <span className="weather__value">{weather.rainfallForecast.toFixed(1)} mm</span>
          <span className="weather__label">{t('weather.rainToday')}</span>
        </div>
        <div className="weather__item">
          <span className="weather__value">{Math.round(weather.humidity)}%</span>
          <span className="weather__label">{t('weather.humidity')}</span>
        </div>
        {sunshineHours != null && (
          <div className="weather__item">
            <span className="weather__value">{sunshineHours.toFixed(1)} h</span>
            <span className="weather__label">{t('weather.sunshine')}</span>
          </div>
        )}
      </div>
      {drying && (
        <p className={`weather__drying weather__drying--${drying}`}>{t(DRYING_KEY[drying])}</p>
      )}
      {fromCache && <p className="weather__cache-note">{t('weather.cacheNote')}</p>}
    </section>
  );
}
