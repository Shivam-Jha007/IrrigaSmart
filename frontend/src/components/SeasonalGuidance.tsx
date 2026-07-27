import type { Crop, Language, Season } from '../types';
import { getSeasonalGuidance } from '../services';
import { cropLabelKey, localeFor, type TranslateFn, type TranslationKey } from '../i18n';

/**
 * SeasonalGuidance — regional agricultural knowledge on the dashboard
 * (docs/12_Product_Roadmap_v2.md Feature 8). Shows the current Indian cropping
 * season, whether the farm's crop is in its main season, its typical
 * sowing/harvest windows, and a seasonal irrigation guideline. The dataset is
 * bundled with the app, so this works fully offline.
 */

interface Props {
  crop: Crop;
  language: Language;
  t: TranslateFn;
}

function seasonKey(season: Season): TranslationKey {
  return `season.${season}`;
}

function seasonGuideKey(season: Season): TranslationKey {
  return `season.guide.${season}`;
}

/** Locale-aware short month name (e.g. "Jun" / "जून" / "জুন"). */
function monthName(month: number, locale: string): string {
  return new Date(2000, month - 1, 1).toLocaleDateString(locale, { month: 'short' });
}

export function SeasonalGuidance({ crop, language, t }: Props) {
  const guidance = getSeasonalGuidance(crop.name, new Date().toISOString());
  const locale = localeFor(language);
  const cropLabel = t(cropLabelKey(crop.name));

  const sowing = `${monthName(guidance.sowingMonths[0], locale)}–${monthName(guidance.sowingMonths[1], locale)}`;
  const harvest = `${monthName(guidance.harvestMonths[0], locale)}–${monthName(guidance.harvestMonths[1], locale)}`;

  return (
    <section className="seasonal" aria-label={t('season.title')}>
      <h3 className="seasonal__title">
        {t('season.title')} · {t(seasonKey(guidance.season))}
      </h3>
      <p className="seasonal__line">
        {guidance.inMainSeason
          ? t('season.inSeason', { crop: cropLabel })
          : t('season.offSeason', {
              crop: cropLabel,
              season: t(seasonKey(guidance.cropMainSeason)),
            })}
      </p>
      <p className="seasonal__meta">{t('season.calendar', { sow: sowing, harvest })}</p>
      <p className="seasonal__guide">{t(seasonGuideKey(guidance.season))}</p>
    </section>
  );
}
