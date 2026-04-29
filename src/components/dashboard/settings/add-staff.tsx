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
  branch_type: string;
  address: string | null;
}

interface FormState {
  full_name: string;
  email: string;
  password: string;
  post_in_office: string;
  branch_id: string;
  image_url: string;
}

export default function AddStaff() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    full_name: '',
    email: '',
    password: '',
    post_in_office: '',
    branch_id: '',
    image_url: '',
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    apiFetch(`/v1/staff/branches`)
      .then((res) => {
        if (res.status === 401) {
          router.replace('/auth/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        const list: Branch[] = data.branches ?? [];
        setBranches(list);
        const match = list.find((b) => b.branch_id === user.branch_id);
        setForm((prev) => ({
          ...prev,
          branch_id: match ? match.branch_id : (list[0]?.branch_id ?? ''),
        }));
      })
      .catch(() => setError('Failed to load branches.'))
      .finally(() => setBranchesLoading(false));
  }, [router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const payload: Record<string, string> = {
      full_name: form.full_name,
      email: form.email,
      password: form.password,
      post_in_office: form.post_in_office,
      branch_id: form.branch_id,
    };
    if (form.image_url.trim()) payload.image_url = form.image_url.trim();

    try {
      const res = await apiFetch(`/v1/staff`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 201) {
        setSuccess(`Staff member "${data.staff.full_name}" added successfully.`);
        setForm((prev) => ({
          full_name: '',
          email: '',
          password: '',
          post_in_office: '',
          branch_id: prev.branch_id,
          image_url: '',
        }));
      } else if (res.status === 401) {
        router.replace('/auth/login');
      } else if (res.status === 409) {
        setError(typeof data.detail === 'string' ? data.detail : 'Email already registered.');
      } else if (res.status === 404) {
        setError(typeof data.detail === 'string' ? data.detail : 'Branch not found.');
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
      setLoading(false);
    }
  }

  const selectedBranch = branches.find((b) => b.branch_id === form.branch_id);
  const branchOptions: DropdownOption[] = branches.map((b) => ({
    value: b.branch_id,
    label: `${b.name} (${b.branch_code})`,
  }));

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Add Staff Member</h1>
      <p className="text-sm text-gray-500 mb-6">
        Create a new user account and assign them to a branch.
      </p>

      {error && (
        <div className="mb-5 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          <span className="mt-0.5">&#9888;</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-5 flex items-start gap-2 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">
          <span className="mt-0.5">&#10003;</span>
          <span>{success}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="Full Name *"
            name="full_name"
            type="text"
            value={form.full_name}
            onChange={handleChange}
            required
            minLength={2}
            placeholder="Ravi Kumar"
          />
          <FormInput
            label="Email *"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="ravi@company.io"
          />
          <FormInput
            label="Password *"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
            placeholder="Min 8 characters"
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

          <div className="sm:col-span-2">
            {branchesLoading ? (
              <div className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-400 bg-gray-50">
                Loading branches...
              </div>
            ) : (
              <SearchableDropdown
                label="Branch *"
                value={form.branch_id}
                onChange={(val) => setForm((f) => ({ ...f, branch_id: val }))}
                options={branchOptions}
                placeholder="Select a branch"
                required
              />
            )}
            {selectedBranch && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="px-2 py-0.5 bg-gray-100 rounded-full capitalize">
                  {selectedBranch.branch_type}
                </span>
                {selectedBranch.address && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                    {selectedBranch.address}
                  </span>
                )}
              </div>
            )}
          </div>

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

        <SubmitButton loading={loading} disabled={branchesLoading} loadingText="Adding Staff..." fullWidth>
          Add Staff Member
        </SubmitButton>
      </form>
    </div>
  );
}
