/**
 * src/lib/offlineDb.ts
 *
 * Lazy-initialized IndexedDB instance (idb wrapper).
 * Never call from server-side code — all entry points are guarded by
 * typeof window checks or only called from 'use client' components.
 *
 * Stores:
 *   pending_bilties  — bilties created while offline, waiting to sync
 *   master_cache     — consignors, consignees, cities, transports etc.
 */

import type { IDBPDatabase } from 'idb';

// ── Pending bilty shape (mirrors the POST /v1/bilty body) ─────────────────────
export interface PendingBilty {
  local_id?: number;                        // auto-assigned by IDB (keyPath)
  bilty_type:    string;
  bilty_date:    string;
  consignor_name: string;
  consignee_name: string;
  payment_mode:  string;
  delivery_type: string;
  saving_option: string;
  status:        string;
  consignor_id?:      string;
  consignor_gstin?:   string;
  consignor_mobile?:  string;
  consignee_id?:      string;
  consignee_gstin?:   string;
  consignee_mobile?:  string;
  transport_id?:      string;
  transport_name?:    string;
  transport_gstin?:   string;
  transport_mobile?:  string;
  from_city_id?:      string;
  to_city_id?:        string;
  contain?:           string;
  invoice_no?:        string;
  invoice_value?:     number;
  invoice_date?:      string;
  document_number?:   string;
  pvt_marks?:         string;
  e_way_bills?:       { ewb_no: string }[];
  no_of_pkg?:         number;
  weight?:            number;
  actual_weight?:     number;
  rate?:              number;
  freight_amount?:    number;
  labour_charge?:     number;
  bill_charge?:       number;
  toll_charge?:       number;
  dd_charge?:         number;
  pf_charge?:         number;
  local_charge?:      number;
  other_charge?:      number;
  total_amount?:      number;
  discount_id?:       string;
  remark?:            string;
  // Offline metadata
  gr_no_provisional:  string;              // e.g. OFFLINE-1746000000000
  synced:             boolean;
  created_locally_at: string;             // ISO datetime
  sync_error?:        string;
}

// ── Master cache shape ────────────────────────────────────────────────────────
export interface MasterCacheEntry {
  key:       string;
  data:      unknown;
  cached_at: string;                       // ISO datetime
}

// ── Singleton DB connection ──────────────────────────────────────────────────
let _db: IDBPDatabase | null = null;

export async function getDb(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser');
  }
  if (_db) return _db;

  const { openDB } = await import('idb');
  _db = await openDB('movesure', 1, {
    upgrade(db) {
      // Bilties queued offline, waiting to sync
      db.createObjectStore('pending_bilties', {
        keyPath:       'local_id',
        autoIncrement: true,
      });
      // Master data cache
      db.createObjectStore('master_cache', { keyPath: 'key' });
    },
  });
  return _db;
}
