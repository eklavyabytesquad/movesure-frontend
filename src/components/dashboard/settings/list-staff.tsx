'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { SearchableDropdown } from './ui';
import type { DropdownOption } from './ui';

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
  created_at: string;
}

export default function ListStaff() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStaff = useCallback(
    async (branchId: string) => {
      setLoading(true);
      setError('');

      const url = branchId
        ? `/v1/staff?branch_id=${branchId}`
        : `/v1/staff`;

      try {
        const res = await apiFetch(url);
        if (res.status === 401) { router.replace('/auth/login'); return; }
        if (!res.ok) { setError('Failed to load staff.'); return; }
        const data = await res.json();
        setStaff(data.staff ?? []);
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
      .then((res) => {
        if (res.status === 401) { router.replace('/auth/login'); return null; }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setBranches(data.branches ?? []);
      })
      .catch(() => {});

    fetchStaff('');
  }, [router, fetchStaff]);

  function handleBranchFilter(branchId: string) {
    setSelectedBranch(branchId);
    fetchStaff(branchId);
  }

  const branchName = (id: string) =>
    branches.find((b) => b.branch_id === id)?.name ?? id.slice(0, 8) + '…';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">All Staff</h1>
        <span className="text-sm text-gray-400">{staff.length} member{staff.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-sm text-gray-500 mb-6">View all staff members in your company.</p>

      {/* Branch filter */}
      <div className="mb-5 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 shrink-0">Filter by branch:</label>
        <SearchableDropdown
          value={selectedBranch}
          onChange={handleBranchFilter}
          options={branches.map((b): DropdownOption => ({ value: b.branch_id, label: `${b.name} (${b.branch_code})` }))}
          placeholder="All branches"
          size="sm"
          className="max-w-xs"
        />
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading staff...</div>
      ) : staff.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center bg-white rounded-2xl border border-gray-200">
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
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        s.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
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
