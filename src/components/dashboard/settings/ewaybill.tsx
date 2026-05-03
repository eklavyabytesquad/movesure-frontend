'use client';

import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { SubmitButton } from './ui';

interface EwbSettings {
  settings_id: string;
  company_id: string;
  company_gstin: string;
  mi_username: string;
  auto_attach_bilty: boolean;
  is_active: boolean;
  metadata: Record<string, unknown>;
}

export default function EwaybillSettings() {
  const router = useRouter();

  const [settings,     setSettings]     = useState<EwbSettings | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const [form, setForm] = useState({
    company_gstin:     '',
    auto_attach_bilty: false,
  });

  async function fetchSettings() {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/v1/ewaybill/settings');
      if (res.status === 401) { router.replace('/auth/login'); return; }
      if (res.status === 404) { setSettings(null); return; }
      if (!res.ok) { setError('Failed to load EWB settings.'); return; }
      const data = await res.json();
      const s: EwbSettings = data.data ?? data;
      setSettings(s);
      setForm({ company_gstin: s.company_gstin, auto_attach_bilty: s.auto_attach_bilty });
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const user = getUser();
    if (!user) { router.replace('/auth/login'); return; }
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch('/v1/ewaybill/settings', {
        method: 'POST',
        body: JSON.stringify({
          company_gstin:     form.company_gstin.trim().toUpperCase(),
          auto_attach_bilty: form.auto_attach_bilty,
          is_active:         true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? 'Failed to save EWB settings.');
        return;
      }
      setSuccess('EWB settings saved successfully.');
      fetchSettings();
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate() {
    if (!window.confirm('Are you sure you want to deactivate E-Way Bill integration?')) return;
    setDeactivating(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch('/v1/ewaybill/settings', { method: 'DELETE' });
      if (res.ok) {
        setSuccess('EWB settings deactivated.');
        fetchSettings();
      } else {
        setError('Failed to deactivate EWB settings.');
      }
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setDeactivating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">E-Way Bill Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure your company GSTIN for E-Way Bill generation via Masters India GSP.
        </p>
      </div>

      {/* Status badge */}
      {settings && (
        <div className={`mb-6 flex items-center gap-3 p-4 rounded-xl border ${settings.is_active ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${settings.is_active ? 'bg-green-500' : 'bg-slate-400'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              Integration {settings.is_active ? 'Active' : 'Inactive'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Masters India account:{' '}
              <span className="font-mono text-slate-700">{settings.mi_username}</span>
            </p>
          </div>
          {settings.is_active && (
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={deactivating}
              className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              {deactivating ? 'Deactivating…' : 'Deactivate'}
            </button>
          )}
        </div>
      )}

      {!settings && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm font-medium text-amber-800">
            No EWB settings configured yet. Enter your company GSTIN below to enable E-Way Bill integration.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Company GSTIN <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.company_gstin}
            onChange={e => setForm(f => ({ ...f, company_gstin: e.target.value.toUpperCase() }))}
            required
            maxLength={15}
            placeholder="e.g. 07AAACR5055K1Z5"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <p className="text-xs text-slate-400 mt-1">15-character GST Identification Number of your company.</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="auto_attach"
            type="checkbox"
            checked={form.auto_attach_bilty}
            onChange={e => setForm(f => ({ ...f, auto_attach_bilty: e.target.checked }))}
            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-400"
          />
          <label htmlFor="auto_attach" className="text-sm text-slate-700">
            Auto-attach EWB to bilty on generation
          </label>
        </div>

        <div className="pt-1">
          <SubmitButton loading={submitting}>
            {settings ? 'Update Settings' : 'Save Settings'}
          </SubmitButton>
        </div>
      </form>

      <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">About This Integration</p>
        <ul className="text-xs text-slate-500 space-y-1.5">
          <li>• E-Way Bills are generated via the <span className="font-medium text-slate-600">Masters India GSP API</span>.</li>
          <li>• The Masters India account is locked to the MoveSure platform account.</li>
          <li>• Your company GSTIN is used for all NIC API calls on behalf of your company.</li>
          <li>• All EWB records are saved to the database for audit and compliance purposes.</li>
        </ul>
      </div>
    </div>
  );
}
