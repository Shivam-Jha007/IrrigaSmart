import { useState } from 'react';
import type { AppStore } from '../app/useAppStore';
import type { TranslationKey } from '../i18n';

/**
 * Onboarding — welcome & learning experience (docs/12_Product_Roadmap_v2.md
 * Feature 6.5). The first screen is a homepage-style hero: brand, tagline,
 * and the platform's key capabilities at a glance. The following screens
 * teach the workflow in simple, farmer-friendly language. Shown on first run
 * and re-openable anytime from the header help button or Settings
 * ("Help & about IrrigaSmart").
 */

interface Props {
  store: AppStore;
  onDone(): void;
}

interface ContentStep {
  icon: string;
  titleKey: TranslationKey;
  bodyKey?: TranslationKey;
  /** Numbered/icon list items (How it works, Getting started). */
  itemKeys?: TranslationKey[];
  itemIcons?: string[];
}

const HOW_ICONS = ['🌱', '🌦️', '⚙️', '💧', '💬'];
const START_ICONS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

const CONTENT_STEPS: ContentStep[] = [
  { icon: '🌱', titleKey: 'onb.about.title', bodyKey: 'onb.about.body' },
  {
    icon: '⚙️',
    titleKey: 'onb.how.title',
    itemKeys: ['onb.how.step1', 'onb.how.step2', 'onb.how.step3', 'onb.how.step4', 'onb.how.step5'],
    itemIcons: HOW_ICONS,
  },
  { icon: '🤝', titleKey: 'onb.trust.title', bodyKey: 'onb.trust.body' },
  { icon: '📴', titleKey: 'onb.offline.title', bodyKey: 'onb.offline.body' },
  { icon: '🔒', titleKey: 'onb.privacy.title', bodyKey: 'onb.privacy.body' },
  {
    icon: '✅',
    titleKey: 'onb.start.title',
    itemKeys: ['onb.start.step1', 'onb.start.step2', 'onb.start.step3', 'onb.start.step4'],
    itemIcons: START_ICONS,
  },
];

const FEATURES: Array<{ icon: string; key: TranslationKey }> = [
  { icon: '🌦️', key: 'onb.feature.weather' },
  { icon: '📴', key: 'onb.feature.offline' },
  { icon: '💬', key: 'onb.feature.explain' },
  { icon: '🌐', key: 'onb.feature.language' },
];

/** Index of the "How it works" entry in CONTENT_STEPS, for the hero shortcut. */
const HOW_CONTENT_INDEX = 1;

export function Onboarding({ store, onDone }: Props) {
  const { t } = store;
  // step 0 = homepage hero; steps 1..N = content steps.
  const [step, setStep] = useState(0);
  const totalSteps = CONTENT_STEPS.length + 1;
  const isLast = step === totalSteps - 1;

  async function finish() {
    await store.updateSettings({ ...store.settings, onboardingCompleted: true });
    onDone();
  }

  const skipButton = (
    <button type="button" className="onboarding__skip" onClick={() => void finish()}>
      {t('onb.skip')}
    </button>
  );

  if (step === 0) {
    return (
      <div className="onboarding">
        <div className="onboarding__card onboarding__card--home">
          {skipButton}
          <span className="onboarding__logo" aria-hidden>
            💧
          </span>
          <h1 className="onboarding__brand onboarding__brand--home">IrrigaSmart</h1>
          <p className="onboarding__tagline">{t('onb.welcome.tagline')}</p>

          <div className="onboarding__features">
            {FEATURES.map((feature) => (
              <div key={feature.key} className="onboarding__feature">
                <span className="onboarding__feature-icon" aria-hidden>
                  {feature.icon}
                </span>
                <span className="onboarding__feature-label">{t(feature.key)}</span>
              </div>
            ))}
          </div>

          <div className="onboarding__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setStep(HOW_CONTENT_INDEX + 1)}>
              {t('onb.how.title')}
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setStep(1)}>
              {t('onb.welcome.start')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const content = CONTENT_STEPS[step - 1]!;

  return (
    <div className="onboarding">
      <div className="onboarding__card">
        {skipButton}
        <span className="onboarding__icon" aria-hidden>
          {content.icon}
        </span>
        <h2 className="onboarding__title">{t(content.titleKey)}</h2>

        {content.bodyKey && <p className="onboarding__body">{t(content.bodyKey)}</p>}

        {content.itemKeys && (
          <ul className="onboarding__items">
            {content.itemKeys.map((key, i) => (
              <li key={key} className="onboarding__item">
                <span className="onboarding__item-icon" aria-hidden>
                  {content.itemIcons?.[i] ?? '•'}
                </span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="onboarding__dots" aria-hidden>
          {Array.from({ length: totalSteps }, (_, i) => (
            <span key={i} className={`onboarding__dot${i === step ? ' onboarding__dot--active' : ''}`} />
          ))}
        </div>

        <div className="onboarding__actions">
          <button type="button" className="btn btn--ghost" onClick={() => setStep(step - 1)}>
            {t('onb.back')}
          </button>
          {isLast ? (
            <button type="button" className="btn btn--primary" onClick={() => void finish()}>
              {t('onb.welcome.start')}
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={() => setStep(step + 1)}>
              {t('onb.next')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
