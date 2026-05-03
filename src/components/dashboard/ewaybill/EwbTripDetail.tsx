'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { EwbBilty, EwbRecord, EwbEntry } from './types';
import EwbValidateTab    from './tabs/EwbValidateTab';
import EwbConsolidateTab from './tabs/EwbConsolidateTab';
import EwbTransporterTab from './tabs/EwbTransporterTab';
import EwbExtendTab      from './tabs/EwbExtendTab';
import EwbGenerateTab    from './tabs/EwbGenerateTab';

// ── Types ────────────────────────────────────────────────────────────────────

interface BiltyRow {
  bilty_id: string;
  gr_no: string;
  bilty_date?: string;
  bilty_type?: string;
  consignor_name?: string;
  consignee_name?: string;
  payment_mode?: string;
  status?: string;
  total_amount?: number;
  e_way_bills?: EwbEntry[];
  ewb_no?: string;
  to_city_id?: string | null;
  from_city_id?: string | null;
  to_city_name?: string | null;
  from_city_name?: string | null;
}

interface ChallanRow {
  challan_id: string;
  challan_no?: string;
  challan_date?: string;
  status?: string;
}

interface TripDetail {
  trip_sheet_id: string;
  trip_sheet_no: string;
  status: string;
  trip_date?: string;
  transport_name?: string;
  vehicle_info?: { vehicle_no?: string; vehicle_type?: string; driver_name?: string };
  total_challan_count?: number;
  total_bilty_count?: number;
  challans: ChallanRow[];
}

interface EwbResult {
  eway_bill_number: string | number;
  ewb_status: string;
  valid_upto?: string;
  ewb_date?: string;
  vehicle_number?: string;
  transporter_name?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type Tab = 'challans' | 'validate' | 'consolidate' | 'transport' | 'extend' | 'generate';

const MAIN_TABS: { id: Tab; label: string; step: number }[] = [
  { id: 'challans',    step: 1, label: 'Challans'         },
  { id: 'validate',    step: 2, label: 'Validate'         },
  { id: 'consolidate', step: 3, label: 'Consolidate'      },
  { id: 'transport',   step: 4, label: 'Transport Update' },
];

const UTIL_TABS: { id: Tab; label: string; color: 'amber' | 'violet' }[] = [
  { id: 'extend',   label: 'Extend Validity', color: 'amber'  },
  { id: 'generate', label: 'Generate EWB',    color: 'violet' },
];

const STATUS_CLS: Record<string, string> = {
  DRAFT:      'bg-slate-100  text-slate-600  border-slate-200',
  OPEN:       'bg-blue-100   text-blue-700   border-blue-200',
  DISPATCHED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  ARRIVED:    'bg-green-100  text-green-700  border-green-200',
  CLOSED:     'bg-slate-100  text-slate-500  border-slate-200',
};

const EWB_STATUS_CLS: Record<string, string> = {
  ACTIVE:         'bg-green-50   border-green-300  text-green-800',
  EXPIRED:        'bg-red-50     border-red-300    text-red-700',
  CANCELLED:      'bg-red-50     border-red-300    text-red-700',
  EXTENDED:       'bg-blue-50    border-blue-300   text-blue-800',
  PART_DELIVERED: 'bg-amber-50   border-amber-300  text-amber-800',
  CONSOLIDATED:   'bg-purple-50  border-purple-300 text-purple-800',
};

function fmtDate(d?: string) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: '2-digit',
    });
  } catch { return d; }
}

function extractEwbs(b: BiltyRow): EwbEntry[] {
  const out: EwbEntry[] = [];
  if (Array.isArray(b.e_way_bills)) {
    b.e_way_bills.forEach(e => { if (e.ewb_no) out.push(e); });
  }
  if (b.ewb_no?.trim()) out.push({ ewb_no: b.ewb_no });
  return out;
}

function toEwbBilty(b: BiltyRow): EwbBilty {
  return {
    bilty_id:       b.bilty_id,
    gr_no:          b.gr_no,
    bilty_date:     b.bilty_date ?? '',
    bilty_type:     b.bilty_type ?? 'REGULAR',
    consignor_name: b.consignor_name ?? '',
    consignee_name: b.consignee_name ?? '',
    payment_mode:   b.payment_mode ?? '',
    status:         b.status ?? '',
    total_amount:   b.total_amount,
    ewbs:           extractEwbs(b),
    to_city_id:     b.to_city_id ?? null,
    from_city_id:   b.from_city_id ?? null,
    to_city_name:   b.to_city_name ?? null,
    from_city_name: b.from_city_name ?? null,
  };
}

// ── Challans tab ─────────────────────────────────────────────────────────────

