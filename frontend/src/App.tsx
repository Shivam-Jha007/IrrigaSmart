import { useState } from 'react';
import './App.css';
import { useAppStore } from './app/useAppStore';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { BottomNav, type Tab } from './components/BottomNav';
import { OfflineBanner } from './components/OfflineBanner';
import { Dashboard } from './pages/Dashboard';
import { FarmsPage } from './pages/FarmsPage';
import { HistoryPage } from './pages/HistoryPage';
import { FertilizerPage } from './pages/FertilizerPage';
import { SettingsPage } from './pages/SettingsPage';
import { Onboarding } from './pages/Onboarding';

/**
 * Application shell (docs/05_UI_UX_Spec.md Navigation).
 *
 * State-based navigation between the four tabs — no router is needed for the
 * MVP's flat structure. All data flows through the single app store, which owns
 * storage + weather + decision-engine integration (Phase 6). All screens render
 * in the language chosen in Settings (docs/12_Product_Roadmap_v2.md Feature 2).
 * The welcome/learning flow (Feature 6.5) gates the app on first run and can
 * be re-opened from Settings.
 */
function App() {
  const store = useAppStore();
  const online = useOnlineStatus();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { t } = store;
  const isRtl = store.settings.preferredLanguage === 'ur';

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
        {tab === 'dashboard' && <Dashboard store={store} onGoToFarms={() => setTab('farms')} />}
        {tab === 'farms' && <FarmsPage store={store} />}
        {tab === 'history' && <HistoryPage store={store} />}
        {tab === 'fertilizer' && <FertilizerPage store={store} />}
        {tab === 'settings' && <SettingsPage store={store} onShowOnboarding={() => setShowOnboarding(true)} />}
      </main>

      <BottomNav
        active={tab}
        onChange={setTab}
        labels={{
          dashboard: t('nav.today'),
          farms: t('nav.farms'),
          history: t('nav.history'),
          fertilizer: t('nav.fertilizer'),
          settings: t('nav.settings'),
        }}
      />
    </div>
  );
}

export default App;
