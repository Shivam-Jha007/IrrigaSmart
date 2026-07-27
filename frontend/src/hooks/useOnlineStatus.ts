import { useEffect, useState } from 'react';

/**
 * Tracks browser online/offline status (docs/05_UI_UX_Spec.md Offline
 * Experience). Used to show the offline indicator and to explain when cached
 * weather is being used. Starts from navigator.onLine and updates on events.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
