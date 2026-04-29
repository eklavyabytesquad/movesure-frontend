'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';
import { invalidatePermissionsCache } from '@/hooks/usePermissions';

/* ──────────── API types ──────────── */

interface ApiPermission {
  id: string;
  module: string;
  action: string;
  scope: string;
  slug: string | null;
  is_active: boolean;
}

interface Grant {
  id: string;
  permission_id: string;
  iam_permission?: { slug: string | null };
}

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  post_in_office: string;
  is_active: boolean;
}

/* ──────────── permission tree ──────────── */

interface PermDef { slug: string; label: string; module: string; action: string; scope: string; }
interface PermGroup { id: string; label: string; perms: PermDef[]; }
interface PageSection { label: string; groups: PermGroup[]; }
interface PageDef {
  id: string;
  label: string;
  description: string;
  pageAccessSlug?: string;
  comingSoon?: boolean;
  sections: PageSection[];
}

/* ──────────── page definitions ──────────── */

const PAGE_DEFS: PageDef[] = [
  {
    id: 'settings',
    label: 'Settings',
    description: 'Staff management, master data, and access control',
    pageAccessSlug: SLUGS.SETTINGS_ACCESS,
    sections: [
      {
        label: 'Staff Management',
        groups: [
          {
            id: 'staff',
            label: 'Staff',
            perms: [
              { slug: SLUGS.STAFF_READ,   label: 'View',       module: 'staff', action: 'read',   scope: 'company' },
              { slug: SLUGS.STAFF_CREATE, label: 'Create',     module: 'staff', action: 'create', scope: 'company' },
              { slug: SLUGS.STAFF_UPDATE, label: 'Edit',       module: 'staff', action: 'update', scope: 'company' },
              { slug: SLUGS.STAFF_DELETE, label: 'Deactivate', module: 'staff', action: 'delete', scope: 'company' },
            ],
          },
        ],
      },
      {
        label: 'Master Data',
        groups: [
          {
            id: 'branches', label: 'Branches',
            perms: [
              { slug: SLUGS.MASTER_BRANCHES_READ,   label: 'View',   module: 'master', action: 'read',   scope: 'branches' },
              { slug: SLUGS.MASTER_BRANCHES_CREATE, label: 'Create', module: 'master', action: 'create', scope: 'branches' },
              { slug: SLUGS.MASTER_BRANCHES_UPDATE, label: 'Edit',   module: 'master', action: 'update', scope: 'branches' },
              { slug: SLUGS.MASTER_BRANCHES_DELETE, label: 'Delete', module: 'master', action: 'delete', scope: 'branches' },
            ],
          },
          {
            id: 'states', label: 'States',
            perms: [
              { slug: SLUGS.MASTER_STATES_READ,   label: 'View',   module: 'master', action: 'read',   scope: 'states' },
              { slug: SLUGS.MASTER_STATES_CREATE, label: 'Create', module: 'master', action: 'create', scope: 'states' },
              { slug: SLUGS.MASTER_STATES_UPDATE, label: 'Edit',   module: 'master', action: 'update', scope: 'states' },
              { slug: SLUGS.MASTER_STATES_DELETE, label: 'Delete', module: 'master', action: 'delete', scope: 'states' },
            ],
          },
          {
            id: 'cities', label: 'Cities',
            perms: [
              { slug: SLUGS.MASTER_CITIES_READ,   label: 'View',   module: 'master', action: 'read',   scope: 'cities' },
              { slug: SLUGS.MASTER_CITIES_CREATE, label: 'Create', module: 'master', action: 'create', scope: 'cities' },
              { slug: SLUGS.MASTER_CITIES_UPDATE, label: 'Edit',   module: 'master', action: 'update', scope: 'cities' },
              { slug: SLUGS.MASTER_CITIES_DELETE, label: 'Delete', module: 'master', action: 'delete', scope: 'cities' },
            ],
          },
          {
            id: 'transports', label: 'Transports',
            perms: [
              { slug: SLUGS.MASTER_TRANSPORTS_READ,   label: 'View',   module: 'master', action: 'read',   scope: 'transports' },
              { slug: SLUGS.MASTER_TRANSPORTS_CREATE, label: 'Create', module: 'master', action: 'create', scope: 'transports' },
              { slug: SLUGS.MASTER_TRANSPORTS_UPDATE, label: 'Edit',   module: 'master', action: 'update', scope: 'transports' },
              { slug: SLUGS.MASTER_TRANSPORTS_DELETE, label: 'Delete', module: 'master', action: 'delete', scope: 'transports' },
            ],
          },
          {
            id: 'city-transports', label: 'City-Transports',
            perms: [
              { slug: SLUGS.MASTER_CITY_TRANSPORTS_READ,   label: 'View',   module: 'master', action: 'read',   scope: 'city-transports' },
              { slug: SLUGS.MASTER_CITY_TRANSPORTS_CREATE, label: 'Create', module: 'master', action: 'create', scope: 'city-transports' },
              { slug: SLUGS.MASTER_CITY_TRANSPORTS_UPDATE, label: 'Edit',   module: 'master', action: 'update', scope: 'city-transports' },
              { slug: SLUGS.MASTER_CITY_TRANSPORTS_DELETE, label: 'Delete', module: 'master', action: 'delete', scope: 'city-transports' },
            ],
          },
        ],
      },
      {
        label: 'Access Control',
        groups: [
          {
            id: 'iam', label: 'IAM / Permissions',
            perms: [
              { slug: SLUGS.IAM_READ,   label: 'View',        module: 'iam', action: 'read',   scope: 'company' },
              { slug: SLUGS.IAM_MANAGE, label: 'Full Manage', module: 'iam', action: 'manage', scope: 'company' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'bilty',
    label: 'Bilty',
    description: 'Booking & shipment management',
    comingSoon: true,
    sections: [],
  },
];

/* ──────────── helpers ──────────── */

function getAllPagePerms(page: PageDef): PermDef[] {
  return page.sections.flatMap((s) => s.groups.flatMap((g) => g.perms));
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function makeAccessDef(slug: string): PermDef {
  const [module, action, scope] = slug.split(':');
  return { slug, label: 'Page Access', module, action, scope };
}

const LABEL_COLORS: Record<string, { on: string; off: string }> = {
  View:         { on: 'bg-sky-50 border-sky-200 text-sky-700',           off: 'bg-white border-slate-200 text-slate-500 hover:border-sky-300' },
  Create:       { on: 'bg-emerald-50 border-emerald-200 text-emerald-700', off: 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300' },
  Edit:         { on: 'bg-yellow-50 border-yellow-200 text-yellow-700',   off: 'bg-white border-slate-200 text-slate-500 hover:border-yellow-300' },
  Delete:       { on: 'bg-red-50 border-red-200 text-red-600',            off: 'bg-white border-slate-200 text-slate-500 hover:border-red-300' },
  Deactivate:   { on: 'bg-red-50 border-red-200 text-red-600',            off: 'bg-white border-slate-200 text-slate-500 hover:border-red-300' },
  'Full Manage':{ on: 'bg-purple-50 border-purple-200 text-purple-700',   off: 'bg-white border-slate-200 text-slate-500 hover:border-purple-300' },
};
function labelColor(label: string, granted: boolean) {
  const c = LABEL_COLORS[label] ?? { on: 'bg-indigo-50 border-indigo-200 text-indigo-700', off: 'bg-white border-slate-200 text-slate-500' };
  return granted ? c.on : c.off;
}

/* ──────────── component ──────────── */

export default function StaffAssign() {
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can(SLUGS.IAM_MANAGE);

  const [apiPerms, setApiPerms]           = useState<ApiPermission[]>([]);
  const [staff, setStaff]                 = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [userGrants, setUserGrants]       = useState<Grant[]>([]);
  const [loadingStaff, setLoadingStaff]   = useState(true);
  const [loadingGrants, setLoadingGrants] = useState(false);
  const [toggling, setToggling]           = useState<Set<string>>(new Set());
  const [expandedPages, setExpandedPages] = useState<Set<string>>(
    () => new Set(PAGE_DEFS.map((p) => p.id)),
  );
  const [staffSearch, setStaffSearch]   = useState('');
  const [error, setError]               = useState('');
  const [autoMsg, setAutoMsg]           = useState<string | null>(null);

  /* fetch permission library (needed to resolve IDs when granting) */
  const fetchApiPerms = useCallback(async () => {
    try {
      const res = await apiFetch(`/v1/iam/permissions`);
      if (!res.ok) return;
      const data = await res.json();
      setApiPerms(data.permissions ?? []);
    } catch { /* silent */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* fetch staff list */
  const fetchStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await apiFetch(`/v1/staff`);
      if (res.status === 401) { router.replace('/auth/login'); return; }
      const data = await res.json();
      setStaff(data.staff ?? []);
    } catch { /* silent */ }
    finally { setLoadingStaff(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* fetch grants for the selected staff member */
  const fetchUserGrants = useCallback(async (userId: string) => {
    setLoadingGrants(true);
    try {
      const res = await apiFetch(`/v1/iam/grants/user/${userId}?active_only=false`);
      if (!res.ok) return;
      const data = await res.json();
      setUserGrants(data.grants ?? []);
    } catch { /* silent */ }
    finally { setLoadingGrants(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const user = getUser();
    if (!user) { router.replace('/auth/login'); return; }
    fetchApiPerms();
    fetchStaff();
  }, [fetchApiPerms, fetchStaff, router]);

  /* ── helpers ── */

  function isGranted(slug: string) {
    return userGrants.some((g) => g.iam_permission?.slug === slug);
  }

  function selectStaff(s: StaffMember) {
    setSelectedStaff(s);
    setError('');
    setAutoMsg(null);
    fetchUserGrants(s.id);
  }

  /* auto-create permission in library if it doesn't exist yet */
  async function ensurePermExists(pd: PermDef): Promise<string | null> {
    const found = apiPerms.find((p) => p.slug === pd.slug);
    if (found) return found.id;
    try {
      const res = await apiFetch(`/v1/iam/permissions`, {
        method: 'POST',
        body: JSON.stringify({ module: pd.module, action: pd.action, scope: pd.scope, slug: pd.slug }),
      });
      if (res.status === 409) {
        const listRes = await apiFetch(`/v1/iam/permissions`);
        const listData = await listRes.json();
        const all: ApiPermission[] = listData.permissions ?? [];
        setApiPerms(all);
        return all.find((p) => p.slug === pd.slug)?.id ?? null;
      }
      if (!res.ok) return null;
      const data = await res.json();
      const newPerm: ApiPermission = data.permission;
      setApiPerms((prev) => [...prev, newPerm]);
      return newPerm.id;
    } catch { return null; }
  }

  /* core grant/revoke for a single permission */
  async function togglePerm(pd: PermDef, grant: boolean) {
    if (!selectedStaff || !canManage) return;
    setToggling((prev) => new Set([...prev, pd.slug]));
    setError('');
    try {
      if (grant) {
        const permId = await ensurePermExists(pd);
        if (!permId) { setError(`Could not find/create permission "${pd.slug}".`); return; }
        const res = await apiFetch(`/v1/iam/grants`, {
          method: 'POST',
          body: JSON.stringify({ user_id: selectedStaff.id, permission_id: permId }),
        });
        if (res.status !== 409 && !res.ok) { setError('Failed to grant permission.'); return; }
      } else {
        const found = userGrants.find((g) => g.iam_permission?.slug === pd.slug);
        if (!found) return;
        const res = await apiFetch(`/v1/iam/grants/${found.id}`, {
          method: 'DELETE',
        });
        if (!res.ok && res.status !== 204) { setError('Failed to revoke permission.'); return; }
      }
      invalidatePermissionsCache();
      await fetchUserGrants(selectedStaff.id);
    } catch { setError('Unable to reach the server.'); }
    finally { setToggling((prev) => { const n = new Set(prev); n.delete(pd.slug); return n; }); }
  }

  /* grant with auto-enable of page access */
  async function handleCheck(pd: PermDef, checked: boolean, pageAccessSlug?: string) {
    if (checked && pageAccessSlug && !isGranted(pageAccessSlug)) {
      await togglePerm(makeAccessDef(pageAccessSlug), true);
      setAutoMsg(`⚡ Page access was automatically enabled so this setting takes effect`);
      setTimeout(() => setAutoMsg(null), 5000);
    }
    await togglePerm(pd, checked);
  }

  /* grant/revoke all perms in a group */
  async function toggleGroup(perms: PermDef[], grantAll: boolean, pageAccessSlug?: string) {
    if (grantAll && pageAccessSlug && !isGranted(pageAccessSlug)) {
      await togglePerm(makeAccessDef(pageAccessSlug), true);
      setAutoMsg(`⚡ Page access was automatically enabled`);
      setTimeout(() => setAutoMsg(null), 5000);
    }
    for (const pd of perms) {
      if (grantAll ? !isGranted(pd.slug) : isGranted(pd.slug)) {
        await togglePerm(pd, grantAll);
      }
    }
  }

  /* grant/revoke entire page (access + all sub-perms) */
  async function togglePage(page: PageDef, grantAll: boolean) {
    const allPerms = getAllPagePerms(page);
    if (grantAll) {
      if (page.pageAccessSlug && !isGranted(page.pageAccessSlug)) {
        await togglePerm(makeAccessDef(page.pageAccessSlug), true);
      }
      for (const pd of allPerms) {
        if (!isGranted(pd.slug)) await togglePerm(pd, true);
      }
    } else {
      for (const pd of allPerms) {
        if (isGranted(pd.slug)) await togglePerm(pd, false);
      }
      if (page.pageAccessSlug && isGranted(page.pageAccessSlug)) {
        await togglePerm(makeAccessDef(page.pageAccessSlug), false);
      }
    }
  }

  /* expand/collapse a page card */
  function toggleExpanded(pageId: string) {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      next.has(pageId) ? next.delete(pageId) : next.add(pageId);
      return next;
    });
  }

  /* derived */
  const filteredStaff = staff.filter((s) =>
    !staffSearch ||
    s.full_name.toLowerCase().includes(staffSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(staffSearch.toLowerCase()),
  );

  /* ─── render ─── */
  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/settings/permissions"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Permission Library
          </Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-lg font-bold text-slate-900">Assign to Staff</h1>
        </div>
        {selectedStaff && (
          <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
            Editing: <span className="font-semibold text-slate-700">{selectedStaff.full_name}</span>
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex gap-5 items-start">

        {/* ── Left: staff list ── */}
        <div className="w-60 shrink-0 sticky top-20">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2 border-b border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                Staff Members
              </p>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Search staff…"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-2">
              {loadingStaff ? (
                <div className="py-8 text-center text-sm text-slate-400">Loading…</div>
              ) : filteredStaff.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">No staff found.</div>
              ) : (
                filteredStaff.map((s) => {
                  const active = selectedStaff?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectStaff(s)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5 ${
                        active
                          ? 'bg-indigo-50 border border-indigo-200 shadow-sm'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {initials(s.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${active ? 'text-indigo-800' : 'text-slate-700'}`}>
                          {s.full_name}
                        </p>
                        <p className="text-[11px] text-slate-400 capitalize truncate mt-0.5">
                          {s.post_in_office.replace(/_/g, ' ')}
                        </p>
                      </div>
                      {!s.is_active && (
                        <span className="text-[10px] bg-red-50 text-red-500 border border-red-200 rounded-full px-1.5 py-0.5 shrink-0">
                          Off
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Right: permission matrix ── */}
        <div className="flex-1 min-w-0 space-y-3">
          {!selectedStaff ? (
            <div className="flex flex-col items-center justify-center h-72 bg-white rounded-xl border border-dashed border-slate-300 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-700">Select a staff member</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Choose someone from the list on the left to manage their page-level access
              </p>
            </div>
          ) : (
            <>
              {/* Staff header card */}
              <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm">
                <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {initials(selectedStaff.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{selectedStaff.full_name}</p>
                  <p className="text-xs text-slate-400 capitalize mt-0.5">
                    {selectedStaff.post_in_office.replace(/_/g, ' ')} · {selectedStaff.email}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                  selectedStaff.is_active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-600 border-red-200'
                }`}>
                  {selectedStaff.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Auto-grant notice */}
              {autoMsg && (
                <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                  <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {autoMsg}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Read-only notice */}
              {!canManage && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                  You have read-only access. Contact an admin to change permissions.
                </div>
              )}

              {/* Page cards */}
              {loadingGrants ? (
                <div className="py-14 text-center text-sm text-slate-400 bg-white rounded-xl border border-slate-200">
                  Loading permissions…
                </div>
              ) : (
                PAGE_DEFS.map((page) => {
                  const expanded    = expandedPages.has(page.id);
                  const allPerms    = getAllPagePerms(page);
                  const hasAccess   = page.pageAccessSlug ? isGranted(page.pageAccessSlug) : false;
                  const allGranted  = allPerms.every((p) => isGranted(p.slug)) && (page.pageAccessSlug ? hasAccess : true);
                  const someGranted = allPerms.some((p) => isGranted(p.slug)) || hasAccess;

                  return (
                    <div key={page.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

                      {/* ── Page header ── */}
                      <div
                        className={`flex items-center gap-3 px-5 py-4 ${!page.comingSoon ? 'cursor-pointer hover:bg-slate-50' : ''} transition-colors`}
                        onClick={() => !page.comingSoon && toggleExpanded(page.id)}
                      >
                        {!page.comingSoon && (
                          <svg
                            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-900">{page.label}</span>
                            {page.comingSoon ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-400 border-slate-200">
                                Coming Soon
                              </span>
                            ) : someGranted ? (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                allGranted
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {allGranted ? 'Full Access' : 'Partial Access'}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{page.description}</p>
                        </div>

                        {canManage && !page.comingSoon && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); togglePage(page, !allGranted); }}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors shrink-0 ${
                              allGranted
                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                : someGranted
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                            }`}
                          >
                            {allGranted ? 'Revoke All' : 'Grant All'}
                          </button>
                        )}
                      </div>

                      {/* ── Expanded body ── */}
                      {expanded && !page.comingSoon && (
                        <div className="border-t border-slate-100">

                          {/* Page access toggle — always first */}
                          {page.pageAccessSlug && (
                            <div className={`flex items-center gap-3 px-5 py-3.5 ${hasAccess ? 'bg-indigo-50/40' : 'bg-amber-50/40'}`}>
                              <label className={`flex items-center gap-2.5 select-none ${canManage ? 'cursor-pointer' : 'cursor-default'}`}>
                                <input
                                  type="checkbox"
                                  checked={hasAccess}
                                  disabled={!canManage || toggling.has(page.pageAccessSlug)}
                                  onChange={(e) => togglePerm(makeAccessDef(page.pageAccessSlug!), e.target.checked)}
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className={`text-sm font-semibold ${hasAccess ? 'text-indigo-800' : 'text-slate-700'}`}>
                                  Access to {page.label} Page
                                </span>
                                {toggling.has(page.pageAccessSlug) && (
                                  <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin inline-block" />
                                )}
                              </label>
                              {!hasAccess && (
                                <span className="text-xs text-amber-600 italic">
                                  — must be enabled for any option below to work
                                </span>
                              )}
                            </div>
                          )}

                          {/* Sections */}
                          {page.sections.map((section) => {
                            const allSecGranted  = section.groups.every((g) => g.perms.every((p) => isGranted(p.slug)));
                            const someSecGranted = section.groups.some((g) => g.perms.some((p) => isGranted(p.slug)));
                            return (
                              <div key={section.label}>
                                {/* Section heading */}
                                <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50 border-y border-slate-100">
                                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    {section.label}
                                  </p>
                                  {canManage && (
                                    <button
                                      type="button"
                                      onClick={() => toggleGroup(
                                        section.groups.flatMap((g) => g.perms),
                                        !allSecGranted,
                                        page.pageAccessSlug,
                                      )}
                                      className={`text-[11px] px-2 py-0.5 rounded font-medium border transition-colors ${
                                        allSecGranted
                                          ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100'
                                          : someSecGranted
                                            ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                                      }`}
                                    >
                                      {allSecGranted ? 'Revoke All' : 'Grant All'}
                                    </button>
                                  )}
                                </div>

                                {/* Group rows */}
                                {section.groups.map((group) => {
                                  const allGrpGranted  = group.perms.every((p) => isGranted(p.slug));
                                  const someGrpGranted = group.perms.some((p) => isGranted(p.slug));
                                  return (
                                    <div
                                      key={group.id}
                                      className="flex items-center gap-4 px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                                    >
                                      {/* Row label */}
                                      <span className="w-32 text-sm font-medium text-slate-700 shrink-0">
                                        {group.label}
                                      </span>

                                      {/* Checkboxes */}
                                      <div className="flex items-center gap-2 flex-wrap flex-1">
                                        {group.perms.map((pd) => {
                                          const granted = isGranted(pd.slug);
                                          const busy    = toggling.has(pd.slug);
                                          return (
                                            <label
                                              key={pd.slug}
                                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all select-none ${
                                                canManage ? 'cursor-pointer' : 'cursor-default'
                                              } ${labelColor(pd.label, granted)} ${busy ? 'opacity-50 pointer-events-none' : ''}`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={granted}
                                                disabled={!canManage || busy}
                                                onChange={(e) => handleCheck(pd, e.target.checked, page.pageAccessSlug)}
                                                className="w-3.5 h-3.5 rounded border-current text-current focus:ring-0 shrink-0"
                                              />
                                              {pd.label}
                                              {busy && (
                                                <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin inline-block shrink-0" />
                                              )}
                                            </label>
                                          );
                                        })}
                                      </div>

                                      {/* Row-level Grant/Revoke */}
                                      {canManage && (
                                        <button
                                          type="button"
                                          onClick={() => toggleGroup(group.perms, !allGrpGranted, page.pageAccessSlug)}
                                          className={`text-[11px] px-2 py-1 rounded-lg font-medium border transition-colors shrink-0 ${
                                            allGrpGranted
                                              ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100'
                                              : someGrpGranted
                                                ? 'bg-amber-50 text-amber-600 border-amber-200'
                                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                          }`}
                                        >
                                          {allGrpGranted ? 'Revoke' : 'All'}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
