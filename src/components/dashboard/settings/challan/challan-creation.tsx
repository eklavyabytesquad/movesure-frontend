'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';
import { FormInput, SearchableDropdown, SubmitButton, ActionButton } from '../ui';

interface Branch          { branch_id: string; name: string; }
interface ChallanBook     { book_id: string; book_name: string; route_scope: string; }
interface TripSheetSummary { trip_sheet_id: string; trip_sheet_no: string; trip_date: string; trip_status: string; vehicle_info?: { vehicle_no?: string; driver_name?: string } | null; }
interface FleetVehicle    { fleet_id: string; vehicle_no: string; current_driver_id: string | null; current_owner_id: string | null; current_conductor_id: string | null; }
interface FleetStaff      { staff_id: string; name: string; role: string; mobile: string | null; }
interface BiltySummary {
  bilty_id: string; gr_no: string; bilty_date: string;
  consignor_name: string; consignee_name: string;
  payment_mode: string; total_amount: number;
}
interface Challan {
  challan_id: string;
  challan_no: string | null;
  challan_date: string;
  challan_status: 'DRAFT' | 'OPEN' | 'DISPATCHED' | 'ARRIVED_HUB' | 'CLOSED';
  is_primary: boolean;
  branch_id: string | null;
  transport_name: string | null;
  vehicle_info: { vehicle_no?: string } | null;
  to_branch_id: string | null;
  from_branch_id: string | null;
  trip_sheet_id: string | null;
  bilty_count?: number;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:       'bg-gray-100 text-gray-600 border-gray-200',
  OPEN:        'bg-blue-50 text-blue-700 border-blue-200',
  DISPATCHED:  'bg-indigo-50 text-indigo-700 border-indigo-200',
  ARRIVED_HUB: 'bg-green-50 text-green-700 border-green-200',
  CLOSED:      'bg-gray-100 text-gray-500 border-gray-200',
};

const DEFAULT_FORM = {
  branch_id: '',
  to_branch_id: '',
  from_branch_id: '',
  book_id: '',
  transport_name: '',
  vehicle_no: '',
  fleet_id: '',
  driver_id: '',
  owner_id: '',
  challan_date: new Date().toISOString().split('T')[0],
  is_primary: false,
};

