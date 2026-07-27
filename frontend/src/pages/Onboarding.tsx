import { useState } from 'react';
import type { AppStore } from '../app/useAppStore';
import type { TranslationKey } from '../i18n';

/**
 * Onboarding — welcome & learning experience (docs/12_Product_Roadmap_v2.md
 * Feature 6.5). Shown on first run and re-openable from Settings ("About
 * IrrigaSmart"). Introduces the platform's purpose, capabilities, and
 * limitations in simple, farmer-friendly language with icons instead of
 * technical diagrams. Completing (or re-closing) marks the flow as seen in
 * Settings.
 */

interface Props {
  store: AppStore;
  onDone(): void;
}

interface Step {
  icon: string;
  titleKey: TranslationKey;
  bodyKey?: TranslationKey;
  /** Numbered/icon list items (How it works, Getting started). */
  itemKeys?: TranslationKey[];
  itemIcons?: string[];
}

const HOW_ICONS = ['🌱', '🌦️', '⚙️', '💧', '💬'];
const START_ICONS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

const STEPS: Step[] = [
  { icon: '💧', titleKey: 'onb.welcome.title', bodyKey: 'onb.welcome.tagline' },
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

export function Onboarding({ store, onDone }: Props) {
  const { t } = store;
  const [index, setIndex] = useState(0);
  const step = STEPS[index]!;
  const isLast = index === STEPS.length - 1;

  async function finish() {
    await store.updateSettings({ ...store.settings, onboardingCompleted: true });
    onDone();
  }

  return (
    <div className="onboarding">
      <div className="onboarding__card">
        <span className="onboarding__icon" aria-hidden>
          {step.icon}
        </span>
        <h1 className="onboarding__brand">IrrigaSmart</h1>
        <h2 className="onboarding__title">{t(step.titleKey)}</h2>

        {step.bodyKey && <p className="onboarding__body">{t(step.bodyKey)}</p>}

        {step.itemKeys && (
          <ul className="onboarding__items">
            {step.itemKeys.map((key, i) => (
              <li key={key} className="onboarding__item">
                <span className="onboarding__item-icon" aria-hidden>
                  {step.itemIcons?.[i] ?? '•'}
                </span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="onboarding__dots" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s.titleKey} className={`onboarding__dot${i === index ? ' onboarding__dot--active' : ''}`} />
          ))}
        </div>

        <div className="onboarding__actions">
          {index > 0 && (
            <button type="button" className="btn btn--ghost" onClick={() => setIndex(index - 1)}>
              {t('onb.back')}
            </button>
          )}
          {isLast ? (
            <button type="button" className="btn btn--primary" onClick={() => void finish()}>
              {t('onb.welcome.start')}
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={() => setIndex(index + 1)}>
              {index === 0 ? t('onb.welcome.start') : t('onb.next')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
