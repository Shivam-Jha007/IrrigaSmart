import { useState } from 'react';
import './App.css';
import { useAppStore } from './app/useAppStore';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { BottomNav, type Tab } from './components/BottomNav';
import { OfflineBanner } from './components/OfflineBanner';
import { Dashboard } from './pages/Dashboard';
import { FarmsPage } from './pages/FarmsPage';
import { HistoryPage } from './pages/HistoryPage';
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

  if (store.loading) {
    return (
      <div className="app-loading">
        <h1 className="app-loading__brand">IrrigaSmart</h1>
        <p>{t('app.loading')}</p>
      </div>
    );
  }

  if (store.initError) {
    return (
      <div className="app-loading">
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
    return <Onboarding store={store} onDone={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-header__logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Water drop cradling a leaf — the brand mark. */}
            <path
              d="M12 2.5c3.6 4.3 6 7.6 6 10.6a6 6 0 1 1-12 0c0-3 2.4-6.3 6-10.6Z"
              fill="#ffffff"
              fillOpacity="0.9"
            />
            <path
              d="M12 16.5c0-2.6 1.6-4.4 3.8-5-.2 2.7-1.7 4.5-3.8 5Zm0 0c0-2.2-1.3-3.8-3.2-4.4.1 2.4 1.4 3.9 3.2 4.4Z"
              fill="#16814c"
            />
          </svg>
        </span>
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
        {tab === 'settings' && <SettingsPage store={store} onShowOnboarding={() => setShowOnboarding(true)} />}
      </main>

      <BottomNav
        active={tab}
        onChange={setTab}
        labels={{
          dashboard: t('nav.today'),
          farms: t('nav.farms'),
          history: t('nav.history'),
          settings: t('nav.settings'),
        }}
      />
    </div>
  );
}

export default App;
