/**
 * src/lib/biltyCache.ts
 *
 * Thin helpers for caching the recent bilty list and individual bilty details
 * in IndexedDB (via the existing master_cache store) so they're available
 * when the user is offline or refreshes the page.
 */

import { saveMasterCache, loadMasterCache } from './masterDataCache';
import type { BiltySummary } from '@/components/dashboard/bilty/types';
import type { BiltyData }    from '@/components/dashboard/bilty/templates/first-a4-template';

const RECENT_KEY   = 'recent_bilties_list';
const detailKey    = (id: string) => `bilty_detail:${id}`;

// ── Recent bilty list (last 100) ──────────────────────────────────────────────

export async function cacheRecentBilties(bilties: BiltySummary[]): Promise<void> {
  await saveMasterCache(RECENT_KEY, bilties.slice(0, 100));
}

export async function loadCachedRecentBilties(): Promise<BiltySummary[]> {
  return (await loadMasterCache<BiltySummary[]>(RECENT_KEY)) ?? [];
}

// ── Individual bilty detail (for offline print / edit) ────────────────────────

export async function cacheBiltyDetail(biltyId: string, data: BiltyData): Promise<void> {
  await saveMasterCache(detailKey(biltyId), data);
}

export async function loadCachedBiltyDetail(biltyId: string): Promise<BiltyData | null> {
  return loadMasterCache<BiltyData>(detailKey(biltyId));
}