function ChallansTab({
  challans,
  challanBilties,
  ewbCache,
  ewbLoading,
  onValidate,
}: {
  challans: ChallanRow[];
  challanBilties: Record<string, BiltyRow[]>;
  ewbCache: Record<string, EwbResult | string>;
  ewbLoading: Record<string, boolean>;
  onValidate: (ewbNo: string) => void;
}) {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {challans.map(ch => {
        const bilties = challanBilties[ch.challan_id] ?? [];
        const ewbBilties = bilties.filter(b => extractEwbs(b).length > 0);

        return (
          <div key={ch.challan_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Challan header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 text-sm">{ch.challan_no ?? '-'}</span>
                {ch.status && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_CLS[ch.status] ?? STATUS_CLS.DRAFT}`}>
                    {ch.status}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                {ch.challan_date && <span>{fmtDate(ch.challan_date)}</span>}
                <span>{bilties.length} bilties &middot; {ewbBilties.length} with EWB</span>
              </div>
            </div>

            {ewbBilties.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 italic">No bilties with EWB numbers.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {ewbBilties.map(b => {
                  const ewbs = extractEwbs(b);
                  return (
                    <div key={b.bilty_id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-semibold text-slate-700">{b.gr_no}</span>
                          <span className="text-slate-400">{fmtDate(b.bilty_date)}</span>
                        </div>
                        {b.payment_mode && (
                          <span className="text-xs text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">
                            {b.payment_mode}
                          </span>
                        )}
                      </div>
                      {(b.consignor_name || b.consignee_name) && (
                        <div className="text-xs text-slate-500 mb-2 truncate">
                          <span className="font-medium text-slate-700">{b.consignor_name}</span>
                          {b.consignor_name && b.consignee_name && (
                            <span className="mx-1.5 text-slate-300">&rarr;</span>
                          )}
                          <span className="font-medium text-slate-700">{b.consignee_name}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {ewbs.map((ewb, ei) => {
                          const isLoad = ewbLoading[ewb.ewb_no];
                          const result = ewbCache[ewb.ewb_no];
                          const isDone = result !== undefined && !isLoad;
                          const isError = typeof result === 'string';
                          const rec = isDone && !isError ? result as EwbResult : undefined;
                          const status = rec?.ewb_status ?? '';

                          const pillCls = isLoad
                            ? 'bg-slate-50 border-slate-200 text-slate-400'
                            : isError
                              ? 'bg-red-50 border-red-300 text-red-700'
                              : rec
                                ? (EWB_STATUS_CLS[status] ?? 'bg-green-50 border-green-300 text-green-800')
                                : 'bg-indigo-50 border-indigo-200 text-indigo-700';

                          const tooltip = isLoad
                            ? 'Validating...'
                            : isError
                              ? result as string
                              : rec
                                ? `${status} - valid until ${fmtDate(rec.valid_upto)}${rec.vehicle_number ? ' - ' + rec.vehicle_number : ''}`
                                : 'Click check to validate';

                          return (
                            <span key={ei} title={tooltip}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-mono transition-colors ${pillCls}`}>
                              {ewb.ewb_no}
                              {!isDone && (
                                <button type="button" onClick={() => onValidate(ewb.ewb_no)}
                                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-green-100 hover:text-green-700 transition-colors">
                                  {isLoad ? (
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                              )}
                              {isDone && !isError && rec && (
                                <span className="text-[10px] font-bold ml-0.5">{status}</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {bilties.length > ewbBilties.length && (
              <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
                + {bilties.length - ewbBilties.length} bilties without EWB
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EwbTripDetail({ tripId }: { tripId: string }) {
  const [trip, setTrip]           = useState<TripDetail | null>(null);
  const [challanBilties, setChallanBilties] = useState<Record<string, BiltyRow[]>>({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('challans');

  // EWB validation state shared across all tabs
  const [validated, setValidated] = useState<Record<string, EwbRecord>>({});

  // Inline validation cache for Challans tab (separate from validated so pills update)
  const [ewbCache, setEwbCache]   = useState<Record<string, EwbResult | string>>({});
  const [ewbLoading, setEwbLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await apiFetch(`/v1/challan/trip-sheet/${tripId}`);
        if (!res.ok) { setError('Trip sheet not found.'); return; }
        const data: TripDetail = await res.json();
        setTrip(data);

        if (data.challans?.length) {
          const entries = await Promise.all(
            data.challans.map(async ch => {
              try {
                const r = await apiFetch(`/v1/challan/${ch.challan_id}`);
                if (!r.ok) return [ch.challan_id, []] as [string, BiltyRow[]];
                const d = await r.json();
                const shallowBilties: BiltyRow[] = d.bilties ?? [];

                // Fetch full bilty to get e_way_bills
                const fullBilties = await Promise.all(
                  shallowBilties.map(async b => {
                    try {
                      const br = await apiFetch(`/v1/bilty/${b.bilty_id}`);
                      if (!br.ok) return b;
                      return await br.json() as BiltyRow;
                    } catch { return b; }
                  })
                );
                return [ch.challan_id, fullBilties] as [string, BiltyRow[]];
              } catch {
                return [ch.challan_id, []] as [string, BiltyRow[]];
              }
            })
          );
          setChallanBilties(Object.fromEntries(entries));
        }
      } catch {
        setError('Unable to reach the server.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tripId]);

  async function validateEwb(ewbNo: string) {
    if (ewbLoading[ewbNo] || ewbCache[ewbNo] !== undefined) return;
    const digits = ewbNo.replace(/\D/g, '');
    setEwbLoading(p => ({ ...p, [ewbNo]: true }));
    try {
      const res = await apiFetch(`/v1/ewaybill/validate?eway_bill_number=${digits}`);
      const data = await res.json();
      if (!res.ok) {
        const d = data.detail;
        setEwbCache(p => ({ ...p, [ewbNo]: typeof d === 'object' ? (d?.error ?? JSON.stringify(d)) : (d ?? 'Failed') }));
      } else {
        const rec = data.data ?? data;
        setEwbCache(p => ({ ...p, [ewbNo]: rec }));
        // Also add to validated so Consolidate/Transport tabs can use it
        setValidated(p => ({ ...p, [ewbNo]: rec }));
      }
    } catch {
      setEwbCache(p => ({ ...p, [ewbNo]: 'Server error' }));
    } finally {
      setEwbLoading(p => ({ ...p, [ewbNo]: false }));
    }
  }

  function handleValidated(ewbNo: string, record: EwbRecord) {
    setValidated(p => ({ ...p, [ewbNo]: record }));
  }

  // Build EwbBilty[] from all loaded bilties for use in Validate tab
  const ewbBiltiesForTab: EwbBilty[] = Object.values(challanBilties)
    .flat()
    .filter(b => extractEwbs(b).length > 0)
    .map(toEwbBilty);

  const totalEwbs      = ewbBiltiesForTab.reduce((s, b) => s + b.ewbs.length, 0);
  const validatedCount = Object.keys(validated).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
      Loading trip sheet...
    </div>
  );
  if (error || !trip) return (
    <div className="flex items-center justify-center h-64 text-red-500 text-sm">{error || 'Not found'}</div>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Trip header */}
      <div className="bg-white border-b border-slate-200 px-4 pt-3 pb-0">
        {/* Back + title row */}
        <div className="flex items-center gap-3 mb-2">
          <Link href="/dashboard/ewaybill"
            className="text-xs text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            E-Way Bill
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-800">{trip.trip_sheet_no}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_CLS[trip.status] ?? STATUS_CLS.DRAFT}`}>
            {trip.status}
          </span>
        </div>

        {/* Trip meta + stat chips */}
        <div className="flex items-center gap-4 flex-wrap mb-2">
          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            {trip.trip_date && <span>{fmtDate(trip.trip_date)}</span>}
            {trip.vehicle_info?.vehicle_no && (
              <span className="font-mono font-medium text-slate-700">{trip.vehicle_info.vehicle_no}</span>
            )}
            {trip.transport_name && <span>{trip.transport_name}</span>}
            {trip.vehicle_info?.driver_name && <span>Driver: {trip.vehicle_info.driver_name}</span>}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
              {ewbBiltiesForTab.length} bilties with EWB
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
              {totalEwbs} EWBs
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-medium">
              {validatedCount} validated
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-end gap-1 overflow-x-auto">
          {MAIN_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-x border-t transition-colors shrink-0
                ${activeTab === tab.id
                  ? 'bg-white border-slate-200 text-indigo-700 shadow-sm -mb-px'
                  : 'border-transparent text-gray-900 hover:text-indigo-700 hover:bg-slate-50'
                }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {tab.step}
              </span>
              {tab.label}
            </button>
          ))}

          <div className="w-px h-6 bg-slate-200 mx-1 self-center" />

          {UTIL_TABS.map(tab => {
            const isAmber = tab.color === 'amber';
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-x border-t transition-colors shrink-0
                  ${activeTab === tab.id
                    ? isAmber
                      ? 'bg-white border-amber-200 text-amber-700 -mb-px'
                      : 'bg-white border-violet-200 text-violet-700 -mb-px'
                    : 'border-transparent text-gray-900 hover:text-amber-700 hover:bg-slate-50'
                  }`}>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isAmber ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'}`}>
                  RARE
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-6">
        {trip.challans.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">No challans in this trip.</div>
        ) : (
          <>
            {activeTab === 'challans' && (
              <ChallansTab
                challans={trip.challans}
                challanBilties={challanBilties}
                ewbCache={ewbCache}
                ewbLoading={ewbLoading}
                onValidate={validateEwb}
              />
            )}
            {activeTab === 'validate' && (
              <EwbValidateTab
                bilties={ewbBiltiesForTab}
                loading={loading}
                onValidated={handleValidated}
                cache={validated}
              />
            )}
            {activeTab === 'consolidate' && (
              <EwbConsolidateTab
                validatedEwbs={validated}
                vehicleNo={trip.vehicle_info?.vehicle_no}
                tripNo={trip.trip_sheet_no}
              />
            )}
            {activeTab === 'transport' && (
              <EwbTransporterTab validatedEwbs={validated} bilties={ewbBiltiesForTab} />
            )}
            {activeTab === 'extend' && (
              <EwbExtendTab validatedEwbs={validated} />
            )}
            {activeTab === 'generate' && (
              <EwbGenerateTab />
            )}
          </>
        )}
      </div>
    </div>
  );
}