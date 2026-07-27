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
 * storage + weather + decision-engine integration (Phase 6).
 */
function App() {
  const store = useAppStore();
  const online = useOnlineStatus();
  const [tab, setTab] = useState<Tab>('dashboard');

  if (store.loading) {
    return (
      <div className="app-loading">
        <h1 className="app-loading__brand">IrrigaSmart</h1>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-header__brand">IrrigaSmart</span>
        {!online && <span className="app-header__offline-dot" aria-label="Offline" />}
      </header>

      {!online && <OfflineBanner />}

      <main className="app-main">
        {tab === 'dashboard' && <Dashboard store={store} onGoToFarms={() => setTab('farms')} />}
        {tab === 'farms' && <FarmsPage store={store} />}
        {tab === 'history' && <HistoryPage store={store} />}
        {tab === 'settings' && <SettingsPage store={store} />}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}

export default App;
