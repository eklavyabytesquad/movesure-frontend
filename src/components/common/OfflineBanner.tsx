'use client';

/**
 * src/components/common/OfflineBanner.tsx
 *
 * Shows a sticky banner when the device is offline.
 * Transitions to a "syncing…" state while pending bilties are being uploaded.
 * Disappears when online and nothing is pending.
 */

import { useEffect, useState } from 'react';

interface Props {
  pendingCount?: number;
  syncing?:      boolean;
}

export function OfflineBanner({ pendingCount = 0, syncing = false }: Props) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Avoid SSR mismatch — read onLine only after mount
    setOffline(!navigator.onLine);

    const goOnline  = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Nothing to show when online + nothing pending
  if (!offline && pendingCount === 0 && !syncing) return null;

  const isSyncing = !offline && (syncing || pendingCount > 0);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
        offline
          ? 'bg-amber-500 text-white'
          : 'bg-blue-600 text-white'
      }`}
    >
      {offline ? (
        <>
          {/* Offline icon */}
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M9 10a3 3 0 116 0M3 3l18 18" />
          </svg>
          <span>
            You are offline — new bilties are saved locally
            {pendingCount > 0 && (
              <span className="ml-1 font-bold">
                ({pendingCount} waiting to sync)
              </span>
            )}
          </span>
        </>
      ) : isSyncing ? (
        <>
          {/* Spinner */}
          <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span>
            Syncing {pendingCount} offline bilty{pendingCount !== 1 ? 'ies' : ''} to server…
          </span>
        </>
      ) : null}
    </div>
  );
}
