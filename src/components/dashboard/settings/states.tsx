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
  branch_id: string;
  total_city_count: number;
  is_active: boolean;
  created_at: string;
}

interface Branch {
  branch_id: string;
  name: string;
  branch_code: string;
}

export default function StatesManager() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can(SLUGS.MASTER_CREATE);
  const canUpdate = can(SLUGS.MASTER_UPDATE);
  const [states, setStates] = useState<State[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ state_name: '', state_code: '', branch_id: '', is_active: true });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ state_name: '', state_code: '', is_active: true });

  const fetchStates = useCallback(
    async (branchId: string) => {
      setLoading(true);
      setError('');
      const url = branchId
        ? `/v1/master/states?branch_id=${branchId}`
        : `/v1/master/states`;
      try {
        const res = await apiFetch(url);
        if (res.status === 401) { router.replace('/auth/login'); return; }
        if (!res.ok) { setError('Failed to load states.'); return; }
        const data = await res.json();
        setStates(data.states ?? []);
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
        const user = getUser();
        if (user?.branch_id) setForm((f) => ({ ...f, branch_id: user.branch_id }));
      })
      .catch(() => {});

    fetchStates('');
  }, [router, fetchStates]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch(`/v1/master/states`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? 'Failed to create state.'); return; }
      setSuccess('State created successfully.');
      setForm({ state_name: '', state_code: '', branch_id: form.branch_id, is_active: true });
      setShowForm(false);
      fetchStates(selectedBranch);
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(state_id: string) {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch(`/v1/master/states/${state_id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? 'Failed to update state.'); return; }
      setSuccess('State updated.');
      setEditingId(null);
      fetchStates(selectedBranch);
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  const branchName = (id: string) =>
    branches.find((b) => b.branch_id === id)?.name ?? id.slice(0, 8) + '…';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">States</h1>
        <span className="text-sm text-gray-400">{states.length} state{states.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-sm text-gray-500 mb-6">Manage states for your company branches.</p>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      <div className="mb-5 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 shrink-0">Filter by branch:</label>
        <SearchableDropdown
          value={selectedBranch}
          onChange={(val) => { setSelectedBranch(val); fetchStates(val); }}
          options={branches.map((b): DropdownOption => ({ value: b.branch_id, label: b.name }))}
          placeholder="All branches"
          size="sm"
          className="max-w-xs"
        />
        {canCreate && (
        <button
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add State'}
        </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">New State</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormInput
              label="State Name *"
              required
              value={form.state_name}
              onChange={(e) => setForm((f) => ({ ...f, state_name: e.target.value }))}
              placeholder="e.g. Maharashtra"
            />
            <FormInput
              label="State Code *"
              required
              value={form.state_code}
              onChange={(e) => setForm((f) => ({ ...f, state_code: e.target.value.toUpperCase() }))}
              placeholder="e.g. MH"
              maxLength={5}
            />
            <SearchableDropdown
              label="Branch *"
              required
              value={form.branch_id}
              onChange={(val) => setForm((f) => ({ ...f, branch_id: val }))}
              options={branches.map((b): DropdownOption => ({ value: b.branch_id, label: b.name }))}
              placeholder="Select branch"
            />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="state-active"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="state-active" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="mt-4">
            <SubmitButton loading={submitting} loadingText="Creating…">Create State</SubmitButton>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading states…</div>
      ) : states.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No states found.</div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">State</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Branch</th>
                <th className="px-4 py-3 text-center">Cities</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {states.map((s) => (
                <tr key={s.state_id} className="hover:bg-gray-50 transition-colors">
                  {editingId === s.state_id ? (
                    <>
                      <td className="px-4 py-3">
                        <FormInput size="sm" value={editForm.state_name} onChange={(e) => setEditForm((f) => ({ ...f, state_name: e.target.value }))} />
                      </td>
                      <td className="px-4 py-3">
                        <FormInput size="sm" className="w-24" value={editForm.state_code} onChange={(e) => setEditForm((f) => ({ ...f, state_code: e.target.value.toUpperCase() }))} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">{branchName(s.branch_id)}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{s.total_city_count}</td>
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <ActionButton variant="save" onClick={() => handleUpdate(s.state_id)} disabled={submitting}>Save</ActionButton>
                        <ActionButton variant="cancel" onClick={() => setEditingId(null)}>Cancel</ActionButton>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.state_name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono font-semibold text-gray-700">{s.state_code}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{branchName(s.branch_id)}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{s.total_city_count}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canUpdate && (
                        <ActionButton variant="edit" onClick={() => { setEditingId(s.state_id); setEditForm({ state_name: s.state_name, state_code: s.state_code, is_active: s.is_active }); }}>Edit</ActionButton>
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
