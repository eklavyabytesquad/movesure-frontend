// Top header bar: title, challan selector dropdown, status badge, action buttons
import { Challan, ChallanBook, isChallanEditable, bookLabel } from './types';
import ChallanSelector from './ChallanSelector';

const STATUS_COLORS: Record<string, string> = {
  DRAFT:       'bg-gray-100 text-gray-600 border-gray-300',
  OPEN:        'bg-blue-50 text-blue-700 border-blue-200',
};

interface Props {
  challans: Challan[];
  selectedId: string;
  selectedChallan: Challan | null;
  primaryBook: ChallanBook | null;
  actionId: string | null;
  canCreate: boolean;
  canUpdate: boolean;
  showForm: boolean;
  loadingChallans?: boolean;
  onSelectChallan: (id: string) => void;
  onDoAction: (action: 'dispatch' | 'arrive-hub' | 'set-primary') => void;
  onToggleForm: () => void;
}

export default function ChallanTopBar({
  challans, selectedId, selectedChallan, primaryBook, actionId,
  canCreate, canUpdate, showForm, loadingChallans,
  onSelectChallan, onDoAction, onToggleForm,
}: Props) {
  const isEditable = selectedChallan ? isChallanEditable(selectedChallan) : false;
  const status = selectedChallan?.challan_status ?? selectedChallan?.status ?? '';

  return (
    <div className="px-5 pt-3 pb-2.5 bg-white border-b border-gray-200 shrink-0 flex items-center gap-3 flex-wrap">

      {/* Title */}
      <h1 className="text-base font-bold text-gray-900 shrink-0">Challan</h1>

      {/* Book label */}
      {primaryBook && (
        <span className="text-[11px] text-blue-600 font-medium bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full shrink-0">
          {bookLabel(primaryBook)}
        </span>
      )}

      {/* Challan dropdown selector */}
      <ChallanSelector
        challans={challans}
        selectedId={selectedId}
        onSelect={onSelectChallan}
        loading={loadingChallans}
      />

      {/* Selected challan status badges */}
      {selectedChallan && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-extrabold text-violet-700">
            #{selectedChallan.challan_no ?? '—'}
          </span>
          {status && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'
            }`}>
              {status}
            </span>
          )}
          {isEditable && (
            <span className="text-[10px] text-orange-500 font-semibold bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
              Pending dispatch
            </span>
          )}
          {selectedChallan.is_primary && (
            <span className="text-[10px] text-yellow-700 font-semibold bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
              ★ Primary
            </span>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {selectedChallan && canUpdate && (
          <>
            {!selectedChallan.is_primary && isEditable && (
              <button
                disabled={!!actionId}
                onClick={() => onDoAction('set-primary')}
                className="px-3 py-1.5 text-[11px] font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors">
                {actionId === selectedId + 'set-primary' ? '…' : 'Set Primary'}
              </button>
            )}
            {isEditable && (
              <button
                disabled={!!actionId}
                onClick={() => onDoAction('dispatch')}
                className="px-3 py-1.5 text-[11px] font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {actionId === selectedId + 'dispatch' ? '…' : '↑ Dispatch'}
              </button>
            )}
          </>
        )}
        {canCreate && (
          <button
            onClick={onToggleForm}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors">
            {showForm ? '✕ Cancel' : '+ New Challan'}
          </button>
        )}
      </div>
    </div>
  );
}
