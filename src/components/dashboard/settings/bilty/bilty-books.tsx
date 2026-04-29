'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';

/* ─── types ─── */

interface BiltyBook {
  book_id: string;
  book_name: string | null;
  template_name: string | null;
  bilty_type: 'REGULAR' | 'MANUAL';
  party_scope: 'COMMON' | 'CONSIGNOR' | 'CONSIGNEE';
  consignor_id: string | null;
  consignee_id: string | null;
  prefix: string | null;
  from_number: number;
  to_number: number;
  current_number: number;
  digits: number;
  postfix: string | null;
  is_fixed: boolean;
  auto_continue: boolean;
  is_active: boolean;
  is_completed: boolean;
  is_primary?: boolean;
  book_defaults?: {
    delivery_type?: string | null;
    payment_mode?: string | null;
    from_city_id?: string | null;
    to_city_id?: string | null;
    transport_id?: string | null;
    bill_charge?: number | null;
    toll_charge?: number | null;
  } | null;
}

const DEFAULT_FORM = {
  book_name: '',
  template_name: '',
  bilty_type: 'REGULAR' as 'REGULAR' | 'MANUAL',
  party_scope: 'COMMON' as 'COMMON' | 'CONSIGNOR' | 'CONSIGNEE',
  consignor_id: '',
  consignee_id: '',
  prefix: '',
  from_number: '',
  to_number: '',
  digits: '4',
  postfix: '',
  is_fixed: false,
  auto_continue: false,
  // book_defaults
  bd_delivery_type: '',
  bd_payment_mode: '',
  bd_from_city_id: '',
  bd_to_city_id: '',
  bd_transport_id: '',
  bd_bill_charge: '',
  bd_toll_charge: '',
};

