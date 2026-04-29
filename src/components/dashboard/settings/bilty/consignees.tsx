'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';

interface Consignee {
  id: string;
  consignee_name: string;
  gstin?: string | null;
  pan?: string | null;
  mobile?: string | null;
  alternate_mobile?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  is_active: boolean;
}

const EMPTY_FORM = {
  consignee_name: '',
  gstin: '',
  pan: '',
  mobile: '',
  alternate_mobile: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
};

export default function Consignees() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can(SLUGS.BILTY_CONSIGNEES_CREATE);
  const canUpdate = can(SLUGS.BILTY_CONSIGNEES_UPDATE);
  const canDelete = can(SLUGS.BILTY_CONSIGNEES_DELETE);

  const [items, setItems]           = useState<Consignee[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editItem, setEditItem]     = useState<Consignee | null>(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/v1/bilty-setting/consignees`);
      if (res.status === 401) { router.replace('/auth/login'); return; }
      const data = await res.json();
      setItems(data.consignees ?? data ?? []);
    } catch { setError('Failed to load consignees.'); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!getUser()) { router.replace('/auth/login'); return; }
    fetchItems();
  }, [fetchItems, router]);

  function openCreate() {
    setEditItem(null); setForm({ ...EMPTY_FORM });
    setError(''); setSuccess(''); setShowForm(true);
  }

  function openEdit(c: Consignee) {
    setEditItem(c);
    setForm({
      consignee_name:   c.consignee_name,
      gstin:            c.gstin ?? '',
      pan:              c.pan ?? '',
      mobile:           c.mobile ?? '',
      alternate_mobile: c.alternate_mobile ?? '',
      email:            c.email ?? '',
      address:          c.address ?? '',
      city:             c.city ?? '',
      state:            c.state ?? '',
      pincode:          c.pincode ?? '',
    });
    setError(''); setSuccess(''); setShowForm(true);
  }

  function closeForm() {
    setShowForm(false); setEditItem(null);
    setForm({ ...EMPTY_FORM }); setError('');
  }

  function f(field: keyof typeof EMPTY_FORM, val: string) {
    setForm(p => ({ ...p, [field]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');

    const body: Record<string, string> = { consignee_name: form.consignee_name.trim() };
    (Object.keys(EMPTY_FORM) as (keyof typeof EMPTY_FORM)[])
      .filter(k => k !== 'consignee_name' && form[k].trim())
      .forEach(k => { body[k] = form[k].trim(); });

    try {
      const url = editItem
        ? `/v1/bilty-setting/consignees/${editItem.id}`
        : `/v1/bilty-setting/consignees`;
      const res = await apiFetch(url, {
        method: editItem ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail)
          ? data.detail.map((d: { msg: string }) => d.msg).join('. ')
          : (data.detail ?? 'Operation failed.');
        setError(msg); return;
      }
      setSuccess(editItem ? 'Consignee updated.' : 'Consignee created.');
      closeForm(); fetchItems();
    } catch { setError('Unable to reach the server.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete consignee "${name}"?`)) return;
    setDeletingId(id); setError('');
    try {
      const res = await apiFetch(`/v1/bilty-setting/consignees/${id}`, {
        method: 'DELETE',      });
      if (!res.ok && res.status !== 204) { setError('Failed to delete.'); return; }
      setSuccess('Consignee deleted.'); fetchItems();
    } catch { setError('Unable to reach the server.'); }
    finally { setDeletingId(null); }
  }

  const filtered = items.filter(c =>
    c.consignee_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.gstin ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.mobile ?? '').includes(search)
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Consignees</h1>
          <p className="text-sm text-slate-500">Manage consignees (receivers) used in bilty creation.</p>
        </div>
        {canCreate && (
          <button type="button" onClick={openCreate}
            className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
            + Add Consignee
          </button>
        )}
      </div>

      {error   && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      {/* Search */}
      <div className="relative mb-5">
        <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, GSTIN, or mobile…"
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <p className="text-sm font-semibold text-slate-700">{editItem ? 'Edit Consignee' : 'New Consignee'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              ['consignee_name', 'Consignee Name *', 'text', true],
              ['mobile', 'Mobile', 'tel', false],
              ['alternate_mobile', 'Alternate Mobile', 'tel', false],
              ['email', 'Email', 'email', false],
              ['gstin', 'GSTIN', 'text', false],
              ['pan', 'PAN', 'text', false],
              ['address', 'Address', 'text', false],
              ['city', 'City', 'text', false],
              ['state', 'State', 'text', false],
              ['pincode', 'Pincode', 'text', false],
            ] as [keyof typeof EMPTY_FORM, string, string, boolean][]).map(([key, label, type, req]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input required={req} type={type} value={form[key]} onChange={e => f(key, e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeForm}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {saving ? 'Saving…' : editItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-14 text-center text-sm text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center text-sm text-slate-400 bg-white rounded-xl border border-slate-200">
          No consignees found.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">GSTIN</th>
                <th className="px-5 py-3 text-left">Mobile</th>
                <th className="px-5 py-3 text-left">City / State</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((c, idx) => (
                <tr key={c.id ?? idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-800">{c.consignee_name}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{c.gstin ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600">{c.mobile ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">
                    {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${c.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {(canUpdate || canDelete) && (
                      <div className="flex items-center justify-end gap-2">
                        {canUpdate && (
                          <button type="button" onClick={() => openEdit(c)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button type="button" disabled={deletingId === c.id}
                            onClick={() => handleDelete(c.id, c.consignee_name)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors">
                            {deletingId === c.id ? '…' : 'Delete'}
                          </button>
                        )}
                      </div>
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
