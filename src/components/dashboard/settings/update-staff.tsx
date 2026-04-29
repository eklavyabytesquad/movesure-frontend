'use client';

import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { FormInput, SearchableDropdown, SubmitButton } from './ui';
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
  image_url: string | null;
  is_active: boolean;
}

interface EditForm {
  full_name: string;
  post_in_office: string;
  branch_id: string;
  image_url: string;
  password: string;
}

export default function UpdateStaff() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<EditForm>({
    full_name: '',
    post_in_office: '',
    branch_id: '',
    image_url: '',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [listError, setListError] = useState('');

  useEffect(() => {
    const user = getUser();
    if (!user) { router.replace('/auth/login'); return; }

    Promise.all([
      apiFetch(`/v1/staff`),
      apiFetch(`/v1/staff/branches`),
    ])
      .then(async ([staffRes, branchRes]) => {
        if (staffRes.status === 401 || branchRes.status === 401) {
          router.replace('/auth/login');
          return;
        }
        const staffData = await staffRes.json();
        const branchData = await branchRes.json();
        setStaff(staffData.staff ?? []);
        setBranches(branchData.branches ?? []);
      })
      .catch(() => setListError('Failed to load data.'))
      .finally(() => setLoadingList(false));
  }, [router]);

  function selectStaff(s: StaffMember) {
    setSelected(s);
    setError('');
    setSuccess('');
    setForm({
      full_name: s.full_name,
      post_in_office: s.post_in_office,
      branch_id: s.branch_id,
      image_url: s.image_url ?? '',
      password: '',
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setSuccess('');
    setSaving(true);


    const payload: Record<string, string | boolean> = {
      full_name: form.full_name,
      post_in_office: form.post_in_office,
      branch_id: form.branch_id,
    };
    if (form.image_url.trim()) payload.image_url = form.image_url.trim();
    if (form.password.trim()) payload.password = form.password.trim();

    try {
      const res = await apiFetch(`/v1/staff/${selected.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 200) {
        setSuccess(`"${data.staff.full_name}" updated successfully.`);
        // Refresh the staff list with updated data
        setStaff((prev) =>
          prev.map((s) => (s.id === selected.id ? { ...s, ...data.staff } : s)),
        );
        setSelected(data.staff);
        setForm((prev) => ({ ...prev, password: '' }));
      } else if (res.status === 401) {
        router.replace('/auth/login');
      } else if (res.status === 404) {
        setError(typeof data.detail === 'string' ? data.detail : 'Staff member not found.');
      } else if (res.status === 422) {
        const msgs = Array.isArray(data.detail)
          ? data.detail.map((d: { msg: string }) => d.msg).join('. ')
          : 'Validation error. Please check all fields.';
        setError(msgs);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Unable to reach the server. Please check your connection.');
    } finally {
      setSaving(false);
    }
  }

  const branchName = (id: string) =>
    branches.find((b) => b.branch_id === id)?.name ?? '';

  const branchOptions: DropdownOption[] = branches.map((b) => ({
    value: b.branch_id,
    label: `${b.name} (${b.branch_code})`,
  }));

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Update Staff</h1>
      <p className="text-sm text-gray-500 mb-6">Select a staff member to edit their details.</p>

      {listError && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {listError}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Staff list */}
        <div className="lg:w-72 shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
            Staff Members
          </p>
          {loadingList ? (
            <div className="text-sm text-gray-400 py-4 text-center">Loading...</div>
          ) : (
            <ul className="space-y-1">
              {staff.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => selectStaff(s)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                      selected?.id === s.id
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium">{s.full_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                      {s.post_in_office} · {branchName(s.branch_id)}
                    </p>
                  </button>
                </li>
              ))}
              {staff.length === 0 && (
                <li className="text-sm text-gray-400 py-4 text-center">No staff found.</li>
              )}
            </ul>
          )}
        </div>

        {/* Edit form */}
        <div className="flex-1">
          {!selected ? (
            <div className="flex items-center justify-center h-40 bg-white rounded-2xl border border-dashed border-gray-300 text-sm text-gray-400">
              Select a staff member on the left to edit
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                  <span>&#9888;</span><span>{error}</span>
                </div>
              )}
              {success && (
                <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">
                  <span>&#10003;</span><span>{success}</span>
                </div>
              )}
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4"
              >
                <div className="pb-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400">Editing</p>
                  <p className="font-semibold text-gray-800">{selected.full_name}</p>
                  <p className="text-xs text-gray-400">{selected.email}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="Full Name *"
                    name="full_name"
                    type="text"
                    value={form.full_name}
                    onChange={handleChange}
                    required
                    minLength={2}
                  />
                  <FormInput
                    label="Role / Post *"
                    name="post_in_office"
                    type="text"
                    value={form.post_in_office}
                    onChange={handleChange}
                    required
                    placeholder="driver, manager, accountant"
                  />
                  <SearchableDropdown
                    label="Branch *"
                    value={form.branch_id}
                    onChange={(val) => setForm((f) => ({ ...f, branch_id: val }))}
                    options={branchOptions}
                    placeholder="Select branch"
                    required
                  />
                  <FormInput
                    label="New Password (leave blank to keep)"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    minLength={8}
                    placeholder="Min 8 characters"
                  />
                  <div className="sm:col-span-2">
                    <FormInput
                      label="Profile Image URL (optional)"
                      name="image_url"
                      type="url"
                      value={form.image_url}
                      onChange={handleChange}
                      placeholder="https://cdn.example.com/avatar.jpg"
                    />
                  </div>
                </div>

                <SubmitButton loading={saving} loadingText="Saving..." fullWidth>
                  Save Changes
                </SubmitButton>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
