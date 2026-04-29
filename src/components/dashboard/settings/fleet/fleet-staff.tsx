'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';
import { FormInput, SearchableDropdown, SubmitButton, ActionButton } from '../ui';

interface FleetStaff {
  staff_id: string;
  name: string;
  role: string;
  mobile: string | null;
  email: string | null;
  license_no: string | null;
  license_expiry: string | null;
  license_type: string | null;
  is_active: boolean;
}

const ROLES = [
  { value: 'DRIVER',     label: 'Driver'     },
  { value: 'OWNER',      label: 'Owner'      },
  { value: 'CONDUCTOR',  label: 'Conductor'  },
  { value: 'CLEANER',    label: 'Cleaner'    },
  { value: 'MECHANIC',   label: 'Mechanic'   },
];

const LICENSE_TYPES = [
  { value: 'LMV',  label: 'LMV'  },
  { value: 'HMV',  label: 'HMV'  },
  { value: 'BOTH', label: 'Both' },
];

const ROLE_COLORS: Record<string, string> = {
  DRIVER:    'bg-blue-50 text-blue-700 border-blue-200',
  OWNER:     'bg-purple-50 text-purple-700 border-purple-200',
  CONDUCTOR: 'bg-green-50 text-green-700 border-green-200',
  CLEANER:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  MECHANIC:  'bg-orange-50 text-orange-700 border-orange-200',
};

const DEFAULT_FORM = {
  name: '', role: 'DRIVER', mobile: '', email: '',
  license_no: '', license_expiry: '', license_type: '',
  aadhar_no: '', pan_no: '', address: '', notes: '',
};

