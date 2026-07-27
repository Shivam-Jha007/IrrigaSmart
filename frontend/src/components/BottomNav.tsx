/** Application tabs (docs/05_UI_UX_Spec.md Navigation). */
export type Tab = 'dashboard' | 'farms' | 'history' | 'settings';

interface Props {
  active: Tab;
  onChange(tab: Tab): void;
}

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Today', icon: '💧' },
  { id: 'farms', label: 'Farms', icon: '🌱' },
  { id: 'history', label: 'History', icon: '📋' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

/**
 * BottomNav — always-visible bottom navigation (docs/05_UI_UX_Spec.md).
 * Large touch targets for accessibility.
 */
export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav__tab${active === tab.id ? ' bottom-nav__tab--active' : ''}`}
          aria-current={active === tab.id ? 'page' : undefined}
          onClick={() => onChange(tab.id)}
        >
          <span className="bottom-nav__icon" aria-hidden>
            {tab.icon}
          </span>
          <span className="bottom-nav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
