/**
 * src/lib/offlineBiltyService.ts
 *
 * Queues bilties to IndexedDB when offline and syncs them back to the
 * server once connectivity is restored.
 */

import type { PendingBilty } from './offlineDb';
import type { BiltySummary } from '@/components/dashboard/bilty/types';

// ── Queue ─────────────────────────────────────────────────────────────────────

/**
 * Persist a bilty form body to IndexedDB.
 * Returns the auto-assigned local_id so the caller can show the provisional GR.
 */
export async function queueOfflineBilty(
  body:       Record<string, unknown>,
  ewbNumbers: string[],
): Promise<{ local_id: number; gr_no_provisional: string }> {
  const { getDb } = await import('./offlineDb');
  const db = await getDb();

  const gr_no_provisional = `OFFLINE-${Date.now()}`;
  const validEwbs = ewbNumbers.filter(n => n.trim()).map(ewb_no => ({ ewb_no }));

  const record: Omit<PendingBilty, 'local_id'> = {
    bilty_type:    (body.bilty_type as string) ?? 'REGULAR',
    bilty_date:    (body.bilty_date as string) ?? new Date().toISOString().split('T')[0],
    consignor_name: (body.consignor_name as string) ?? '',
    consignee_name: (body.consignee_name as string) ?? '',
    payment_mode:  (body.payment_mode as string)  ?? 'PAID',
    delivery_type: (body.delivery_type as string) ?? 'DOOR',
    saving_option: (body.saving_option as string) ?? 'SAVE',
    status:        'SAVED',
    // optional fields — spread only if present in body
    ...(body.consignor_id      ? { consignor_id:      body.consignor_id as string }      : {}),
    ...(body.consignor_gstin   ? { consignor_gstin:   body.consignor_gstin as string }   : {}),
    ...(body.consignor_mobile  ? { consignor_mobile:  body.consignor_mobile as string }  : {}),
    ...(body.consignee_id      ? { consignee_id:      body.consignee_id as string }      : {}),
    ...(body.consignee_gstin   ? { consignee_gstin:   body.consignee_gstin as string }   : {}),
    ...(body.consignee_mobile  ? { consignee_mobile:  body.consignee_mobile as string }  : {}),
    ...(body.transport_id      ? { transport_id:      body.transport_id as string }      : {}),
    ...(body.transport_name    ? { transport_name:    body.transport_name as string }    : {}),
    ...(body.transport_gstin   ? { transport_gstin:   body.transport_gstin as string }   : {}),
    ...(body.transport_mobile  ? { transport_mobile:  body.transport_mobile as string }  : {}),
    ...(body.from_city_id      ? { from_city_id:      body.from_city_id as string }      : {}),
    ...(body.to_city_id        ? { to_city_id:        body.to_city_id as string }        : {}),
    ...(body.contain           ? { contain:           body.contain as string }           : {}),
    ...(body.invoice_no        ? { invoice_no:        body.invoice_no as string }        : {}),
    ...(body.invoice_value     ? { invoice_value:     body.invoice_value as number }     : {}),
    ...(body.invoice_date      ? { invoice_date:      body.invoice_date as string }      : {}),
    ...(body.document_number   ? { document_number:   body.document_number as string }   : {}),
    ...(body.pvt_marks         ? { pvt_marks:         body.pvt_marks as string }         : {}),
    ...(validEwbs.length > 0   ? { e_way_bills:       validEwbs }                        : {}),
    ...(body.no_of_pkg         ? { no_of_pkg:         body.no_of_pkg as number }         : {}),
    ...(body.weight            ? { weight:            body.weight as number }            : {}),
    ...(body.actual_weight     ? { actual_weight:     body.actual_weight as number }     : {}),
    ...(body.rate              ? { rate:              body.rate as number }              : {}),
    ...(body.freight_amount    ? { freight_amount:    body.freight_amount as number }    : {}),
    ...(body.labour_charge     ? { labour_charge:     body.labour_charge as number }     : {}),
    ...(body.bill_charge       ? { bill_charge:       body.bill_charge as number }       : {}),
    ...(body.toll_charge       ? { toll_charge:       body.toll_charge as number }       : {}),
    ...(body.dd_charge         ? { dd_charge:         body.dd_charge as number }         : {}),
    ...(body.pf_charge         ? { pf_charge:         body.pf_charge as number }         : {}),
    ...(body.local_charge      ? { local_charge:      body.local_charge as number }      : {}),
    ...(body.other_charge      ? { other_charge:      body.other_charge as number }      : {}),
    ...(body.total_amount      ? { total_amount:      body.total_amount as number }      : {}),
    ...(body.discount_id       ? { discount_id:       body.discount_id as string }       : {}),
    ...(body.remark            ? { remark:            body.remark as string }            : {}),
    gr_no_provisional,
    synced:             false,
    created_locally_at: new Date().toISOString(),
  };

  const local_id = await db.add('pending_bilties', record as PendingBilty) as number;
  return { local_id, gr_no_provisional };
}

// ── Query ─────────────────────────────────────────────────────────────────────

/** All bilties that have not yet been synced to the server. */
export async function getPendingBilties(): Promise<PendingBilty[]> {
  try {
    const { getDb } = await import('./offlineDb');
    const db = await getDb();
    const all = await db.getAll('pending_bilties') as PendingBilty[];
    return all.filter(b => !b.synced);
  } catch {
    return [];
  }
}

/** Count of pending-sync bilties (cheap UI badge). */
export async function getPendingCount(): Promise<number> {
  const pending = await getPendingBilties();
  return pending.length;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function markSynced(localId: number): Promise<void> {
  try {
    const { getDb } = await import('./offlineDb');
    const db = await getDb();
    const record = await db.get('pending_bilties', localId) as PendingBilty | undefined;
    if (record) await db.put('pending_bilties', { ...record, synced: true });
  } catch { /* best-effort */ }
}

export async function markSyncError(localId: number, error: string): Promise<void> {
  try {
    const { getDb } = await import('./offlineDb');
    const db = await getDb();
    const record = await db.get('pending_bilties', localId) as PendingBilty | undefined;
    if (record) await db.put('pending_bilties', { ...record, sync_error: error });
  } catch { /* best-effort */ }
}

// ── Display helpers ───────────────────────────────────────────────────────────

/** Convert a PendingBilty into a BiltySummary-compatible shape for the recent list. */
export function pendingToSummary(b: PendingBilty): BiltySummary & { isOffline: true } {
  return {
    bilty_id:       `offline:${b.local_id ?? 0}`,
    gr_no:          b.gr_no_provisional,
    bilty_date:     b.bilty_date,
    bilty_type:     b.bilty_type,
    consignor_name: b.consignor_name,
    consignee_name: b.consignee_name,
    payment_mode:   b.payment_mode,
    total_amount:   b.total_amount ?? 0,
    status:         'PENDING_SYNC',
    no_of_pkg:      b.no_of_pkg ?? 0,
    weight:         b.weight ?? 0,
    isOffline:      true,
  };
}
