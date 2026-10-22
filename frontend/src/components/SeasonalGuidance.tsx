import type { Crop, Language, Season } from '../types';
import { getSeasonalGuidance } from '../services';
import { monthNameFor } from '../services/briefingFragments';
import { cropLabelKey, type TranslateFn, type TranslationKey } from '../i18n';
import { SpeakButton } from './SpeakButton';

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
  /** Pre-built spoken line (V2.3), from the shared fragment builders. */
  speech?: string | null;
  t: TranslateFn;
}

function seasonKey(season: Season): TranslationKey {
  return `season.${season}`;
}

function seasonGuideKey(season: Season): TranslationKey {
  return `season.guide.${season}`;
}

export function SeasonalGuidance({ crop, language, speech, t }: Props) {
  const guidance = getSeasonalGuidance(crop.name, new Date().toISOString());
  const cropLabel = t(cropLabelKey(crop.name));

  const sowing = `${monthNameFor(guidance.sowingMonths[0]!, language)}–${monthNameFor(
    guidance.sowingMonths[1]!,
    language,
  )}`;
  const harvest = `${monthNameFor(guidance.harvestMonths[0]!, language)}–${monthNameFor(
    guidance.harvestMonths[1]!,
    language,
  )}`;

  return (
    <section className="seasonal" aria-label={t('season.title')}>
      <div className="seasonal__head">
        <h3 className="seasonal__title">
          {t('season.title')} · {t(seasonKey(guidance.season))}
        </h3>
        {speech && (
          <SpeakButton
            text={speech}
            language={language}
            speakId="seasonal-card"
            label={t('assistant.readAloud')}
            t={t}
          />
        )}
      </div>
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
