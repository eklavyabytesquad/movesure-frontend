// New Challan creation form (collapsible panel)
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Branch, ChallanBook, bookLabel } from '../types';

interface FleetVehicle {
  fleet_id: string;
  vehicle_no: string;
  make?: string;
  model?: string;
}

interface FleetDriver {
  staff_id: string;
  name: string;
  mobile?: string;
}

export interface ChallanFormState {
  to_branch_id: string;
  from_branch_id: string;
  book_id: string;
  transport_name: string;
  vehicle_no: string;
  challan_date: string;
  is_primary: boolean;
  fleet_id: string;
  driver_id: string;
  remarks: string;
}

interface Props {
  form: ChallanFormState;
  setForm: React.Dispatch<React.SetStateAction<ChallanFormState>>;
  branches: Branch[];
  books: ChallanBook[];
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function NewChallanForm({ form, setForm, branches, books, saving, onSubmit, onCancel }: Props) {
  const [fleets, setFleets]   = useState<FleetVehicle[]>([]);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);

  useEffect(() => {
    apiFetch('/v1/fleet?status=ACTIVE&limit=200')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setFleets(d.fleet ?? d.vehicles ?? d ?? []); })
      .catch(() => {});
    apiFetch('/v1/fleet/staff?role=DRIVER&is_active=true&limit=200')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setDrivers(d.staff ?? d ?? []); })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-4 mt-3 shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
      <p className="text-xs font-bold text-gray-700 mb-3">New Challan</p>
      <form onSubmit={onSubmit}>
        {/* Row 1 — Date, Book, Branch, Transport, Manual Vehicle */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-gray-500">Date *</label>
            <input type="date" required value={form.challan_date}
              onChange={e => setForm(f => ({ ...f, challan_date: e.target.value }))}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-gray-500">Book</label>
            <select value={form.book_id} onChange={e => setForm(f => ({ ...f, book_id: e.target.value }))}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Primary (default)</option>
              {books.map(b => <option key={b.book_id} value={b.book_id}>{bookLabel(b)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-gray-500">To Branch</label>
            <select value={form.to_branch_id} onChange={e => setForm(f => ({ ...f, to_branch_id: e.target.value }))}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Select…</option>
              {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-gray-500">Transport</label>
            <input type="text" value={form.transport_name} placeholder="Sharma Transport"
              onChange={e => setForm(f => ({ ...f, transport_name: e.target.value }))}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-gray-500">Vehicle No <span className="font-normal text-gray-400">(manual)</span></label>
            <input type="text" value={form.vehicle_no} placeholder="MH04AB1234"
              onChange={e => setForm(f => ({ ...f, vehicle_no: e.target.value }))}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>

        {/* Row 2 — Fleet, Driver, Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-gray-500">
              Fleet Vehicle <span className="font-normal text-gray-400">(registered)</span>
            </label>
            <select value={form.fleet_id} onChange={e => setForm(f => ({ ...f, fleet_id: e.target.value }))}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">— None / manual entry above —</option>
              {fleets.map(v => (
                <option key={v.fleet_id} value={v.fleet_id}>
                  {v.vehicle_no}{v.make ? ` · ${v.make}` : ''}{v.model ? ` ${v.model}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-gray-500">
              Driver <span className="font-normal text-gray-400">(registered)</span>
            </label>
            <select value={form.driver_id} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">— None —</option>
              {drivers.map(d => (
                <option key={d.staff_id} value={d.staff_id}>
                  {d.name}{d.mobile ? ` · ${d.mobile}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-gray-500">Remarks</label>
            <input type="text" value={form.remarks}
              placeholder="e.g. Fragile goods — handle with care"
              onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {saving ? 'Creating…' : 'Create'}
          </button>
          <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
          <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
            <input type="checkbox" checked={form.is_primary}
              onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))}
              className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600" />
            <span className="text-[11px] text-gray-600 font-medium">Set as primary</span>
          </label>
        </div>
      </form>
    </div>
  );
}
