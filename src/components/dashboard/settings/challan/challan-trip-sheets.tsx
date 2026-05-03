'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';
import { FormInput, SearchableDropdown, SubmitButton, ActionButton } from '../ui';

// ── Types ─────────────────────────────────────────────────────────────────────

interface City         { city_id: string; city_name: string; }
interface Fleet        { fleet_id: string; vehicle_no: string; make?: string; model?: string; }
interface FleetStaff   { staff_id: string; name: string; mobile?: string; }
interface TripChallan  { challan_id: string; challan_no: string | null; challan_date: string; total_bilty_count?: number; total_freight?: number; is_mine?: boolean; }
interface AvailChallan { challan_id: string; challan_no: string | null; challan_date: string; challan_status: string; transport_name: string | null; }

interface TripSheet {
  trip_sheet_id: string;
  trip_sheet_no: string;
  trip_date: string;
  trip_status: 'DRAFT' | 'OPEN' | 'DISPATCHED' | 'ARRIVED' | 'CLOSED';
  status?: 'DRAFT' | 'OPEN' | 'DISPATCHED' | 'ARRIVED' | 'CLOSED';
  transport_name: string | null;
  from_city_id: string | null;
  to_city_id: string | null;
  fleet_id?: string | null;
  driver_id?: string | null;
  owner_id?: string | null;
  conductor_id?: string | null;
  remarks?: string | null;
  vehicle_info: {
    vehicle_no?: string; truck_no?: string; truck_type?: string;
    driver_name?: string; driver_mobile?: string; owner_name?: string;
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:      'bg-gray-100 text-gray-600 border-gray-200',
  OPEN:       'bg-blue-50 text-blue-700 border-blue-200',
  DISPATCHED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ARRIVED:    'bg-green-50 text-green-700 border-green-200',
  CLOSED:     'bg-gray-100 text-gray-500 border-gray-200',
};

const TRUCK_TYPES = ['TRUCK', 'TRAILER', 'MINI_TRUCK', 'PICKUP', 'TANKER', 'OTHER'];

const DEFAULT_FORM = {
  trip_sheet_no:   '',
  trip_date:       new Date().toISOString().split('T')[0],
  from_city_id:    '',
  to_city_id:      '',
  fleet_id:        '',
  driver_id:       '',
  owner_id:        '',
  conductor_id:    '',
  truck_no:        '',
  truck_type:      '',
  owner_name:      '',
  driver_name:     '',
  driver_mobile:   '',
  remarks:         '',
};

export default function ChallanTripSheets() {
  const router    = useRouter();
  const { can }   = usePermissions();
  const canCreate = can(SLUGS.CHALLAN_TRIP_SHEETS_CREATE);
  const canUpdate = can(SLUGS.CHALLAN_TRIP_SHEETS_UPDATE);

  const [sheets,     setSheets]     = useState<TripSheet[]>([]);
  const [cities,     setCities]     = useState<City[]>([]);
  const [vehicles,   setVehicles]   = useState<Fleet[]>([]);
  const [drivers,    setDrivers]    = useState<FleetStaff[]>([]);
  const [owners,     setOwners]     = useState<FleetStaff[]>([]);
  const [conductors, setConductors] = useState<FleetStaff[]>([]);

  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editItem,   setEditItem]   = useState<TripSheet | null>(null);
  const [form,       setForm]       = useState({ ...DEFAULT_FORM });
  const [saving,     setSaving]     = useState(false);
  const [actionId,   setActionId]   = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const [expandedTripId,    setExpandedTripId]    = useState<string | null>(null);
  const [expandedChallans,  setExpandedChallans]  = useState<TripChallan[]>([]);
  const [loadingExpanded,   setLoadingExpanded]   = useState(false);
  const [manageTripId,      setManageTripId]      = useState<string | null>(null);
  const [availChallans,     setAvailChallans]     = useState<AvailChallan[]>([]);
  const [loadingAvail,      setLoadingAvail]      = useState(false);
  const [challanFilter,     setChallanFilter]     = useState('');
  const [addingChallanId,   setAddingChallanId]   = useState<string | null>(null);
  const [removingChallanId, setRemovingChallanId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sheetsRes, cityRes, fleetRes, driverRes, ownerRes, conductorRes] = await Promise.all([
        apiFetch('/v1/challan/trip-sheet'),
        apiFetch('/v1/master/cities?is_active=true'),
        apiFetch('/v1/fleet?status=ACTIVE'),
        apiFetch('/v1/fleet/staff?role=DRIVER'),
        apiFetch('/v1/fleet/staff?role=OWNER'),
        apiFetch('/v1/fleet/staff?role=CONDUCTOR'),
      ]);
      if (sheetsRes.ok) {
        const d = await sheetsRes.json();
        const raw = d.trip_sheets ?? d ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSheets(raw.map((s: any) => ({ ...s, trip_status: s.trip_status ?? s.status ?? 'DRAFT' })));
      }
      if (cityRes.ok)      { const d = await cityRes.json();      setCities(d.cities ?? d ?? []); }
      if (fleetRes.ok)     { const d = await fleetRes.json();     setVehicles(d.fleet ?? d ?? []); }
      if (driverRes.ok)    { const d = await driverRes.json();    setDrivers(d.staff ?? d ?? []); }
      if (ownerRes.ok)     { const d = await ownerRes.json();     setOwners(d.staff ?? d ?? []); }
      if (conductorRes.ok) { const d = await conductorRes.json(); setConductors(d.staff ?? d ?? []); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!getUser()) { router.replace('/auth/login'); return; }
    load();
  }, [load, router]);

  const f = (k: keyof typeof DEFAULT_FORM, val: string) => setForm(p => ({ ...p, [k]: val }));

  function openCreate() {
    setEditItem(null);
    setForm({ ...DEFAULT_FORM, trip_date: new Date().toISOString().split('T')[0] });
    setError(''); setSuccess('');
    setShowForm(true);
  }

  function openEdit(s: TripSheet) {
    setEditItem(s);
    setForm({
      trip_sheet_no: s.trip_sheet_no,
      trip_date:     s.trip_date,
      from_city_id:  s.from_city_id ?? '',
      to_city_id:    s.to_city_id ?? '',
      fleet_id:      s.fleet_id ?? '',
      driver_id:     s.driver_id ?? '',
      owner_id:      s.owner_id ?? '',
      conductor_id:  s.conductor_id ?? '',
      truck_no:      s.vehicle_info?.truck_no ?? s.vehicle_info?.vehicle_no ?? '',
      truck_type:    s.vehicle_info?.truck_type ?? '',
      owner_name:    s.vehicle_info?.owner_name ?? '',
      driver_name:   s.vehicle_info?.driver_name ?? '',
      driver_mobile: s.vehicle_info?.driver_mobile ?? '',
      remarks:       s.remarks ?? '',
    });
    setError(''); setSuccess('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const body: Record<string, unknown> = {
        trip_sheet_no: form.trip_sheet_no || undefined,
        trip_date:     form.trip_date,
      };
      if (form.from_city_id) body.from_city_id = form.from_city_id;
      if (form.to_city_id)   body.to_city_id   = form.to_city_id;
      if (form.remarks)      body.remarks       = form.remarks;

      if (form.fleet_id) {
        body.fleet_id = form.fleet_id;
        if (form.driver_id)    body.driver_id    = form.driver_id;
        if (form.owner_id)     body.owner_id     = form.owner_id;
        if (form.conductor_id) body.conductor_id = form.conductor_id;
      } else {
        const vi: Record<string, string> = {};
        if (form.truck_no)      vi.truck_no      = form.truck_no;
        if (form.truck_type)    vi.truck_type    = form.truck_type;
        if (form.driver_name)   vi.driver_name   = form.driver_name;
        if (form.driver_mobile) vi.driver_mobile = form.driver_mobile;
        if (form.owner_name)    vi.owner_name    = form.owner_name;
        if (Object.keys(vi).length) body.vehicle_info = vi;
      }

      const url    = editItem ? `/v1/challan/trip-sheet/${editItem.trip_sheet_id}` : '/v1/challan/trip-sheet';
      const method = editItem ? 'PUT' : 'POST';
      const res  = await apiFetch(url, { method, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data.detail)
          ? data.detail.map((d: { msg: string }) => d.msg).join('. ')
          : (data.detail ?? 'Failed'));
        return;
      }
      setSuccess(editItem ? 'Trip sheet updated.' : 'Trip sheet created.');
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  }

  async function doAction(id: string, action: 'dispatch' | 'arrive') {
    setActionId(id);
    try {
      await apiFetch(`/v1/challan/trip-sheet/${id}/${action}`, { method: 'POST' });
      load();
    } finally { setActionId(null); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this trip sheet?')) return;
    setDeletingId(id);
    try {
      await apiFetch(`/v1/challan/trip-sheet/${id}`, { method: 'DELETE' });
      load();
    } finally { setDeletingId(null); }
  }

  async function toggleExpand(trip_sheet_id: string) {
    if (expandedTripId === trip_sheet_id) { setExpandedTripId(null); return; }
    setExpandedTripId(trip_sheet_id);
    setExpandedChallans([]);
    setLoadingExpanded(true);
    try {
      const res = await apiFetch(`/v1/challan/trip-sheet/${trip_sheet_id}/challans`);
      if (res.ok) { const d = await res.json(); setExpandedChallans(d ?? []); }
    } finally { setLoadingExpanded(false); }
  }

  async function openManageChallans(trip_sheet_id: string) {
    setManageTripId(trip_sheet_id);
    setChallanFilter('');
    setLoadingAvail(true);
    try {
      const res = await apiFetch('/v1/challan');
      if (res.ok) { const d = await res.json(); setAvailChallans(d.challans ?? d ?? []); }
    } finally { setLoadingAvail(false); }
  }

  async function addChallanToSheet(challanId: string) {
    if (!manageTripId) return;
    setAddingChallanId(challanId);
    try {
      await apiFetch(`/v1/challan/${challanId}/move-to-trip-sheet`, {
        method: 'POST',
        body: JSON.stringify({ trip_sheet_id: manageTripId }),
      });
      setAvailChallans(prev => prev.filter(c => c.challan_id !== challanId));
      if (expandedTripId === manageTripId) {
        const r = await apiFetch(`/v1/challan/trip-sheet/${manageTripId}/challans`);
        if (r.ok) { const d = await r.json(); setExpandedChallans(d ?? []); }
      }
      load();
    } finally { setAddingChallanId(null); }
  }

  async function removeChallanFromSheet(challanId: string) {
    setRemovingChallanId(challanId);
    try {
      await apiFetch(`/v1/challan/${challanId}/remove-from-trip-sheet`, { method: 'POST' });
      setExpandedChallans(prev => prev.filter(c => c.challan_id !== challanId));
      load();
    } finally { setRemovingChallanId(null); }
  }

  const cityOptions    = cities.map(c => ({ value: c.city_id,    label: c.city_name }));
  const vehicleOptions = vehicles.map(v => ({ value: v.fleet_id, label: `${v.vehicle_no}${v.make ? ` · ${v.make}` : ''}${v.model ? ` ${v.model}` : ''}` }));
  const driverOptions  = drivers.map(d => ({ value: d.staff_id,  label: d.name + (d.mobile ? ` (${d.mobile})` : '') }));
  const ownerOptions   = owners.map(o => ({ value: o.staff_id,   label: o.name }));
  const conductorOpts  = conductors.map(c => ({ value: c.staff_id, label: c.name }));

  function cityName(id: string | null) {
    return id ? (cities.find(c => c.city_id === id)?.city_name ?? id) : '—';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">Challan Trip Sheets</h1>
        <span className="text-sm text-gray-400">{sheets.length} sheet{sheets.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-sm text-gray-500 mb-6">Group challans into truck journeys. Dispatch and track deliveries.</p>

      {error   && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      {canCreate && (
        <div className="mb-5">
          <button onClick={openCreate}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            + New Trip Sheet
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-gray-800">{editItem ? 'Edit Trip Sheet' : 'New Trip Sheet'}</h2>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Basic Info</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormInput label="Trip Sheet No" value={form.trip_sheet_no}
                onChange={e => f('trip_sheet_no', e.target.value)} placeholder="e.g. TS-001/25 (auto if blank)" />
              <FormInput label="Trip Date *" required type="date" value={form.trip_date}
                onChange={e => f('trip_date', e.target.value)} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Route</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SearchableDropdown label="From City" value={form.from_city_id}
                onChange={val => f('from_city_id', val)} options={cityOptions} placeholder="Select city" />
              <SearchableDropdown label="To City" value={form.to_city_id}
                onChange={val => f('to_city_id', val)} options={cityOptions} placeholder="Select city" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Vehicle &amp; Crew</p>
            {vehicleOptions.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                <SearchableDropdown label="Vehicle (Fleet)" value={form.fleet_id}
                  onChange={val => f('fleet_id', val)} options={vehicleOptions} placeholder="Select vehicle" />
                <SearchableDropdown label="Driver" value={form.driver_id}
                  onChange={val => f('driver_id', val)} options={driverOptions} placeholder="Select driver" />
                <SearchableDropdown label="Owner (optional)" value={form.owner_id}
                  onChange={val => f('owner_id', val)} options={ownerOptions} placeholder="Select owner" />
                <SearchableDropdown label="Conductor / Helper (optional)" value={form.conductor_id}
                  onChange={val => f('conductor_id', val)} options={conductorOpts} placeholder="Select conductor" />
              </div>
            )}
            {!form.fleet_id && (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-3 font-medium">
                  {vehicleOptions.length > 0
                    ? 'Or enter vehicle details manually (used when no fleet vehicle selected):'
                    : 'No fleet registered. Enter vehicle details manually:'}
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormInput label="Vehicle / Truck No" value={form.truck_no}
                    onChange={e => f('truck_no', e.target.value)} placeholder="MH04AB1234" />
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Truck Type</label>
                    <select value={form.truck_type} onChange={e => f('truck_type', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— Select type —</option>
                      {TRUCK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <FormInput label="Owner Name" value={form.owner_name}
                    onChange={e => f('owner_name', e.target.value)} placeholder="Suresh Transport" />
                  <FormInput label="Driver Name" value={form.driver_name}
                    onChange={e => f('driver_name', e.target.value)} placeholder="Ramesh Kumar" />
                  <FormInput label="Driver Mobile" value={form.driver_mobile}
                    onChange={e => f('driver_mobile', e.target.value)} placeholder="9876543210" />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Remarks (optional)</label>
            <textarea value={form.remarks} onChange={e => f('remarks', e.target.value)}
              placeholder="e.g. Direct trip MUM to DEL" rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <SubmitButton loading={saving} loadingText="Saving…">
              {editItem ? 'Update Trip Sheet' : 'Create Trip Sheet'}
            </SubmitButton>
            <ActionButton variant="cancel" onClick={() => setShowForm(false)}>Cancel</ActionButton>
          </div>
        </form>
      )}

      {manageTripId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Add Challans to Trip Sheet</h3>
              <button onClick={() => setManageTripId(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">x</button>
            </div>
            <div className="px-5 py-3 border-b border-gray-100">
              <FormInput value={challanFilter} onChange={e => setChallanFilter(e.target.value)}
                placeholder="Filter by challan no or transport..." />
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {loadingAvail ? (
                <div className="py-8 text-center text-sm text-gray-400">Loading challans...</div>
              ) : availChallans.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">No challans available.</div>
              ) : (
                <div className="space-y-2">
                  {availChallans
                    .filter(c => {
                      const q = challanFilter.toLowerCase();
                      return !q || (c.challan_no ?? '').toLowerCase().includes(q) ||
                        (c.transport_name ?? '').toLowerCase().includes(q);
                    })
                    .map(c => (
                      <div key={c.challan_id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-semibold text-xs text-gray-900">{c.challan_no ?? 'Pending'}</span>
                            <span className="text-xs text-gray-400">{c.challan_date}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[c.challan_status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>{c.challan_status}</span>
                          </div>
                          {c.transport_name && <p className="text-xs text-gray-500 mt-0.5">{c.transport_name}</p>}
                        </div>
                        <ActionButton variant="primary" size="sm"
                          disabled={addingChallanId === c.challan_id}
                          onClick={() => addChallanToSheet(c.challan_id)}>
                          {addingChallanId === c.challan_id ? '...' : '+ Add'}
                        </ActionButton>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
              <ActionButton variant="cancel" onClick={() => setManageTripId(null)}>Done</ActionButton>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading...</div>
      ) : sheets.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No trip sheets found.</div>
      ) : (
        <div className="space-y-3">
          {sheets.map(s => {
            const st = s.trip_status;
            const vehicleNo  = s.vehicle_info?.vehicle_no ?? s.vehicle_info?.truck_no;
            const driverName = s.vehicle_info?.driver_name;
            return (
              <div key={s.trip_sheet_id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold font-mono text-gray-900 text-sm">{s.trip_sheet_no}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[st]}`}>{st}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>{s.trip_date}</span>
                        <span>{cityName(s.from_city_id)} to {cityName(s.to_city_id)}</span>
                        {vehicleNo   && <span>{vehicleNo}</span>}
                        {driverName  && <span>{driverName}</span>}
                        {s.remarks   && <span className="italic">{s.remarks}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {canUpdate && st === 'OPEN' && (
                        <ActionButton variant="primary" size="sm" disabled={actionId === s.trip_sheet_id}
                          onClick={() => doAction(s.trip_sheet_id, 'dispatch')}>
                          {actionId === s.trip_sheet_id ? '...' : 'Dispatch'}
                        </ActionButton>
                      )}
                      {canUpdate && st === 'DISPATCHED' && (
                        <ActionButton variant="save" size="sm" disabled={actionId === s.trip_sheet_id}
                          onClick={() => doAction(s.trip_sheet_id, 'arrive')}>
                          {actionId === s.trip_sheet_id ? '...' : 'Mark Arrived'}
                        </ActionButton>
                      )}
                      {canUpdate && !['ARRIVED', 'CLOSED'].includes(st) && (
                        <ActionButton variant="edit" size="sm" onClick={() => openEdit(s)}>Edit</ActionButton>
                      )}
                      {canUpdate && ['DRAFT', 'OPEN'].includes(st) && (
                        <ActionButton variant="primary" size="sm" onClick={() => openManageChallans(s.trip_sheet_id)}>
                          + Challans
                        </ActionButton>
                      )}
                      {canUpdate && ['DRAFT', 'OPEN'].includes(st) && (
                        <ActionButton variant="danger" size="sm" disabled={deletingId === s.trip_sheet_id}
                          onClick={() => handleDelete(s.trip_sheet_id)}>
                          {deletingId === s.trip_sheet_id ? '...' : 'Delete'}
                        </ActionButton>
                      )}
                      <button onClick={() => toggleExpand(s.trip_sheet_id)}
                        className="px-3 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium transition-colors">
                        {expandedTripId === s.trip_sheet_id ? 'Hide' : 'View Challans'}
                      </button>
                    </div>
                  </div>
                </div>

                {expandedTripId === s.trip_sheet_id && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Challans on this trip</p>
                      {canUpdate && ['DRAFT', 'OPEN'].includes(st) && (
                        <button onClick={() => openManageChallans(s.trip_sheet_id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                          + Add Challans
                        </button>
                      )}
                    </div>
                    {loadingExpanded ? (
                      <div className="text-center text-xs text-gray-400 py-4">Loading...</div>
                    ) : expandedChallans.length === 0 ? (
                      <div className="text-center text-xs text-gray-400 py-6">No challans assigned yet.</div>
                    ) : (() => {
                      const mine  = expandedChallans.filter(c => c.is_mine !== false);
                      const other = expandedChallans.filter(c => c.is_mine === false);
                      const ChallanRow = ({ c, removable }: { c: TripChallan; removable: boolean }) => (
                        <div className="flex items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 px-3 py-2">
                          <div className="flex items-center gap-3 min-w-0 flex-wrap">
                            <span className="font-mono text-xs font-semibold text-gray-900">{c.challan_no ?? 'Pending'}</span>
                            <span className="text-xs text-gray-500">{c.challan_date}</span>
                            {c.total_bilty_count != null && <span className="text-xs text-gray-400">{c.total_bilty_count} bilties</span>}
                            {c.total_freight != null && <span className="text-xs font-medium text-gray-700">Rs.{c.total_freight.toLocaleString('en-IN')}</span>}
                          </div>
                          {removable && canUpdate && ['DRAFT', 'OPEN'].includes(st) && (
                            <ActionButton variant="danger" size="sm"
                              disabled={removingChallanId === c.challan_id}
                              onClick={() => removeChallanFromSheet(c.challan_id)}>
                              {removingChallanId === c.challan_id ? '...' : 'Remove'}
                            </ActionButton>
                          )}
                        </div>
                      );
                      return (
                        <div className="space-y-4">
                          {mine.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1.5">My Challans</p>
                              <div className="space-y-1.5">
                                {mine.map(c => <ChallanRow key={c.challan_id} c={c} removable />)}
                              </div>
                            </div>
                          )}
                          {other.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Other Branches</p>
                              <div className="space-y-1.5">
                                {other.map(c => <ChallanRow key={c.challan_id} c={c} removable={false} />)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
