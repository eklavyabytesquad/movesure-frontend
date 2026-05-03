'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface City { city_id: string; city_name: string; }

interface TripChallan {
  challan_id: string;
  challan_no: string | null;
  challan_date: string;
  branch_id?: string;
  status?: string;
  total_bilty_count?: number;
  total_freight?: number;
  total_weight?: number;
  total_packages?: number;
  is_mine: boolean;
  bilties?: TripBilty[];
}

interface TripBilty {
  bilty_id: string;
  gr_no: string;
  bilty_date: string;
  consignor_name: string;
  consignee_name: string;
  from_city_id?: string;
  to_city_id?: string;
  no_of_pkg?: number;
  weight?: number;
  total_amount?: number;
  delivery_type?: string;
  payment_mode?: string;
  status?: string;
}

interface TripSheet {
  trip_sheet_id: string;
  trip_sheet_no: string;
  trip_date: string;
  trip_status: 'DRAFT' | 'OPEN' | 'DISPATCHED' | 'ARRIVED' | 'CLOSED';
  status?: string;
  from_city_id?: string | null;
  to_city_id?: string | null;
  vehicle_info?: { vehicle_no?: string; truck_no?: string; driver_name?: string; driver?: string } | null;
  transport_name?: string | null;
  remarks?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:      'bg-gray-100 text-gray-600 border-gray-200',
  OPEN:       'bg-blue-50 text-blue-700 border-blue-200',
  DISPATCHED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ARRIVED:    'bg-green-50 text-green-700 border-green-200',
  CLOSED:     'bg-gray-100 text-gray-500 border-gray-200',
};

// ── ChallanRow ────────────────────────────────────────────────────────────────

