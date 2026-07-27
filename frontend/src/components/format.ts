import type { RecommendationStatus } from '../types';

/** Display helpers shared across the UI (docs/05_UI_UX_Spec.md). */

/** CSS custom-property color token for a recommendation status. */
export function statusColor(status: RecommendationStatus): string {
  switch (status) {
    case 'Irrigate Today':
      return 'var(--color-irrigate)';
    case 'Delay Irrigation':
      return 'var(--color-delay)';
    case 'Monitor Tomorrow':
      return 'var(--color-monitor)';
  }
}

/** Short imperative label for a status (used in compact contexts). */
export function statusLabel(status: RecommendationStatus): string {
  return status;
}

/** Format a volume in litres with thousands separators. */
export function formatLiters(liters: number): string {
  return `${Math.round(liters).toLocaleString('en-US')} L`;
}

/** Format a depth in millimetres to one decimal. */
export function formatMm(mm: number): string {
  return `${mm.toFixed(1)} mm`;
}

/** Format an ISO timestamp as a readable local date. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Format an ISO timestamp as a readable local date + time. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
