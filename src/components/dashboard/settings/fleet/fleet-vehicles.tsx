'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';
import { FormInput, SearchableDropdown, SubmitButton, ActionButton } from '../ui';

interface FleetStaffMinimal { staff_id: string; name: string; role: string; mobile: string | null; }
interface FleetVehicle {
  fleet_id: string;
  vehicle_no: string;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  year_of_manufacture: number | null;
  body_type: string | null;
  capacity_kg: number | null;
  status: string;
  insurance_expiry: string | null;
  rc_expiry: string | null;
  permit_expiry: string | null;
  fitness_expiry: string | null;
  puc_expiry: string | null;
  current_driver_id: string | null;
  current_owner_id: string | null;
  current_conductor_id: string | null;
  current_driver: FleetStaffMinimal | null;
  current_owner: FleetStaffMinimal | null;
  current_conductor: FleetStaffMinimal | null;
}

const VEHICLE_TYPES = ['TRUCK','TRAILER','MINI_TRUCK','PICKUP','TANKER','OTHER'].map(v => ({ value: v, label: v.replace('_', ' ') }));
const BODY_TYPES    = ['OPEN','CLOSED','CONTAINER','FLATBED','TANKER','OTHER'].map(v => ({ value: v, label: v }));
const STATUSES      = ['ACTIVE','IN_TRANSIT','MAINTENANCE','INACTIVE'].map(v => ({ value: v, label: v.replace('_', ' ') }));

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:      'bg-green-50 text-green-700 border-green-200',
  IN_TRANSIT:  'bg-blue-50 text-blue-700 border-blue-200',
  MAINTENANCE: 'bg-orange-50 text-orange-700 border-orange-200',
  INACTIVE:    'bg-gray-100 text-gray-500 border-gray-200',
};

const DEFAULT_FORM = {
  vehicle_no: '', vehicle_type: 'TRUCK', make: '', model: '',
  year_of_manufacture: '', body_type: '', capacity_kg: '',
  current_driver_id: '', current_owner_id: '', current_conductor_id: '',
  insurance_no: '', insurance_expiry: '',
  rc_no: '', rc_expiry: '',
  permit_no: '', permit_type: '', permit_expiry: '',
  fitness_expiry: '', puc_expiry: '',
  notes: '',
};

