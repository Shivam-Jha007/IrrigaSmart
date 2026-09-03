/** Application tabs (docs/05_UI_UX_Spec.md Navigation; History removed V2.2). */
export type Tab = 'dashboard' | 'farms' | 'fertilizer' | 'settings';

interface Props {
  active: Tab;
  onChange(tab: Tab): void;
  /** Localized labels per tab, supplied by the caller (roadmap Feature 2). */
  labels: Record<Tab, string>;
}

const TABS: Array<{ id: Tab; icon: string }> = [
  { id: 'dashboard', icon: '💧' },
  { id: 'farms', icon: '🌱' },
  { id: 'fertilizer', icon: '🧪' },
  { id: 'settings', icon: '⚙️' },
];

/**
 * BottomNav — always-visible bottom navigation (docs/05_UI_UX_Spec.md).
 * Large touch targets for accessibility.
 */
export function BottomNav({ active, onChange, labels }: Props) {
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
          <span className="bottom-nav__label">{labels[tab.id]}</span>
        </button>
      ))}
    </nav>
  );
}
