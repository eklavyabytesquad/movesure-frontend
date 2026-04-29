/**
 * src/lib/masterDataCache.ts
 *
 * Stale-while-revalidate cache for master/reference data (consignors,
 * consignees, cities, transports, primary book, templates).
 *
 * Pattern used in BiltyPage:
 *   1. If online  → fetch from API, update cache, apply to state
 *   2. If offline → load from cache, apply to state (may be null / stale)
 */

import type { MasterCacheEntry } from './offlineDb';

const CACHE_KEYS = {
  CONSIGNORS:   'consignors',
  CONSIGNEES:   'consignees',
  CITIES:       'cities',
  TRANSPORTS:   'transports',
  CITY_TRANSPORTS: 'city_transports',
  PRIMARY_BOOK: 'primary_book',
  PRIMARY_TPL:  'primary_tpl',
  DISCOUNTS:    'discounts',
} as const;

export type MasterCacheKey = typeof CACHE_KEYS[keyof typeof CACHE_KEYS];
export { CACHE_KEYS };

/** Persist any value under a string key. Failures are silently swallowed. */
export async function saveMasterCache(key: string, data: unknown): Promise<void> {
  try {
    const { getDb } = await import('./offlineDb');
    const db = await getDb();
    const entry: MasterCacheEntry = {
      key,
      data,
      cached_at: new Date().toISOString(),
    };
    await db.put('master_cache', entry);
  } catch {
    // Non-fatal — cache writes should never break the happy path
  }
}

/** Load a cached value. Returns null if not found or on any error. */
export async function loadMasterCache<T>(key: string): Promise<T | null> {
  try {
    const { getDb } = await import('./offlineDb');
    const db = await getDb();
    const entry = await db.get('master_cache', key) as MasterCacheEntry | undefined;
    return entry ? (entry.data as T) : null;
  } catch {
    return null;
  }
}
