'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE } from '@/lib/auth';

interface FormData {
  company: {
    name: string;
    email: string;
    plan: string;
    address: string;
    phone_number: string;
    gstin: string;
  };
  branch: {
    name: string;
    branch_code: string;
    address: string;
  };
  admin: {
    full_name: string;
    email: string;
    password: string;
  };
}

const inputCls =
  'w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-800 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    company: { name: '', email: '', plan: 'starter', address: '', phone_number: '', gstin: '' },
    branch: { name: '', branch_code: '', address: '' },
    admin: { full_name: '', email: '', password: '' },
  });

  function update<K extends keyof FormData>(section: K, field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      company: {
        name: form.company.name,
        email: form.company.email,
        plan: form.company.plan || undefined,
        address: form.company.address || undefined,
        phone_number: form.company.phone_number || undefined,
        gstin: form.company.gstin || undefined,
      },
      branch: {
        name: form.branch.name,
        branch_code: form.branch.branch_code,
        address: form.branch.address || undefined,
      },
      admin: {
        full_name: form.admin.full_name,
        email: form.admin.email,
        password: form.admin.password,
      },
    };

    try {
      const res = await fetch(`${API_BASE}/v1/onboarding/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 201) {
        router.push('/auth/login');
      } else if (res.status === 409) {
        setError(typeof data.detail === 'string' ? data.detail : 'Email already registered.');
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

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-gray-100 py-10 px-4">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-extrabold text-blue-600 tracking-tight">MoveSure</span>
          </Link>
          <p className="mt-2 text-sm text-gray-500">Create your company account</p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
            <span className="mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ── Company Information ── */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
              Company Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Company Name *">
                <input
                  type="text"
                  value={form.company.name}
                  onChange={(e) => update('company', 'name', e.target.value)}
                  required
                  minLength={2}
                  placeholder="TechMove Ltd"
                  className={inputCls}
                />
              </Field>
              <Field label="Company Email *">
                <input
                  type="email"
                  value={form.company.email}
                  onChange={(e) => update('company', 'email', e.target.value)}
                  required
                  placeholder="admin@company.io"
                  className={inputCls}
                />
              </Field>
              <Field label="Phone Number">
                <input
                  type="tel"
                  value={form.company.phone_number}
                  onChange={(e) => update('company', 'phone_number', e.target.value)}
                  placeholder="+91 9876543210"
                  className={inputCls}
                />
              </Field>
              <Field label="GSTIN">
                <input
                  type="text"
                  value={form.company.gstin}
                  onChange={(e) => update('company', 'gstin', e.target.value)}
                  placeholder="27AAAAA0000A1Z5"
                  className={inputCls}
                />
              </Field>
              <Field label="Plan">
                <select
                  value={form.company.plan}
                  onChange={(e) => update('company', 'plan', e.target.value)}
                  className={inputCls}
                >
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </Field>
              <Field label="Company Address">
                <input
                  type="text"
                  value={form.company.address}
                  onChange={(e) => update('company', 'address', e.target.value)}
                  placeholder="123 Main St, City"
                  className={inputCls}
                />
              </Field>
            </div>
          </section>

          {/* ── Branch Information ── */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
              Branch Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Branch Name *">
                <input
                  type="text"
                  value={form.branch.name}
                  onChange={(e) => update('branch', 'name', e.target.value)}
                  required
                  minLength={2}
                  placeholder="Main Office"
                  className={inputCls}
                />
              </Field>
              <Field label="Branch Code *">
                <input
                  type="text"
                  value={form.branch.branch_code}
                  onChange={(e) => update('branch', 'branch_code', e.target.value)}
                  required
                  minLength={2}
                  placeholder="TM001"
                  className={inputCls}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Branch Address">
                  <input
                    type="text"
                    value={form.branch.address}
                    onChange={(e) => update('branch', 'address', e.target.value)}
                    placeholder="Same as company address or different"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* ── Admin Account ── */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-blue-100">
              Admin Account
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name *">
                <input
                  type="text"
                  value={form.admin.full_name}
                  onChange={(e) => update('admin', 'full_name', e.target.value)}
                  required
                  minLength={2}
                  placeholder="Alice Smith"
                  className={inputCls}
                />
              </Field>
              <Field label="Admin Email *">
                <input
                  type="email"
                  value={form.admin.email}
                  onChange={(e) => update('admin', 'email', e.target.value)}
                  required
                  placeholder="alice@company.io"
                  className={inputCls}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Password *">
                  <input
                    type="password"
                    value={form.admin.password}
                    onChange={(e) => update('admin', 'password', e.target.value)}
                    required
                    minLength={8}
                    placeholder="Min 8 characters"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 transition-all"
          >
            {loading ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-sm text-gray-500">Already have an account? </span>
          <Link href="/auth/login" className="text-sm text-blue-600 font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
