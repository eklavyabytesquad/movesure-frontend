'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE, getToken, getUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { FormInput, SubmitButton, ActionButton } from './ui';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';
import { invalidatePermissionsCache } from '@/hooks/usePermissions';

/* ─────────────────── types ─────────────────── */

type Tab = 'library' | 'assign';

interface Permission {
  id: string;
  module: string;
  action: string;
  scope: string;
  slug: string | null;
  is_active: boolean;
  created_at: string;
}

interface Grant {
  id: string;
  permission_id: string;
  branch_id: string | null;
  reason: string | null;
  expires_at: string | null;
  iam_permission?: {
    module: string;
    action: string;
    scope: string;
    slug: string | null;
    is_active: boolean;
  };
}

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  post_in_office: string;
  branch_id: string;
  is_active: boolean;
}

/* ─────────────────── preset helpers ─────────────────── */

const MODULES = ['master', 'staff', 'reports', 'billing', 'custom'];
const ACTIONS = ['create', 'read', 'update', 'delete', 'export'];
const SCOPES  = ['company', 'branch', 'own'];

/** Quick-pick presets — common permission slugs for MoveSure */
const PRESETS: { label: string; module: string; action: string; scope: string; slug: string }[] = [
  { label: 'Staff – View',        module: 'staff',   action: 'read',   scope: 'company', slug: SLUGS.STAFF_READ   },
  { label: 'Staff – Create',      module: 'staff',   action: 'create', scope: 'company', slug: SLUGS.STAFF_CREATE },
  { label: 'Staff – Update',      module: 'staff',   action: 'update', scope: 'company', slug: SLUGS.STAFF_UPDATE },
  { label: 'Staff – Delete',      module: 'staff',   action: 'delete', scope: 'company', slug: SLUGS.STAFF_DELETE },
  { label: 'Master – View',       module: 'master',  action: 'read',   scope: 'branch',  slug: SLUGS.MASTER_READ   },
  { label: 'Master – Create',     module: 'master',  action: 'create', scope: 'branch',  slug: SLUGS.MASTER_CREATE },
  { label: 'Master – Update',     module: 'master',  action: 'update', scope: 'branch',  slug: SLUGS.MASTER_UPDATE },
  { label: 'Master – Delete',     module: 'master',  action: 'delete', scope: 'branch',  slug: SLUGS.MASTER_DELETE },
  { label: 'IAM – View',          module: 'iam',     action: 'read',   scope: 'company', slug: SLUGS.IAM_READ     },
  { label: 'IAM – Full Manage',   module: 'iam',     action: 'manage', scope: 'company', slug: SLUGS.IAM_MANAGE   },
  { label: 'Reports – Export',    module: 'reports', action: 'export', scope: 'company', slug: 'reports:export:company' },
  { label: 'Billing – View',      module: 'billing', action: 'read',   scope: 'company', slug: 'billing:read:company'  },
];

const moduleColor: Record<string, string> = {
  staff:   'bg-blue-50  text-blue-700  border border-blue-200',
  master:  'bg-indigo-50 text-indigo-700 border border-indigo-200',
  reports: 'bg-amber-50 text-amber-700  border border-amber-200',
  billing: 'bg-green-50 text-green-700  border border-green-200',
};
const getModuleColor = (m: string) => moduleColor[m] ?? 'bg-slate-50 text-slate-600 border border-slate-200';

const actionColor: Record<string, string> = {
  read:   'bg-sky-50    text-sky-700',
  create: 'bg-emerald-50 text-emerald-700',
  update: 'bg-yellow-50 text-yellow-700',
  delete: 'bg-red-50    text-red-700',
  export: 'bg-purple-50 text-purple-700',
};
const getActionColor = (a: string) => actionColor[a] ?? 'bg-slate-50 text-slate-500';

/* ─────────────────── component ─────────────────── */

