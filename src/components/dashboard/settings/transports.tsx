'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { FormInput, SearchableDropdown, SubmitButton, ActionButton } from './ui';
import type { DropdownOption } from './ui';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';

interface MobileEntry { name: string; mobile: string; }

interface Transport {
  transport_id: string;
  transport_code: string;
  transport_name: string;
  branch_id: string;
  gstin: string;
  mobile_number_owner: MobileEntry[];
  website: string;
  address: string;
  is_active: boolean;
  created_at: string;
}

interface Branch {
  branch_id: string;
  name: string;
  branch_code: string;
}

const emptyForm = {
  transport_code: '', transport_name: '', branch_id: '', gstin: '',
  website: '', address: '', is_active: true,
  mobile_number_owner: [{ name: '', mobile: '' }] as MobileEntry[],
};

export default function TransportsManager() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can(SLUGS.MASTER_TRANSPORTS_CREATE);
  const canUpdate = can(SLUGS.MASTER_TRANSPORTS_UPDATE);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filterBranch, setFilterBranch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    transport_name: '', gstin: '', website: '', address: '', is_active: true,
    mobile_number_owner: [{ name: '', mobile: '' }] as MobileEntry[],
  });

  const fetchTransports = useCallback(
    async (branchId: string) => {
      setLoading(true);
      setError('');
      const url = branchId
        ? `/v1/master/transports?branch_id=${branchId}`
        : `/v1/master/transports`;
      try {
        const res = await apiFetch(url);
        if (res.status === 401) { router.replace('/auth/login'); return; }
        if (!res.ok) { setError('Failed to load transports.'); return; }
        const data = await res.json();
        setTransports(data.transports ?? []);
      } catch {
        setError('Unable to reach the server.');
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const user = getUser();
    if (!user) { router.replace('/auth/login'); return; }

    apiFetch(`/v1/staff/branches`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setBranches(data.branches ?? []);
        const u = getUser();
        if (u?.branch_id) setForm((f) => ({ ...f, branch_id: u.branch_id }));
      })
      .catch(() => {});

    fetchTransports('');
  }, [router, fetchTransports]);

  function updateFormOwner(idx: number, field: keyof MobileEntry, value: string) {
    setForm((f) => {
      const owners = [...f.mobile_number_owner];
      owners[idx] = { ...owners[idx], [field]: value };
      return { ...f, mobile_number_owner: owners };
    });
  }

  function addFormOwner() {
    setForm((f) => ({ ...f, mobile_number_owner: [...f.mobile_number_owner, { name: '', mobile: '' }] }));
  }

  function removeFormOwner(idx: number) {
    setForm((f) => ({ ...f, mobile_number_owner: f.mobile_number_owner.filter((_, i) => i !== idx) }));
  }

  function updateEditOwner(idx: number, field: keyof MobileEntry, value: string) {
    setEditForm((f) => {
      const owners = [...f.mobile_number_owner];
      owners[idx] = { ...owners[idx], [field]: value };
      return { ...f, mobile_number_owner: owners };
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch(`/v1/master/transports`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? 'Failed to create transport.'); return; }
      setSuccess('Transport created successfully.');
      setForm({ ...emptyForm, branch_id: form.branch_id });
      setShowForm(false);
      fetchTransports(filterBranch);
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(transport_id: string) {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch(`/v1/master/transports/${transport_id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? 'Failed to update transport.'); return; }
      setSuccess('Transport updated.');
      setEditingId(null);
      fetchTransports(filterBranch);
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  const branchName = (id: string) => branches.find((b) => b.branch_id === id)?.name ?? id.slice(0, 8) + '…';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">Transports</h1>
        <span className="text-sm text-gray-400">{transports.length} transport{transports.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-sm text-gray-500 mb-6">Manage transport vendors for your company branches.</p>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      <div className="mb-5 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 shrink-0">Branch:</label>
        <SearchableDropdown
          value={filterBranch}
          onChange={(val) => { setFilterBranch(val); fetchTransports(val); }}
          options={branches.map((b): DropdownOption => ({ value: b.branch_id, label: b.name }))}
          placeholder="All"
          size="sm"
          className="max-w-xs"
        />
        {canCreate && (
        <button
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Transport'}
        </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">New Transport</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormInput
              label="Transport Code *"
              required
              value={form.transport_code}
              onChange={(e) => setForm((f) => ({ ...f, transport_code: e.target.value.toUpperCase() }))}
              placeholder="e.g. VRL001"
            />
            <FormInput
              label="Transport Name *"
              required
              value={form.transport_name}
              onChange={(e) => setForm((f) => ({ ...f, transport_name: e.target.value }))}
              placeholder="e.g. VRL Logistics"
            />
            <SearchableDropdown
              label="Branch *"
              required
              value={form.branch_id}
              onChange={(val) => setForm((f) => ({ ...f, branch_id: val }))}
              options={branches.map((b): DropdownOption => ({ value: b.branch_id, label: b.name }))}
              placeholder="Select branch"
            />
            <FormInput
              label="GSTIN"
              value={form.gstin}
              onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))}
              placeholder="e.g. 29ABCDE1234F1Z5"
            />
            <FormInput
              label="Website"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              placeholder="https://..."
            />
            <FormInput
              label="Address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Office address"
            />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Owner Contact(s) *</label>
              <button type="button" onClick={addFormOwner}
                className="text-xs text-blue-600 hover:underline">+ Add Owner</button>
            </div>
            {form.mobile_number_owner.map((owner, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <FormInput size="sm" value={owner.name} onChange={(e) => updateFormOwner(idx, 'name', e.target.value)} placeholder="Owner name" />
                <FormInput size="sm" className="w-36" value={owner.mobile} onChange={(e) => updateFormOwner(idx, 'mobile', e.target.value)} placeholder="Mobile" />
                {form.mobile_number_owner.length > 1 && (
                  <button type="button" onClick={() => removeFormOwner(idx)}
                    className="text-gray-400 hover:text-red-500 px-1 text-lg leading-none">×</button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input type="checkbox" id="transport-active" checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <label htmlFor="transport-active" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="mt-4">
            <SubmitButton loading={submitting} loadingText="Creating…">Create Transport</SubmitButton>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading transports…</div>
      ) : transports.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No transports found.</div>
      ) : (
        <div className="space-y-3">
          {transports.map((t) => (
            <div key={t.transport_id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              {editingId === t.transport_id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormInput label="Transport Name" size="sm" value={editForm.transport_name} onChange={(e) => setEditForm((f) => ({ ...f, transport_name: e.target.value }))} />
                    <FormInput label="GSTIN" size="sm" value={editForm.gstin} onChange={(e) => setEditForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))} />
                    <FormInput label="Website" size="sm" value={editForm.website} onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))} />
                    <FormInput label="Address" size="sm" value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-600">Owner Contact(s)</label>
                      <button type="button"
                        onClick={() => setEditForm((f) => ({ ...f, mobile_number_owner: [...f.mobile_number_owner, { name: '', mobile: '' }] }))}
                        className="text-xs text-blue-600 hover:underline">+ Add</button>
                    </div>
                    {editForm.mobile_number_owner.map((owner, idx) => (
                      <div key={idx} className="flex gap-2 mb-1.5">
                        <FormInput size="sm" value={owner.name} onChange={(e) => updateEditOwner(idx, 'name', e.target.value)} placeholder="Name" />
                        <FormInput size="sm" className="w-32" value={owner.mobile} onChange={(e) => updateEditOwner(idx, 'mobile', e.target.value)} placeholder="Mobile" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={editForm.is_active}
                      onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                    <span className="text-sm text-gray-700">Active</span>
                  </div>
                  <div className="flex gap-2">
                    <ActionButton variant="save" onClick={() => handleUpdate(t.transport_id)} disabled={submitting}>Save</ActionButton>
                    <ActionButton variant="cancel" onClick={() => setEditingId(null)}>Cancel</ActionButton>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{t.transport_name}</span>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono font-semibold text-gray-700">{t.transport_code}</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      <span>{branchName(t.branch_id)}</span>
                      {t.gstin && <span>GSTIN: {t.gstin}</span>}
                      {t.address && <span>{t.address}</span>}
                      {t.website && <span>{t.website}</span>}
                    </div>
                    {t.mobile_number_owner?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {t.mobile_number_owner.map((o, i) => (
                          <span key={i} className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">
                            {o.name} — {o.mobile}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {canUpdate && (
                  <ActionButton
                    variant="edit"
                    onClick={() => {
                      setEditingId(t.transport_id);
                      setEditForm({
                        transport_name: t.transport_name, gstin: t.gstin ?? '', website: t.website ?? '',
                        address: t.address ?? '', is_active: t.is_active,
                        mobile_number_owner: t.mobile_number_owner?.length > 0 ? t.mobile_number_owner : [{ name: '', mobile: '' }],
                      });
                    }}
                  >
                    Edit
                  </ActionButton>
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
