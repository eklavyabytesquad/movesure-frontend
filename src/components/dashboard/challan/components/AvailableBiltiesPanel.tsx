// Available (unassigned) bilties panel — bottom section
import { useState } from 'react';
import { BiltySummary } from '../types';

interface Props {
  bilties: BiltySummary[];
  isEditable: boolean;
  canUpdate: boolean;
  addingBilty: string | null;
  challanNo: string | null;
  onAdd: (biltyId: string) => void;
}

function paymentBadge(mode: string) {
  if (mode === 'PAID')    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">PAID</span>;
  if (mode === 'TO-PAY')  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">TO-PAY</span>;
  if (mode === 'FOC')     return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">FOC</span>;
  return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{mode}</span>;
}

function deliveryBadge(d?: string) {
  if (d === 'DOOR')   return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">DOOR</span>;
  if (d === 'GODOWN') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-700">GODOWN</span>;
  return <span className="text-[10px] text-gray-400">—</span>;
}

function typeBadge(t?: string) {
  if (!t) return <span className="text-[10px] text-gray-400">—</span>;
  return t === 'MANUAL'
    ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">MNL</span>
    : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">REG</span>;
}

export default function AvailableBiltiesPanel({ bilties, isEditable, canUpdate, addingBilty, challanNo, onAdd }: Props) {
  const [search, setSearch]             = useState('');
  const [payFilter, setPayFilter]       = useState('');
  const [delivFilter, setDelivFilter]   = useState('');

  const filtered = bilties.filter(b => {
    const q = search.toLowerCase();
    const matchQ = !q || b.gr_no.toLowerCase().includes(q)
      || b.consignor_name.toLowerCase().includes(q)
      || b.consignee_name.toLowerCase().includes(q)
      || (b.to_city_name ?? '').toLowerCase().includes(q)
      || (b.contain ?? '').toLowerCase().includes(q)
      || (b.pvt_marks ?? '').toLowerCase().includes(q);
    const matchPay   = !payFilter   || b.payment_mode === payFilter;
    const matchDeliv = !delivFilter || b.delivery_type === delivFilter;
    return matchQ && matchPay && matchDeliv;
  });

  return (
    <div className="flex flex-col border-t-2 border-gray-200 bg-white" style={{ height: '40%', minHeight: '220px' }}>
      {/* Header */}
      <div className="shrink-0 px-4 py-2.5 border-b border-gray-200 flex items-center gap-3 flex-wrap bg-gray-50">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800">
            Available Bilties
            <span className="ml-1.5 text-xs font-normal text-gray-400">({bilties.length} unassigned)</span>
          </p>
          {isEditable && challanNo && (
            <p className="text-[11px] text-blue-600 font-medium mt-0.5">Adding to: Challan {challanNo}</p>
          )}
          {!isEditable && (
            <p className="text-[11px] text-orange-500 font-medium mt-0.5">Select an active challan to add bilties</p>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transit…"
            className="border border-gray-300 rounded-lg px-3 py-1 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 w-44"
          />
          <select value={payFilter} onChange={e => setPayFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="">All Payments</option>
            <option value="PAID">PAID</option>
            <option value="TO-PAY">TO-PAY</option>
            <option value="TBB">TBB</option>
          </select>
          <select value={delivFilter} onChange={e => setDelivFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="">All Types</option>
            <option value="DOOR">DOOR</option>
            <option value="GODOWN">GODOWN</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            {bilties.length === 0 ? 'All bilties are assigned to challans.' : 'No bilties match your filters.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Type</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500 whitespace-nowrap">GR No</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Date</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500">Consignor</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500">Consignee</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500">Content</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Destination</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Pvt Marks</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Payment</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Delivery</th>
                <th className="text-right px-3 py-2 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Pkgs</th>
                <th className="text-right px-3 py-2 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Weight</th>
                <th className="text-right px-3 py-2 text-[11px] font-semibold text-gray-500 whitespace-nowrap">Amount</th>
                {canUpdate && <th className="px-3 py-2 text-[11px] font-semibold text-gray-500 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(b => (
                <tr key={b.bilty_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2">{typeBadge(b.bilty_type)}</td>
                  <td className="px-3 py-2 font-mono font-bold text-gray-900 text-xs whitespace-nowrap">{b.gr_no}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                    {b.bilty_date ? b.bilty_date.replace(/^\d{4}-/, '') : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700 max-w-36 truncate uppercase">{b.consignor_name}</td>
                  <td className="px-3 py-2 text-xs text-gray-700 max-w-36 truncate uppercase">{b.consignee_name}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 max-w-24 truncate uppercase">{b.contain ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-blue-600 font-semibold whitespace-nowrap">{b.to_city_name ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{b.pvt_marks ?? '—'}</td>
                  <td className="px-3 py-2">{paymentBadge(b.payment_mode)}</td>
                  <td className="px-3 py-2">{deliveryBadge(b.delivery_type)}</td>
                  <td className="px-3 py-2 text-xs text-right text-gray-700">{b.no_of_pkg ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-right text-gray-700 whitespace-nowrap">
                    {(b.weight ?? b.actual_weight) != null ? `${b.weight ?? b.actual_weight}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs font-bold text-right text-gray-800 whitespace-nowrap">
                    {b.total_amount != null ? `₹${b.total_amount.toLocaleString('en-IN')}` : '—'}
                  </td>
                  {canUpdate && (
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => onAdd(b.bilty_id)}
                        disabled={!isEditable || addingBilty === b.bilty_id}
                        title={!isEditable ? 'Select an active challan first' : 'Add to challan'}
                        className="rounded-lg bg-violet-600 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-violet-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                        {addingBilty === b.bilty_id ? '…' : '+ Add'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