export default function PermissionsManager() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('library');
  const { can } = usePermissions();
  const canManage = can(SLUGS.IAM_MANAGE);

  /* ── shared data ── */
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [staff, setStaff]             = useState<StaffMember[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [globalError, setGlobalError]  = useState('');

  /* ── library tab ── */
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    module: 'staff', action: 'read', scope: 'company', slug: '', custom_module: '', custom_action: '',
  });
  const [creating, setCreating]     = useState(false);
  const [libError, setLibError]     = useState('');
  const [libSuccess, setLibSuccess] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState('');

  /* ── assign tab ── */
  const [selectedStaff, setSelectedStaff]     = useState<StaffMember | null>(null);
  const [userGrants, setUserGrants]            = useState<Grant[]>([]);
  const [loadingGrants, setLoadingGrants]      = useState(false);
  const [revokingId, setRevokingId]            = useState<string | null>(null);
  const [grantPermId, setGrantPermId]          = useState('');
  const [grantReason, setGrantReason]          = useState('');
  const [granting, setGranting]                = useState(false);
  const [assignError, setAssignError]          = useState('');
  const [assignSuccess, setAssignSuccess]      = useState('');
  const [staffSearch, setStaffSearch]          = useState('');

  /* ─── token helper ─── */
  function tok() {
    const t = getToken();
    if (!t) { router.replace('/auth/login'); return null; }
    return t;
  }

  /* ─── fetch permissions ─── */
  const fetchPermissions = useCallback(async () => {
    setLoadingPerms(true);
    const token = tok();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/v1/iam/permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.replace('/auth/login'); return; }
      const data = await res.json();
      setPermissions(data.permissions ?? []);
    } catch {
      setGlobalError('Failed to load permissions.');
    } finally {
      setLoadingPerms(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── fetch staff ─── */
  const fetchStaff = useCallback(async () => {
    setLoadingStaff(true);
    const token = tok();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/v1/staff`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.replace('/auth/login'); return; }
      const data = await res.json();
      setStaff(data.staff ?? []);
    } catch {
      /* silent */
    } finally {
      setLoadingStaff(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const user = getUser();
    if (!user) { router.replace('/auth/login'); return; }
    fetchPermissions();
    fetchStaff();
  }, [fetchPermissions, fetchStaff, router]);

  /* ─── fetch grants for a user ─── */
  const fetchUserGrants = useCallback(async (userId: string) => {
    setLoadingGrants(true);
    setAssignError('');
    const token = tok();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/v1/iam/grants/user/${userId}?active_only=false`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.replace('/auth/login'); return; }
      const data = await res.json();
      setUserGrants(data.grants ?? []);
    } catch {
      setAssignError('Failed to load user permissions.');
    } finally {
      setLoadingGrants(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── select staff ─── */
  function selectStaff(s: StaffMember) {
    setSelectedStaff(s);
    setAssignError('');
    setAssignSuccess('');
    setGrantPermId('');
    setGrantReason('');
    fetchUserGrants(s.id);
  }

  /* ─── create permission ─── */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setLibError('');
    setLibSuccess('');
    const token = tok();
    if (!token) return;

    const module_ = createForm.module === 'custom' ? createForm.custom_module.trim() : createForm.module;
    const action_ = createForm.action === 'custom' ? createForm.custom_action.trim() : createForm.action;
    const slug_   = createForm.slug.trim() || `${module_}:${action_}:${createForm.scope}`;

    if (!module_ || !action_) {
      setLibError('Module and action are required.');
      setCreating(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/v1/iam/permissions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: module_, action: action_, scope: createForm.scope, slug: slug_ }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setLibError(typeof data.detail === 'string' ? data.detail : 'Permission or slug already exists.');
        return;
      }
      if (!res.ok) {
        const msgs = Array.isArray(data.detail)
          ? data.detail.map((d: { msg: string }) => d.msg).join('. ')
          : (data.detail ?? 'Failed to create permission.');
        setLibError(msgs);
        return;
      }
      setLibSuccess(`Permission "${slug_}" created.`);
      setShowCreateForm(false);
      setCreateForm({ module: 'staff', action: 'read', scope: 'company', slug: '', custom_module: '', custom_action: '' });
      fetchPermissions();
    } catch {
      setLibError('Unable to reach the server.');
    } finally {
      setCreating(false);
    }
  }

  /* ─── apply preset ─── */
  async function applyPreset(p: typeof PRESETS[0]) {
    setLibError('');
    setLibSuccess('');
    const token = tok();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/v1/iam/permissions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: p.module, action: p.action, scope: p.scope, slug: p.slug }),
      });
      const data = await res.json();
      if (res.status === 409) { setLibSuccess(`"${p.slug}" already exists.`); fetchPermissions(); return; }
      if (!res.ok) { setLibError(data.detail ?? 'Failed.'); return; }
      setLibSuccess(`"${p.slug}" added to library.`);
      fetchPermissions();
    } catch {
      setLibError('Unable to reach the server.');
    }
  }

  /* ─── delete permission ─── */
  async function handleDelete(id: string, slug: string | null) {
    if (!confirm(`Delete permission "${slug ?? id}"? All grants for it will also be removed.`)) return;
    setDeletingId(id);
    setLibError('');
    const token = tok();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/v1/iam/permissions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.replace('/auth/login'); return; }
      if (!res.ok && res.status !== 204) { setLibError('Failed to delete permission.'); return; }
      setLibSuccess(`Permission deleted.`);
      fetchPermissions();
    } catch {
      setLibError('Unable to reach the server.');
    } finally {
      setDeletingId(null);
    }
  }

  /* ─── grant permission ─── */
  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStaff || !grantPermId) return;
    setGranting(true);
    setAssignError('');
    setAssignSuccess('');
    const token = tok();
    if (!token) return;
    try {
      const body: Record<string, string> = {
        user_id: selectedStaff.id,
        permission_id: grantPermId,
      };
      if (grantReason.trim()) body.reason = grantReason.trim();

      const res = await fetch(`${API_BASE}/v1/iam/grants`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 409) {
        setAssignError('This permission is already granted to this staff member.');
        return;
      }
      if (!res.ok) {
        setAssignError(data.detail ?? 'Failed to grant permission.');
        return;
      }
      setAssignSuccess('Permission granted.');
      invalidatePermissionsCache();
      setGrantPermId('');
      setGrantReason('');
      fetchUserGrants(selectedStaff.id);
    } catch {
      setAssignError('Unable to reach the server.');
    } finally {
      setGranting(false);
    }
  }

  /* ─── revoke grant ─── */
  async function handleRevoke(grantId: string) {
    setRevokingId(grantId);
    setAssignError('');
    const token = tok();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/v1/iam/grants/${grantId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.replace('/auth/login'); return; }
      if (!res.ok && res.status !== 204) { setAssignError('Failed to revoke.'); return; }
      setAssignSuccess('Permission revoked.');
      invalidatePermissionsCache();
      if (selectedStaff) fetchUserGrants(selectedStaff.id);
    } catch {
      setAssignError('Unable to reach the server.');
    } finally {
      setRevokingId(null);
    }
  }

  /* ─── derived ─── */
  const filteredPerms = moduleFilter
    ? permissions.filter((p) => p.module === moduleFilter)
    : permissions;

  const uniqueModules = Array.from(new Set(permissions.map((p) => p.module)));

  const availableToGrant = selectedStaff
    ? permissions.filter((p) => !userGrants.some((g) => g.permission_id === p.id))
    : permissions;

  const grantOptions = availableToGrant.map((p) => ({
    value: p.id,
    label: p.slug ?? `${p.module}:${p.action}:${p.scope}`,
  }));

  const filteredStaff = staff.filter((s) =>
    staffSearch
      ? s.full_name.toLowerCase().includes(staffSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(staffSearch.toLowerCase())
      : true,
  );

  /* ─── tabs ─── */
  const tabs: { key: Tab; label: string }[] = [
    { key: 'library', label: `Permission Library${permissions.length ? ` (${permissions.length})` : ''}` },
    { key: 'assign',  label: 'Assign to Staff' },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <h1 className="text-xl font-bold text-slate-900 mb-1">Permissions</h1>
      <p className="text-sm text-slate-500 mb-5">
        Define what each staff member can do across every module.
      </p>

      {globalError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {globalError}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ LIBRARY TAB ══════════ */}
      {tab === 'library' && (
        <div>
          {libError   && <div className="mb-4 rounded-lg bg-red-50   border border-red-200   px-4 py-3 text-sm text-red-700  ">{libError}</div>}
          {libSuccess && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{libSuccess}</div>}

          {/* ── Toolbar ── */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            {/* Module filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setModuleFilter('')}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  !moduleFilter ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >All</button>
              {uniqueModules.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModuleFilter(m === moduleFilter ? '' : m)}
                  className={`px-3 py-1 text-xs rounded-full font-medium capitalize transition-colors ${
                    moduleFilter === m ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >{m}</button>
              ))}
            </div>
            {canManage && (
            <button
              type="button"
              onClick={() => { setShowCreateForm((v) => !v); setLibError(''); }}
              className="ml-auto rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              {showCreateForm ? 'Cancel' : '+ New Permission'}
            </button>
            )}
          </div>

          {/* ── Presets ── */}
          {canManage && showCreateForm && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick Add Presets</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {PRESETS.map((p) => {
                  const exists = permissions.some((perm) => perm.slug === p.slug);
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => applyPreset(p)}
                      disabled={exists}
                      className={`px-3 py-1 text-xs rounded-lg font-medium border transition-colors ${
                        exists
                          ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-default'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {exists ? '✓ ' : '+ '}{p.label}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Custom Permission</p>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {/* Module */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1.5">Module *</label>
                      <select
                        value={createForm.module}
                        onChange={(e) => setCreateForm((f) => ({ ...f, module: e.target.value }))}
                        className="w-full border border-gray-300 text-gray-900 bg-white text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    {createForm.module === 'custom' && (
                      <FormInput
                        label="Custom Module *"
                        value={createForm.custom_module}
                        onChange={(e) => setCreateForm((f) => ({ ...f, custom_module: e.target.value }))}
                        placeholder="e.g. inventory"
                      />
                    )}

                    {/* Action */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1.5">Action *</label>
                      <select
                        value={createForm.action}
                        onChange={(e) => setCreateForm((f) => ({ ...f, action: e.target.value }))}
                        className="w-full border border-gray-300 text-gray-900 bg-white text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                        <option value="custom">custom…</option>
                      </select>
                    </div>
                    {createForm.action === 'custom' && (
                      <FormInput
                        label="Custom Action *"
                        value={createForm.custom_action}
                        onChange={(e) => setCreateForm((f) => ({ ...f, custom_action: e.target.value }))}
                        placeholder="e.g. approve"
                      />
                    )}

                    {/* Scope */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1.5">Scope</label>
                      <select
                        value={createForm.scope}
                        onChange={(e) => setCreateForm((f) => ({ ...f, scope: e.target.value }))}
                        className="w-full border border-gray-300 text-gray-900 bg-white text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Slug */}
                    <div>
                      <FormInput
                        label="Slug (auto-filled)"
                        value={
                          createForm.slug ||
                          `${createForm.module === 'custom' ? createForm.custom_module || '…' : createForm.module}:${createForm.action === 'custom' ? createForm.custom_action || '…' : createForm.action}:${createForm.scope}`
                        }
                        onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))}
                        placeholder="module:action:scope"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <SubmitButton loading={creating} loadingText="Creating…">
                      Create Permission
                    </SubmitButton>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── Permissions table ── */}
          {loadingPerms ? (
            <div className="py-10 text-center text-sm text-slate-400">Loading permissions…</div>
          ) : filteredPerms.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400 bg-white rounded-xl border border-slate-200">
              No permissions found.{!permissions.length && ' Add presets or create custom ones above.'}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Module</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Scope</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Slug</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredPerms.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getModuleColor(p.module)}`}>
                          {p.module}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getActionColor(p.action)}`}>
                          {p.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs capitalize hidden sm:table-cell">{p.scope}</td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <code className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded">
                          {p.slug ?? `${p.module}:${p.action}:${p.scope}`}
                        </code>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {canManage && (
                        <ActionButton
                          variant="danger"
                          disabled={deletingId === p.id}
                          onClick={() => handleDelete(p.id, p.slug)}
                        >
                          {deletingId === p.id ? '\u2026' : 'Delete'}
                        </ActionButton>
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

      {/* ══════════ ASSIGN TAB ══════════ */}
      {tab === 'assign' && (
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Left: staff list ── */}
          <div className="lg:w-72 shrink-0">
            <div className="mb-2">
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search staff…"
                className="w-full border border-slate-200 text-slate-800 bg-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
              />
            </div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 mt-3">
              Staff Members
            </p>
            {loadingStaff ? (
              <div className="text-sm text-slate-400 py-4 text-center">Loading…</div>
            ) : (
              <ul className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                {filteredStaff.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => selectStaff(s)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                        selectedStaff?.id === s.id
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <p className="font-medium">{s.full_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 capitalize">{s.post_in_office}</p>
                    </button>
                  </li>
                ))}
                {filteredStaff.length === 0 && (
                  <li className="text-sm text-slate-400 py-4 text-center">No staff found.</li>
                )}
              </ul>
            )}
          </div>

          {/* ── Right: grants panel ── */}
          <div className="flex-1 min-w-0">
            {!selectedStaff ? (
              <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">
                Select a staff member to manage their permissions
              </div>
            ) : (
              <div className="space-y-5">
                {/* Staff header */}
                <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-5 py-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {selectedStaff.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{selectedStaff.full_name}</p>
                    <p className="text-xs text-slate-400 capitalize mt-0.5">{selectedStaff.post_in_office} · {selectedStaff.email}</p>
                  </div>
                  <span className={`ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedStaff.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {selectedStaff.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {assignError   && <div className="rounded-lg bg-red-50   border border-red-200   px-4 py-3 text-sm text-red-700  ">{assignError}</div>}
                {assignSuccess && <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{assignSuccess}</div>}

                {/* Current grants */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <p className="text-sm font-semibold text-slate-800 mb-3">
                    Current Permissions
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {loadingGrants ? 'loading…' : `${userGrants.length} granted`}
                    </span>
                  </p>

                  {loadingGrants ? (
                    <div className="py-4 text-center text-sm text-slate-400">Loading grants…</div>
                  ) : userGrants.length === 0 ? (
                    <div className="py-4 text-center text-sm text-slate-400 rounded-lg border border-dashed border-slate-200">
                      No permissions assigned yet.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {userGrants.map((g) => {
                        const perm = g.iam_permission;
                        const slug = perm?.slug ?? `${perm?.module ?? '?'}:${perm?.action ?? '?'}:${perm?.scope ?? '?'}`;
                        return (
                          <li
                            key={g.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5"
                          >
                            <div className="min-w-0 flex items-center gap-2 flex-wrap">
                              {perm && (
                                <>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getModuleColor(perm.module)}`}>
                                    {perm.module}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getActionColor(perm.action)}`}>
                                    {perm.action}
                                  </span>
                                  <span className="text-xs text-slate-400 capitalize">{perm.scope}</span>
                                </>
                              )}
                              <code className="text-xs text-slate-500 font-mono">{slug}</code>
                              {g.reason && (
                                <span className="text-xs text-slate-400 italic">"{g.reason}"</span>
                              )}
                            </div>
                            {canManage && (
                            <ActionButton
                              variant="danger"
                              disabled={revokingId === g.id}
                              onClick={() => handleRevoke(g.id)}
                            >
                              {revokingId === g.id ? '\u2026' : 'Revoke'}
                            </ActionButton>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Assign new permission */}
                {canManage && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <p className="text-sm font-semibold text-slate-800 mb-3">Assign Permission</p>
                  {permissions.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No permissions in the library yet.{' '}
                      <button
                        type="button"
                        onClick={() => setTab('library')}
                        className="text-indigo-500 hover:underline"
                      >
                        Go to Library to add some.
                      </button>
                    </p>
                  ) : availableToGrant.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      All available permissions are already granted to this staff member.
                    </p>
                  ) : (
                    <form onSubmit={handleGrant} className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1.5">Select Permission *</label>
                        <select
                          required
                          value={grantPermId}
                          onChange={(e) => setGrantPermId(e.target.value)}
                          className="w-full border border-gray-300 text-gray-900 bg-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">— choose a permission —</option>
                          {grantOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <FormInput
                        label="Reason (optional)"
                        value={grantReason}
                        onChange={(e) => setGrantReason(e.target.value)}
                        placeholder="e.g. Assigned as branch manager"
                      />
                      <div className="flex justify-end">
                        <SubmitButton loading={granting} loadingText="Granting…">
                          Grant Permission
                        </SubmitButton>
                      </div>
                    </form>
                  )}
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