export default function ChallanCreation() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can(SLUGS.CHALLAN_CREATE);
  const canUpdate = can(SLUGS.CHALLAN_UPDATE);

  const [challans, setChallans]         = useState<Challan[]>([]);
  const [branches, setBranches]         = useState<Branch[]>([]);
  const [books, setBooks]               = useState<ChallanBook[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
  const [drivers, setDrivers]           = useState<FleetStaff[]>([]);
  const [owners, setOwners]             = useState<FleetStaff[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editItem, setEditItem]         = useState<Challan | null>(null);
  const [form, setForm]                 = useState({ ...DEFAULT_FORM });
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [actionId, setActionId]         = useState<string | null>(null);

  // Add bilty modal
  const [addBiltyId, setAddBiltyId]     = useState<string | null>(null);
  const [availBilties, setAvailBilties] = useState<BiltySummary[]>([]);
  const [loadingBilties, setLoadingBilties] = useState(false);
  const [toCityFilter, setToCityFilter] = useState('');
  const [addingBilty, setAddingBilty]   = useState<string | null>(null);

  // Expanded challan bilties panel
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [expandedBilties, setExpandedBilties] = useState<BiltySummary[]>([]);
  const [loadingExpanded, setLoadingExpanded] = useState(false);

  // Assign to trip sheet modal
  const [assignTripChallanId, setAssignTripChallanId] = useState<string | null>(null);
  const [allTripSheets, setAllTripSheets]             = useState<TripSheetSummary[]>([]);
  const [tripSheets, setTripSheets]                   = useState<TripSheetSummary[]>([]);
  const [assigningTrip, setAssigningTrip]             = useState<string | null>(null);
  const [removingTrip, setRemovingTrip]               = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [challanRes, branchRes, bookRes, tripSheetRes, fleetRes, driverRes, ownerRes] = await Promise.all([
        apiFetch(`/v1/challan`),
        apiFetch(`/v1/master/branches?is_active=true`),
        apiFetch(`/v1/challan/book?is_active=true`),
        apiFetch(`/v1/challan/trip-sheet`),
        apiFetch(`/v1/fleet?is_active=true&limit=200`),
        apiFetch(`/v1/fleet/staff?role=DRIVER&is_active=true&limit=200`),
        apiFetch(`/v1/fleet/staff?role=OWNER&is_active=true&limit=200`),
      ]);
      if (challanRes.ok)   { const d = await challanRes.json();   setChallans(d.challans ?? d ?? []); }
      if (branchRes.ok)    { const d = await branchRes.json();    setBranches(d.branches ?? d ?? []); }
      if (bookRes.ok)      { const d = await bookRes.json();      setBooks(d.books ?? d ?? []); }
      if (tripSheetRes.ok) { const d = await tripSheetRes.json(); const ts = d.trip_sheets ?? d ?? []; setAllTripSheets(ts); }
      if (fleetRes.ok)     { const d = await fleetRes.json();     setFleetVehicles(d.fleet ?? d ?? []); }
      if (driverRes.ok)    { const d = await driverRes.json();    setDrivers(d.staff ?? d ?? []); }
      if (ownerRes.ok)     { const d = await ownerRes.json();     setOwners(d.staff ?? d ?? []); }
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!getUser()) { router.replace('/auth/login'); return; }
    load();
  }, [load, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      if (editItem) {
        // Update existing challan
        const body: Record<string, unknown> = { challan_date: form.challan_date };
        if (form.to_branch_id)   body.to_branch_id   = form.to_branch_id;
        if (form.from_branch_id) body.from_branch_id = form.from_branch_id;
        if (form.transport_name) body.transport_name = form.transport_name;
        if (form.fleet_id)       body.fleet_id       = form.fleet_id;
        if (form.driver_id)      body.driver_id      = form.driver_id;
        if (form.owner_id)       body.owner_id       = form.owner_id;
        body.vehicle_info = form.vehicle_no ? { vehicle_no: form.vehicle_no } : null;
        const res = await apiFetch(`/v1/challan/${editItem.challan_id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(Array.isArray(data.detail) ? data.detail.map((d: { msg: string }) => d.msg).join('. ') : (data.detail ?? 'Failed'));
          return;
        }
        setSuccess('Challan updated.');
      } else {
        // Create new challan
        const body: Record<string, unknown> = {
          challan_date: form.challan_date,
          is_primary:   form.is_primary,
        };
        if (form.branch_id)      body.branch_id      = form.branch_id;
        if (form.to_branch_id)   body.to_branch_id   = form.to_branch_id;
        if (form.from_branch_id) body.from_branch_id = form.from_branch_id;
        if (form.book_id)        body.book_id        = form.book_id;
        if (form.transport_name) body.transport_name = form.transport_name;
        if (form.fleet_id)       body.fleet_id       = form.fleet_id;
        if (form.driver_id)      body.driver_id      = form.driver_id;
        if (form.owner_id)       body.owner_id       = form.owner_id;
        if (form.vehicle_no)     body.vehicle_info   = { vehicle_no: form.vehicle_no };
        const res = await apiFetch(`/v1/challan`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(Array.isArray(data.detail) ? data.detail.map((d: { msg: string }) => d.msg).join('. ') : (data.detail ?? 'Failed'));
          return;
        }
        setSuccess('Challan created.');
      }
      setShowForm(false);
      setEditItem(null);
      setForm({ ...DEFAULT_FORM, challan_date: new Date().toISOString().split('T')[0] });
      load();
    } finally { setSaving(false); }
  }

  function openEdit(c: Challan) {
    setEditItem(c);
    setForm({
      branch_id:      '',
      challan_date:   c.challan_date,
      from_branch_id: c.from_branch_id ?? '',
      to_branch_id:   c.to_branch_id ?? '',
      book_id:        '',
      transport_name: c.transport_name ?? '',
      vehicle_no:     c.vehicle_info?.vehicle_no ?? '',
      fleet_id:       '',
      driver_id:      '',
      owner_id:       '',
      is_primary:     c.is_primary,
    });
    setError(''); setSuccess('');
    setShowForm(true);
  }

  function openAssignTrip(challanId: string) {
    setAssignTripChallanId(challanId);
    setTripSheets(allTripSheets.filter(s => ['DRAFT', 'OPEN'].includes(s.trip_status)));
  }

  async function assignChallanToTrip(tripSheetId: string) {
    if (!assignTripChallanId) return;
    setAssigningTrip(tripSheetId);
    try {
      const res = await apiFetch(`/v1/challan/${assignTripChallanId}/move-to-trip-sheet`, {
        method: 'POST',
        body: JSON.stringify({ trip_sheet_id: tripSheetId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? 'Failed to assign trip sheet');
        return;
      }
      setSuccess('Challan assigned to trip sheet.');
      setAssignTripChallanId(null);
      load();
    } finally { setAssigningTrip(null); }
  }

  async function removeChallanFromTrip(challanId: string) {
    setRemovingTrip(challanId);
    try {
      await apiFetch(`/v1/challan/${challanId}/remove-from-trip-sheet`, {
        method: 'POST',
      });
      setSuccess('Challan removed from trip sheet.');
      load();
    } finally { setRemovingTrip(null); }
  }

  async function doAction(id: string, action: 'dispatch' | 'arrive-hub' | 'set-primary') {
    setActionId(id + action);
    try {
      await apiFetch(`/v1/challan/${id}/${action}`, {
        method: 'POST',
      });
      load();
    } finally { setActionId(null); }
  }

  async function openAddBilty(challanId: string) {
    setAddBiltyId(challanId);
    setToCityFilter('');
    setLoadingBilties(true);
    try {
      const res = await apiFetch(`/v1/challan/available-bilties`);
      if (res.ok) { const d = await res.json(); setAvailBilties(d.bilties ?? d ?? []); }
    } finally { setLoadingBilties(false); }
  }

  async function addBiltyToChallan(biltyId: string) {
    if (!addBiltyId) return;
    setAddingBilty(biltyId);
    try {
      await apiFetch(`/v1/challan/${addBiltyId}/add-bilty`, {
        method: 'POST',
        body: JSON.stringify({ bilty_id: biltyId }),
      });
      setAvailBilties(prev => prev.filter(b => b.bilty_id !== biltyId));
      load();
    } finally { setAddingBilty(null); }
  }

  async function removeBiltyFromChallan(challanId: string, biltyId: string) {
    await apiFetch(`/v1/challan/${challanId}/remove-bilty/${biltyId}`, {
      method: 'POST',
    });
    setExpandedBilties(prev => prev.filter(b => b.bilty_id !== biltyId));
    load();
  }

  async function toggleExpand(challanId: string) {
    if (expandedId === challanId) { setExpandedId(null); return; }
    setExpandedId(challanId);
    setExpandedBilties([]);
    setLoadingExpanded(true);
    try {
      const res = await apiFetch(`/v1/challan/${challanId}/bilties`);
      if (res.ok) { const d = await res.json(); setExpandedBilties(d.bilties ?? d ?? []); }
    } finally { setLoadingExpanded(false); }
  }

  function branchName(id: string | null) {
    return id ? (branches.find(b => b.branch_id === id)?.name ?? id) : '—';
  }

  function onFleetSelect(fleetId: string) {
    const v = fleetVehicles.find(f => f.fleet_id === fleetId);
    setForm(p => ({
      ...p,
      fleet_id:  fleetId,
      driver_id: v?.current_driver_id  ?? p.driver_id,
      owner_id:  v?.current_owner_id   ?? p.owner_id,
    }));
  }

  const editableStatuses = ['DRAFT', 'OPEN'];
  const branchOptions  = branches.map(b => ({ value: b.branch_id, label: b.name }));
  const bookOptions    = books.map(b => ({ value: b.book_id, label: `${b.book_name} [${b.route_scope}]` }));
  const vehicleOptions = fleetVehicles.map(v => ({ value: v.fleet_id, label: v.vehicle_no }));
  const driverOptions  = drivers.map(s => ({ value: s.staff_id, label: `${s.name}${s.mobile ? ` (${s.mobile})` : ''}` }));
  const ownerOptions   = owners.map(s  => ({ value: s.staff_id, label: s.name }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">Challans</h1>
        <span className="text-sm text-gray-400">{challans.length} challan{challans.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-sm text-gray-500 mb-6">Create and manage dispatch challans. Add bilties, dispatch, and track arrival.</p>

      {error   && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      {canCreate && (
        <div className="mb-5">
          <button onClick={() => { setEditItem(null); setForm({ ...DEFAULT_FORM, challan_date: new Date().toISOString().split('T')[0] }); setShowForm(true); setError(''); setSuccess(''); }}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            + New Challan
          </button>
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <form onSubmit={handleSave} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">{editItem ? 'Edit Challan' : 'New Challan'}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormInput
              label="Challan Date *"
              required
              type="date"
              value={form.challan_date}
              onChange={e => setForm(p => ({ ...p, challan_date: e.target.value }))}
            />
            {!editItem && (
              <SearchableDropdown
                label="Create Under Branch"
                value={form.branch_id}
                onChange={val => setForm(p => ({ ...p, branch_id: val }))}
                options={branchOptions}
                placeholder="Current branch (default)"
              />
            )}
            <SearchableDropdown
              label="From Branch"
              value={form.from_branch_id}
              onChange={val => setForm(p => ({ ...p, from_branch_id: val }))}
              options={branchOptions}
              placeholder="Current branch (default)"
            />
            <SearchableDropdown
              label="Destination Branch"
              value={form.to_branch_id}
              onChange={val => setForm(p => ({ ...p, to_branch_id: val }))}
              options={branchOptions}
              placeholder="Select branch"
            />
            {!editItem && (
              <SearchableDropdown
                label="Challan Book"
                value={form.book_id}
                onChange={val => setForm(p => ({ ...p, book_id: val }))}
                options={bookOptions}
                placeholder="Use primary book (default)"
              />
            )}
            <FormInput
              label="Transport Name"
              value={form.transport_name}
              onChange={e => setForm(p => ({ ...p, transport_name: e.target.value }))}
              placeholder="Sharma Transport"
            />
            {vehicleOptions.length > 0 ? (
              <SearchableDropdown
                label="Vehicle (Fleet)"
                value={form.fleet_id}
                onChange={onFleetSelect}
                options={vehicleOptions}
                placeholder="Select registered vehicle"
              />
            ) : (
              <FormInput
                label="Vehicle No"
                value={form.vehicle_no}
                onChange={e => setForm(p => ({ ...p, vehicle_no: e.target.value }))}
                placeholder="MH04AB1234"
              />
            )}
            {vehicleOptions.length > 0 && (
              <FormInput
                label="Vehicle No (override)"
                value={form.vehicle_no}
                onChange={e => setForm(p => ({ ...p, vehicle_no: e.target.value }))}
                placeholder="Leave blank to use registered no."
              />
            )}
            <SearchableDropdown
              label="Driver"
              value={form.driver_id}
              onChange={val => setForm(p => ({ ...p, driver_id: val }))}
              options={driverOptions}
              placeholder="Select driver"
            />
            <SearchableDropdown
              label="Owner"
              value={form.owner_id}
              onChange={val => setForm(p => ({ ...p, owner_id: val }))}
              options={ownerOptions}
              placeholder="Select owner"
            />
            {!editItem && (
              <div className="sm:col-span-3 flex items-center gap-2">
                <input type="checkbox" id="is_primary_chln" checked={form.is_primary}
                  onChange={e => setForm(p => ({ ...p, is_primary: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                <label htmlFor="is_primary_chln" className="text-sm text-gray-700">Set as primary challan for this branch</label>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-3">
            <SubmitButton loading={saving} loadingText={editItem ? 'Updating…' : 'Creating…'}>
              {editItem ? 'Update Challan' : 'Create Challan'}
            </SubmitButton>
            <ActionButton variant="cancel" onClick={() => { setShowForm(false); setEditItem(null); }}>Cancel</ActionButton>
          </div>
        </form>
      )}

      {/* Assign Trip Sheet Modal */}
      {assignTripChallanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[70vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Assign to Trip Sheet</h3>
              <button onClick={() => setAssignTripChallanId(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {tripSheets.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">No open trip sheets found. Create one from the Trip Sheets page first.</div>
              ) : (
                <div className="space-y-2">
                  {tripSheets.map(s => (
                    <div key={s.trip_sheet_id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                      <div>
                        <p className="font-mono font-semibold text-sm text-gray-900">{s.trip_sheet_no}</p>
                        <p className="text-xs text-gray-500">{s.trip_date} &middot; <span className="uppercase">{s.trip_status}</span></p>
                      </div>
                      <ActionButton variant="primary" size="sm" disabled={assigningTrip === s.trip_sheet_id} onClick={() => assignChallanToTrip(s.trip_sheet_id)}>
                        {assigningTrip === s.trip_sheet_id ? '…' : 'Assign'}
                      </ActionButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
              <ActionButton variant="cancel" onClick={() => setAssignTripChallanId(null)}>Close</ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Add Bilty Modal */}
      {addBiltyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Add Bilties to Challan</h3>
              <button onClick={() => setAddBiltyId(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="px-5 py-3 border-b border-gray-100">
              <FormInput
                value={toCityFilter}
                onChange={e => setToCityFilter(e.target.value)}
                placeholder="Filter by consignor, consignee or GR…"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {loadingBilties ? (
                <div className="py-8 text-center text-sm text-gray-400">Loading bilties…</div>
              ) : availBilties.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">No available bilties. All assigned or none exist.</div>
              ) : (
                <div className="space-y-2">
                  {availBilties
                    .filter(b => {
                      const q = toCityFilter.toLowerCase();
                      return !q || b.gr_no.toLowerCase().includes(q) ||
                        b.consignor_name.toLowerCase().includes(q) ||
                        b.consignee_name.toLowerCase().includes(q);
                    })
                    .map(b => (
                      <div key={b.bilty_id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-xs text-gray-900">{b.gr_no}</span>
                            <span className="text-xs text-gray-400">{b.bilty_date}</span>
                            <span className="text-xs text-gray-400 uppercase">{b.payment_mode}</span>
                          </div>
                          <p className="text-xs text-gray-600 truncate">{b.consignor_name} → {b.consignee_name}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-gray-800">₹{b.total_amount?.toLocaleString('en-IN')}</span>
                          <ActionButton variant="primary" size="sm" disabled={addingBilty === b.bilty_id} onClick={() => addBiltyToChallan(b.bilty_id)}>
                            {addingBilty === b.bilty_id ? '…' : '+ Add'}
                          </ActionButton>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
              <ActionButton variant="cancel" onClick={() => setAddBiltyId(null)}>Done</ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Challan list */}
      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : challans.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No challans found. Create one to start dispatching bilties.</div>
      ) : (
        <div className="space-y-3">
          {challans.map(c => (
            <div key={c.challan_id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold font-mono text-gray-900">{c.challan_no ?? 'Pending No.'}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.challan_status]}`}>
                        {c.challan_status}
                      </span>
                      {c.is_primary && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">PRIMARY</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>📅 {c.challan_date}</span>
                      {c.transport_name && <span>🚛 {c.transport_name}</span>}
                      {c.vehicle_info?.vehicle_no && <span>🚘 {c.vehicle_info.vehicle_no}</span>}
                      {c.to_branch_id && <span>📦 To: {branchName(c.to_branch_id)}</span>}
                      {c.trip_sheet_id && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200 font-medium">
                          📋 {allTripSheets.find(s => s.trip_sheet_id === c.trip_sheet_id)?.trip_sheet_no ?? 'On Trip Sheet'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {canUpdate && c.challan_status !== 'CLOSED' && (
                      <ActionButton variant="edit" size="sm" onClick={() => openEdit(c)}>Edit</ActionButton>
                    )}
                    {canUpdate && editableStatuses.includes(c.challan_status) && (
                      <ActionButton variant="edit" size="sm" onClick={() => openAddBilty(c.challan_id)}>+ Bilties</ActionButton>
                    )}
                    {canUpdate && editableStatuses.includes(c.challan_status) && !c.trip_sheet_id && (
                      <ActionButton variant="primary" size="sm" onClick={() => openAssignTrip(c.challan_id)}>+ Trip Sheet</ActionButton>
                    )}
                    {canUpdate && editableStatuses.includes(c.challan_status) && c.trip_sheet_id && (
                      <ActionButton variant="danger" size="sm" disabled={removingTrip === c.challan_id} onClick={() => removeChallanFromTrip(c.challan_id)}>
                        {removingTrip === c.challan_id ? '…' : '✕ Trip Sheet'}
                      </ActionButton>
                    )}
                    {canUpdate && !c.is_primary && editableStatuses.includes(c.challan_status) && (
                      <ActionButton variant="primary" size="sm" disabled={actionId === c.challan_id + 'set-primary'} onClick={() => doAction(c.challan_id, 'set-primary')}>
                        Set Primary
                      </ActionButton>
                    )}
                    {canUpdate && c.challan_status === 'OPEN' && (
                      <ActionButton variant="primary" size="sm" disabled={actionId === c.challan_id + 'dispatch'} onClick={() => doAction(c.challan_id, 'dispatch')}>
                        {actionId === c.challan_id + 'dispatch' ? '…' : 'Dispatch'}
                      </ActionButton>
                    )}
                    {canUpdate && c.challan_status === 'DISPATCHED' && (
                      <ActionButton variant="save" size="sm" disabled={actionId === c.challan_id + 'arrive-hub'} onClick={() => doAction(c.challan_id, 'arrive-hub')}>
                        {actionId === c.challan_id + 'arrive-hub' ? '…' : 'Arrive Hub'}
                      </ActionButton>
                    )}
                    <button onClick={() => toggleExpand(c.challan_id)}
                      className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      {expandedId === c.challan_id ? 'Hide Bilties ▲' : 'View Bilties ▼'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded bilties panel */}
              {expandedId === c.challan_id && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  {loadingExpanded ? (
                    <div className="text-center text-xs text-gray-400 py-4">Loading bilties…</div>
                  ) : expandedBilties.length === 0 ? (
                    <div className="text-center text-xs text-gray-400 py-4">No bilties on this challan yet.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {expandedBilties.map(b => (
                        <div key={b.bilty_id} className="flex items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 px-3 py-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs font-semibold text-gray-900">{b.gr_no}</span>
                            <span className="text-xs text-gray-500 truncate">{b.consignor_name} → {b.consignee_name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-semibold text-gray-700">₹{b.total_amount?.toLocaleString('en-IN')}</span>
                            {canUpdate && editableStatuses.includes(c.challan_status) && (
                              <ActionButton variant="danger" size="sm" onClick={() => removeBiltyFromChallan(c.challan_id, b.bilty_id)}>Remove</ActionButton>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
