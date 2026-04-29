'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { generateFirstA4 }  from './templates/first-a4-template';
import { generateSecondA4 } from './templates/second-a4-template';
import type { BiltyData }   from './templates/first-a4-template';

import {
  BLANK, BiltyForm,
  Book, Consignor, Consignee, City, Transport, PrimaryTemplate, BiltyDiscount, BiltySummary,
} from './types';
import { PdfPreviewModal } from './ui';
import SectionGrBook from './sections/SectionGrBook';
import SectionConsignor from './sections/SectionConsignor';
import SectionConsignee from './sections/SectionConsignee';
import SectionRouteTransport from './sections/SectionRouteTransport';
import SectionShipment from './sections/SectionShipment';
import SectionInvoice from './sections/SectionInvoice';
import SectionEwb from './sections/SectionEwb';
import SectionCharges from './sections/SectionCharges';
import SectionDiscount from './sections/SectionDiscount';
import SectionRemark from './sections/SectionRemark';
import SectionFormActions from './sections/SectionFormActions';

const LIMIT = 40;

// ─── Bilty Search Bar ────────────────────────────────────────────────────────
function BiltySearchBar({
  recent, loading, onSelect,
}: {
  recent: BiltySummary[];
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);
  const [hi,    setHi]    = useState(0);
  const [shownCount, setShownCount] = useState(20);
  const ref = useRef<HTMLDivElement>(null);

  const q = query.toLowerCase().trim();
  const results = q.length === 0
    ? recent.slice(0, shownCount)
    : recent.filter(b =>
        b.gr_no.toLowerCase().includes(q) ||
        b.consignor_name.toLowerCase().includes(q) ||
        b.consignee_name.toLowerCase().includes(q)
      ).slice(0, 20);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); setHi(0); return; }
      setHi(h => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && results[hi]) {
        e.preventDefault();
        onSelect(results[hi].bilty_id);
        setOpen(false); setQuery('');
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative w-72 sm:w-80">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setHi(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? 'Loading bilties…' : 'Search bilty in this book…'}
          autoComplete="off"
          suppressHydrationWarning
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 right-0 w-88 bg-white border border-slate-200 rounded-xl shadow-xl max-h-96 overflow-y-auto">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            {q ? 'Search results' : 'Recent bilties'} — click to edit
          </p>
          {results.map((b, i) => (
            <button
              key={b.bilty_id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(b.bilty_id); setOpen(false); setQuery(''); }}
              onMouseEnter={() => setHi(i)}
              className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-slate-100 last:border-b-0 ${
                i === hi ? 'bg-indigo-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold font-mono text-slate-900 text-xs">{b.gr_no}</span>
                <span className="text-[11px] text-slate-400">
                  {b.bilty_date
                    ? new Date(b.bilty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                    : ''}
                </span>
              </div>
              <div className="text-xs text-slate-600 truncate">{b.consignor_name} → {b.consignee_name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold text-slate-800">₹{b.total_amount?.toLocaleString('en-IN') ?? '—'}</span>
                <span className="text-[10px] text-slate-400 uppercase">{b.payment_mode}</span>
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                  b.status === 'SAVED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  b.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border-red-200' :
                  'bg-slate-100 text-slate-600 border-slate-200'
                }`}>{b.status}</span>
              </div>
            </button>
          ))}
          {/* Load more for recent (no query) */}
          {!q && recent.length > shownCount && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setShownCount(n => n + 20); }}
              className="w-full text-center px-3 py-2 text-xs text-indigo-600 font-medium hover:bg-indigo-50 border-t border-slate-100 transition-colors"
            >
              Load more ({recent.length - shownCount} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function BiltyPage() {
  const router = useRouter();

  const [primaryBook,     setPrimaryBook]     = useState<Book | null>(null);
  const [primaryTemplate, setPrimaryTemplate] = useState<PrimaryTemplate | null>(null);
  const [noPrimaryBook,   setNoPrimaryBook]   = useState(false);
  const [consignors,   setConsignors]   = useState<Consignor[]>([]);
  const [consignees,   setConsignees]   = useState<Consignee[]>([]);
  const [cities,       setCities]       = useState<City[]>([]);
  const [transports,   setTransports]   = useState<Transport[]>([]);
  const [discounts,    setDiscounts]    = useState<BiltyDiscount[]>([]);
  const [cityTransportMap, setCityTransportMap] = useState<Record<string, string>>({});
  const [dropLoading,  setDropLoading]  = useState(true);

  const [form,         setForm]         = useState<BiltyForm>({ ...BLANK, bilty_date: new Date().toISOString().split('T')[0] });
  const [ewbNumbers,   setEwbNumbers]   = useState<string[]>(['']);
  const [grPreview,    setGrPreview]    = useState('');
  const [editBiltyId,  setEditBiltyId]  = useState<string | null>(null);

  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState('');
  const [savedJson,    setSavedJson]    = useState<object | null>(null);
  const [printing,     setPrinting]     = useState(false);
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null);

  const [recent,        setRecent]        = useState<BiltySummary[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [cancelId,      setCancelId]      = useState<string | null>(null);
  const [cancelReason,  setCancelReason]  = useState('');
  const [cancelling,    setCancelling]    = useState(false);
  const [recentPage,    setRecentPage]    = useState(0);
  const [hasMorePages,  setHasMorePages]  = useState(true);


  // Shared helper: apply book_defaults to form (call AFTER cities/transports are loaded)
  function applyBookDefaults(book: Book | null) {
    if (!book) return;
    const bd = book.book_defaults ?? {};
    setForm(f => ({
      ...f,
      ...(bd.delivery_type ? { delivery_type:  bd.delivery_type as BiltyForm['delivery_type'] }  : {}),
      ...(bd.payment_mode  ? { payment_mode:   bd.payment_mode  as BiltyForm['payment_mode']  }  : {}),
      ...(bd.from_city_id  ? { from_city_id:   bd.from_city_id  }            : {}),
      ...(bd.to_city_id    ? { to_city_id:     bd.to_city_id    }            : {}),
      ...(bd.transport_id  ? { transport_id:   bd.transport_id  }            : {}),
      ...(bd.bill_charge   ? { bill_charge:    String(bd.bill_charge)  }     : {}),
      ...(bd.toll_charge   ? { toll_charge:    String(bd.toll_charge)  }     : {}),
    }));
  }

  useEffect(() => {
    if (!getUser()) { router.replace('/auth/login'); return; }
    async function load() {
      setDropLoading(true);
      try {
        // 1. Fetch all in parallel
        const [primaryBookRes, primaryTplRes, crRes, ceRes, cityRes, tpRes, discRes, ctRes] = await Promise.all([
          apiFetch(`/v1/bilty-setting/books/primary?bilty_type=REGULAR`),
          apiFetch(`/v1/bilty-setting/templates/primary`),
          apiFetch(`/v1/bilty-setting/consignors?is_active=true`),
          apiFetch(`/v1/bilty-setting/consignees?is_active=true`),
          apiFetch(`/v1/master/cities?is_active=true`),
          apiFetch(`/v1/master/transports?is_active=true`),
          apiFetch(`/v1/bilty-setting/discounts?is_active=true`),
          apiFetch(`/v1/master/city-transports`),
        ]);

        // 2. Parse all JSON in parallel so state sets batch together
        const jsons = await Promise.all([
          (primaryBookRes.ok || primaryBookRes.status === 404) ? primaryBookRes.json().catch(() => null) : Promise.resolve(null),
          primaryTplRes.ok  ? primaryTplRes.json().catch(() => null)  : Promise.resolve(null),
          crRes.ok          ? crRes.json().catch(() => null)           : Promise.resolve(null),
          ceRes.ok          ? ceRes.json().catch(() => null)           : Promise.resolve(null),
          cityRes.ok        ? cityRes.json().catch(() => null)         : Promise.resolve(null),
          tpRes.ok          ? tpRes.json().catch(() => null)           : Promise.resolve(null),
          discRes.ok        ? discRes.json().catch(() => null)         : Promise.resolve(null),
          ctRes.ok          ? ctRes.json().catch(() => null)           : Promise.resolve(null),
        ]);
        const [bookData, tplData, crData, ceData, cityData, tpData, discData, ctData] = jsons;

        // 3. Set all reference data first (so city/transport lookups work in applyBookDefaults)
        const cityList: City[]      = cityData?.cities      ?? cityData      ?? [];
        const tpList:   Transport[] = tpData?.transports    ?? tpData        ?? [];
        setCities(cityList);
        setTransports(tpList);
        setConsignors(crData?.consignors ?? crData ?? []);
        setConsignees(ceData?.consignees ?? ceData ?? []);
        setDiscounts(discData?.discounts  ?? discData  ?? []);
        if (tplData) setPrimaryTemplate(tplData?.template ?? tplData);

        // city-transport map: city_id → transport_id (first match)
        const ctLinks: { city_id: string; transport_id: string }[] =
          ctData?.city_transports ?? ctData?.links ?? [];
        const ctMap: Record<string, string> = {};
        ctLinks.forEach(l => { if (!ctMap[l.city_id]) ctMap[l.city_id] = l.transport_id; });
        setCityTransportMap(ctMap);

        // 4. Apply primary book + defaults AFTER lists are ready
        if (primaryBookRes.status === 404) {
          setNoPrimaryBook(true);
        } else if (bookData) {
          const book: Book = bookData?.book ?? bookData;
          setPrimaryBook(book);
          applyBookDefaults(book);
        }
      } finally { setDropLoading(false); }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (form.bilty_type !== 'REGULAR' || !primaryBook) { setGrPreview(''); return; }
    setGrPreview(
      (primaryBook.prefix ?? '') +
      String(primaryBook.current_number).padStart(primaryBook.digits, '0') +
      (primaryBook.postfix ?? '')
    );
  }, [form.bilty_type, primaryBook]);

  useEffect(() => {
    const sum = [
      form.freight_amount, form.labour_charge, form.bill_charge,
      form.toll_charge, form.dd_charge, form.pf_charge, form.local_charge, form.other_charge,
    ].reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
    if (sum > 0) setForm(f => ({ ...f, total_amount: sum.toFixed(2) }));
  }, [form.freight_amount, form.labour_charge, form.bill_charge, form.toll_charge, form.dd_charge, form.pf_charge, form.local_charge, form.other_charge]);

  useEffect(() => {
    const w = parseFloat(form.weight) || 0;
    const r = parseFloat(form.rate) || 0;
    if (w > 0 && r > 0) setForm(f => ({ ...f, freight_amount: (w * r).toFixed(2) }));
  }, [form.weight, form.rate]);

  const loadRecent = useCallback(async (page = 0) => {
    setRecentLoading(true);
    try {
      const res = await apiFetch(`/v1/bilty?limit=${LIMIT}&offset=${page * LIMIT}`);
      if (res.ok) {
        const d = await res.json();
        const list: BiltySummary[] = d.bilties ?? d ?? [];
        setRecent(prev => page === 0 ? list : [...prev, ...list]);
        setHasMorePages((d.count ?? list.length) >= LIMIT);
        setRecentPage(page);
      }
    } finally { setRecentLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load recent on mount so search bar is populated immediately
  useEffect(() => { loadRecent(0); }, [loadRecent]);

  function sf(key: keyof BiltyForm, val: string) {
    setForm(p => ({ ...p, [key]: val }));
  }

  function selectConsignor(id: string) {
    const c = consignors.find(x => (x.consignor_id ?? x.id) === id);
    setForm(p => ({ ...p, consignor_id: id, consignor_name: c?.consignor_name ?? '', consignor_gstin: c?.gstin ?? '', consignor_mobile: c?.mobile ?? '' }));
  }

  function selectConsignee(id: string) {
    const c = consignees.find(x => (x.consignee_id ?? x.id) === id);
    setForm(p => ({ ...p, consignee_id: id, consignee_name: c?.consignee_name ?? '', consignee_gstin: c?.gstin ?? '', consignee_mobile: c?.mobile ?? '' }));
  }

  function selectTransport(id: string) {
    const t = transports.find(x => x.transport_id === id);
    setForm(p => ({ ...p, transport_id: id, transport_name: t?.transport_name ?? '', transport_gstin: t?.gstin ?? '', transport_mobile: t?.mobile ?? '' }));
  }

  function handleToCitySelect(cityId: string) {
    const tpId = cityTransportMap[cityId];
    if (tpId) selectTransport(tpId);
  }

  function resetForm() {
    const base = { ...BLANK, bilty_date: new Date().toISOString().split('T')[0] };
    const bd = primaryBook?.book_defaults ?? {};
    setForm({
      ...base,
      ...(bd.delivery_type ? { delivery_type: bd.delivery_type as BiltyForm['delivery_type'] }  : {}),
      ...(bd.payment_mode  ? { payment_mode:  bd.payment_mode  as BiltyForm['payment_mode']  }  : {}),
      ...(bd.from_city_id  ? { from_city_id:  bd.from_city_id  }         : {}),
      ...(bd.to_city_id    ? { to_city_id:    bd.to_city_id    }         : {}),
      ...(bd.transport_id  ? { transport_id:  bd.transport_id  }         : {}),
      ...(bd.bill_charge   ? { bill_charge:   String(bd.bill_charge) }   : {}),
      ...(bd.toll_charge   ? { toll_charge:   String(bd.toll_charge) }   : {}),
    });
    setEwbNumbers(['']);
    setEditBiltyId(null); setSavedJson(null); setSaveError('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(''); setSaving(true); setSavedJson(null);

    try {
      const body: Record<string, unknown> = {
        bilty_type:     'REGULAR',
        bilty_date:     form.bilty_date || new Date().toISOString().split('T')[0],
        consignor_name: form.consignor_name,
        consignee_name: form.consignee_name,
        payment_mode:   form.payment_mode,
        delivery_type:  form.delivery_type,
        saving_option:  form.saving_option || 'SAVE',
        status:         'SAVED',
      };
      if (form.consignor_id)     body.consignor_id      = form.consignor_id;
      if (form.consignor_gstin)  body.consignor_gstin   = form.consignor_gstin;
      if (form.consignor_mobile) body.consignor_mobile  = form.consignor_mobile;
      if (form.consignee_id)     body.consignee_id      = form.consignee_id;
      if (form.consignee_gstin)  body.consignee_gstin   = form.consignee_gstin;
      if (form.consignee_mobile) body.consignee_mobile  = form.consignee_mobile;
      if (form.transport_id)     body.transport_id      = form.transport_id;
      if (form.transport_name)   body.transport_name    = form.transport_name;
      if (form.transport_gstin)  body.transport_gstin   = form.transport_gstin;
      if (form.transport_mobile) body.transport_mobile  = form.transport_mobile;
      if (form.from_city_id)     body.from_city_id      = form.from_city_id;
      if (form.to_city_id)       body.to_city_id        = form.to_city_id;
      if (form.contain)          body.contain           = form.contain;
      if (form.invoice_no)       body.invoice_no        = form.invoice_no;
      if (form.invoice_value)    body.invoice_value     = parseFloat(form.invoice_value);
      if (form.invoice_date)     body.invoice_date      = form.invoice_date;
      if (form.document_number)  body.document_number   = form.document_number;
      if (form.pvt_marks)        body.pvt_marks         = form.pvt_marks;
      const validEwbs = ewbNumbers.filter(n => n.trim());
      if (validEwbs.length > 0)  body.e_way_bills = validEwbs.map(ewb_no => ({ ewb_no }));
      if (form.no_of_pkg)        body.no_of_pkg         = parseInt(form.no_of_pkg);
      if (form.weight)           body.weight            = parseFloat(form.weight);
      if (form.actual_weight)    body.actual_weight     = parseFloat(form.actual_weight);
      if (form.rate)             body.rate              = parseFloat(form.rate);
      if (form.freight_amount)   body.freight_amount    = parseFloat(form.freight_amount);
      if (form.labour_charge)    body.labour_charge     = parseFloat(form.labour_charge);
      if (form.bill_charge)      body.bill_charge       = parseFloat(form.bill_charge);
      if (form.toll_charge)      body.toll_charge       = parseFloat(form.toll_charge);
      if (form.dd_charge)        body.dd_charge         = parseFloat(form.dd_charge);
      if (form.pf_charge)        body.pf_charge         = parseFloat(form.pf_charge);
      if (form.local_charge)     body.local_charge      = parseFloat(form.local_charge);
      if (form.other_charge)     body.other_charge      = parseFloat(form.other_charge);
      if (form.total_amount)     body.total_amount      = parseFloat(form.total_amount);
      if (form.discount_id)      body.discount_id       = form.discount_id;
      if (form.remark)           body.remark            = form.remark;

      const path   = editBiltyId ? `/v1/bilty/${editBiltyId}` : `/v1/bilty`;
      const method = editBiltyId ? 'PATCH' : 'POST';

      const res = await apiFetch(path, {
        method,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(
          Array.isArray(data.detail)
            ? data.detail.map((d: { msg: string }) => d.msg).join('. ')
            : (data.detail ?? 'Failed to save bilty.')
        );
        return;
      }

      setSavedJson(data);
      const biltyId: string = data.bilty?.bilty_id ?? data.bilty_id ?? '';
      const wasRegularNew = !editBiltyId;

      setEditBiltyId(null);
      loadRecent(0);

      if (biltyId && form.saving_option !== 'DRAFT') {
        await printBilty(biltyId);
      }
      resetForm();
      // Step 3: re-fetch primary book to get updated current_number → new GR preview
      if (wasRegularNew) {
        await refreshPrimaryBook();
      }
    } catch (err) {
      setSaveError('Unable to reach the server.');
      console.error(err);
    } finally { setSaving(false); }
  }

  async function loadForEdit(bilty_id: string) {
    const res = await apiFetch(`/v1/bilty/${bilty_id}`);
    if (!res.ok) return;
    const raw = await res.json();
    const b = raw.bilty ?? raw;
    setForm({
      bilty_type:       b.bilty_type ?? 'REGULAR',
      gr_no:            b.gr_no ?? '',
      bilty_date:       b.bilty_date ?? '',
      consignor_id:     b.consignor_id ?? '',
      consignor_name:   b.consignor_name ?? '',
      consignor_gstin:  b.consignor_gstin ?? '',
      consignor_mobile: b.consignor_mobile ?? '',
      consignee_id:     b.consignee_id ?? '',
      consignee_name:   b.consignee_name ?? '',
      consignee_gstin:  b.consignee_gstin ?? '',
      consignee_mobile: b.consignee_mobile ?? '',
      transport_id:     b.transport_id ?? '',
      transport_name:   b.transport_name ?? '',
      transport_gstin:  b.transport_gstin ?? '',
      transport_mobile: b.transport_mobile ?? '',
      from_city_id:     b.from_city_id ?? '',
      to_city_id:       b.to_city_id ?? '',
      delivery_type:    b.delivery_type ?? 'DOOR',
      payment_mode:     b.payment_mode ?? 'PAID',
      contain:          b.contain ?? '',
      invoice_no:       b.invoice_no ?? '',
      invoice_value:    b.invoice_value != null ? String(b.invoice_value) : '',
      invoice_date:     b.invoice_date ?? '',
      document_number:  b.document_number ?? '',
      pvt_marks:        b.pvt_marks ?? '',
      no_of_pkg:        b.no_of_pkg != null ? String(b.no_of_pkg) : '',
      weight:           b.weight != null ? String(b.weight) : '',
      actual_weight:    b.actual_weight != null ? String(b.actual_weight) : '',
      labour_rate:      b.labour_rate != null ? String(b.labour_rate) : '',
      rate:             b.rate != null ? String(b.rate) : '',
      freight_amount:   b.freight_amount != null ? String(b.freight_amount) : '',
      labour_charge:    b.labour_charge != null ? String(b.labour_charge) : '',
      bill_charge:      b.bill_charge != null ? String(b.bill_charge) : '',
      toll_charge:      b.toll_charge != null ? String(b.toll_charge) : '',
      dd_charge:        b.dd_charge != null ? String(b.dd_charge) : '',
      pf_charge:        b.pf_charge != null ? String(b.pf_charge) : '',
      local_charge:     b.local_charge != null ? String(b.local_charge) : '',
      other_charge:     b.other_charge != null ? String(b.other_charge) : '',
      total_amount:     b.total_amount != null ? String(b.total_amount) : '',
      saving_option:    'SAVE',
      remark:           b.remark ?? '',
      discount_id:      b.discount_id ?? '',
    });
    // Restore EWB numbers from the bilty
    const ewbs: string[] = (b.e_way_bills ?? []).map((e: { ewb_no: string }) => e.ewb_no).filter(Boolean);
    setEwbNumbers(ewbs.length > 0 ? ewbs : ['']);
    setEditBiltyId(bilty_id);
    setSavedJson(null); setSaveError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleCancel() {
    if (!cancelId || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      const res = await apiFetch(`/v1/bilty/${cancelId}`, {
        method: 'DELETE',
        body: JSON.stringify({ deletion_reason: cancelReason.trim() }),
      });
      if (res.ok) { setCancelId(null); setCancelReason(''); loadRecent(0); }
    } finally { setCancelling(false); }
  }

  async function printBilty(biltyId: string) {
    setPrinting(true);
    try {
      // 1. Fetch full bilty
      const res = await apiFetch(`/v1/bilty/${biltyId}`);
      if (!res.ok) return;
      const raw = await res.json();
      const b: BiltyData = raw.bilty ?? raw;

      // 2. Use the primaryTemplate already in state (loaded at screen open).
      //    Re-fetch it fresh in case metadata changed.
      let tpl = primaryTemplate;
      if (!tpl) {
        const tr = await apiFetch(`/v1/bilty-setting/templates/primary`);
        if (tr.ok) tpl = (await tr.json()).template ?? (await tr.json());
      }

      // 3. Pick renderer by slug — falls back to first-a4-template
      let blobUrl: string;
      const slug = tpl?.slug ?? '';
      if (slug === 'second-a4-template') {
        blobUrl = generateSecondA4(b, tpl!);
      } else {
        // default / first-a4-template
        blobUrl = generateFirstA4(b, tpl ?? { template_id: '', code: '', name: '', slug: '', metadata: null, is_primary: false, is_active: true });
      }

      setPreviewUrl(blobUrl);
    } catch (err) {
      console.error('Print error', err);
    } finally { setPrinting(false); }
  }

  async function refreshPrimaryBook() {
    try {
      const res = await apiFetch(`/v1/bilty-setting/books/primary?bilty_type=REGULAR`);
      if (res.ok) {
        const raw = await res.json();
        setPrimaryBook(raw.book ?? raw);
        setNoPrimaryBook(false);
      }
    } catch { /* silent */ }
  }

  return (
    <div>
      {previewUrl && <PdfPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}

      {/* ── Header ── */}
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Bilty</h1>
          <p className="text-xs text-slate-500">
            {editBiltyId ? 'Editing existing bilty — make changes and update.' : 'Create new GR / LR entries for the primary bill book.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {editBiltyId && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editing #{form.gr_no}
              <button type="button" onClick={resetForm} className="ml-1 text-amber-500 hover:text-amber-700 text-xs underline">
                Cancel edit
              </button>
            </span>
          )}
          {/* Search existing bilties */}
          <BiltySearchBar recent={recent} loading={recentLoading} onSelect={id => loadForEdit(id)} />
        </div>
      </div>

      {/* ── Form ── */}
      {dropLoading ? (
        <div className="py-20 text-center text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
        <form onSubmit={handleSave} className="space-y-2">
          <SectionGrBook
            form={form} primaryBook={primaryBook} noPrimaryBook={noPrimaryBook}
            grPreview={grPreview} editBiltyId={editBiltyId} sf={sf} cities={cities}
          />
          <SectionRouteTransport form={form} cities={cities} transports={transports} sf={sf} selectTransport={selectTransport} onToCitySelect={handleToCitySelect} />
          <SectionConsignor form={form} consignors={consignors} sf={sf} selectConsignor={selectConsignor} />
          <SectionConsignee form={form} consignees={consignees} sf={sf} selectConsignee={selectConsignee} />
          <SectionShipment form={form} sf={sf} />
          <SectionInvoice form={form} sf={sf} />
          <SectionEwb ewbNumbers={ewbNumbers} setEwbNumbers={setEwbNumbers} />
          <SectionCharges form={form} sf={sf} />
          <SectionFormActions
            form={form} saving={saving} editBiltyId={editBiltyId}
            saveError={saveError} savedJson={savedJson}
            sf={sf} onReset={resetForm} onDismiss={() => setSavedJson(null)}
          />
        </form>
        </div>
      )}
    </div>
  );
}
