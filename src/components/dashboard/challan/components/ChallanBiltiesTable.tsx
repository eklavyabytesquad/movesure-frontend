// Challan bilties table — the rich table on the right main panel
import { useState } from 'react';
import { BiltySummary } from '../types';

interface Props {
  bilties: BiltySummary[];
  challanNo: string | null;
  isEditable: boolean;
  canUpdate: boolean;
  removingBilty: string | null;
  selectedBilties: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (all: boolean) => void;
  onRemove: (biltyId: string) => void;
  onRemoveSelected: () => void;
  onRefresh: () => void;
  onPrint: () => void;
  printing: boolean;
  loading: boolean;
}

function paymentBadge(mode: string) {
  if (mode === 'PAID')    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">PAID</span>;
  if (mode === 'TO-PAY')  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">TO-PAY</span>;
  if (mode === 'FOC')     return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">FOC</span>;
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{mode}</span>;
}

function typeBadge(t?: string) {
  if (!t) return <span className="text-[10px] text-gray-400">—</span>;
  return t === 'MANUAL'
    ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">MNL</span>
    : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">REG</span>;
}

function deliveryBadge(d?: string) {
  if (d === 'DOOR')   return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">DOOR</span>;
  if (d === 'GODOWN') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-700">GODOWN</span>;
  return <span className="text-[10px] text-gray-400">—</span>;
}

export default function ChallanBiltiesTable({
  bilties, challanNo, isEditable, canUpdate,
  removingBilty, selectedBilties, onToggleSelect, onSelectAll,
  onRemove, onRemoveSelected, onRefresh, onPrint, printing, loading,
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? bilties.filter(b => {
        const q = search.toLowerCase();
        return [
          b.gr_no, b.consignor_name, b.consignee_name,
          b.contain, b.to_city_name, b.pvt_marks,
        ].some(f => f?.toLowerCase().includes(q));
      })
    : bilties;

  const allSelected = filtered.length > 0 && filtered.every(b => selectedBilties.has(b.bilty_id));
  const totalWeight = filtered.reduce((s, b) => s + (b.weight ?? b.actual_weight ?? 0), 0);
  const totalAmt    = filtered.reduce((s, b) => s + (b.total_amount ?? 0), 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Table header bar */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 text-violet-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="font-bold text-gray-900 text-sm">
            Challan {challanNo ?? '—'}
          </span>
          <span className="text-xs text-gray-500">({bilties.length} bilties{search.trim() ? ` · ${filtered.length} shown` : ''})</span>
        </div>

        {/* Sub-pills */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {bilties.length} in transit
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {selectedBilties.size} selected
          </span>
        </div>

        {/* Search */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search bilties…"
              className="pl-7 pr-7 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 w-44"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            )}
          </div>

        {/* Action buttons */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button onClick={onRefresh}
            className="flex items-center gap-1 text-[11px] text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={onPrint}
            disabled={printing || bilties.length === 0}
            className="flex items-center gap-1 text-[11px] font-semibold text-white bg-blue-600 border border-blue-600 rounded-lg px-2.5 py-1 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {printing ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            )}
            {printing ? 'Printing…' : 'Print Challan'}
          </button>
          <button
            className="flex items-center gap-1 text-[11px] text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
            onClick={() => onSelectAll(!allSelected)}
            className="text-[11px] text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition-colors">
            All
          </button>
          {isEditable && canUpdate && (
            <button
              onClick={onRemoveSelected}
              disabled={selectedBilties.size === 0}
              className="flex items-center gap-1 text-[11px] text-red-600 border border-red-200 rounded-lg px-2.5 py-1 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove ({selectedBilties.size})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading…</div>
      ) : bilties.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
          No bilties on this challan yet.{isEditable ? ' Use Available Bilties below to add.' : ''}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
          No bilties match &quot;{search}&quot;.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                {isEditable && canUpdate && (
                  <th className="w-10 px-3 py-2.5">
                    <input type="checkbox" checked={allSelected} onChange={e => onSelectAll(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600" />
                  </th>
                )}
                <th className="text-center px-2 py-2.5 text-[11px] font-semibold text-gray-500 w-8">#</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Type</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">GR No</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Date</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500">Consignor</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500">Consignee</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500">Content</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Destination</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Pvt Marks</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Payment</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Delivery</th>
                <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Pkgs</th>
                <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Weight</th>
                <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Amount</th>
                {isEditable && canUpdate && (
                  <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-gray-500">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((b, i) => {
                const isChecked = selectedBilties.has(b.bilty_id);
                return (
                  <tr key={b.bilty_id} className={`transition-colors ${isChecked ? 'bg-violet-50/50' : 'hover:bg-gray-50'}`}>
                    {isEditable && canUpdate && (
                      <td className="px-3 py-2.5">
                        <input type="checkbox" checked={isChecked}
                          onChange={() => onToggleSelect(b.bilty_id)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600" />
                      </td>
                    )}
                    <td className="px-2 py-2.5 text-center text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2.5">{typeBadge(b.bilty_type)}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-gray-900 text-xs whitespace-nowrap">{b.gr_no}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {b.bilty_date ? b.bilty_date.replace(/^\d{4}-/, '') : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-700 max-w-36 truncate uppercase">{b.consignor_name}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-700 max-w-36 truncate uppercase">{b.consignee_name}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 max-w-24 truncate uppercase">{b.contain ?? '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-blue-600 font-semibold whitespace-nowrap">{b.to_city_name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{b.pvt_marks ?? '—'}</td>
                    <td className="px-3 py-2.5">{paymentBadge(b.payment_mode)}</td>
                    <td className="px-3 py-2.5">{deliveryBadge(b.delivery_type)}</td>
                    <td className="px-3 py-2.5 text-xs text-right text-gray-700">{b.no_of_pkg ?? '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-right text-gray-700 whitespace-nowrap">
                      {(b.weight ?? b.actual_weight) != null ? `${b.weight ?? b.actual_weight}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold text-right text-gray-800 whitespace-nowrap">
                      {b.total_amount != null ? `₹${b.total_amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    {isEditable && canUpdate && (
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => onRemove(b.bilty_id)}
                          disabled={removingBilty === b.bilty_id}
                          className="text-[11px] font-semibold text-red-500 border border-red-200 rounded-md px-2 py-0.5 hover:bg-red-50 disabled:opacity-40 transition-colors whitespace-nowrap">
                          {removingBilty === b.bilty_id ? '…' : '× Remove'}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {/* Totals footer */}
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  {isEditable && canUpdate ? <td /> : null}
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td className="px-3 py-2 text-xs font-bold text-right text-gray-700">
                    {filtered.reduce((s, b) => s + (b.no_of_pkg ?? 0), 0)}
                  </td>
                  <td className="px-3 py-2 text-xs font-bold text-right text-gray-700 whitespace-nowrap">
                    {totalWeight > 0 ? `${totalWeight}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs font-bold text-right text-gray-800 whitespace-nowrap">
                    ₹{totalAmt.toLocaleString('en-IN')}
                  </td>
                  {isEditable && canUpdate ? <td /> : null}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
