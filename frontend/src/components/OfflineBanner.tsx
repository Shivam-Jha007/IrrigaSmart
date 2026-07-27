/**
 * OfflineBanner — clearly indicates offline status without blocking the user
 * (docs/05_UI_UX_Spec.md Offline Experience).
 */
export function OfflineBanner() {
  return (
    <div className="offline-banner" role="status">
      You are offline. Showing saved data — recommendations use your last weather.
    </div>
  );
}
