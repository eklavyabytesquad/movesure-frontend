'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';

/* ─── types ─── */
interface BiltyBook { id: string; book_name: string | null; }
interface DiscountBranch { branch_id: string; name: string; }

interface BiltyDiscount {
  id: string;
  discount_code: string;
  percentage: number;
  bill_book_id: string | null;
  bill_book_name?: string | null;
  max_amount_discounted: number | null;
  minimum_amount: number;
  is_active: boolean;
  branch_id?: string | null;
  branch_name?: string | null;
}

const EMPTY = {
  discount_code:        '',
  percentage:           '',
  bill_book_id:         '',
  branch_id:            '',
  max_amount_discounted: '',
  minimum_amount:       '',
};

const INPUT = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';
const LABEL = 'block text-sm font-medium text-slate-700 mb-1';

export default function BiltyDiscounts() {
  const router    = useRouter();
  const { can }   = usePermissions();
  const canCreate = can(SLUGS.BILTY_DISCOUNTS_CREATE);
  const canUpdate = can(SLUGS.BILTY_DISCOUNTS_UPDATE);
  const canDelete = can(SLUGS.BILTY_DISCOUNTS_DELETE);

  const [discounts,  setDiscounts]  = useState<BiltyDiscount[]>([]);
  const [books,      setBooks]      = useState<BiltyBook[]>([]);
  const [branches,   setBranches]   = useState<DiscountBranch[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editItem,   setEditItem]   = useState<BiltyDiscount | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY });
  const [saving,     setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [discRes, booksRes, branchRes] = await Promise.all([
        apiFetch(`/v1/bilty-setting/discounts`),
        apiFetch(`/v1/bilty-setting/books?is_active=true`),
        apiFetch(`/v1/staff/branches`),
      ]);
      if (discRes.status === 401) { router.replace('/auth/login'); return; }
      if (discRes.ok)   { const d = await discRes.json();   setDiscounts(d.discounts ?? d ?? []); }
      if (booksRes.ok)  { const d = await booksRes.json();  setBooks(d.books ?? d ?? []); }
      if (branchRes.ok) { const d = await branchRes.json(); setBranches(d.branches ?? d ?? []); }
    } catch { setError('Failed to load discounts.'); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    setEditItem(null);
    setForm({ ...EMPTY });
    setError(''); setSuccess('');
    setShowForm(true);
  }

  function openEdit(d: BiltyDiscount) {
    setEditItem(d);
    setForm({
      discount_code:         d.discount_code,
      percentage:            String(d.percentage),
      bill_book_id:          d.bill_book_id ?? '',
      branch_id:             d.branch_id ?? '',
      max_amount_discounted: d.max_amount_discounted != null ? String(d.max_amount_discounted) : '',
      minimum_amount:        d.minimum_amount != null ? String(d.minimum_amount) : '',
    });
    setError(''); setSuccess('');
    setShowForm(true);
  }

  function sf(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');

    const body: Record<string, unknown> = {
      discount_code: form.discount_code.trim(),
      percentage:    parseFloat(form.percentage) || 0,
    };
    if (form.bill_book_id)          body.bill_book_id          = form.bill_book_id;
    if (form.branch_id)             body.branch_id             = form.branch_id;
    if (form.max_amount_discounted) body.max_amount_discounted = parseFloat(form.max_amount_discounted);
    if (form.minimum_amount)        body.minimum_amount        = parseFloat(form.minimum_amount);

    try {
      const url    = editItem ? `/v1/bilty-setting/discounts/${editItem.id}` : `/v1/bilty-setting/discounts`;
      const method = editItem ? 'PATCH' : 'POST';
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail)
          ? data.detail.map((d: { msg: string }) => d.msg).join('. ')
          : (data.detail ?? 'Failed to save discount.');
        setError(msg); return;
      }
      setSuccess(editItem ? 'Discount updated.' : 'Discount created.');
      setShowForm(false);
      fetchData();
    } catch { setError('Unable to reach the server.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this discount?')) return;
    setDeletingId(id); setError(''); setSuccess('');
    try {
      const res = await apiFetch(`/v1/bilty-setting/discounts/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) { const d = await res.json(); setError(d.detail ?? 'Failed to delete.'); return; }
      setSuccess('Discount deleted.'); fetchData();
    } catch { setError('Unable to reach the server.'); }
    finally { setDeletingId(null); }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Bilty Discounts</h2>
          <p className="text-sm text-slate-500 mt-0.5">Discount master applied at time of bilty creation.</p>
        </div>
        {canCreate && !showForm && (
          <button onClick={openCreate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            + New Discount
          </button>
        )}
      </div>

      {/* Alerts */}
      {error   && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6 space-y-4">
          <p className="text-sm font-semibold text-slate-700">{editItem ? 'Edit Discount' : 'New Discount'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Discount Code * <span className="text-slate-400 font-normal">(max 50)</span></label>
              <input required maxLength={50} value={form.discount_code} onChange={e => sf('discount_code', e.target.value)}
                placeholder="DIWALI10" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Percentage * <span className="text-slate-400 font-normal">(0–100)</span></label>
              <input required type="number" min={0} max={100} step="0.01" value={form.percentage}
                onChange={e => sf('percentage', e.target.value)} placeholder="10" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Restrict to Book <span className="text-slate-400 font-normal">(optional)</span></label>
              <select value={form.bill_book_id} onChange={e => sf('bill_book_id', e.target.value)} className={INPUT}>
                <option value="">— Any book —</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.book_name ?? b.id}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Restrict to Branch <span className="text-slate-400 font-normal">(optional)</span></label>
              <select value={form.branch_id} onChange={e => sf('branch_id', e.target.value)} className={INPUT}>
                <option value="">— All branches —</option>
                {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Minimum Bilty Amount (₹)</label>
              <input type="number" min={0} step="0.01" value={form.minimum_amount}
                onChange={e => sf('minimum_amount', e.target.value)} placeholder="0.00" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Max Discount Cap (₹) <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="number" min={0} step="0.01" value={form.max_amount_discounted}
                onChange={e => sf('max_amount_discounted', e.target.value)} placeholder="No cap" className={INPUT} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : (editItem ? 'Update' : 'Create')}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="py-20 text-center text-sm text-slate-400">Loading discounts…</div>
      ) : discounts.length === 0 ? (
        <div className="py-20 text-center text-sm text-slate-400">No discounts yet. Create one to get started.</div>
      ) : (
        <div className="space-y-3">
          {discounts.map(d => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="font-semibold text-slate-800 text-sm bg-slate-100 px-2 py-0.5 rounded">{d.discount_code}</code>
                  <span className="text-sm font-bold text-indigo-700">{d.percentage}%</span>
                  {d.bill_book_name && (
                    <span className="text-xs text-slate-500 border border-slate-200 px-2 py-0.5 rounded">Book: {d.bill_book_name}</span>
                  )}
                  {!d.bill_book_id && (
                    <span className="text-xs text-slate-400 border border-slate-200 px-2 py-0.5 rounded">All books</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${d.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {d.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-slate-500">
                  {d.minimum_amount > 0 && <span>Min amount: ₹{d.minimum_amount.toLocaleString('en-IN')}</span>}
                  {d.max_amount_discounted != null && <span>Max cap: ₹{d.max_amount_discounted.toLocaleString('en-IN')}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {canUpdate && (
                  <button onClick={() => openEdit(d)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors font-medium">
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => handleDelete(d.id)} disabled={deletingId === d.id}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors font-medium">
                    {deletingId === d.id ? '…' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
