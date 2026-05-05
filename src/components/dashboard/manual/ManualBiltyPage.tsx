'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';
import {
  City, Consignor, Consignee, Transport,
  ManualBilty, ManualBook, BookDefaults, VisFlags,
  ManualForm, BLANK_FORM,
} from './types';
import ManualBiltyModal from './ManualBiltyModal';
import ManualBiltyTable from './ManualBiltyTable';

export default function ManualBiltyPage() {
  const { can } = usePermissions();
  const canCreate = can(SLUGS.BILTY_CREATE);
  const canUpdate = can(SLUGS.BILTY_UPDATE);
  const canDelete = can(SLUGS.BILTY_DELETE);

  // ── Master data ────────────────────────────────────────────────────────────
  const [cities,           setCities]           = useState<City[]>([]);
  const [consignors,       setConsignors]       = useState<Consignor[]>([]);
  const [consignees,       setConsignees]       = useState<Consignee[]>([]);
  const [transports,       setTransports]       = useState<Transport[]>([]);
  const [cityMap,          setCityMap]          = useState<Record<string, string>>({});
  const [cityTransportMap, setCityTransportMap] = useState<Record<string, { transport_id: string; mobile?: string }[]>>({});

  // ── Book defaults / visibility ─────────────────────────────────────────────
  const [vis, setVis] = useState<VisFlags>({
    show_invoice:          true,
    show_eway_bill:        false,
    show_itemized_charges: false,
    show_pvt_marks:        true,
    show_contain:          true,
  });
  const [manualBooks,       setManualBooks]       = useState<ManualBook[]>([]);
  const [defaultFormPatch,  setDefaultFormPatch]  = useState<Partial<ManualForm>>({});

  // ── List state ─────────────────────────────────────────────────────────────
  const [bilties,   setBilties]   = useState<ManualBilty[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [statusFil, setStatusFil] = useState('');
  const [payFil,    setPayFil]    = useState('');

  // ── Modal / form state ─────────────────────────────────────────────────────
  const [showModal,  setShowModal]  = useState(false);
  const [editItem,   setEditItem]   = useState<ManualBilty | null>(null);
  const [form,       setForm]       = useState<ManualForm>({ ...BLANK_FORM });
  const [ewbNumbers, setEwbNumbers] = useState<string[]>([]);
  const [saving,     setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error,      setError]      = useState('');
  const [grError,    setGrError]    = useState('');
  const [toast,      setToast]      = useState('');


  // ── Load master ────────────────────────────────────────────────────────────
  const loadMaster = useCallback(async () => {
    const [cityRes, crRes, ceRes, tpRes, bookRes, booksListRes, ctRes] = await Promise.all([
      apiFetch('/v1/master/cities?is_active=true'),
      apiFetch('/v1/bilty-setting/consignors'),
      apiFetch('/v1/bilty-setting/consignees'),
      apiFetch('/v1/master/transports?is_active=true'),
      apiFetch('/v1/bilty-setting/books/primary?bilty_type=MANUAL'),
      apiFetch('/v1/bilty-setting/books/all?bilty_type=MANUAL'),
      apiFetch('/v1/master/city-transports'),
    ]);

    if (cityRes.ok) {
      const d = await cityRes.json();
      const arr: City[] = d.cities ?? d ?? [];
      setCities(arr);
      const m: Record<string, string> = {};
      arr.forEach(c => { m[c.city_id] = c.city_name; });
      setCityMap(m);
    }
    if (crRes.ok)        { const d = await crRes.json();        setConsignors(d.consignors ?? d ?? []); }
    if (ceRes.ok)        { const d = await ceRes.json();        setConsignees(d.consignees ?? d ?? []); }
    if (tpRes.ok)        { const d = await tpRes.json();        setTransports(d.transports ?? d ?? []); }
    if (booksListRes.ok) { const d = await booksListRes.json(); setManualBooks(d.books ?? d ?? []); }
    if (ctRes.ok) {
      const d = await ctRes.json();
      const links: { city_id: string; transport_id: string; branch_mobile?: { mobile: string }[] }[] =
        d.city_transports ?? d.links ?? [];
      const ctMap: Record<string, { transport_id: string; mobile?: string }[]> = {};
      links.forEach(l => {
        if (!ctMap[l.city_id]) ctMap[l.city_id] = [];
        const mobile = Array.isArray(l.branch_mobile) && l.branch_mobile.length > 0
          ? l.branch_mobile[0].mobile : undefined;
        ctMap[l.city_id].push({ transport_id: l.transport_id, mobile });
      });
      setCityTransportMap(ctMap);
    }

    if (bookRes.ok) {
      const d = await bookRes.json();
      const bd: BookDefaults = d.book_defaults ?? d.book?.book_defaults ?? {};
      const patch: Partial<ManualForm> = {
        ...(bd.delivery_type ? { delivery_type: bd.delivery_type } : {}),
        ...(bd.payment_mode  ? { payment_mode:  bd.payment_mode  } : {}),
        ...(bd.from_city_id  ? { from_city_id:  bd.from_city_id  } : {}),
        ...(bd.to_city_id    ? { to_city_id:    bd.to_city_id    } : {}),
        ...(bd.transport_id  ? { transport_id:  bd.transport_id  } : {}),
        ...(bd.bill_charge   ? { bill_charge:   String(bd.bill_charge)  } : {}),
        ...(bd.toll_charge   ? { toll_charge:   String(bd.toll_charge)  } : {}),
      };
      setDefaultFormPatch(patch);
      setForm(f => ({ ...f, ...patch }));
      setVis({
        show_invoice:          bd.show_invoice          ?? true,
        show_eway_bill:        bd.show_eway_bill        ?? false,
        show_itemized_charges: bd.show_itemized_charges ?? false,
        show_pvt_marks:        bd.show_pvt_marks        ?? true,
        show_contain:          bd.show_contain          ?? true,
      });
    }
  }, []);

  // ── Load bilties ───────────────────────────────────────────────────────────
  const loadBilties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/v1/bilty?bilty_type=MANUAL&limit=500');
      if (res.ok) {
        const d = await res.json();
        setBilties(d.bilties ?? d ?? []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadMaster();
    loadBilties();
  }, [loadMaster, loadBilties]);

  // ── Auto-total itemized charges ────────────────────────────────────────────
  useEffect(() => {
    const keys = [
      'freight_amount', 'labour_charge', 'bill_charge', 'toll_charge',
      'dd_charge', 'pf_charge', 'local_charge', 'other_charge',
    ] as (keyof ManualForm)[];
    const sum = keys.reduce((acc, k) => acc + (parseFloat(String(form[k])) || 0), 0);
    if (sum > 0) setForm(f => ({ ...f, total_amount: sum.toFixed(2) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.freight_amount, form.labour_charge, form.bill_charge, form.toll_charge,
      form.dd_charge, form.pf_charge, form.local_charge, form.other_charge]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function sf(k: keyof ManualForm, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function sfMulti(patch: Partial<ManualForm>) {
    setForm(f => ({ ...f, ...patch }));
  }

  function openCreate() {
    setEditItem(null);
    setForm({ ...BLANK_FORM, bilty_date: new Date().toISOString().split('T')[0], ...defaultFormPatch });
    setEwbNumbers([]);
    setError(''); setGrError('');
    setShowModal(true);
  }

  // Compute GR number from book's current_number (avoids the peek API returning current+1)
  function computeGrFromBook(book: ManualBook): string {
    if (!book.prefix && !book.postfix && !book.digits) return '';
    const num = String(book.current_number).padStart(book.digits ?? 4, '0');
    return `${book.prefix ?? ''}${num}${book.postfix ?? ''}`;
  }

  // Select a book: auto-fill GR from current_number and from_city from book_defaults
  async function fetchNextGr(bookId: string) {
    const book = manualBooks.find(b => b.book_id === bookId);

    // Build patch — always apply from_city if book has a default
    const patch: Partial<ManualForm> = { book_id: bookId };
    if (book?.book_defaults?.from_city_id) {
      patch.from_city_id = book.book_defaults.from_city_id;
    }

    if (!book) {
      setForm(f => ({ ...f, ...patch, gr_no: '' }));
      return;
    }

    // Check exhausted client-side
    if (book.current_number > book.to_number) {
      showToast('This book is exhausted. Please select another book.');
      setForm(f => ({ ...f, ...patch, gr_no: '' }));
      setGrError('Book exhausted');
      return;
    }

    // Compute GR from current_number directly (peek API returns current+1 which is wrong)
    const grNo = computeGrFromBook(book);
    setGrError('');
    setForm(f => ({ ...f, ...patch, gr_no: grNo }));
  }

  function openEdit(b: ManualBilty) {
    setEditItem(b);
    setForm({
      gr_no:            b.gr_no ?? '',
      book_id:          '',
      bilty_date:       b.bilty_date ?? new Date().toISOString().split('T')[0],
      consignor_id:     b.consignor_id    ?? '',
      consignor_name:   b.consignor_name  ?? '',
      consignor_gstin:  b.consignor_gstin  ?? '',
      consignor_mobile: b.consignor_mobile ?? '',
      consignee_id:     b.consignee_id    ?? '',
      consignee_name:   b.consignee_name  ?? '',
      consignee_gstin:  b.consignee_gstin  ?? '',
      consignee_mobile: b.consignee_mobile ?? '',
      transport_id:     b.transport_id    ?? '',
      transport_name:   b.transport_name  ?? '',
      from_city_id:     b.from_city_id    ?? '',
      to_city_id:       b.to_city_id      ?? '',
      delivery_type:    b.delivery_type   ?? 'DOOR',
      payment_mode:     b.payment_mode    ?? 'TO-PAY',
      contain:          b.contain         ?? '',
      invoice_no:       b.invoice_no      ?? '',
      invoice_value:    b.invoice_value   != null ? String(b.invoice_value)   : '',
      pvt_marks:        b.pvt_marks       ?? '',
      ewb_no:           b.ewb_no          ?? '',
      no_of_pkg:        b.no_of_pkg       != null ? String(b.no_of_pkg)       : '',
      weight:           b.weight          != null ? String(b.weight)          : '',
      freight_amount:   b.freight_amount  != null ? String(b.freight_amount)  : '',
      labour_charge:    b.labour_charge   != null ? String(b.labour_charge)   : '',
      bill_charge:      b.bill_charge     != null ? String(b.bill_charge)     : '',
      toll_charge:      b.toll_charge     != null ? String(b.toll_charge)     : '',
      dd_charge:        b.dd_charge       != null ? String(b.dd_charge)       : '',
      pf_charge:        b.pf_charge       != null ? String(b.pf_charge)       : '',
      local_charge:     b.local_charge    != null ? String(b.local_charge)    : '',
      other_charge:     b.other_charge    != null ? String(b.other_charge)    : '',
      total_amount:     b.total_amount    != null ? String(b.total_amount)    : '',
      remark:           b.remark          ?? '',
      saving_option:    'SAVE',
    });
    setError(''); setGrError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditItem(null);
    setError(''); setGrError('');
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.gr_no.trim()) { setGrError('GR number is required.'); return; }
    if (form.gr_no.length > 50) { setGrError('GR number must be <= 50 characters.'); return; }
    setGrError('');
    setSaving(true); setError('');

    // Auto-create new consignor in master if no ID but name provided (online only)
    let resolvedConsignorId = form.consignor_id;
    if (!resolvedConsignorId && form.consignor_name.trim() && navigator.onLine) {
      try {
        const cr = await apiFetch('/v1/bilty-setting/consignors', {
          method: 'POST',
          body: JSON.stringify({
            consignor_name: form.consignor_name.trim(),
            ...(form.consignor_gstin  ? { gstin:  form.consignor_gstin  } : {}),
            ...(form.consignor_mobile ? { mobile: form.consignor_mobile } : {}),
          }),
        });
        if (cr.ok) {
          const cd = await cr.json();
          resolvedConsignorId = cd.consignor?.consignor_id ?? cd.consignor_id ?? '';
        }
      } catch { /* non-fatal */ }
    }

    // Auto-create new consignee in master if no ID but name provided (online only)
    let resolvedConsigneeId = form.consignee_id;
    if (!resolvedConsigneeId && form.consignee_name.trim() && navigator.onLine) {
      try {
        const cr = await apiFetch('/v1/bilty-setting/consignees', {
          method: 'POST',
          body: JSON.stringify({
            consignee_name: form.consignee_name.trim(),
            ...(form.consignee_gstin  ? { gstin:  form.consignee_gstin  } : {}),
            ...(form.consignee_mobile ? { mobile: form.consignee_mobile } : {}),
          }),
        });
        if (cr.ok) {
          const cd = await cr.json();
          resolvedConsigneeId = cd.consignee?.consignee_id ?? cd.consignee_id ?? '';
        }
      } catch { /* non-fatal */ }
    }

    const body: Record<string, unknown> = {
      bilty_type:    'MANUAL',
      gr_no:         form.gr_no.trim(),
      bilty_date:    form.bilty_date,
      payment_mode:  form.payment_mode,
      delivery_type: form.delivery_type,
      saving_option: form.saving_option,
    };

    if (form.book_id)          body.book_id          = form.book_id;
    if (resolvedConsignorId)   body.consignor_id     = resolvedConsignorId;
    if (form.consignor_name)   body.consignor_name   = form.consignor_name;
    if (form.consignor_gstin)  body.consignor_gstin  = form.consignor_gstin;
    if (form.consignor_mobile) body.consignor_mobile = form.consignor_mobile;
    if (resolvedConsigneeId) body.consignee_id     = resolvedConsigneeId;
    if (form.consignee_name)   body.consignee_name   = form.consignee_name;
    if (form.consignee_gstin)  body.consignee_gstin  = form.consignee_gstin;
    if (form.consignee_mobile) body.consignee_mobile = form.consignee_mobile;
    if (form.transport_id)     body.transport_id     = form.transport_id;
    if (form.transport_name)   body.transport_name   = form.transport_name;
    if (form.from_city_id)     body.from_city_id     = form.from_city_id;
    if (form.to_city_id)       body.to_city_id       = form.to_city_id;
    if (form.contain)          body.contain          = form.contain;
    if (form.invoice_no)       body.invoice_no       = form.invoice_no;
    if (form.invoice_value)    body.invoice_value    = Number(form.invoice_value);
    if (form.pvt_marks)        body.pvt_marks        = form.pvt_marks;
    if (form.ewb_no)           body.ewb_no           = form.ewb_no;
    const validEwbs = ewbNumbers.filter(n => n.trim());
    if (validEwbs.length > 0)  body.ewb_no           = validEwbs[0];
    if (validEwbs.length > 1)  body.e_way_bills      = validEwbs.map(ewb_no => ({ ewb_no }));
    if (form.no_of_pkg)        body.no_of_pkg        = Number(form.no_of_pkg);
    if (form.weight)           body.weight           = Number(form.weight);
    if (form.remark)           body.remark           = form.remark;

    (['freight_amount','labour_charge','bill_charge','toll_charge','dd_charge','pf_charge','local_charge','other_charge','total_amount'] as const)
      .forEach(k => { if (form[k]) body[k] = Number(form[k]); });

    try {
      const res = editItem
        ? await apiFetch(`/v1/bilty/${editItem.bilty_id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await apiFetch('/v1/bilty', { method: 'POST', body: JSON.stringify(body) });

      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail)
          ? data.detail.map((d: { msg: string }) => d.msg).join('. ')
          : (data.detail ?? 'Failed to save bilty.');
        setError(msg);
        return;
      }
      showToast(editItem ? 'Bilty updated successfully.' : 'Manual bilty created.');
      closeModal();
      loadBilties();
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id: string, gr: string) {
    if (!confirm(`Delete manual bilty GR: ${gr}? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/v1/bilty/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const d = await res.json();
        const msg = Array.isArray(d.detail)
          ? d.detail.map((e: { msg: string }) => e.msg).join('. ')
          : (typeof d.detail === 'string' ? d.detail : 'Failed to delete.');
        showToast(msg);
        return;
      }
      showToast('Bilty deleted.');
      setBilties(prev => prev.filter(b => b.bilty_id !== id));
    } catch {
      showToast('Unable to reach the server.');
    } finally {
      setDeletingId(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4 shrink-0 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Manual Bilties</h1>
            <p className="text-xs text-slate-400">Hand-written GR numbers · no auto-generation</p>
          </div>
        </div>

        {/* Book chips */}
        {manualBooks.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {manualBooks.map(bk => (
              <span
                key={bk.book_id}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                  bk.is_primary
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                } ${!bk.is_active ? 'opacity-40' : ''}`}
              >
                {bk.is_primary && <span className="text-amber-500">*</span>}
                {bk.book_name ?? 'MANUAL'}
                {bk.book_defaults?.payment_mode && (
                  <span className="opacity-60 font-normal">· {bk.book_defaults.payment_mode}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {canCreate && (
          <button
            onClick={openCreate}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 active:bg-violet-800 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Create Manual Bilty
          </button>
        )}
      </div>

      {/* Table */}
      <ManualBiltyTable
        bilties={bilties}
        loading={loading}
        search={search}
        statusFil={statusFil}
        payFil={payFil}
        cityMap={cityMap}
        onSearch={setSearch}
        onStatusFil={setStatusFil}
        onPayFil={setPayFil}
        onRefresh={loadBilties}
        onEdit={openEdit}
        onDelete={handleDelete}
        deletingId={deletingId}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />

      {/* Modal */}
      <ManualBiltyModal
        open={showModal}
        onClose={closeModal}
        form={form}
        vis={vis}
        cities={cities}
        consignors={consignors}
        consignees={consignees}
        transports={transports}
        manualBooks={manualBooks}
        cityTransportMap={cityTransportMap}
        editItem={editItem}
        saving={saving}
        error={error}
        grError={grError}
        ewbNumbers={ewbNumbers}
        setEwbNumbers={setEwbNumbers}
        onChange={sf}
        onChangeMulti={sfMulti}
        onSubmit={handleSubmit}
        onClearError={() => setError('')}
        onFetchNextGr={fetchNextGr}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-2xl">
          <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}

    </div>
  );
}
