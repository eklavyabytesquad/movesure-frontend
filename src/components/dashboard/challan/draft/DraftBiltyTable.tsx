// Draft bilties table — shows all DRAFT status bilties, allows promoting to SAVED
'use client';
import { useState } from 'react';
import { BiltySummary } from '../types';

interface Props {
  bilties: BiltySummary[];
  loading: boolean;
  promotingId: string | null;
  canUpdate: boolean;
  onPromote: (biltyId: string) => void;  // DRAFT → SAVED
  onRefresh: () => void;
}

function paymentBadge(mode: string) {
  if (mode === 'PAID')   return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">PAID</span>;
  if (mode === 'TO-PAY') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">TO-PAY</span>;
  if (mode === 'FOC')    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">FOC</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{mode}</span>;
}

function typeBadge(t?: string) {
  if (!t) return null;
  return t === 'MANUAL'
    ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">MNL</span>
    : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">REG</span>;
}

function deliveryBadge(d?: string) {
  if (d === 'DOOR')   return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">DOOR</span>;
  if (d === 'GODOWN') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-700">GODOWN</span>;
  return null;
}

export default function DraftBiltyTable({ bilties, loading, promotingId, canUpdate, onPromote, onRefresh }: Props) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? bilties.filter(b => {
        const q = search.toLowerCase();
        return [b.gr_no, b.consignor_name, b.consignee_name, b.contain, b.to_city_name, b.pvt_marks]
          .some(f => f?.toLowerCase().includes(q));
      })
    : bilties;

  const totalAmt    = bilties.reduce((s, b) => s + (b.total_amount ?? 0), 0);
  const totalWeight = bilties.reduce((s, b) => s + (b.weight ?? b.actual_weight ?? 0), 0);
  const totalPkgs   = bilties.reduce((s, b) => s + (b.no_of_pkg ?? 0), 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-bold text-gray-900 text-sm">Draft Bilties</span>
          <span className="text-xs text-gray-500">({bilties.length} total{search.trim() ? ` · ${filtered.length} shown` : ''})</span>
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
            {totalPkgs} pkgs
          </span>
          <span className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
            {totalWeight} kg
          </span>
          <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
            ₹{totalAmt.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search drafts…"
              className="pl-7 pr-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 w-40" />
          </div>
          <button onClick={onRefresh}
            className="flex items-center gap-1 text-[11px] text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading…</div>
      ) : bilties.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-sm text-gray-400">
          <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>No draft bilties. Use the panel below to move bilties here.</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">No match for &quot;{search}&quot;</div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-amber-50 border-b border-amber-100">
                <th className="text-center px-2 py-2.5 text-[11px] font-semibold text-gray-500 w-8">#</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Type</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">GR No</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Date</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500">Consignor</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500">Consignee</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500">Content</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Destination</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Payment</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Delivery</th>
                <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Pkgs</th>
                <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Weight</th>
                <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Amount</th>
                {canUpdate && <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((b, i) => (
                <tr key={b.bilty_id} className="hover:bg-amber-50/40 transition-colors">
                  <td className="px-2 py-2.5 text-center text-[11px] text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2.5">{typeBadge(b.bilty_type)}</td>
                  <td className="px-3 py-2.5 font-mono font-bold text-gray-900 text-xs whitespace-nowrap">{b.gr_no}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    {b.bilty_date ? b.bilty_date.replace(/^\d{4}-/, '') : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-700 max-w-36 truncate uppercase">{b.consignor_name}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-700 max-w-36 truncate uppercase">{b.consignee_name}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 max-w-24 truncate">{b.contain ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-blue-600 font-semibold whitespace-nowrap">{b.to_city_name ?? '—'}</td>
                  <td className="px-3 py-2.5">{paymentBadge(b.payment_mode)}</td>
                  <td className="px-3 py-2.5">{deliveryBadge(b.delivery_type)}</td>
                  <td className="px-3 py-2.5 text-xs text-right text-gray-700">{b.no_of_pkg ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-right text-gray-700 whitespace-nowrap">
                    {(b.weight ?? b.actual_weight) != null ? `${b.weight ?? b.actual_weight} kg` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-bold text-right text-gray-800 whitespace-nowrap">
                    {b.total_amount != null ? `₹${b.total_amount.toLocaleString('en-IN')}` : '—'}
                  </td>
                  {canUpdate && (
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => onPromote(b.bilty_id)}
                        disabled={promotingId === b.bilty_id}
                        title="Move to Saved (ready for challan)"
                        className="rounded-lg bg-green-600 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                        {promotingId === b.bilty_id ? '…' : '→ Saved'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