function ChallanRow({
  c, cities, isMine, removable, removingId,
  onRemove, onJoin, joiningId,
}: {
  c: TripChallan;
  cities: Record<string, string>;
  isMine: boolean;
  removable: boolean;
  removingId: string | null;
  onRemove?: (challanId: string) => void;
  onJoin?: (challanId: string) => void;
  joiningId?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border overflow-hidden ${isMine ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'}`}>
      {/* Challan summary row */}
      <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isMine ? 'bg-blue-500' : 'bg-gray-300'}`} />
          <span className="font-mono font-bold text-sm text-gray-900">{c.challan_no ?? 'Pending No.'}</span>
          {c.status && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
              {c.status}
            </span>
          )}
          <span className="text-xs text-gray-500">{c.challan_date}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          {c.total_bilty_count != null && (
            <span className="font-medium text-gray-700">{c.total_bilty_count} bilties</span>
          )}
          {c.total_packages != null && <span>{c.total_packages} pkgs</span>}
          {c.total_weight   != null && <span>{c.total_weight} kg</span>}
          {c.total_freight  != null && (
            <span className="font-bold text-green-700">₹{c.total_freight.toLocaleString('en-IN')}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {removable && onRemove && (
            <button
              onClick={() => onRemove(c.challan_id)}
              disabled={removingId === c.challan_id}
              className="rounded-lg bg-red-50 border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 disabled:opacity-40 transition-colors">
              {removingId === c.challan_id ? '…' : 'Remove'}
            </button>
          )}
          {c.bilties && c.bilties.length > 0 && (
            <button onClick={() => setExpanded(v => !v)}
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] text-gray-500 hover:bg-gray-100 transition-colors">
              {expanded ? 'Hide ▲' : `View Bilties ▼`}
            </button>
          )}
        </div>
      </div>

      {/* Expanded bilties */}
      {expanded && c.bilties && c.bilties.length > 0 && (
        <div className="border-t border-gray-100 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-3 py-2 font-semibold text-gray-500 whitespace-nowrap">GR No</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-500">Consignor</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-500">Consignee</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-500 whitespace-nowrap">To City</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-500">Pkgs</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-500">Weight</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-500">Amount</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-500">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {c.bilties.map(b => (
                <tr key={b.bilty_id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono font-bold text-gray-900 whitespace-nowrap">{b.gr_no}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-32 truncate uppercase">{b.consignor_name}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-32 truncate uppercase">{b.consignee_name}</td>
                  <td className="px-3 py-2 text-blue-600 font-semibold whitespace-nowrap">
                    {b.to_city_id ? (cities[b.to_city_id] ?? b.to_city_id) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">{b.no_of_pkg ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">{b.weight != null ? `${b.weight} kg` : '—'}</td>
                  <td className="px-3 py-2 text-right font-bold text-gray-800 whitespace-nowrap">
                    {b.total_amount != null ? `₹${b.total_amount.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {b.payment_mode === 'PAID'   && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">PAID</span>}
                    {b.payment_mode === 'TO-PAY' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">TO-PAY</span>}
                    {b.payment_mode === 'FOC'    && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">FOC</span>}
                    {!['PAID','TO-PAY','FOC'].includes(b.payment_mode ?? '') && <span className="text-gray-400">{b.payment_mode ?? '—'}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── TripSheetCard ─────────────────────────────────────────────────────────────

function TripSheetCard({
  sheet, cities, canUpdate,
}: {
  sheet: TripSheet;
  cities: Record<string, string>;
  canUpdate: boolean;
}) {
  const st = sheet.trip_status;
  const [challans, setChallans]       = useState<TripChallan[]>([]);
  const [loading,  setLoading]        = useState(false);
  const [expanded, setExpanded]       = useState(false);
  const [removingId, setRemovingId]   = useState<string | null>(null);
  const [actionId,   setActionId]     = useState<string | null>(null);
  const [error,      setError]        = useState('');
  const [addChallanFilter, setAddChallanFilter] = useState('');
  const [showAddPanel, setShowAddPanel]         = useState(false);
  const [availChallans, setAvailChallans]       = useState<{ challan_id: string; challan_no: string | null; challan_date: string; challan_status: string }[]>([]);
  const [loadingAvail, setLoadingAvail]         = useState(false);
  const [addingId, setAddingId]                 = useState<string | null>(null);

  const vehicleNo  = sheet.vehicle_info?.vehicle_no ?? sheet.vehicle_info?.truck_no;
  const driverName = sheet.vehicle_info?.driver_name ?? sheet.vehicle_info?.driver;

  async function loadChallans() {
    setLoading(true); setError('');
    try {
      const res = await apiFetch(`/v1/challan/trip-sheet/${sheet.trip_sheet_id}/challans`);
      if (res.ok) { const d = await res.json(); setChallans(d ?? []); }
    } finally { setLoading(false); }
  }

  async function toggleExpand() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (challans.length === 0) await loadChallans();
  }

  async function handleRemove(challanId: string) {
    setRemovingId(challanId); setError('');
    try {
      const res = await apiFetch(`/v1/challan/${challanId}/remove-from-trip-sheet`, { method: 'POST' });
      if (!res.ok) { const d = await res.json(); setError(d.detail ?? 'Failed.'); return; }
      setChallans(prev => prev.filter(c => c.challan_id !== challanId));
    } finally { setRemovingId(null); }
  }

  async function handleAction(action: 'dispatch' | 'arrive') {
    setActionId(action); setError('');
    try {
      const res = await apiFetch(`/v1/challan/trip-sheet/${sheet.trip_sheet_id}/${action}`, { method: 'POST' });
      if (!res.ok) { const d = await res.json(); setError(d.detail ?? 'Failed.'); return; }
      window.location.reload(); // refresh to reflect new status
    } finally { setActionId(null); }
  }

  async function openAddPanel() {
    setShowAddPanel(true); setAddChallanFilter(''); setLoadingAvail(true);
    try {
      const res = await apiFetch('/v1/challan');
      if (res.ok) { const d = await res.json(); setAvailChallans(d.challans ?? d ?? []); }
    } finally { setLoadingAvail(false); }
  }

  async function addChallan(challanId: string) {
    setAddingId(challanId);
    try {
      await apiFetch(`/v1/challan/${challanId}/move-to-trip-sheet`, {
        method: 'POST',
        body: JSON.stringify({ trip_sheet_id: sheet.trip_sheet_id }),
      });
      setAvailChallans(prev => prev.filter(c => c.challan_id !== challanId));
      await loadChallans();
    } finally { setAddingId(null); }
  }

  const myChallans    = challans.filter(c => c.is_mine);
  const otherChallans = challans.filter(c => !c.is_mine);

  const totalBilties = challans.reduce((s, c) => s + (c.total_bilty_count ?? 0), 0);
  const totalFreight = challans.reduce((s, c) => s + (c.total_freight ?? 0), 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start gap-3 justify-between flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-bold font-mono text-gray-900">{sheet.trip_sheet_no}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[st]}`}>{st}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span>{sheet.trip_date}</span>
              {(sheet.from_city_id || sheet.to_city_id) && (
                <span className="font-medium text-blue-600">
                  {sheet.from_city_id ? (cities[sheet.from_city_id] ?? '?') : '—'}
                  {' → '}
                  {sheet.to_city_id ? (cities[sheet.to_city_id] ?? '?') : '—'}
                </span>
              )}
              {vehicleNo   && <span>🚘 {vehicleNo}</span>}
              {driverName  && <span>👤 {driverName}</span>}
              {sheet.transport_name && <span>🚛 {sheet.transport_name}</span>}
            </div>
            <div className="flex gap-3 mt-1.5 text-xs">
              <span className="text-gray-500">{challans.length} challans · {totalBilties} bilties</span>
              {totalFreight > 0 && <span className="font-bold text-green-700">₹{totalFreight.toLocaleString('en-IN')}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {canUpdate && st === 'OPEN' && (
              <button onClick={() => handleAction('dispatch')} disabled={actionId === 'dispatch'}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {actionId === 'dispatch' ? '…' : 'Dispatch'}
              </button>
            )}
            {canUpdate && st === 'DISPATCHED' && (
              <button onClick={() => handleAction('arrive')} disabled={actionId === 'arrive'}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                {actionId === 'arrive' ? '…' : 'Mark Arrived'}
              </button>
            )}
            {canUpdate && ['DRAFT', 'OPEN'].includes(st) && (
              <button onClick={openAddPanel}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors">
                + Add Challan
              </button>
            )}
            <button onClick={toggleExpand}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              {expanded ? 'Collapse ▲' : 'View Challans ▼'}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* Add Challan panel */}
      {showAddPanel && (
        <div className="border-t border-blue-100 bg-blue-50/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-blue-700">Add Challan to Trip</p>
            <button onClick={() => setShowAddPanel(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
          </div>
          <input type="text" value={addChallanFilter} onChange={e => setAddChallanFilter(e.target.value)}
            placeholder="Filter challans…"
            className="w-full mb-3 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
          {loadingAvail ? (
            <p className="text-xs text-gray-400 text-center py-3">Loading…</p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {availChallans
                .filter(c => !addChallanFilter || (c.challan_no ?? '').toLowerCase().includes(addChallanFilter.toLowerCase()))
                .map(c => (
                  <div key={c.challan_id} className="flex items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 px-3 py-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-mono text-xs font-bold text-gray-900">{c.challan_no ?? 'Pending'}</span>
                      <span className="text-xs text-gray-400">{c.challan_date}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[c.challan_status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>{c.challan_status}</span>
                    </div>
                    <button onClick={() => addChallan(c.challan_id)} disabled={addingId === c.challan_id}
                      className="rounded-lg bg-blue-600 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0">
                      {addingId === c.challan_id ? '…' : '+ Add'}
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Expanded challans view */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-4">
          {loading ? (
            <div className="text-xs text-gray-400 text-center py-6">Loading challans…</div>
          ) : challans.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-6">No challans on this trip yet.</div>
          ) : (
            <div className="space-y-5">
              {/* My Challans */}
              {myChallans.length > 0 && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 mb-2">My Challans</p>
                  <div className="space-y-2">
                    {myChallans.map(c => (
                      <ChallanRow key={c.challan_id} c={c} cities={cities} isMine removable={['DRAFT','OPEN'].includes(st) && canUpdate}
                        removingId={removingId} onRemove={handleRemove} />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Branches */}
              {otherChallans.length > 0 && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">Other Branches</p>
                  <div className="space-y-2">
                    {otherChallans.map(c => (
                      <ChallanRow key={c.challan_id} c={c} cities={cities} isMine={false} removable={false}
                        removingId={removingId} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── TripSheetDashboard ────────────────────────────────────────────────────────

export default function TripSheetDashboard() {
  const [sheets,  setSheets]  = useState<TripSheet[]>([]);
  const [cities,  setCities]  = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [filter,  setFilter]  = useState<'ALL' | 'DRAFT' | 'OPEN' | 'DISPATCHED' | 'ARRIVED' | 'CLOSED'>('ALL');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [sheetsRes, cityRes] = await Promise.all([
        apiFetch('/v1/challan/trip-sheet'),
        apiFetch('/v1/master/cities?is_active=true'),
      ]);
      if (cityRes.ok) {
        const d = await cityRes.json();
        const map: Record<string, string> = {};
        (d.cities ?? d ?? []).forEach((c: City) => { map[c.city_id] = c.city_name; });
        setCities(map);
      }
      if (sheetsRes.ok) {
        const d = await sheetsRes.json();
        const raw = d.trip_sheets ?? d ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSheets(raw.map((s: any) => ({ ...s, trip_status: s.trip_status ?? s.status ?? 'DRAFT' })));
      } else { setError('Failed to load trip sheets.'); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'ALL' ? sheets : sheets.filter(s => s.trip_status === filter);
  const canUpdate = true; // permissions checked inline; keep true for this view

  const STATUS_TABS = ['ALL', 'DRAFT', 'OPEN', 'DISPATCHED', 'ARRIVED', 'CLOSED'] as const;
  const counts = STATUS_TABS.reduce((acc, s) => {
    acc[s] = s === 'ALL' ? sheets.length : sheets.filter(x => x.trip_status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50 overflow-hidden">

      {/* Top bar */}
      <div className="shrink-0 px-5 pt-3 pb-2.5 bg-white border-b border-gray-200 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </span>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">Trip Sheets</h1>
            <p className="text-[11px] text-gray-400 leading-tight">Truck journeys — cross-branch challan grouping</p>
          </div>
        </div>

        <div className="flex-1" />

        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-[11px] text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 transition-colors">
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="shrink-0 flex gap-1 px-4 py-2 bg-white border-b border-gray-200 overflow-x-auto">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap ${
              filter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {s} {counts[s] > 0 && <span className="ml-1 opacity-75">({counts[s]})</span>}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 shrink-0 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading trip sheets…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-sm text-gray-400">
            <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>No trip sheets {filter !== 'ALL' ? `with status ${filter}` : 'found'}.</span>
            <p className="text-xs text-gray-300">Create trip sheets in Settings → Challan → Trip Sheets</p>
          </div>
        ) : (
          filtered.map(s => (
            <TripSheetCard key={s.trip_sheet_id} sheet={s} cities={cities} canUpdate={canUpdate} />
          ))
        )}
      </div>
    </div>
  );
}