export default function FleetVehicles() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can(SLUGS.FLEET_CREATE);
  const canUpdate = can(SLUGS.FLEET_UPDATE);
  const canDelete = can(SLUGS.FLEET_DELETE);

  const [vehicles, setVehicles]   = useState<FleetVehicle[]>([]);
  const [drivers, setDrivers]     = useState<FleetStaffMinimal[]>([]);
  const [owners, setOwners]       = useState<FleetStaffMinimal[]>([]);
  const [conductors, setConductors] = useState<FleetStaffMinimal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState<FleetVehicle | null>(null);
  const [form, setForm]           = useState({ ...DEFAULT_FORM });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ is_active: 'true', limit: '200' });
      if (statusFilter) params.set('status', statusFilter);
      const [vRes, dRes, oRes, cRes] = await Promise.all([
        apiFetch(`/v1/fleet?${params}`),
        apiFetch(`/v1/fleet/staff?role=DRIVER&is_active=true&limit=200`),
        apiFetch(`/v1/fleet/staff?role=OWNER&is_active=true&limit=200`),
        apiFetch(`/v1/fleet/staff?role=CONDUCTOR&is_active=true&limit=200`),
      ]);
      if (vRes.ok) { const d = await vRes.json(); setVehicles(d.fleet ?? d ?? []); }
      if (dRes.ok) { const d = await dRes.json(); setDrivers(d.staff ?? d ?? []); }
      if (oRes.ok) { const d = await oRes.json(); setOwners(d.staff ?? d ?? []); }
      if (cRes.ok) { const d = await cRes.json(); setConductors(d.staff ?? d ?? []); }
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (!getUser()) { router.replace('/auth/login'); return; }
    load();
  }, [load, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const body: Record<string, unknown> = { vehicle_no: form.vehicle_no, vehicle_type: form.vehicle_type };
      if (form.make)               body.make               = form.make;
      if (form.model)              body.model              = form.model;
      if (form.year_of_manufacture) body.year_of_manufacture = Number(form.year_of_manufacture);
      if (form.body_type)          body.body_type          = form.body_type;
      if (form.capacity_kg)        body.capacity_kg        = Number(form.capacity_kg);
      if (form.current_driver_id)  body.current_driver_id  = form.current_driver_id;
      if (form.current_owner_id)   body.current_owner_id   = form.current_owner_id;
      if (form.current_conductor_id) body.current_conductor_id = form.current_conductor_id;
      if (form.insurance_no)       body.insurance_no       = form.insurance_no;
      if (form.insurance_expiry)   body.insurance_expiry   = form.insurance_expiry;
      if (form.rc_no)              body.rc_no              = form.rc_no;
      if (form.rc_expiry)          body.rc_expiry          = form.rc_expiry;
      if (form.permit_no)          body.permit_no          = form.permit_no;
      if (form.permit_type)        body.permit_type        = form.permit_type;
      if (form.permit_expiry)      body.permit_expiry      = form.permit_expiry;
      if (form.fitness_expiry)     body.fitness_expiry     = form.fitness_expiry;
      if (form.puc_expiry)         body.puc_expiry         = form.puc_expiry;
      if (form.notes)              body.notes              = form.notes;

      const url    = editItem ? `/v1/fleet/${editItem.fleet_id}` : `/v1/fleet`;
      const method = editItem ? 'PATCH' : 'POST';
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data.detail) ? data.detail.map((d: { msg: string }) => d.msg).join('. ') : (data.detail ?? 'Failed'));
        return;
      }
      setSuccess(editItem ? 'Vehicle updated.' : 'Vehicle registered.');
      setShowForm(false); setEditItem(null); setForm({ ...DEFAULT_FORM });
      load();
    } finally { setSaving(false); }
  }

  function openEdit(v: FleetVehicle) {
    setEditItem(v);
    setForm({
      vehicle_no: v.vehicle_no, vehicle_type: v.vehicle_type,
      make: v.make ?? '', model: v.model ?? '',
      year_of_manufacture: v.year_of_manufacture?.toString() ?? '',
      body_type: v.body_type ?? '', capacity_kg: v.capacity_kg?.toString() ?? '',
      current_driver_id: v.current_driver_id ?? '',
      current_owner_id:  v.current_owner_id  ?? '',
      current_conductor_id: v.current_conductor_id ?? '',
      insurance_no: '', insurance_expiry: v.insurance_expiry ?? '',
      rc_no: '', rc_expiry: v.rc_expiry ?? '',
      permit_no: '', permit_type: '', permit_expiry: v.permit_expiry ?? '',
      fitness_expiry: v.fitness_expiry ?? '', puc_expiry: v.puc_expiry ?? '',
      notes: '',
    });
    setError(''); setSuccess(''); setShowForm(true);
  }

  async function deactivate(fleetId: string) {
    setDeactivatingId(fleetId);
    try {
      await apiFetch(`/v1/fleet/${fleetId}`, {
        method: 'DELETE',
      });
      setSuccess('Vehicle deactivated.');
      load();
    } finally { setDeactivatingId(null); }
  }

  function expiryBadge(dateStr: string | null, label: string) {
    if (!dateStr) return null;
    const days = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
    let cls = 'text-gray-500';
    if (days < 0)  cls = 'text-red-600 font-semibold';
    else if (days < 7)  cls = 'text-red-500 font-semibold';
    else if (days < 30) cls = 'text-orange-500 font-semibold';
    return <span className={`text-[10px] ${cls}`}>{label}: {dateStr}{days < 0 ? ' ⚠️' : days < 30 ? ` (${days}d)` : ''}</span>;
  }

  const driverOpts    = drivers.map(s    => ({ value: s.staff_id, label: `${s.name}${s.mobile ? ` (${s.mobile})` : ''}` }));
  const ownerOpts     = owners.map(s     => ({ value: s.staff_id, label: s.name }));
  const conductorOpts = conductors.map(s => ({ value: s.staff_id, label: s.name }));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">Fleet Vehicles</h1>
        <span className="text-sm text-gray-400">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-sm text-gray-500 mb-5">Register and manage trucks. Track documents and assign drivers.</p>

      {error   && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        {canCreate && (
          <button onClick={() => { setEditItem(null); setForm({ ...DEFAULT_FORM }); setError(''); setSuccess(''); setShowForm(true); }}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            + Register Vehicle
          </button>
        )}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSave} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">{editItem ? 'Edit Vehicle' : 'Register Vehicle'}</h2>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vehicle Details</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
            <FormInput label="Vehicle No *" required value={form.vehicle_no} onChange={e => setForm(p => ({ ...p, vehicle_no: e.target.value.toUpperCase() }))} placeholder="MH04AB1234" />
            <SearchableDropdown label="Vehicle Type" value={form.vehicle_type} onChange={val => setForm(p => ({ ...p, vehicle_type: val }))} options={VEHICLE_TYPES} placeholder="Select type" />
            <SearchableDropdown label="Body Type" value={form.body_type} onChange={val => setForm(p => ({ ...p, body_type: val }))} options={BODY_TYPES} placeholder="Select body" />
            <FormInput label="Make" value={form.make} onChange={e => setForm(p => ({ ...p, make: e.target.value }))} placeholder="TATA" />
            <FormInput label="Model" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} placeholder="407" />
            <FormInput label="Year" type="number" value={form.year_of_manufacture} onChange={e => setForm(p => ({ ...p, year_of_manufacture: e.target.value }))} placeholder="2020" />
            <FormInput label="Capacity (kg)" type="number" value={form.capacity_kg} onChange={e => setForm(p => ({ ...p, capacity_kg: e.target.value }))} placeholder="10000" />
          </div>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned Staff</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
            <SearchableDropdown label="Driver" value={form.current_driver_id} onChange={val => setForm(p => ({ ...p, current_driver_id: val }))} options={driverOpts} placeholder="Select driver" />
            <SearchableDropdown label="Owner" value={form.current_owner_id} onChange={val => setForm(p => ({ ...p, current_owner_id: val }))} options={ownerOpts} placeholder="Select owner" />
            <SearchableDropdown label="Conductor" value={form.current_conductor_id} onChange={val => setForm(p => ({ ...p, current_conductor_id: val }))} options={conductorOpts} placeholder="Select conductor" />
          </div>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Documents</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
            <FormInput label="RC No" value={form.rc_no} onChange={e => setForm(p => ({ ...p, rc_no: e.target.value }))} placeholder="RC number" />
            <FormInput label="RC Expiry" type="date" value={form.rc_expiry} onChange={e => setForm(p => ({ ...p, rc_expiry: e.target.value }))} />
            <FormInput label="Insurance No" value={form.insurance_no} onChange={e => setForm(p => ({ ...p, insurance_no: e.target.value }))} placeholder="POL/2024/12345" />
            <FormInput label="Insurance Expiry" type="date" value={form.insurance_expiry} onChange={e => setForm(p => ({ ...p, insurance_expiry: e.target.value }))} />
            <FormInput label="Permit No" value={form.permit_no} onChange={e => setForm(p => ({ ...p, permit_no: e.target.value }))} placeholder="Permit number" />
            <FormInput label="Permit Expiry" type="date" value={form.permit_expiry} onChange={e => setForm(p => ({ ...p, permit_expiry: e.target.value }))} />
            <FormInput label="Fitness Expiry" type="date" value={form.fitness_expiry} onChange={e => setForm(p => ({ ...p, fitness_expiry: e.target.value }))} />
            <FormInput label="PUC Expiry" type="date" value={form.puc_expiry} onChange={e => setForm(p => ({ ...p, puc_expiry: e.target.value }))} />
          </div>

          <div className="mt-4 flex gap-3">
            <SubmitButton loading={saving} loadingText={editItem ? 'Saving…' : 'Registering…'}>{editItem ? 'Save Changes' : 'Register Vehicle'}</SubmitButton>
            <ActionButton variant="cancel" onClick={() => { setShowForm(false); setEditItem(null); }}>Cancel</ActionButton>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : vehicles.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No vehicles found. Register your first truck to get started.</div>
      ) : (
        <div className="space-y-3">
          {vehicles.map(v => (
            <div key={v.fleet_id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold font-mono text-gray-900">{v.vehicle_no}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[v.status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>{v.status}</span>
                    <span className="text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-gray-100">{v.vehicle_type}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-1">
                    {v.make && <span>🏭 {v.make} {v.model}</span>}
                    {v.capacity_kg && <span>⚖️ {(v.capacity_kg/1000).toFixed(1)}T</span>}
                    {v.current_driver && <span>👤 Driver: <span className="text-gray-700 font-medium">{v.current_driver.name}</span></span>}
                    {v.current_owner  && <span>👤 Owner: <span className="text-gray-700 font-medium">{v.current_owner.name}</span></span>}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {expiryBadge(v.insurance_expiry, 'Insurance')}
                    {expiryBadge(v.rc_expiry, 'RC')}
                    {expiryBadge(v.permit_expiry, 'Permit')}
                    {expiryBadge(v.fitness_expiry, 'Fitness')}
                    {expiryBadge(v.puc_expiry, 'PUC')}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canUpdate && <ActionButton variant="edit" size="sm" onClick={() => openEdit(v)}>Edit</ActionButton>}
                  {canDelete && (
                    <ActionButton variant="danger" size="sm" disabled={deactivatingId === v.fleet_id} onClick={() => deactivate(v.fleet_id)}>
                      {deactivatingId === v.fleet_id ? '…' : 'Deactivate'}
                    </ActionButton>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