export default function BiltyBooks() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can(SLUGS.BILTY_BOOKS_CREATE);
  const canUpdate = can(SLUGS.BILTY_BOOKS_UPDATE);
  const canDelete = can(SLUGS.BILTY_BOOKS_DELETE);

  const [books, setBooks]                 = useState<BiltyBook[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [editItem, setEditItem]           = useState<BiltyBook | null>(null);
  const [form, setForm]                   = useState({ ...DEFAULT_FORM });
  const [saving, setSaving]               = useState(false);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');
  const [filterType, setFilterType]       = useState('');
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [consignorsList, setConsignorsList] = useState<{ id: string; consignor_name: string }[]>([]);
  const [consigneesList, setConsigneesList] = useState<{ id: string; consignee_name: string }[]>([]);
  const [citiesList, setCitiesList]         = useState<{ city_id: string; city_name: string }[]>([]);
  const [transportsList, setTransportsList] = useState<{ transport_id: string; transport_name: string }[]>([]);

  async function fetchParties(token: string) {
    const [crs, ces, cityRes, tpRes] = await Promise.all([
      apiFetch(`/v1/bilty-setting/consignors`),
      apiFetch(`/v1/bilty-setting/consignees`),
      apiFetch(`/v1/master/cities?is_active=true`),
      apiFetch(`/v1/master/transports?is_active=true`),
    ]);
    if (crs.ok)     { const d = await crs.json();     setConsignorsList(d.consignors ?? d ?? []); }
    if (ces.ok)     { const d = await ces.json();     setConsigneesList(d.consignees ?? d ?? []); }
    if (cityRes.ok) { const d = await cityRes.json(); setCitiesList(d.cities ?? d ?? []); }
    if (tpRes.ok)   { const d = await tpRes.json();   setTransportsList(d.transports ?? d ?? []); }
  }

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.set('bilty_type', filterType);
    try {
      const res = await apiFetch(`/v1/bilty-setting/books?${params}`);
      if (res.status === 401) { router.replace('/auth/login'); return; }
      const data = await res.json();
      setBooks(data.books ?? data ?? []);
    } catch { setError('Failed to load bilty books.'); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

  useEffect(() => {
    if (!getUser()) { router.replace('/auth/login'); return; }
    fetchBooks();
    if (token) fetchParties(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchBooks, router]);

  function resetForm() {
    setEditItem(null);
    setForm({ ...DEFAULT_FORM });
    setError('');
    setSuccess('');
  }

  function openEdit(b: BiltyBook) {
    setEditItem(b);
    setForm({
      book_name:        b.book_name ?? '',
      template_name:    b.template_name ?? '',
      bilty_type:       b.bilty_type,
      party_scope:      b.party_scope,
      consignor_id:     b.consignor_id ?? '',
      consignee_id:     b.consignee_id ?? '',
      prefix:           b.prefix ?? '',
      from_number:      String(b.from_number),
      to_number:        String(b.to_number),
      digits:           String(b.digits),
      postfix:          b.postfix ?? '',
      is_fixed:         b.is_fixed,
      auto_continue:    b.auto_continue,
      bd_delivery_type: b.book_defaults?.delivery_type ?? '',
      bd_payment_mode:  b.book_defaults?.payment_mode  ?? '',
      bd_from_city_id:  b.book_defaults?.from_city_id  ?? '',
      bd_to_city_id:    b.book_defaults?.to_city_id    ?? '',
      bd_transport_id:  b.book_defaults?.transport_id  ?? '',
      bd_bill_charge:   b.book_defaults?.bill_charge   != null ? String(b.book_defaults.bill_charge) : '',
      bd_toll_charge:   b.book_defaults?.toll_charge   != null ? String(b.book_defaults.toll_charge) : '',
    });
    setError(''); setSuccess('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');

    // book_defaults — always send (null clears it on edit)
    const bd: Record<string, string | number | null> = {
      delivery_type: form.bd_delivery_type || null,
      payment_mode:  form.bd_payment_mode  || null,
      from_city_id:  form.bd_from_city_id  || null,
      to_city_id:    form.bd_to_city_id    || null,
      transport_id:  form.bd_transport_id  || null,
      bill_charge:   form.bd_bill_charge   ? Number(form.bd_bill_charge)  : null,
      toll_charge:   form.bd_toll_charge   ? Number(form.bd_toll_charge)  : null,
    };
    const hasAnyDefault = Object.values(bd).some(v => v !== null);

    if (editItem) {
      // PATCH — only send editable fields (number range is immutable)
      const body: Record<string, unknown> = {
        is_fixed:      form.is_fixed,
        auto_continue: form.auto_continue,
        book_defaults: hasAnyDefault ? bd : null,
      };
      if (form.book_name.trim())     body.book_name     = form.book_name.trim();
      if (form.template_name.trim()) body.template_name = form.template_name.trim();
      if (form.prefix.trim())        body.prefix        = form.prefix.trim();
      if (form.postfix.trim())       body.postfix       = form.postfix.trim();
      try {
        const res = await apiFetch(`/v1/bilty-setting/books/${editItem.book_id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          const msg = Array.isArray(data.detail)
            ? data.detail.map((d: { msg: string }) => d.msg).join('. ')
            : (data.detail ?? 'Failed to update book.');
          setError(msg); return;
        }
        setSuccess('Book updated successfully.');
        setShowForm(false); resetForm(); fetchBooks();
      } catch { setError('Unable to reach the server.'); }
      finally { setSaving(false); }
      return;
    }

    // POST — create new
    const body: Record<string, unknown> = {
      bilty_type:    form.bilty_type,
      party_scope:   form.party_scope,
      from_number:   Number(form.from_number),
      to_number:     Number(form.to_number),
      digits:        Number(form.digits),
      is_fixed:      form.is_fixed,
      auto_continue: form.auto_continue,
    };
    if (form.book_name.trim())     body.book_name     = form.book_name.trim();
    if (form.template_name.trim()) body.template_name = form.template_name.trim();
    if (form.prefix.trim())        body.prefix        = form.prefix.trim();
    if (form.postfix.trim())       body.postfix       = form.postfix.trim();
    if (form.party_scope === 'CONSIGNOR' && form.consignor_id) body.consignor_id = form.consignor_id;
    if (form.party_scope === 'CONSIGNEE' && form.consignee_id) body.consignee_id = form.consignee_id;
    if (hasAnyDefault) body.book_defaults = bd;

    try {
      const res = await apiFetch(`/v1/bilty-setting/books`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail)
          ? data.detail.map((d: { msg: string }) => d.msg).join('. ')
          : (data.detail ?? 'Failed to create book.');
        setError(msg); return;
      }
      setSuccess('Book created successfully.');
      setShowForm(false); resetForm(); fetchBooks();
    } catch { setError('Unable to reach the server.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string | null) {
    if (!confirm(`Delete book "${name ?? id}"?`)) return;
    setDeletingId(id); setError('');
    try {
      const res = await apiFetch(`/v1/bilty-setting/books/${id}`, {
        method: 'DELETE',      });
      if (!res.ok && res.status !== 204) { setError('Failed to delete.'); return; }
      setSuccess('Book deleted.'); fetchBooks();
    } catch { setError('Unable to reach the server.'); }
    finally { setDeletingId(null); }
  }

  async function handleSetPrimary(id: string) {
    setSettingPrimaryId(id); setError(''); setSuccess('');
    try {
      const res = await apiFetch(`/v1/bilty-setting/books/${id}/set-primary`, {
        method: 'PATCH',
      });
      if (!res.ok) { const d = await res.json(); setError(d.detail ?? 'Failed to set primary.'); return; }
      setSuccess('Primary book updated.'); fetchBooks();
    } catch { setError('Unable to reach the server.'); }
    finally { setSettingPrimaryId(null); }
  }

  const filtered = filterType ? books.filter(b => b.bilty_type === filterType) : books;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Bilty Books</h1>
          <p className="text-sm text-slate-500">Manage GR / LR number books and their sequential ranges.</p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => { if (showForm && !editItem) { setShowForm(false); resetForm(); } else { resetForm(); setShowForm(true); } }}
            className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            {showForm && !editItem ? 'Cancel' : '+ New Book'}
          </button>
        )}
      </div>

      {error   && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      {/* Filter */}
      <div className="flex gap-2 mb-5">
        {(['', 'REGULAR', 'MANUAL'] as const).map(t => (
          <button key={t} type="button" onClick={() => setFilterType(t)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${filterType === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {t || 'All'}
          </button>
        ))}
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">{editItem ? `Edit Book — ${editItem.book_name ?? editItem.book_id}` : 'New Bilty Book'}</p>
            {editItem && (
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors">✕ Close</button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Book Name</label>
              <input value={form.book_name} onChange={e => setForm(f => ({...f, book_name: e.target.value}))}
                placeholder='e.g. "Book-A 2025-26"'
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              {editItem ? (
                <input readOnly value={form.bilty_type}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
              ) : (
                <select value={form.bilty_type} onChange={e => setForm(f => ({...f, bilty_type: e.target.value as 'REGULAR' | 'MANUAL'}))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="REGULAR">REGULAR</option>
                  <option value="MANUAL">MANUAL</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Party Scope</label>
              {editItem ? (
                <input readOnly value={form.party_scope}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
              ) : (
                <select value={form.party_scope}
                  onChange={e => setForm(f => ({...f, party_scope: e.target.value as 'COMMON' | 'CONSIGNOR' | 'CONSIGNEE', consignor_id: '', consignee_id: ''}))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="COMMON">COMMON</option>
                  <option value="CONSIGNOR">CONSIGNOR</option>
                  <option value="CONSIGNEE">CONSIGNEE</option>
                </select>
              )}
            </div>
            {form.party_scope === 'CONSIGNOR' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Consignor</label>
                <select value={form.consignor_id} onChange={e => setForm(f => ({...f, consignor_id: e.target.value}))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— Select consignor —</option>
                  {consignorsList.map((c, i) => (
                    <option key={c.id ?? i} value={c.id}>{c.consignor_name}</option>
                  ))}
                </select>
              </div>
            )}
            {form.party_scope === 'CONSIGNEE' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Consignee</label>
                <select value={form.consignee_id} onChange={e => setForm(f => ({...f, consignee_id: e.target.value}))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— Select consignee —</option>
                  {consigneesList.map((c, i) => (
                    <option key={c.id ?? i} value={c.id}>{c.consignee_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">From Number {!editItem && '*'}</label>
              <input readOnly={!!editItem} required={!editItem} type="number" min={1} value={form.from_number}
                onChange={e => !editItem && setForm(f => ({...f, from_number: e.target.value}))}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${editItem ? 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed' : 'border-slate-300'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">To Number {!editItem && '*'}</label>
              <input readOnly={!!editItem} required={!editItem} type="number" min={1} value={form.to_number}
                onChange={e => !editItem && setForm(f => ({...f, to_number: e.target.value}))}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${editItem ? 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed' : 'border-slate-300'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Digits (zero-pad)</label>
              <input readOnly={!!editItem} type="number" min={1} max={10} value={form.digits}
                onChange={e => !editItem && setForm(f => ({...f, digits: e.target.value}))}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${editItem ? 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed' : 'border-slate-300'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prefix</label>
              <input value={form.prefix} onChange={e => setForm(f => ({...f, prefix: e.target.value}))} placeholder='e.g. "MUM/"'
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Postfix</label>
              <input value={form.postfix} onChange={e => setForm(f => ({...f, postfix: e.target.value}))} placeholder='e.g. "/25"'
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
              <input value={form.template_name} onChange={e => setForm(f => ({...f, template_name: e.target.value}))} placeholder='e.g. "A4-Standard"'
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Book Defaults */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Book Defaults <span className="font-normal normal-case text-slate-400">(pre-fills the bilty form)</span></p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Default Delivery Type</label>
                <select value={form.bd_delivery_type} onChange={e => setForm(f => ({...f, bd_delivery_type: e.target.value}))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— none —</option>
                  <option value="DOOR">DOOR</option>
                  <option value="GODOWN">GODOWN</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Default Payment Mode</label>
                <select value={form.bd_payment_mode} onChange={e => setForm(f => ({...f, bd_payment_mode: e.target.value}))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— none —</option>
                  <option value="PAID">PAID</option>
                  <option value="TO-PAY">TO-PAY</option>
                  <option value="FOC">FOC</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Default From City</label>
                <select value={form.bd_from_city_id} onChange={e => setForm(f => ({...f, bd_from_city_id: e.target.value}))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— none —</option>
                  {citiesList.map(c => <option key={c.city_id} value={c.city_id}>{c.city_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Default To City</label>
                <select value={form.bd_to_city_id} onChange={e => setForm(f => ({...f, bd_to_city_id: e.target.value}))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— none —</option>
                  {citiesList.map(c => <option key={c.city_id} value={c.city_id}>{c.city_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Default Transporter</label>
                <select value={form.bd_transport_id} onChange={e => setForm(f => ({...f, bd_transport_id: e.target.value}))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— none —</option>
                  {transportsList.map(t => <option key={t.transport_id} value={t.transport_id}>{t.transport_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Default Bill Charge (₹)</label>
                <input type="number" min={0} step="0.01" value={form.bd_bill_charge}
                  onChange={e => setForm(f => ({...f, bd_bill_charge: e.target.value}))}
                  placeholder="0.00"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Default Toll Charge (₹)</label>
                <input type="number" min={0} step="0.01" value={form.bd_toll_charge}
                  onChange={e => setForm(f => ({...f, bd_toll_charge: e.target.value}))}
                  placeholder="0.00"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_fixed} onChange={e => setForm(f => ({...f, is_fixed: e.target.checked}))}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
              Fixed number (never auto-increment)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input type="checkbox" checked={form.auto_continue} onChange={e => setForm(f => ({...f, auto_continue: e.target.checked}))}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
              Auto-continue when exhausted
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {saving ? (editItem ? 'Saving…' : 'Creating…') : (editItem ? 'Save Changes' : 'Create Book')}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-14 text-center text-sm text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center text-sm text-slate-400 bg-white rounded-xl border border-slate-200">
          No bilty books found.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Book Name</th>
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">Scope</th>
                <th className="px-5 py-3 text-left">Range</th>
                <th className="px-5 py-3 text-left">Used</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Preview</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(b => {
                const used = b.current_number - b.from_number;
                const total = b.to_number - b.from_number + 1;
                const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
                const preview = `${b.prefix ?? ''}${String(b.current_number).padStart(b.digits, '0')}${b.postfix ?? ''}`;
                return (
                  <tr key={b.book_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        {b.is_primary && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300">
                            ★ Primary
                          </span>
                        )}
                        {b.book_name ?? <span className="text-slate-400 italic">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${b.bilty_type === 'REGULAR' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {b.bilty_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{b.party_scope}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs font-mono">{b.from_number}–{b.to_number}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-400">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {b.is_completed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">Completed</span>
                      ) : b.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">Inactive</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <code className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{preview}</code>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {(canUpdate || canDelete) && (
                        <div className="flex items-center justify-end gap-2">
                          {canUpdate && !b.is_primary && !b.is_completed && (
                            <button type="button" disabled={settingPrimaryId === b.book_id}
                              onClick={() => handleSetPrimary(b.book_id)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 transition-colors font-medium">
                              {settingPrimaryId === b.book_id ? '…' : 'Set Primary'}
                            </button>
                          )}
                          {canUpdate && (
                            <button type="button"
                              onClick={() => { openEdit(b); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors font-medium">
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button type="button" disabled={deletingId === b.book_id}
                              onClick={() => handleDelete(b.book_id, b.book_name)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors">
                              {deletingId === b.book_id ? '…' : 'Delete'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
