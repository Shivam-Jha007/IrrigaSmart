import { useMemo, useState } from 'react';
import './App.css';
import { useAppStore } from './app/useAppStore';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { BottomNav, type Tab } from './components/BottomNav';
import { OfflineBanner } from './components/OfflineBanner';
import { SpeakButton } from './components/SpeakButton';
import { Dashboard } from './pages/Dashboard';
import { FarmsPage } from './pages/FarmsPage';
import { FertilizerPage } from './pages/FertilizerPage';
import { SettingsPage } from './pages/SettingsPage';
import { Onboarding } from './pages/Onboarding';
import { buildAssistantContext, type AssistantEngineInputs } from './services';

/**
 * Application shell (docs/05_UI_UX_Spec.md Navigation).
 *
 * State-based navigation between the four tabs — no router is needed for the
 * MVP's flat structure. All data flows through the single app store, which owns
 * storage + weather + decision-engine integration (Phase 6). All screens render
 * in the language chosen in Settings (docs/12_Product_Roadmap_v2.md Feature 2).
 * The welcome/learning flow (Feature 6.5) gates the app on first run and can
 * be re-opened from Settings.
 *
 * The chat assistant (V2.2) was removed in V2.3: its answers could drift from
 * the dashboard, and the audio briefing + per-card speakers now deliver the
 * same information deterministically. The shell still builds the assistant
 * context — it feeds the briefing card, which replaced the chat as the voice
 * surface.
 */
function App() {
  const store = useAppStore();
  const online = useOnlineStatus();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  // The Dashboard reports the engine inputs it produces; the shell turns them
  // into the briefing context that the TodayBriefingCard renders and speaks.
  const [assistantInputs, setAssistantInputs] = useState<AssistantEngineInputs | null>(null);
  const { t } = store;
  const isRtl = store.settings.preferredLanguage === 'ur';

  // The chat panel's farm context (V2.2), computed HERE from the reported
  // engine inputs plus the LIVE store profiles: a fertilizer selection saved
  // on the Fertilizer tab refreshes store.profiles, this memo recomputes, and
  // the bot quotes the new selection immediately — no return to Today needed.
  // Before the Dashboard has reported anything (or with no farms), the panel
  // answers generally.
  const assistantContext = useMemo(() => {
    if (!assistantInputs || store.profiles.length === 0) return undefined;
    const profile = assistantInputs.farmId
      ? store.profiles.find((p) => p.farm.id === assistantInputs.farmId)
      : undefined;
    return buildAssistantContext({
      profile,
      view: assistantInputs.view,
      weather: assistantInputs.weather,
      today: assistantInputs.today,
      waterProgress: assistantInputs.waterProgress,
      ...(assistantInputs.photoCheck !== undefined
        ? { photoCheck: assistantInputs.photoCheck }
        : {}),
      language: store.settings.preferredLanguage,
      t,
    });
  }, [assistantInputs, store.profiles, store.settings.preferredLanguage, t]);

  if (store.loading) {
    return (
      <div className="app-loading" dir={isRtl ? 'rtl' : 'ltr'}>
        <h1 className="app-loading__brand">IrrigaSmart</h1>
        <p>{t('app.loading')}</p>
      </div>
    );
  }

  if (store.initError) {
    return (
      <div className="app-loading" dir={isRtl ? 'rtl' : 'ltr'}>
        <h1 className="app-loading__brand">IrrigaSmart</h1>
        <h2 className="app-loading__error-title">{t('app.initErrorTitle')}</h2>
        <p className="app-loading__error-body">{t('app.initErrorBody')}</p>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          {t('app.reload')}
        </button>
      </div>
    );
  }

  if (showOnboarding || !store.settings.onboardingCompleted) {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'}>
        <Onboarding store={store} onDone={() => setShowOnboarding(false)} />
      </div>
    );
  }

  return (
    <div className="app" dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="app-header">
        <img
          className="app-header__logo"
          src="/logo.png"
          alt=""
          aria-hidden="true"
          width={34}
          height={34}
        />
        <span className="app-header__brand">IrrigaSmart</span>
        {!online && <span className="app-header__offline-dot" aria-label="Offline" />}
        {/* The orientation speaker (V2.3): a first-time farmer's "what is this
            app?" answered out loud, in their language, before they can read
            anything. Same deterministic-text rule as every other voice
            surface — a fixed translated sentence, no generation. */}
        <SpeakButton
          text={t('app.intro')}
          language={store.settings.preferredLanguage}
          speakId="app-intro"
          label={t('app.introButton')}
          variantClass="app-header__speak"
          t={t}
        />
        <button
          type="button"
          className="app-header__help"
          aria-label={t('settings.about')}
          onClick={() => setShowOnboarding(true)}
        >
          ?
        </button>
      </header>

      {!online && <OfflineBanner message={t('app.offlineBanner')} />}

      <main className="app-main">
        {tab === 'dashboard' && (
          <Dashboard
            store={store}
            onGoToFarms={() => setTab('farms')}
            onAssistantInputs={setAssistantInputs}
            briefingContext={assistantContext}
          />
        )}
        {tab === 'farms' && <FarmsPage store={store} />}
        {tab === 'fertilizer' && <FertilizerPage store={store} />}
        {tab === 'settings' && <SettingsPage store={store} onShowOnboarding={() => setShowOnboarding(true)} />}
      </main>

      <BottomNav
        active={tab}
        onChange={setTab}
        labels={{
          dashboard: t('nav.today'),
          farms: t('nav.farms'),
          fertilizer: t('nav.fertilizer'),
          settings: t('nav.settings'),
        }}
      />
    </div>
  );
}

export default App;
