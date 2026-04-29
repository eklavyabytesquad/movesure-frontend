// Left sidebar: list of un-dispatched challans with select + overview card
import { Challan, Branch, isChallanEditable, STATUS_COLORS } from './types';

interface Props {
  challans: Challan[];
  selectedId: string;
  branches: Branch[];
  onSelect: (id: string) => void;
}

function branchName(id: string | null, branches: Branch[]): string {
  return id ? (branches.find(b => b.branch_id === id)?.name ?? id) : '—';
}

export default function ChallanSidebar({ challans, selectedId, branches, onSelect }: Props) {
  const selected = challans.find(c => c.challan_id === selectedId) ?? null;

  return (
    <div className="w-56 shrink-0 flex flex-col bg-white border-r border-gray-200 h-full overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Select Challan</p>
      </div>

      {/* Challan list */}
      <div className="flex-1 overflow-y-auto py-2 space-y-1 px-2">
        {challans.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">No active challans</p>
        )}
        {challans.map(c => {
          const status = c.challan_status ?? c.status ?? 'DRAFT';
          const isActive = c.challan_id === selectedId;
          return (
            <button
              key={c.challan_id}
              onClick={() => onSelect(c.challan_id)}
              className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                isActive
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'hover:bg-gray-100 text-gray-800'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className={`font-mono font-bold text-sm ${isActive ? 'text-white' : 'text-gray-900'}`}>
                  {c.challan_no ?? '—'}
                  {c.is_primary ? ' ★' : ''}
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${
                  isActive
                    ? 'bg-white/20 text-white border-white/30'
                    : STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  {status}
                </span>
              </div>
              <div className={`text-[11px] ${isActive ? 'text-violet-200' : 'text-gray-400'}`}>
                {c.challan_date}
                {c.bilty_count != null ? ` · ${c.bilty_count} bilties` : ''}
              </div>
              {c.to_branch_id && (
                <div className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-violet-200' : 'text-gray-400'}`}>
                  → {branchName(c.to_branch_id, branches)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected challan overview */}
      {selected && (
        <div className="border-t border-gray-100 px-3 py-3 shrink-0">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Challan Overview</p>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mb-2 ${
            isChallanEditable(selected)
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-orange-50 text-orange-700 border border-orange-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isChallanEditable(selected) ? 'bg-green-500' : 'bg-orange-500'}`} />
            {isChallanEditable(selected) ? 'ACTIVE' : selected.challan_status ?? selected.status}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-gray-400 w-12 shrink-0">Truck</span>
              <span className={`font-medium truncate ${selected.vehicle_info?.vehicle_no ? 'text-gray-700' : 'text-gray-400'}`}>
                {selected.vehicle_info?.vehicle_no ?? 'Not assigned'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-gray-400 w-12 shrink-0">Driver</span>
              <span className={`font-medium truncate ${selected.vehicle_info?.driver_name ? 'text-gray-700' : 'text-gray-400'}`}>
                {selected.vehicle_info?.driver_name ?? 'Not assigned'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-gray-400 w-12 shrink-0">Transport</span>
              <span className={`font-medium truncate ${selected.transport_name ? 'text-gray-700' : 'text-gray-400'}`}>
                {selected.transport_name ?? 'Not assigned'}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 mt-2">Created {selected.challan_date}</p>
        </div>
      )}
    </div>
  );
}
