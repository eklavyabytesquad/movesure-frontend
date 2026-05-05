'use client';

import { ManualBilty, ManualBook, STATUS_CHIP, PAY_CHIP } from './types';

interface Props {
  bilties: ManualBilty[];
  loading: boolean;
  search: string;
  statusFil: string;
  payFil: string;
  cityMap: Record<string, string>;
  manualBooks: ManualBook[];
  onSearch: (v: string) => void;
  onStatusFil: (v: string) => void;
  onPayFil: (v: string) => void;
  onRefresh: () => void;
  onEdit: (b: ManualBilty) => void;
  onDelete: (id: string, gr: string) => void;
  deletingId: string | null;
  canUpdate: boolean;
  canDelete: boolean;
}

export default function ManualBiltyTable({
  bilties, loading, search, statusFil, payFil, cityMap, manualBooks,
  onSearch, onStatusFil, onPayFil, onRefresh,
  onEdit, onDelete, deletingId, canUpdate, canDelete,
}: Props) {
  const bookMap = Object.fromEntries(manualBooks.map(b => [b.book_id, b.book_name ?? b.book_id]));
  const filtered = bilties.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      b.gr_no.toLowerCase().includes(q) ||
      b.consignor_name.toLowerCase().includes(q) ||
      b.consignee_name.toLowerCase().includes(q) ||
      (b.to_city_id && cityMap[b.to_city_id]?.toLowerCase().includes(q));
    const matchStatus = !statusFil || b.status === statusFil;
    const matchPay    = !payFil    || b.payment_mode === payFil;
    return matchSearch && matchStatus && matchPay;
  });

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center gap-3 flex-wrap shrink-0">
        <div className="relative flex-1 min-w-56">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search by GR, consignor, consignee or city…"
            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          {search && (
            <button onClick={() => onSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none">
              ×
            </button>
          )}
        </div>

        <select
          value={statusFil}
          onChange={e => onStatusFil(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
        >
          <option value="">All Status</option>
          {['DRAFT', 'SAVED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={payFil}
          onChange={e => onPayFil(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
        >
          <option value="">All Payment</option>
          <option value="PAID">Paid</option>
          <option value="TO-PAY">To-Pay</option>
          <option value="FOC">FOC</option>
        </select>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>

        <span className="text-sm text-slate-400 ml-auto">
          {filtered.length} bilti{filtered.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="py-28 text-center">
            <div className="inline-block w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-slate-400">Loading bilties…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-28 text-center">
            <svg className="mx-auto w-14 h-14 text-slate-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium text-slate-400">
              {search || statusFil || payFil
                ? 'No bilties match the current filters.'
                : 'No manual bilties yet.'}
            </p>
            {!search && !statusFil && !payFil && (
              <p className="text-xs text-slate-300 mt-1">Click "Create Manual Bilty" to add one.</p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 font-semibold text-slate-600 whitespace-nowrap">GR No</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600 whitespace-nowrap">Book</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600 whitespace-nowrap">Date</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Consignor</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Consignee</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600 whitespace-nowrap">Route</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Pvt Mark</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-600">Pkgs</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-600">Weight</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-600">Amount</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Payment</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Status</th>
                <th className="px-5 py-3 w-36"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map(b => (
                <tr key={b.bilty_id} className="hover:bg-slate-50/70 transition-colors group">
                  <td className="px-5 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">{b.gr_no}</td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    {b.book_id
                      ? <span className="text-xs font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">{bookMap[b.book_id] ?? b.book_name ?? '—'}</span>
                      : <span className="text-xs text-slate-400">—</span>
                    }
                  </td>
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{b.bilty_date}</td>
                  <td className="px-5 py-3 max-w-40 truncate uppercase text-slate-700 font-medium">{b.consignor_name}</td>
                  <td className="px-5 py-3 max-w-40 truncate uppercase text-slate-600">{b.consignee_name}</td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="text-blue-600 font-semibold">
                      {b.from_city_id ? (cityMap[b.from_city_id] ?? '?') : '—'}
                    </span>
                    <span className="text-slate-300 mx-1.5">→</span>
                    <span className="text-blue-600 font-semibold">
                      {b.to_city_id ? (cityMap[b.to_city_id] ?? '?') : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 max-w-32 truncate text-slate-500 text-xs">{b.pvt_marks ?? '—'}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{b.no_of_pkg ?? '—'}</td>
                  <td className="px-5 py-3 text-right text-slate-600 whitespace-nowrap">
                    {b.weight != null ? `${b.weight} kg` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                    {b.total_amount != null ? `₹${b.total_amount.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PAY_CHIP[b.payment_mode] ?? 'bg-slate-100 text-slate-500'}`}>
                      {b.payment_mode}{b.delivery_type ? `/${b.delivery_type}` : ''}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_CHIP[b.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      {canUpdate && (
                        <button
                          onClick={() => onEdit(b)}
                          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => onDelete(b.bilty_id, b.gr_no)}
                          disabled={deletingId === b.bilty_id}
                          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-700 disabled:opacity-40 transition-colors"
                        >
                          {deletingId === b.bilty_id ? '…' : 'Del'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
