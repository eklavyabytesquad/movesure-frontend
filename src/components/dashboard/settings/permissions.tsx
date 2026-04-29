'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { FormInput, SubmitButton, ActionButton } from './ui';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';

/* ─────────────────── types ─────────────────── */

interface Permission {
  id: string;
  module: string;
  action: string;
  scope: string;
  slug: string | null;
  is_active: boolean;
  created_at: string;
}

/* ─────────────────── preset helpers ─────────────────── */

const MODULES = ['master', 'staff', 'reports', 'billing', 'custom'];
const ACTIONS = ['create', 'read', 'update', 'delete', 'export'];
const SCOPES  = ['company', 'branch', 'own'];

const PRESETS: { label: string; module: string; action: string; scope: string; slug: string }[] = [
  { label: 'Settings - Access',   module: 'settings', action: 'access', scope: 'company', slug: SLUGS.SETTINGS_ACCESS },
  { label: 'Staff - View',        module: 'staff',   action: 'read',   scope: 'company', slug: SLUGS.STAFF_READ   },
  { label: 'Staff - Create',      module: 'staff',   action: 'create', scope: 'company', slug: SLUGS.STAFF_CREATE },
  { label: 'Staff - Update',      module: 'staff',   action: 'update', scope: 'company', slug: SLUGS.STAFF_UPDATE },
  { label: 'Staff - Delete',      module: 'staff',   action: 'delete', scope: 'company', slug: SLUGS.STAFF_DELETE },
  { label: 'IAM - View',          module: 'iam',     action: 'read',   scope: 'company', slug: SLUGS.IAM_READ     },
  { label: 'IAM - Full Manage',   module: 'iam',     action: 'manage', scope: 'company', slug: SLUGS.IAM_MANAGE   },
  { label: 'Reports - Export',    module: 'reports', action: 'export', scope: 'company', slug: 'reports:export:company' },
  { label: 'Billing - View',      module: 'billing', action: 'read',   scope: 'company', slug: 'billing:read:company'  },
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
  const { can } = usePermissions();
  const canManage = can(SLUGS.IAM_MANAGE);

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(true);
  const [globalError, setGlobalError]  = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    module: 'staff', action: 'read', scope: 'company', slug: '', custom_module: '', custom_action: '',
  });
  const [creating, setCreating]     = useState(false);
  const [libError, setLibError]     = useState('');
  const [libSuccess, setLibSuccess] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState('');


  const fetchPermissions = useCallback(async () => {
    setLoadingPerms(true);
    try {
      const res = await apiFetch(`/v1/iam/permissions`);
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

  useEffect(() => {
    const user = getUser();
    if (!user) { router.replace('/auth/login'); return; }
    fetchPermissions();
  }, [fetchPermissions, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setLibError('');
    setLibSuccess('');

    const module_ = createForm.module === 'custom' ? createForm.custom_module.trim() : createForm.module;
    const action_ = createForm.action === 'custom' ? createForm.custom_action.trim() : createForm.action;
    const slug_   = createForm.slug.trim() || `${module_}:${action_}:${createForm.scope}`;

    if (!module_ || !action_) {
      setLibError('Module and action are required.');
      setCreating(false);
      return;
    }

    try {
      const res = await apiFetch(`/v1/iam/permissions`, {
        method: 'POST',
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

  async function applyPreset(p: typeof PRESETS[0]) {
    setLibError('');
    setLibSuccess('');
    try {
      const res = await apiFetch(`/v1/iam/permissions`, {
        method: 'POST',
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

  async function handleDelete(id: string, slug: string | null) {
    if (!confirm(`Delete permission "${slug ?? id}"? All grants for it will also be removed.`)) return;
    setDeletingId(id);
    setLibError('');
    try {
      const res = await apiFetch(`/v1/iam/permissions/${id}`, {
        method: 'DELETE',
      });
      if (res.status === 401) { router.replace('/auth/login'); return; }
      if (!res.ok && res.status !== 204) { setLibError('Failed to delete permission.'); return; }
      setLibSuccess('Permission deleted.');
      fetchPermissions();
    } catch {
      setLibError('Unable to reach the server.');
    } finally {
      setDeletingId(null);
    }
  }

  const filteredPerms = moduleFilter
    ? permissions.filter((p) => p.module === moduleFilter)
    : permissions;

  const uniqueModules = Array.from(new Set(permissions.map((p) => p.module)));

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Permission Library</h1>
          <p className="text-sm text-slate-500">
            Define the permission slugs available for your company.
          </p>
        </div>
        <Link
          href="/dashboard/settings/permissions/staff-assign"
          className="flex items-center gap-2 shrink-0 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Assign to Staff
        </Link>
      </div>

      {globalError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {globalError}
        </div>
      )}

      {libError   && <div className="mb-4 rounded-lg bg-red-50   border border-red-200   px-4 py-3 text-sm text-red-700  ">{libError}</div>}
      {libSuccess && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{libSuccess}</div>}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setModuleFilter('')}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              !moduleFilter ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {uniqueModules.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModuleFilter(m === moduleFilter ? '' : m)}
              className={`px-3 py-1 text-xs rounded-full font-medium capitalize transition-colors ${
                moduleFilter === m ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m}
            </button>
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
                  {exists ? 'check ' : '+ '}{p.label}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Custom Permission</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">Action *</label>
                  <select
                    value={createForm.action}
                    onChange={(e) => setCreateForm((f) => ({ ...f, action: e.target.value }))}
                    className="w-full border border-gray-300 text-gray-900 bg-white text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                    <option value="custom">custom...</option>
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
                <div>
                  <FormInput
                    label="Slug (auto-filled)"
                    value={
                      createForm.slug ||
                      `${createForm.module === 'custom' ? createForm.custom_module || '...' : createForm.module}:${createForm.action === 'custom' ? createForm.custom_action || '...' : createForm.action}:${createForm.scope}`
                    }
                    onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="module:action:scope"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <SubmitButton loading={creating} loadingText="Creating...">
                  Create Permission
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {loadingPerms ? (
        <div className="py-10 text-center text-sm text-slate-400">Loading permissions...</div>
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
                        {deletingId === p.id ? '...' : 'Delete'}
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
  );
}
