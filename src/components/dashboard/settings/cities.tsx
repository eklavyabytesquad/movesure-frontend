'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { FormInput, SearchableDropdown, SubmitButton, ActionButton } from './ui';
import type { DropdownOption } from './ui';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';

interface State {
  state_id: string;
  state_name: string;
  state_code: string;
}

interface City {
  city_id: string;
  city_name: string;
  city_code: string;
  city_pin_code: string;
  state_id: string;
  branch_id: string;
  is_active: boolean;
  created_at: string;
}

interface Branch {
  branch_id: string;
  name: string;
  branch_code: string;
}

export default function CitiesManager() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can(SLUGS.MASTER_CITIES_CREATE);
  const canUpdate = can(SLUGS.MASTER_CITIES_UPDATE);
  const [cities, setCities] = useState<City[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterState, setFilterState] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ city_name: '', city_code: '', city_pin_code: '', state_id: '', branch_id: '', is_active: true });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ city_name: '', city_code: '', city_pin_code: '', state_id: '', is_active: true });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCities = useCallback(
    async (branchId: string, stateId: string) => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (branchId) params.set('branch_id', branchId);
      if (stateId) params.set('state_id', stateId);
      const qs = params.toString();
      try {
        const res = await apiFetch(`/v1/master/cities${qs ? '?' + qs : ''}`);
        if (res.status === 401) { router.replace('/auth/login'); return; }
        if (!res.ok) { setError('Failed to load cities.'); return; }
        const data = await res.json();
        setCities(data.cities ?? []);
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

    apiFetch(`/v1/master/states`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setStates(data.states ?? []); })
      .catch(() => {});

    fetchCities('', '');
  }, [router, fetchCities]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch(`/v1/master/cities`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? 'Failed to create city.'); return; }
      setSuccess('City created successfully.');
      setForm({ city_name: '', city_code: '', city_pin_code: '', state_id: '', branch_id: form.branch_id, is_active: true });
      setShowForm(false);
      fetchCities(filterBranch, filterState);
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(city_id: string) {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch(`/v1/master/cities/${city_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          city_name:     editForm.city_name,
          city_code:     editForm.city_code,
          city_pin_code: editForm.city_pin_code,
          state_id:      editForm.state_id || undefined,
          is_active:     editForm.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? 'Failed to update city.'); return; }
      setSuccess('City updated.');
      setEditingId(null);
      fetchCities(filterBranch, filterState);
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  const stateName = (id: string) => states.find((s) => s.state_id === id)?.state_name ?? id.slice(0, 8) + '…';
  const branchName = (id: string) => branches.find((b) => b.branch_id === id)?.name ?? id.slice(0, 8) + '…';

  const filteredCities = searchQuery
    ? cities.filter((c) => c.city_name.toLowerCase().includes(searchQuery.toLowerCase()) || c.city_code.toLowerCase().includes(searchQuery.toLowerCase()) || c.city_pin_code.includes(searchQuery))
    : cities;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">Cities</h1>
        <span className="text-sm text-gray-400">{filteredCities.length}{searchQuery ? ` of ${cities.length}` : ''} cit{filteredCities.length !== 1 ? 'ies' : 'y'}</span>
      </div>
      <p className="text-sm text-gray-500 mb-6">Manage cities for your company branches.</p>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700 shrink-0">Branch:</label>
        <SearchableDropdown
          value={filterBranch}
          onChange={(val) => { setFilterBranch(val); fetchCities(val, filterState); }}
          options={branches.map((b): DropdownOption => ({ value: b.branch_id, label: b.name }))}
          placeholder="All"
          size="sm"
          className="max-w-xs"
        />
        <label className="text-sm font-medium text-gray-700 shrink-0">State:</label>
        <SearchableDropdown
          value={filterState}
          onChange={(val) => { setFilterState(val); fetchCities(filterBranch, val); }}
          options={states.map((s): DropdownOption => ({ value: s.state_id, label: s.state_name }))}
          placeholder="All"
          size="sm"
          className="max-w-xs"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search cities…"
          className="flex-1 min-w-45 max-w-xs rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => fetchCities(filterBranch, filterState)}
          title="Refresh"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ↻ Refresh
        </button>
        {canCreate && (
        <button
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add City'}
        </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">New City</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormInput
              label="City Name *"
              required
              value={form.city_name}
              onChange={(e) => setForm((f) => ({ ...f, city_name: e.target.value }))}
              placeholder="e.g. Mumbai"
            />
            <FormInput
              label="City Code *"
              required
              value={form.city_code}
              onChange={(e) => setForm((f) => ({ ...f, city_code: e.target.value.toUpperCase() }))}
              placeholder="e.g. MUM"
              maxLength={6}
            />
            <FormInput
              label="Pin Code *"
              required
              value={form.city_pin_code}
              onChange={(e) => setForm((f) => ({ ...f, city_pin_code: e.target.value }))}
              placeholder="e.g. 400001"
              maxLength={10}
            />
            <SearchableDropdown
              label="State *"
              required
              value={form.state_id}
              onChange={(val) => setForm((f) => ({ ...f, state_id: val }))}
              options={states.map((s): DropdownOption => ({ value: s.state_id, label: s.state_name }))}
              placeholder="Select state"
            />
            <SearchableDropdown
              label="Branch *"
              required
              value={form.branch_id}
              onChange={(val) => setForm((f) => ({ ...f, branch_id: val }))}
              options={branches.map((b): DropdownOption => ({ value: b.branch_id, label: b.name }))}
              placeholder="Select branch"
            />
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                Active
              </label>
            </div>
          </div>
          <div className="mt-4">
            <SubmitButton loading={submitting} loadingText="Creating…">Create City</SubmitButton>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading cities…</div>
      ) : filteredCities.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">{searchQuery ? 'No cities match your search.' : 'No cities found.'}</div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Pin Code</th>
                <th className="px-4 py-3 text-left">State</th>
                <th className="px-4 py-3 text-left">Branch</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCities.map((c) => (
                <tr key={c.city_id} className="hover:bg-gray-50 transition-colors">
                  {editingId === c.city_id ? (
                    <>
                      <td className="px-4 py-3"><FormInput size="sm" value={editForm.city_name} onChange={(e) => setEditForm((f) => ({ ...f, city_name: e.target.value }))} /></td>
                      <td className="px-4 py-3"><FormInput size="sm" className="w-20" value={editForm.city_code} onChange={(e) => setEditForm((f) => ({ ...f, city_code: e.target.value.toUpperCase() }))} /></td>
                      <td className="px-4 py-3"><FormInput size="sm" className="w-24" value={editForm.city_pin_code} onChange={(e) => setEditForm((f) => ({ ...f, city_pin_code: e.target.value }))} /></td>
                      <td className="px-4 py-3">
                        <SearchableDropdown
                          size="sm"
                          value={editForm.state_id}
                          onChange={(val) => setEditForm((f) => ({ ...f, state_id: val }))}
                          options={states.map((s): DropdownOption => ({ value: s.state_id, label: s.state_name }))}
                          placeholder="Select state"
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-500">{branchName(c.branch_id)}</td>
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <ActionButton variant="save" onClick={() => handleUpdate(c.city_id)} disabled={submitting}>Save</ActionButton>
                        <ActionButton variant="cancel" onClick={() => setEditingId(null)}>Cancel</ActionButton>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.city_name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono font-semibold text-gray-700">{c.city_code}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.city_pin_code}</td>
                      <td className="px-4 py-3 text-gray-500">{stateName(c.state_id)}</td>
                      <td className="px-4 py-3 text-gray-500">{branchName(c.branch_id)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canUpdate && (
                        <ActionButton variant="edit" onClick={() => { setEditingId(c.city_id); setEditForm({ city_name: c.city_name, city_code: c.city_code, city_pin_code: c.city_pin_code, state_id: c.state_id, is_active: c.is_active }); }}>Edit</ActionButton>
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