export default function FleetStaff() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can(SLUGS.FLEET_STAFF_CREATE);
  const canUpdate = can(SLUGS.FLEET_STAFF_UPDATE);
  const canDelete = can(SLUGS.FLEET_STAFF_DELETE);

  const [staff, setStaff]       = useState<FleetStaff[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<FleetStaff | null>(null);
  const [form, setForm]         = useState({ ...DEFAULT_FORM });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch]     = useState('');
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ is_active: 'true', limit: '200' });
      if (roleFilter) params.set('role', roleFilter);
      if (search)     params.set('search', search);
      const res = await apiFetch(`/v1/fleet/staff?${params}`);
      if (res.ok) { const d = await res.json(); setStaff(d.staff ?? d ?? []); }
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, search]);

  useEffect(() => {
    if (!getUser()) { router.replace('/auth/login'); return; }
    load();
  }, [load, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const body: Record<string, unknown> = { name: form.name, role: form.role };
      if (form.mobile)       body.mobile        = form.mobile;
      if (form.email)        body.email         = form.email;
      if (form.license_no)   body.license_no    = form.license_no;
      if (form.license_expiry) body.license_expiry = form.license_expiry;
      if (form.license_type) body.license_type  = form.license_type;
      if (form.aadhar_no)    body.aadhar_no     = form.aadhar_no;
      if (form.pan_no)       body.pan_no        = form.pan_no;
      if (form.address)      body.address       = form.address;
      if (form.notes)        body.notes         = form.notes;

      const url    = editItem ? `/v1/fleet/staff/${editItem.staff_id}` : `/v1/fleet/staff`;
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
      setSuccess(editItem ? 'Staff updated.' : 'Staff added.');
      setShowForm(false); setEditItem(null); setForm({ ...DEFAULT_FORM });
      load();
    } finally { setSaving(false); }
  }

  function openEdit(s: FleetStaff) {
    setEditItem(s);
    setForm({
      name: s.name, role: s.role, mobile: s.mobile ?? '',
      email: s.email ?? '', license_no: s.license_no ?? '',
      license_expiry: s.license_expiry ?? '', license_type: s.license_type ?? '',
      aadhar_no: '', pan_no: '', address: '', notes: '',
    });
    setError(''); setSuccess(''); setShowForm(true);
  }

  async function deactivate(staffId: string) {
    setDeactivatingId(staffId);
    try {
      await apiFetch(`/v1/fleet/staff/${staffId}`, {
        method: 'DELETE',
      });
      setSuccess('Staff deactivated.');
      load();
    } finally { setDeactivatingId(null); }
  }

  function expiryClass(dateStr: string | null) {
    if (!dateStr) return '';
    const days = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
    if (days < 0)   return 'text-red-600 font-semibold';
    if (days < 30)  return 'text-orange-600 font-semibold';
    if (days < 60)  return 'text-yellow-600';
    return 'text-gray-600';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">Fleet Staff</h1>
        <span className="text-sm text-gray-400">{staff.length} member{staff.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-sm text-gray-500 mb-5">Manage drivers, owners, conductors and other fleet personnel.</p>

      {error   && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        {canCreate && (
          <button onClick={() => { setEditItem(null); setForm({ ...DEFAULT_FORM }); setError(''); setSuccess(''); setShowForm(true); }}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            + Add Staff
          </button>
        )}
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSave} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">{editItem ? 'Edit Staff' : 'Add Fleet Staff'}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormInput label="Full Name *" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ramesh Kumar" />
            <SearchableDropdown label="Role *" required value={form.role} onChange={val => setForm(p => ({ ...p, role: val }))} options={ROLES} placeholder="Select role" />
            <FormInput label="Mobile" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} placeholder="9876543210" />
            <FormInput label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="driver@example.com" />
            {(form.role === 'DRIVER') && (<>
              <FormInput label="Licence No" value={form.license_no} onChange={e => setForm(p => ({ ...p, license_no: e.target.value }))} placeholder="MH0120191234567" />
              <FormInput label="Licence Expiry" type="date" value={form.license_expiry} onChange={e => setForm(p => ({ ...p, license_expiry: e.target.value }))} />
              <SearchableDropdown label="Licence Type" value={form.license_type} onChange={val => setForm(p => ({ ...p, license_type: val }))} options={LICENSE_TYPES} placeholder="Select type" />
            </>)}
            <FormInput label="Aadhaar No" value={form.aadhar_no} onChange={e => setForm(p => ({ ...p, aadhar_no: e.target.value }))} placeholder="123456789012" />
            <FormInput label="PAN No" value={form.pan_no} onChange={e => setForm(p => ({ ...p, pan_no: e.target.value }))} placeholder="ABCDE1234F" />
            <div className="sm:col-span-3">
              <FormInput label="Address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Residential address" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <SubmitButton loading={saving} loadingText={editItem ? 'Saving…' : 'Adding…'}>{editItem ? 'Save Changes' : 'Add Staff'}</SubmitButton>
            <ActionButton variant="cancel" onClick={() => { setShowForm(false); setEditItem(null); }}>Cancel</ActionButton>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : staff.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No fleet staff found. Add drivers, owners, and conductors here.</div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Mobile</th>
                <th className="px-4 py-3 text-left">Licence No</th>
                <th className="px-4 py-3 text-left">Licence Expiry</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s, i) => (
                <tr key={s.staff_id} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''} hover:bg-blue-50/20 transition-colors`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${ROLE_COLORS[s.role] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {s.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.mobile ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{s.license_no ?? '—'}</td>
                  <td className={`px-4 py-3 text-xs ${expiryClass(s.license_expiry)}`}>
                    {s.license_expiry
                      ? <>
                          {s.license_expiry}
                          {(() => { const d = Math.floor((new Date(s.license_expiry).getTime() - Date.now()) / 86400000); return d < 0 ? ' ⚠️ Expired' : d < 30 ? ` (${d}d left)` : ''; })()}
                        </>
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canUpdate && <ActionButton variant="edit" size="sm" onClick={() => openEdit(s)}>Edit</ActionButton>}
                      {canDelete && (
                        <ActionButton variant="danger" size="sm" disabled={deactivatingId === s.staff_id} onClick={() => deactivate(s.staff_id)}>
                          {deactivatingId === s.staff_id ? '…' : 'Deactivate'}
                        </ActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
