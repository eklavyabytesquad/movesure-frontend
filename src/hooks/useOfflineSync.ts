'use client';

/**
 * src/hooks/useOfflineSync.ts
 *
 * Syncs pending (offline-created) bilties back to the server whenever the
 * device goes online.  Also exposes `pendingCount` for the UI badge.
 *
 * Usage in BiltyPage:
 *   const { pendingCount, syncing, syncNow, refreshPendingCount } = useOfflineSync({
 *     onSynced: () => loadRecent(0),
 *   });
 */

import { useEffect, useCallback, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  getPendingBilties,
  markSynced,
  markSyncError,
} from '@/lib/offlineBiltyService';

interface Options {
  /** Called after at least one bilty was successfully synced. */
  onSynced?: () => void;
}

export function useOfflineSync({ onSynced }: Options = {}) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing,      setSyncing]      = useState(false);

  // ── Refresh badge count ───────────────────────────────────────────────────
  const refreshPendingCount = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      const pending = await getPendingBilties();
      setPendingCount(pending.length);
    } catch { /* ignore */ }
  }, []);

  // ── Sync logic ────────────────────────────────────────────────────────────
  const syncNow = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!navigator.onLine) return;

    const pending = await getPendingBilties();
    if (pending.length === 0) return;

    setSyncing(true);
    let syncedAny = false;

    try {
      for (const bilty of pending) {
        try {
          // Strip IndexedDB/offline-only fields before sending
          const {
            local_id,
            synced,
            created_locally_at,
            sync_error,
            gr_no_provisional,
            ...serverBody
          } = bilty;

          void local_id; void synced; void created_locally_at; void sync_error;

          // Include provisional GR as a backend audit field
          const res = await apiFetch('/v1/bilty', {
            method: 'POST',
            body:   JSON.stringify({ ...serverBody, gr_no_provisional }),
          });

          if (res.ok) {
            await markSynced(bilty.local_id!);
            syncedAny = true;
          } else {
            const d = await res.json().catch(() => ({})) as { detail?: string };
            await markSyncError(bilty.local_id!, d.detail ?? 'Sync failed');
          }
        } catch (err) {
          await markSyncError(bilty.local_id!, String(err));
        }
      }
    } finally {
      setSyncing(false);
      await refreshPendingCount();
      if (syncedAny) onSynced?.();
    }
  }, [refreshPendingCount, onSynced]);

  // ── Wire up events ────────────────────────────────────────────────────────
  useEffect(() => {
    // Populate badge on mount
    refreshPendingCount();

    // Auto-sync when device reconnects
    const handleOnline = () => { syncNow(); };
    window.addEventListener('online', handleOnline);

    // Register Background Sync tag where supported (Chrome / Android)
    // This allows sync to fire even if the tab is in the background.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        if ('sync' in reg) {
          getPendingBilties().then(pending => {
            if (pending.length > 0) {
              (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } })
                .sync.register('sync-bilties').catch(() => { /* best-effort */ });
            }
          });
        }
      }).catch(() => { /* SW not ready yet */ });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncNow, refreshPendingCount]);

  return { pendingCount, syncing, syncNow, refreshPendingCount };
}
