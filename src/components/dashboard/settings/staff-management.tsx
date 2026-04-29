'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { FormInput, SearchableDropdown, SubmitButton, ActionButton } from './ui';
import type { DropdownOption } from './ui';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';

type Tab = 'list' | 'add' | 'edit';

interface Branch {
  branch_id: string;
  name: string;
  branch_code: string;
  branch_type: string;
  address: string | null;
}

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  post_in_office: string;
  branch_id: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export default function StaffManagement() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('list');
  const { can } = usePermissions();
  const canCreate = can(SLUGS.STAFF_CREATE);
  const canUpdate = can(SLUGS.STAFF_UPDATE);

  // Shared data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filterBranch, setFilterBranch] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [listError, setListError] = useState('');

  // Add tab state
  const [addForm, setAddForm] = useState({
    full_name: '', email: '', password: '', post_in_office: '', branch_id: '', image_url: '',
  });
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit tab state
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '', post_in_office: '', branch_id: '', image_url: '', password: '',
  });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchStaff = useCallback(
    async (branchId: string) => {
      setLoadingStaff(true);
      setListError('');
      const path = branchId ? `/v1/staff?branch_id=${branchId}` : `/v1/staff`;
      try {
        const res = await apiFetch(path);
        if (res.status === 401) { router.replace('/auth/login'); return; }
        if (!res.ok) { setListError('Failed to load staff.'); return; }
        const data = await res.json();
        setStaff(data.staff ?? []);
      } catch {
        setListError('Unable to reach the server.');
      } finally {
        setLoadingStaff(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const user = getUser();
    if (!user) { router.replace('/auth/login'); return; }

    apiFetch(`/v1/staff/branches`)
      .then((r) => (r.status === 401 ? (router.replace('/auth/login'), null) : r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const list: Branch[] = data.branches ?? [];
        setBranches(list);
        const u = getUser();
        if (u?.branch_id) setAddForm((f) => ({ ...f, branch_id: u.branch_id }));
      })
      .catch(() => {})
      .finally(() => setLoadingBranches(false));

    fetchStaff('');
  }, [router, fetchStaff]);

  function openEdit(s: StaffMember) {
    setSelected(s);
    setEditError('');
    setEditSuccess('');
    setEditForm({
      full_name: s.full_name,
      post_in_office: s.post_in_office,
      branch_id: s.branch_id,
      image_url: s.image_url ?? '',
      password: '',
    });
    setTab('edit');
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError('');
    setAddSuccess('');

    const payload: Record<string, string> = {
      full_name: addForm.full_name,
      email: addForm.email,
      password: addForm.password,
      post_in_office: addForm.post_in_office,
      branch_id: addForm.branch_id,
    };
    if (addForm.image_url.trim()) payload.image_url = addForm.image_url.trim();

    try {
      const res = await apiFetch(`/v1/staff`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 201) {
        setAddSuccess(`"${data.staff.full_name}" added successfully.`);
        setAddForm((f) => ({
          full_name: '', email: '', password: '', post_in_office: '',
          branch_id: f.branch_id, image_url: '',
        }));
        fetchStaff(filterBranch);
      } else if (res.status === 401) {
        router.replace('/auth/login');
      } else if (res.status === 409) {
        setAddError(typeof data.detail === 'string' ? data.detail : 'Email already registered.');
      } else if (res.status === 422) {
        const msgs = Array.isArray(data.detail)
          ? data.detail.map((d: { msg: string }) => d.msg).join('. ')
          : 'Validation error. Please check all fields.';
        setAddError(msgs);
      } else {
        setAddError(typeof data.detail === 'string' ? data.detail : 'Failed to add staff.');
      }
    } catch {
      setAddError('Unable to reach the server.');
    } finally {
      setAdding(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setEditError('');
    setEditSuccess('');

    const payload: Record<string, string | boolean> = {
      full_name: editForm.full_name,
      post_in_office: editForm.post_in_office,
      branch_id: editForm.branch_id,
    };
    if (editForm.image_url.trim()) payload.image_url = editForm.image_url.trim();
    if (editForm.password.trim()) payload.password = editForm.password.trim();

    try {
      const res = await apiFetch(`/v1/staff/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 200) {
        setEditSuccess(`"${data.staff.full_name}" updated successfully.`);
        setStaff((prev) => prev.map((s) => (s.id === selected.id ? { ...s, ...data.staff } : s)));
        setSelected(data.staff);
        setEditForm((f) => ({ ...f, password: '' }));
      } else if (res.status === 401) {
        router.replace('/auth/login');
      } else if (res.status === 422) {
        const msgs = Array.isArray(data.detail)
          ? data.detail.map((d: { msg: string }) => d.msg).join('. ')
          : 'Validation error.';
        setEditError(msgs);
      } else {
        setEditError(typeof data.detail === 'string' ? data.detail : 'Failed to update.');
      }
    } catch {
      setEditError('Unable to reach the server.');
    } finally {
      setSaving(false);
    }
  }

  const branchName = (id: string) => branches.find((b) => b.branch_id === id)?.name ?? '';
  const branchOptions: DropdownOption[] = branches.map((b) => ({
    value: b.branch_id,
    label: `${b.name} (${b.branch_code})`,
  }));

  const tabDefs: { key: Tab; label: string }[] = [
    { key: 'list', label: `All Staff${staff.length ? ` (${staff.length})` : ''}` },
    ...(canCreate ? [{ key: 'add' as Tab, label: 'Add Staff' }] : []),
    ...(canUpdate ? [{ key: 'edit' as Tab, label: selected ? `Editing: ${selected.full_name}` : 'Edit Staff' }] : []),
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Staff Management</h1>
      <p className="text-sm text-gray-500 mb-5">Add, view and update staff members.</p>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {tabDefs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ALL STAFF tab ── */}
      {tab === 'list' && (
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700 shrink-0">Filter by branch:</label>
            <SearchableDropdown
              value={filterBranch}
              onChange={(val) => { setFilterBranch(val); fetchStaff(val); }}
              options={branches.map((b): DropdownOption => ({
                value: b.branch_id, label: `${b.name} (${b.branch_code})`,
              }))}
              placeholder="All branches"
              size="sm"
              className="max-w-xs"
            />
            {canCreate && (
            <button
              type="button"
              onClick={() => setTab('add')}
              className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + Add Staff
            </button>
            )}
          </div>

          {listError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              {listError}
            </div>
          )}

          {loadingStaff ? (
            <div className="py-8 text-center text-sm text-gray-400">Loading staff…</div>
          ) : staff.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400 bg-white rounded-2xl border border-gray-200">
              No staff members found.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Name</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">Email</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Role</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden lg:table-cell">Branch</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {staff.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900">{s.full_name}</td>
                      <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">{s.email}</td>
                      <td className="px-5 py-3.5 text-gray-500 capitalize hidden md:table-cell">{s.post_in_office}</td>
                      <td className="px-5 py-3.5 text-gray-500 hidden lg:table-cell">{branchName(s.branch_id)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {canUpdate && (
                        <ActionButton variant="edit" onClick={() => openEdit(s)}>Edit</ActionButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ADD STAFF tab ── */}
      {tab === 'add' && (
        <div className="max-w-xl">
          {addError && (
            <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              <span>&#9888;</span><span>{addError}</span>
            </div>
          )}
          {addSuccess && (
            <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">
              <span>&#10003;</span><span>{addSuccess}</span>
            </div>
          )}
          <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label="Full Name *"
                type="text"
                value={addForm.full_name}
                onChange={(e) => setAddForm((f) => ({ ...f, full_name: e.target.value }))}
                required
                minLength={2}
                placeholder="Ravi Kumar"
              />
              <FormInput
                label="Email *"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                required
                placeholder="ravi@company.io"
              />
              <FormInput
                label="Password *"
                type="password"
                value={addForm.password}
                onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
                placeholder="Min 8 characters"
              />
              <FormInput
                label="Role / Post *"
                type="text"
                value={addForm.post_in_office}
                onChange={(e) => setAddForm((f) => ({ ...f, post_in_office: e.target.value }))}
                required
                placeholder="driver, manager, accountant"
              />
              <div className="sm:col-span-2">
                {loadingBranches ? (
                  <div className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-400 bg-gray-50">
                    Loading branches...
                  </div>
                ) : (
                  <SearchableDropdown
                    label="Branch *"
                    value={addForm.branch_id}
                    onChange={(val) => setAddForm((f) => ({ ...f, branch_id: val }))}
                    options={branchOptions}
                    placeholder="Select a branch"
                    required
                  />
                )}
              </div>
              <div className="sm:col-span-2">
                <FormInput
                  label="Profile Image URL (optional)"
                  type="url"
                  value={addForm.image_url}
                  onChange={(e) => setAddForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://cdn.example.com/avatar.jpg"
                />
              </div>
            </div>
            <SubmitButton loading={adding} disabled={loadingBranches} loadingText="Adding…" fullWidth>
              Add Staff Member
            </SubmitButton>
          </form>
        </div>
      )}

      {/* ── EDIT STAFF tab ── */}
      {tab === 'edit' && (
        <div className="max-w-xl">
          {!selected ? (
            <div className="flex flex-col items-center justify-center gap-2 h-40 bg-white rounded-2xl border border-dashed border-gray-300 text-sm text-gray-400">
              <span>No staff selected for editing.</span>
              <button
                type="button"
                onClick={() => setTab('list')}
                className="text-blue-500 hover:underline text-xs"
              >
                Go to All Staff and click Edit on a row
              </button>
            </div>
          ) : (
            <>
              {editError && (
                <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                  <span>&#9888;</span><span>{editError}</span>
                </div>
              )}
              {editSuccess && (
                <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">
                  <span>&#10003;</span><span>{editSuccess}</span>
                </div>
              )}
              <form onSubmit={handleEdit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                <div className="pb-2 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Editing</p>
                    <p className="font-semibold text-gray-800">{selected.full_name}</p>
                    <p className="text-xs text-gray-400">{selected.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('list')}
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    ← Back to list
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="Full Name *"
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                    required
                    minLength={2}
                  />
                  <FormInput
                    label="Role / Post *"
                    type="text"
                    value={editForm.post_in_office}
                    onChange={(e) => setEditForm((f) => ({ ...f, post_in_office: e.target.value }))}
                    required
                    placeholder="driver, manager, accountant"
                  />
                  <SearchableDropdown
                    label="Branch *"
                    value={editForm.branch_id}
                    onChange={(val) => setEditForm((f) => ({ ...f, branch_id: val }))}
                    options={branchOptions}
                    placeholder="Select branch"
                    required
                  />
                  <FormInput
                    label="New Password (leave blank to keep)"
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                    minLength={8}
                    placeholder="Min 8 characters"
                  />
                  <div className="sm:col-span-2">
                    <FormInput
                      label="Profile Image URL (optional)"
                      type="url"
                      value={editForm.image_url}
                      onChange={(e) => setEditForm((f) => ({ ...f, image_url: e.target.value }))}
                      placeholder="https://cdn.example.com/avatar.jpg"
                    />
                  </div>
                </div>

                <SubmitButton loading={saving} loadingText="Saving…" fullWidth>
                  Save Changes
                </SubmitButton>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
