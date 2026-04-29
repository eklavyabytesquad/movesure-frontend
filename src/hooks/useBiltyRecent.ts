'use client';

/**
 * src/hooks/useBiltyRecent.ts
 *
 * Manages the recent-bilties list used by the search bar and the sidebar.
 *
 * Fixes implemented here:
 *  • Caches up to 100 server-side bilties in IndexedDB.
 *  • On offline / page-refresh, serves the cached list + any pending-sync
 *    (OFFLINE-xxx) bilties — so the list is never blank.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiFetch }          from '@/lib/api';
import {
  getPendingBilties,
  pendingToSummary,
} from '@/lib/offlineBiltyService';
import {
  cacheRecentBilties,
  loadCachedRecentBilties,
} from '@/lib/biltyCache';
import type { BiltySummary } from '@/components/dashboard/bilty/types';

const LIMIT = 40;

export function useBiltyRecent() {
  const [recent,        setRecent]        = useState<BiltySummary[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentPage,    setRecentPage]    = useState(0);
  const [hasMorePages,  setHasMorePages]  = useState(true);

  const loadRecent = useCallback(async (page = 0) => {
    setRecentLoading(true);
    try {
      // Offline-queued bilties always appear at the top on page 0
      const pendingItems: BiltySummary[] = page === 0
        ? (await getPendingBilties().catch(() => [])).map(pendingToSummary)
        : [];

      if (!navigator.onLine) {
        if (page === 0) {
          // Serve cached server bilties so the list survives offline refresh
          const cached = await loadCachedRecentBilties();
          setRecent([...pendingItems, ...cached]);
        }
        return;
      }

      const res = await apiFetch(`/v1/bilty?limit=${LIMIT}&offset=${page * LIMIT}`);
      if (!res.ok) return;

      const d     = await res.json();
      const list: BiltySummary[] = d.bilties ?? d ?? [];

      setRecent(prev => page === 0 ? [...pendingItems, ...list] : [...prev, ...list]);
      setHasMorePages((d.count ?? list.length) >= LIMIT);
      setRecentPage(page);

      // Keep offline cache fresh (first page only — no need to paginate cache)
      if (page === 0) cacheRecentBilties(list).catch(() => {});
    } finally {
      setRecentLoading(false);
    }
  }, []);

  // Populate immediately on mount
  useEffect(() => { loadRecent(0); }, [loadRecent]);

  return { recent, recentLoading, recentPage, hasMorePages, loadRecent };
}
