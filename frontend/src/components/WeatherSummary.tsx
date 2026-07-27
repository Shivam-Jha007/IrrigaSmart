import type { WeatherData } from '../types';
import type { TranslateFn } from '../i18n';

/**
 * WeatherSummary — shows only irrigation-relevant weather
 * (docs/05_UI_UX_Spec.md: temperature, rainfall forecast, humidity). Other
 * meteorological fields are intentionally omitted to reduce cognitive load.
 */

interface Props {
  weather: WeatherData;
  fromCache: boolean;
  t: TranslateFn;
}

export function WeatherSummary({ weather, fromCache, t }: Props) {
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
      </div>
      {fromCache && <p className="weather__cache-note">{t('weather.cacheNote')}</p>}
    </section>
  );
}
