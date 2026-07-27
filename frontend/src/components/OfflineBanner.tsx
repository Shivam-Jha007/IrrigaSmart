interface Props {
  /** Localized banner text, supplied by the caller (roadmap Feature 2). */
  message: string;
}

/**
 * OfflineBanner — clearly indicates offline status without blocking the user
 * (docs/05_UI_UX_Spec.md Offline Experience).
 */
export function OfflineBanner({ message }: Props) {
  return (
    <div className="offline-banner" role="status">
      {message}
    </div>
  );
}
