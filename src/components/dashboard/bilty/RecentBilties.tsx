import { BiltySummary, STATUS_COLORS, PAY_COLORS } from './types';
import { Badge } from './ui';

interface Props {
  recent: BiltySummary[];
  recentLoading: boolean;
  hasMorePages: boolean;
  printing: boolean;
  cancelId: string | null;
  cancelReason: string;
  cancelling: boolean;
  setCancelReason: (v: string) => void;
  onEdit: (id: string) => void;
  onPrint: (id: string) => void;
  onCancelOpen: (id: string) => void;
  onCancelClose: () => void;
  onCancelConfirm: () => void;
  onLoadMore: () => void;
}

export default function RecentBilties({
  recent, recentLoading, hasMorePages, printing,
  cancelId, cancelReason, cancelling, setCancelReason,
  onEdit, onPrint, onCancelOpen, onCancelClose, onCancelConfirm, onLoadMore,
}: Props) {
  return (
    <div>
      {recentLoading && recent.length === 0 ? (
        <div className="py-20 text-center text-sm text-slate-400">Loading…</div>
      ) : recent.length === 0 ? (
        <div className="py-20 text-center text-sm text-slate-400 bg-white rounded-xl border border-slate-200">
          No bilties found.
        </div>
      ) : (
        <div className="space-y-3">
          {recent.map((b, idx) => (
            <div
              key={b.bilty_id ?? idx}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-200 transition-colors"
            >
              {/* Left: GR info */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                <div>
                  <p className="text-xs text-slate-400">GR No</p>
                  <p className="font-semibold text-slate-800 font-mono">{b.gr_no}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Date</p>
                  <p className="text-slate-700">
                    {b.bilty_date
                      ? new Date(b.bilty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Consignor</p>
                  <p className="text-slate-700 truncate">{b.consignor_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Consignee</p>
                  <p className="text-slate-700 truncate">{b.consignee_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Pkgs / Wt</p>
                  <p className="text-slate-600">{b.no_of_pkg} pkgs · {b.weight} kg</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Amount</p>
                  <p className="font-semibold text-slate-800">₹{b.total_amount?.toLocaleString('en-IN') ?? '—'}</p>
                </div>
                <div className="flex items-end gap-2">
                  <Badge label={b.status} colorClass={STATUS_COLORS[b.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'} />
                  <Badge label={b.payment_mode} colorClass={PAY_COLORS[b.payment_mode] ?? 'bg-slate-100 text-slate-600 border-slate-200'} />
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button" disabled={printing}
                  onClick={() => onPrint(b.bilty_id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
                >
                  {printing ? '…' : 'Print'}
                </button>
                {b.status !== 'CANCELLED' && (
                  <>
                    <button
                      type="button" onClick={() => onEdit(b.bilty_id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors font-medium"
                    >
                      Edit
                    </button>
                    <button
                      type="button" onClick={() => onCancelOpen(b.bilty_id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {hasMorePages && (
            <div className="text-center pt-2">
              <button
                type="button" disabled={recentLoading}
                onClick={onLoadMore}
                className="px-5 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 disabled:opacity-50 transition-colors"
              >
                {recentLoading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancel modal */}
      {cancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Cancel Bilty</h3>
            <p className="text-sm text-slate-500 mb-4">
              Please provide a reason for cancellation. This action cannot be undone.
            </p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={3}
              placeholder="e.g. Wrong consignee entered…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onCancelClose}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                Back
              </button>
              <button
                type="button" disabled={!cancelReason.trim() || cancelling}
                onClick={onCancelConfirm}
                className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {cancelling ? 'Cancelling…' : 'Cancel Bilty'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
