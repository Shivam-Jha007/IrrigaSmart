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

/**
 * Application shell (docs/05_UI_UX_Spec.md Navigation).
 *
 * State-based navigation between the four tabs — no router is needed for the
 * MVP's flat structure. All data flows through the single app store, which owns
 * storage + weather + decision-engine integration (Phase 6). All screens render
 * in the language chosen in Settings (docs/12_Product_Roadmap_v2.md Feature 2).
 */
function App() {
  const store = useAppStore();
  const online = useOnlineStatus();
  const [tab, setTab] = useState<Tab>('dashboard');
  const { t } = store;

  if (store.loading) {
    return (
      <div className="app-loading">
        <h1 className="app-loading__brand">IrrigaSmart</h1>
        <p>{t('app.loading')}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-header__brand">IrrigaSmart</span>
        {!online && <span className="app-header__offline-dot" aria-label="Offline" />}
      </header>

      {!online && <OfflineBanner message={t('app.offlineBanner')} />}

      <main className="app-main">
        {tab === 'dashboard' && <Dashboard store={store} onGoToFarms={() => setTab('farms')} />}
        {tab === 'farms' && <FarmsPage store={store} />}
        {tab === 'history' && <HistoryPage store={store} />}
        {tab === 'settings' && <SettingsPage store={store} />}
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
