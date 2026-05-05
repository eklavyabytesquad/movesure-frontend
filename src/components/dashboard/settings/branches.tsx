'use client';

import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { FormInput, SubmitButton, ActionButton, SearchableDropdown } from './ui';
import type { DropdownOption } from './ui';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';

interface Branch {
  branch_id: string;
  name: string;
  branch_code: string;
  branch_type: string;
  address: string | null;
  mobile_number: string | null;
  owner_name: string | null;
  city_id: string | null;
  created_at: string;
}

interface City {
  city_id: string;
  city_name: string;
  city_code?: string | null;
}

const BRANCH_TYPES = [
  { value: 'primary', label: 'Primary' },
  { value: 'hub',     label: 'Hub' },
  { value: 'branch',  label: 'Branch' },
];

export default function BranchesManager() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can(SLUGS.MASTER_BRANCHES_CREATE);
  const canUpdate = can(SLUGS.MASTER_BRANCHES_UPDATE);

  const [branches, setBranches]     = useState<Branch[]>([]);
  const [cities, setCities]         = useState<City[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create form
  const [form, setForm] = useState({
    name: '', branch_code: '', branch_type: 'branch', address: '',
    mobile_number: '', owner_name: '', city_id: '',
  });

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm]   = useState({
    name: '', branch_code: '', branch_type: 'branch', address: '',
    mobile_number: '', owner_name: '', city_id: '',
  });

  async function fetchBranches() {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/v1/master/branches`);
      if (res.status === 401) { router.replace('/auth/login'); return; }
      if (!res.ok) { setError('Failed to load branches.'); return; }
      const data = await res.json();
      setBranches(data.branches ?? []);
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCities() {
    try {
      const res = await apiFetch('/v1/master/cities?is_active=true');
      if (res.ok) { const d = await res.json(); setCities(d.cities ?? d ?? []); }
    } catch { /* non-fatal */ }
  }

  useEffect(() => {
    const user = getUser();
    if (!user) { router.replace('/auth/login'); return; }
    fetchBranches();
    fetchCities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload: Record<string, string> = {
        name: form.name.trim(),
        branch_code: form.branch_code.trim().toUpperCase(),
        branch_type: form.branch_type,
      };
      if (form.address.trim())       payload.address       = form.address.trim();
      if (form.mobile_number.trim()) payload.mobile_number = form.mobile_number.trim();
      if (form.owner_name.trim())    payload.owner_name    = form.owner_name.trim();
      if (form.city_id)              payload.city_id       = form.city_id;

      const res = await apiFetch(`/v1/master/branches`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 409) {
        setError(typeof data.detail === 'string' ? data.detail : 'Branch code already exists.');
        return;
      }
      if (!res.ok) {
        const msgs = Array.isArray(data.detail)
          ? data.detail.map((d: { msg: string }) => d.msg).join('. ')
          : (data.detail ?? 'Failed to create branch.');
        setError(msgs);
        return;
      }
      setSuccess(`Branch "${data.branch.name}" created.`);
      setForm({ name: '', branch_code: '', branch_type: 'branch', address: '', mobile_number: '', owner_name: '', city_id: '' });
      setShowForm(false);
      fetchBranches();
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(branch_id: string) {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload: Record<string, string | null> = {
        name: editForm.name.trim(),
        branch_code: editForm.branch_code.trim().toUpperCase(),
        branch_type: editForm.branch_type,
        address:       editForm.address.trim()       || '',
        mobile_number: editForm.mobile_number.trim() || '',
        owner_name:    editForm.owner_name.trim()    || '',
        city_id:       editForm.city_id              || null,
      };

      const res = await apiFetch(`/v1/master/branches/${branch_id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 409) {
        setError(typeof data.detail === 'string' ? data.detail : 'Branch code already exists.');
        return;
      }
      if (!res.ok) {
        setError(data.detail ?? 'Failed to update branch.');
        return;
      }
      setSuccess(`Branch "${data.branch.name}" updated.`);
      setEditingId(null);
      fetchBranches();
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(b: Branch) {
    setEditingId(b.branch_id);
    setEditForm({
      name:          b.name,
      branch_code:   b.branch_code,
      branch_type:   b.branch_type,
      address:       b.address       ?? '',
      mobile_number: b.mobile_number ?? '',
      owner_name:    b.owner_name    ?? '',
      city_id:       b.city_id       ?? '',
    });
    setError('');
    setSuccess('');
  }

  const cityName = (id: string | null) => id ? (cities.find(c => c.city_id === id)?.city_name ?? '—') : '—';
  const cityOptions: DropdownOption[] = cities.map(c => ({ value: c.city_id, label: c.city_name }));

  const typeBadge = (type: string) => {
    const map: Record<string, string> = {
      primary: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      hub:     'bg-amber-50  text-amber-700  border border-amber-200',
      branch:  'bg-slate-50  text-slate-600  border border-slate-200',
    };
    return map[type] ?? 'bg-slate-50 text-slate-600 border border-slate-200';
  };

  const filteredBranches = searchQuery
    ? branches.filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.branch_code.toLowerCase().includes(searchQuery.toLowerCase()))
    : branches;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-slate-900">Branches</h1>
        <span className="text-sm text-slate-400">{filteredBranches.length}{searchQuery ? ` of ${branches.length}` : ''} branch{filteredBranches.length !== 1 ? 'es' : ''}</span>
      </div>
      <p className="text-sm text-slate-500 mb-6">Manage your company's branches.</p>

      {error   && <div className="mb-4 rounded-lg bg-red-50   border border-red-200   px-4 py-3 text-sm text-red-700  ">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      {/* ── Toolbar ── */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search branches…"
          className="flex-1 min-w-45 max-w-xs rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={fetchBranches}
          title="Refresh"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ↻ Refresh
        </button>
        {canCreate && (
        <button
          onClick={() => { setShowForm((v) => !v); setError(''); setSuccess(''); }}
          className="ml-auto rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Branch'}
        </button>
        )}
      </div>

      {/* ── Create form ── */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">New Branch</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormInput
              label="Branch Name *"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Pune Office"
            />
            <FormInput
              label="Branch Code *"
              required
              value={form.branch_code}
              onChange={(e) => setForm((f) => ({ ...f, branch_code: e.target.value.toUpperCase() }))}
              placeholder="PUN001"
              maxLength={20}
            />
            <div className="w-full">
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Branch Type</label>
              <select
                value={form.branch_type}
                onChange={(e) => setForm((f) => ({ ...f, branch_type: e.target.value }))}
                className="w-full border border-gray-300 text-gray-900 bg-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {BRANCH_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <FormInput
              label="Owner / Manager"
              value={form.owner_name}
              onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
              placeholder="Rajesh Gupta"
            />
            <FormInput
              label="Mobile Number"
              value={form.mobile_number}
              onChange={(e) => setForm((f) => ({ ...f, mobile_number: e.target.value }))}
              placeholder="9876543210"
              maxLength={20}
            />
            <SearchableDropdown
              label="City"
              value={form.city_id}
              onChange={(val) => setForm((f) => ({ ...f, city_id: val }))}
              options={cityOptions}
              placeholder="Select city"
            />
            <FormInput
              label="Address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="FC Road, Pune 411004"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <SubmitButton loading={submitting} loadingText="Creating…">
              Create Branch
            </SubmitButton>
          </div>
        </form>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">Loading branches…</div>
      ) : filteredBranches.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400 bg-white rounded-xl border border-slate-200">
          {searchQuery ? 'No branches match your search.' : 'No branches found. Add your first branch above.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Code</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Type</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">City</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Owner</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Mobile</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden 2xl:table-cell">Address</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBranches.map((b) =>
                editingId === b.branch_id ? (
                  /* ── Inline edit row ── */
                  <tr key={b.branch_id} className="bg-indigo-50/40">
                    <td colSpan={5} className="px-5 py-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-3">
                        <FormInput
                          label="Name *"
                          required
                          size="sm"
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        />
                        <FormInput
                          label="Code *"
                          required
                          size="sm"
                          value={editForm.branch_code}
                          onChange={(e) => setEditForm((f) => ({ ...f, branch_code: e.target.value.toUpperCase() }))}
                          maxLength={20}
                        />
                        <div className="w-full">
                          <label className="block text-sm font-semibold text-gray-800 mb-1.5">Type</label>
                          <select
                            value={editForm.branch_type}
                            onChange={(e) => setEditForm((f) => ({ ...f, branch_type: e.target.value }))}
                            className="w-full border border-gray-300 text-gray-900 bg-white text-sm px-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {BRANCH_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <FormInput
                          label="Owner / Manager"
                          size="sm"
                          value={editForm.owner_name}
                          onChange={(e) => setEditForm((f) => ({ ...f, owner_name: e.target.value }))}
                          placeholder="Optional"
                        />
                        <FormInput
                          label="Mobile"
                          size="sm"
                          value={editForm.mobile_number}
                          onChange={(e) => setEditForm((f) => ({ ...f, mobile_number: e.target.value }))}
                          placeholder="Optional"
                          maxLength={20}
                        />
                        <SearchableDropdown
                          label="City"
                          size="sm"
                          value={editForm.city_id}
                          onChange={(val) => setEditForm((f) => ({ ...f, city_id: val }))}
                          options={cityOptions}
                          placeholder="Select city"
                        />
                        <FormInput
                          label="Address"
                          size="sm"
                          value={editForm.address}
                          onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="flex gap-2">
                        <ActionButton
                          variant="save"
                          disabled={submitting}
                          onClick={() => handleUpdate(b.branch_id)}
                        >
                          {submitting ? 'Saving…' : 'Save'}
                        </ActionButton>
                        <ActionButton
                          variant="cancel"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ) : (
                  /* ── Normal row ── */
                  <tr key={b.branch_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{b.name}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-500 text-xs hidden sm:table-cell">{b.branch_code}</td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeBadge(b.branch_type)}`}>
                        {b.branch_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs hidden lg:table-cell">{cityName(b.city_id)}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs hidden xl:table-cell">{b.owner_name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs hidden xl:table-cell font-mono">{b.mobile_number ?? '—'}</td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs hidden 2xl:table-cell truncate max-w-45">{b.address ?? '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      {canUpdate && (
                      <ActionButton variant="edit" onClick={() => startEdit(b)}>
                        Edit
                      </ActionButton>
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
