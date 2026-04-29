'use client';

import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ActionButton } from './ui';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';

interface Branch {
  branch_id: string;
  name: string;
  branch_code: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  post_in_office: string;
  branch_id: string;
  is_active: boolean;
}

export default function DeactivateStaff() {
  const router = useRouter();
  const { can } = usePermissions();
  const canToggle = can(SLUGS.STAFF_DELETE);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const user = getUser();
    if (!user) { router.replace('/auth/login'); return; }

    Promise.all([
      apiFetch(`/v1/staff`),
      apiFetch(`/v1/staff/branches`),
    ])
      .then(async ([staffRes, branchRes]) => {
        if (staffRes.status === 401) { router.replace('/auth/login'); return; }
        const staffData = await staffRes.json();
        const branchData = await branchRes.json();
        setStaff(staffData.staff ?? []);
        setBranches(branchData.branches ?? []);
      })
      .catch(() => setError('Failed to load staff.'))
      .finally(() => setLoading(false));
  }, [router]);

  async function toggleStatus(s: StaffMember) {
    setToggling(s.id);
    setError('');

    try {
      const res = await apiFetch(`/v1/staff/${s.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !s.is_active }),
      });

      if (res.status === 401) { router.replace('/auth/login'); return; }

      const data = await res.json();
      if (res.status === 200) {
        setStaff((prev) =>
          prev.map((m) => (m.id === s.id ? { ...m, is_active: data.staff.is_active } : m)),
        );
        setToast(
          `${data.staff.full_name} has been ${data.staff.is_active ? 'activated' : 'deactivated'}.`,
        );
        setTimeout(() => setToast(''), 3500);
      } else {
        const detail = data.detail;
        setError(typeof detail === 'string' ? detail : 'Failed to update status.');
      }
    } catch {
      setError('Unable to reach the server. Please check your connection.');
    } finally {
      setToggling(null);
    }
  }

  const branchName = (id: string) =>
    branches.find((b) => b.branch_id === id)?.name ?? id.slice(0, 8) + '…';

  const active = staff.filter((s) => s.is_active);
  const inactive = staff.filter((s) => !s.is_active);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Deactivate / Activate Staff</h1>
      <p className="text-sm text-gray-500 mb-6">
        Toggle a staff member&apos;s account status. Deactivated accounts cannot log in.
      </p>

      {/* Toast */}
      {toast && (
        <div className="mb-5 flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-xl">
          <span>&#10003;</span>
          <span>{toast}</span>
        </div>
      )}

      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading staff...</div>
      ) : (
        <div className="space-y-6">
          {/* Active staff */}
          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Active ({active.length})
            </p>
            {active.length === 0 ? (
              <p className="text-sm text-gray-400">No active staff.</p>
            ) : (
              <ul className="space-y-2">
                {active.map((s) => (
                  <StaffRow
                    key={s.id}
                    staff={s}
                    branchName={branchName(s.branch_id)}
                    toggling={toggling === s.id}
                    onToggle={() => toggleStatus(s)}
                    canToggle={canToggle}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* Inactive staff */}
          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Inactive ({inactive.length})
            </p>
            {inactive.length === 0 ? (
              <p className="text-sm text-gray-400">No inactive staff.</p>
            ) : (
              <ul className="space-y-2">
                {inactive.map((s) => (
                  <StaffRow
                    key={s.id}
                    staff={s}
                    branchName={branchName(s.branch_id)}
                    toggling={toggling === s.id}
                    onToggle={() => toggleStatus(s)}
                    canToggle={canToggle}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function StaffRow({
  staff,
  branchName,
  toggling,
  onToggle,
  canToggle,
}: {
  staff: StaffMember;
  branchName: string;
  toggling: boolean;
  onToggle: () => void;
  canToggle: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-4 bg-white px-5 py-3.5 rounded-xl border border-gray-200 shadow-sm">
      <div className="min-w-0">
        <p className="font-medium text-gray-900 truncate">{staff.full_name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {staff.email} · <span className="capitalize">{staff.post_in_office}</span> · {branchName}
        </p>
      </div>
      {canToggle && (
      <ActionButton
        variant={staff.is_active ? 'danger' : 'save'}
        size="md"
        onClick={onToggle}
        disabled={toggling}
      >
        {toggling ? '...' : staff.is_active ? 'Deactivate' : 'Activate'}
      </ActionButton>
      )}
    </li>
  );
}
