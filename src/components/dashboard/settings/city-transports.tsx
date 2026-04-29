'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { FormInput, SearchableDropdown, SubmitButton, ActionButton } from './ui';
import type { DropdownOption } from './ui';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';

interface MobileLabel { label: string; mobile: string; }

interface CityTransport {
  id: string;
  city_id: string;
  transport_id: string;
  branch_id: string;
  branch_mobile: MobileLabel[];
  address: string;
  manager_name: string;
  is_active: boolean;
  created_at: string;
}

interface City { city_id: string; city_name: string; city_code: string; }
interface Transport { transport_id: string; transport_name: string; transport_code: string; }
interface Branch { branch_id: string; name: string; branch_code: string; }

export default function CityTransportsManager() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can(SLUGS.MASTER_CREATE);
  const canUpdate = can(SLUGS.MASTER_UPDATE);
  const [links, setLinks] = useState<CityTransport[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    city_id: '', transport_id: '', branch_id: '', address: '', manager_name: '', is_active: true,
    branch_mobile: [{ label: '', mobile: '' }] as MobileLabel[],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    address: '', manager_name: '', is_active: true,
    branch_mobile: [{ label: '', mobile: '' }] as MobileLabel[],
  });

  const fetchLinks = useCallback(
    async (branchId: string, cityId: string) => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (branchId) params.set('branch_id', branchId);
      if (cityId) params.set('city_id', cityId);
      const qs = params.toString();
      try {
        const res = await apiFetch(`/v1/master/city-transports${qs ? '?' + qs : ''}`);
        if (res.status === 401) { router.replace('/auth/login'); return; }
        if (!res.ok) { setError('Failed to load city-transport links.'); return; }
        const data = await res.json();
        setLinks(data.city_transports ?? data.links ?? []);
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

    Promise.all([
      apiFetch(`/v1/staff/branches`, { headers }).then((r) => r.ok ? r.json() : null),
      apiFetch(`/v1/master/cities`, { headers }).then((r) => r.ok ? r.json() : null),
      apiFetch(`/v1/master/transports`, { headers }).then((r) => r.ok ? r.json() : null),
    ]).then(([branchData, cityData, transportData]) => {
      if (branchData) setBranches(branchData.branches ?? []);
      if (cityData) setCities(cityData.cities ?? []);
      if (transportData) setTransports(transportData.transports ?? []);
      const u = getUser();
      if (u?.branch_id) setForm((f) => ({ ...f, branch_id: u.branch_id }));
    }).catch(() => {});

    fetchLinks('', '');
  }, [router, fetchLinks]);

  function updateFormMobile(idx: number, field: keyof MobileLabel, value: string) {
    setForm((f) => {
      const items = [...f.branch_mobile];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, branch_mobile: items };
    });
  }

  function updateEditMobile(idx: number, field: keyof MobileLabel, value: string) {
    setEditForm((f) => {
      const items = [...f.branch_mobile];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, branch_mobile: items };
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch(`/v1/master/city-transports`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? 'Failed to create link.'); return; }
      setSuccess('City-transport link created.');
      setForm({ city_id: '', transport_id: '', branch_id: form.branch_id, address: '', manager_name: '', is_active: true, branch_mobile: [{ label: '', mobile: '' }] });
      setShowForm(false);
      fetchLinks(filterBranch, filterCity);
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(id: string) {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch(`/v1/master/city-transports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? 'Failed to update link.'); return; }
      setSuccess('Link updated.');
      setEditingId(null);
      fetchLinks(filterBranch, filterCity);
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  const cityName = (id: string) => cities.find((c) => c.city_id === id)?.city_name ?? id.slice(0, 8) + '…';
  const transportName = (id: string) => transports.find((t) => t.transport_id === id)?.transport_name ?? id.slice(0, 8) + '…';
  const branchName = (id: string) => branches.find((b) => b.branch_id === id)?.name ?? id.slice(0, 8) + '…';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">City-wise Transport</h1>
        <span className="text-sm text-gray-400">{links.length} link{links.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-sm text-gray-500 mb-6">Link transport vendors to specific cities with branch contact details.</p>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700 shrink-0">Branch:</label>
        <SearchableDropdown
          value={filterBranch}
          onChange={(val) => { setFilterBranch(val); fetchLinks(val, filterCity); }}
          options={branches.map((b): DropdownOption => ({ value: b.branch_id, label: b.name }))}
          placeholder="All"
          size="sm"
          className="max-w-xs"
        />
        <label className="text-sm font-medium text-gray-700 shrink-0">City:</label>
        <SearchableDropdown
          value={filterCity}
          onChange={(val) => { setFilterCity(val); fetchLinks(filterBranch, val); }}
          options={cities.map((c): DropdownOption => ({ value: c.city_id, label: c.city_name }))}
          placeholder="All"
          size="sm"
          className="max-w-xs"
        />
        {canCreate && (
        <button onClick={() => setShowForm((v) => !v)}
          className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          {showForm ? 'Cancel' : '+ Add Link'}
        </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">New City-Transport Link</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SearchableDropdown
              label="City *"
              required
              value={form.city_id}
              onChange={(val) => setForm((f) => ({ ...f, city_id: val }))}
              options={cities.map((c): DropdownOption => ({ value: c.city_id, label: c.city_name }))}
              placeholder="Select city"
            />
            <SearchableDropdown
              label="Transport *"
              required
              value={form.transport_id}
              onChange={(val) => setForm((f) => ({ ...f, transport_id: val }))}
              options={transports.map((t): DropdownOption => ({ value: t.transport_id, label: t.transport_name }))}
              placeholder="Select transport"
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
              label="Manager Name"
              value={form.manager_name}
              onChange={(e) => setForm((f) => ({ ...f, manager_name: e.target.value }))}
              placeholder="e.g. Ajay Patil"
            />
            <div className="sm:col-span-2">
              <FormInput
                label="Address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Depot address"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Branch Mobile Numbers</label>
              <button type="button"
                onClick={() => setForm((f) => ({ ...f, branch_mobile: [...f.branch_mobile, { label: '', mobile: '' }] }))}
                className="text-xs text-blue-600 hover:underline">+ Add</button>
            </div>
            {form.branch_mobile.map((m, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <FormInput size="sm" value={m.label} onChange={(e) => updateFormMobile(idx, 'label', e.target.value)} placeholder="Label (e.g. booking)" />
                <FormInput size="sm" className="w-36" value={m.mobile} onChange={(e) => updateFormMobile(idx, 'mobile', e.target.value)} placeholder="Mobile" />
                {form.branch_mobile.length > 1 && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, branch_mobile: f.branch_mobile.filter((_, i) => i !== idx) }))}
                    className="text-gray-400 hover:text-red-500 px-1 text-lg leading-none">×</button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input type="checkbox" id="ct-active" checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <label htmlFor="ct-active" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="mt-4">
            <SubmitButton loading={submitting} loadingText="Linking…">Create Link</SubmitButton>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading links…</div>
      ) : links.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No city-transport links found.</div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-left">Transport</th>
                <th className="px-4 py-3 text-left">Branch</th>
                <th className="px-4 py-3 text-left">Manager</th>
                <th className="px-4 py-3 text-left">Contacts</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {links.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                  {editingId === l.id ? (
                    <>
                      <td className="px-4 py-3 text-gray-600">{cityName(l.city_id)}</td>
                      <td className="px-4 py-3 text-gray-600">{transportName(l.transport_id)}</td>
                      <td className="px-4 py-3 text-gray-500">{branchName(l.branch_id)}</td>
                      <td className="px-4 py-3">
                        <FormInput size="sm" value={editForm.manager_name} onChange={(e) => setEditForm((f) => ({ ...f, manager_name: e.target.value }))} placeholder="Manager" />
                      </td>
                      <td className="px-4 py-3 space-y-1">
                        {editForm.branch_mobile.map((m, idx) => (
                          <div key={idx} className="flex gap-1">
                            <FormInput size="sm" className="w-20" value={m.label} onChange={(e) => updateEditMobile(idx, 'label', e.target.value)} placeholder="label" />
                            <FormInput size="sm" className="w-24" value={m.mobile} onChange={(e) => updateEditMobile(idx, 'mobile', e.target.value)} placeholder="mobile" />
                          </div>
                        ))}
                        <button type="button"
                          onClick={() => setEditForm((f) => ({ ...f, branch_mobile: [...f.branch_mobile, { label: '', mobile: '' }] }))}
                          className="text-xs text-blue-500 hover:underline">+ Add</button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" checked={editForm.is_active}
                          onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <ActionButton variant="save" onClick={() => handleUpdate(l.id)} disabled={submitting}>Save</ActionButton>
                        <ActionButton variant="cancel" onClick={() => setEditingId(null)}>Cancel</ActionButton>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{cityName(l.city_id)}</td>
                      <td className="px-4 py-3 text-gray-700">{transportName(l.transport_id)}</td>
                      <td className="px-4 py-3 text-gray-500">{branchName(l.branch_id)}</td>
                      <td className="px-4 py-3 text-gray-600">{l.manager_name || '—'}</td>
                      <td className="px-4 py-3">
                        {l.branch_mobile?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {l.branch_mobile.map((m, i) => (
                              <span key={i} className="text-xs bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">
                                {m.label}: {m.mobile}
                              </span>
                            ))}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${l.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {l.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canUpdate && (
                        <ActionButton
                          variant="edit"
                          onClick={() => {
                            setEditingId(l.id);
                            setEditForm({
                              manager_name: l.manager_name ?? '', address: l.address ?? '', is_active: l.is_active,
                              branch_mobile: l.branch_mobile?.length > 0 ? l.branch_mobile : [{ label: '', mobile: '' }],
                            });
                          }}
                        >
                          Edit
                        </ActionButton>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
