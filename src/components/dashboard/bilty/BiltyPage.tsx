'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch }           from '@/lib/api';
import { generateFirstA4 }    from './templates/first-a4-template';
import { generateSecondA4 }   from './templates/second-a4-template';
import { generateThirdA4 }    from './templates/third-a4-template';
import type { BiltyData }     from './templates/first-a4-template';
import { useOfflineSync }     from '@/hooks/useOfflineSync';
import { useBiltyMasterData } from '@/hooks/useBiltyMasterData';
import { useBiltyRecent }     from '@/hooks/useBiltyRecent';
import {
  queueOfflineBilty,
  updatePendingBilty,
  getPendingBiltyByLocalId,
  pendingToBiltyData,
} from '@/lib/offlineBiltyService';
import {
  cacheBiltyDetail,
  loadCachedBiltyDetail,
} from '@/lib/biltyCache';
import { loadMasterCache, CACHE_KEYS } from '@/lib/masterDataCache';
import { OfflineBanner } from '@/components/common/OfflineBanner';

import {
  BLANK, BiltyForm,
  Book, City, PrimaryTemplate,
} from './types';
import { PdfPreviewModal, focusNextFormElement } from './ui';
import BiltySearchBar        from './ui/BiltySearchBar';
import EwbValidateModal       from './ui/EwbValidateModal';
import SectionGrBook         from './sections/SectionGrBook';
import SectionConsignor      from './sections/SectionConsignor';
import SectionConsignee      from './sections/SectionConsignee';
import SectionRouteTransport from './sections/SectionRouteTransport';
import SectionShipment       from './sections/SectionShipment';
import SectionInvoice        from './sections/SectionInvoice';
import SectionEwb            from './sections/SectionEwb';
import SectionCharges        from './sections/SectionCharges';
import SectionDiscount       from './sections/SectionDiscount';
import SectionRemark         from './sections/SectionRemark';
import SectionFormActions    from './sections/SectionFormActions';

// ─────────────────────────────────────────────────────────────────────────────

export default function BiltyPage() {
  // ── Master data + dropdowns (cache-first, offline-safe) ──────────────────
  const editBiltyIdRef = useRef<string | null>(null);

  const {
    primaryBook, primaryTemplate, noPrimaryBook,
    consignors, consignees, cities, transports, discounts, cityTransportMap,
    dropLoading, refreshPrimaryBook,
  } = useBiltyMasterData({ onBookLoaded: (book) => { if (!editBiltyIdRef.current) applyBookDefaults(book); } });

  // ── Recent bilties (cache-first, offline-safe) ────────────────────────────
  const { recent, recentLoading, recentPage, hasMorePages, loadRecent } = useBiltyRecent();

  // ── Offline sync ──────────────────────────────────────────────────────────
  const { pendingCount, syncing, refreshPendingCount } = useOfflineSync({
    onSynced: () => {
      loadRecent(0);
      // Refresh the book so the GR number shown reflects all newly-synced bilties
      refreshPrimaryBook();
    },
  });

  // ── Form state ────────────────────────────────────────────────────────────
  const [form,       setForm]       = useState<BiltyForm>({ ...BLANK, bilty_date: new Date().toISOString().split('T')[0] });
  const [ewbNumbers, setEwbNumbers] = useState<string[]>(['']);
  const [grPreview,  setGrPreview]  = useState('');
  const [editBiltyId, setEditBiltyId] = useState<string | null>(null);

  // ── Action state ──────────────────────────────────────────────────────────
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedJson, setSavedJson] = useState<object | null>(null);
  const [printing,  setPrinting]  = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // ── EWB validate ──────────────────────────────────────────────────────────
  const [showEwbValidate, setShowEwbValidate] = useState(false);

  // ── Cancel state ──────────────────────────────────────────────────────────
  const [cancelId,     setCancelId]     = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling,   setCancelling]   = useState(false);

  useEffect(() => { editBiltyIdRef.current = editBiltyId; }, [editBiltyId]);

  // ── GR preview ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (form.bilty_type !== 'REGULAR' || !primaryBook) { setGrPreview(''); return; }
    setGrPreview(
      (primaryBook.prefix ?? '') +
      String(primaryBook.current_number).padStart(primaryBook.digits, '0') +
      (primaryBook.postfix ?? '')
    );
  }, [form.bilty_type, primaryBook]);

  // ── Auto-total charges ────────────────────────────────────────────────────
  useEffect(() => {
    const sum = [
      form.freight_amount, form.labour_charge, form.bill_charge,
      form.toll_charge, form.dd_charge, form.pf_charge, form.local_charge, form.other_charge,
    ].reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
    if (sum > 0) setForm(f => ({ ...f, total_amount: sum.toFixed(2) }));
  }, [form.freight_amount, form.labour_charge, form.bill_charge, form.toll_charge, form.dd_charge, form.pf_charge, form.local_charge, form.other_charge]);

  // ── Auto-freight from weight x rate ──────────────────────────────────────
  useEffect(() => {
    const w = parseFloat(form.weight) || 0;
    const r = parseFloat(form.rate)   || 0;
    if (w > 0 && r > 0) setForm(f => ({ ...f, freight_amount: (w * r).toFixed(2) }));
  }, [form.weight, form.rate]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function sf(key: keyof BiltyForm, val: string) {
    setForm(p => ({ ...p, [key]: val }));
  }

  function applyBookDefaults(book: Book | null) {
    if (!book) return;
    const bd = book.book_defaults ?? {};
    setForm(f => ({
      ...f,
      ...(bd.delivery_type ? { delivery_type: bd.delivery_type as BiltyForm['delivery_type'] } : {}),
      ...(bd.payment_mode  ? { payment_mode:  bd.payment_mode  as BiltyForm['payment_mode']  } : {}),
      ...(bd.from_city_id  ? { from_city_id:  bd.from_city_id  } : {}),
      ...(bd.to_city_id    ? { to_city_id:    bd.to_city_id    } : {}),
      ...(bd.transport_id  ? { transport_id:  bd.transport_id  } : {}),
      ...(bd.bill_charge   ? { bill_charge:   String(bd.bill_charge)  } : {}),
      ...(bd.toll_charge   ? { toll_charge:   String(bd.toll_charge)  } : {}),
    }));
  }

  function resetForm() {
    const bd = primaryBook?.book_defaults ?? {};
    setForm({
      ...BLANK,
      bilty_date: new Date().toISOString().split('T')[0],
      ...(bd.delivery_type ? { delivery_type: bd.delivery_type as BiltyForm['delivery_type'] } : {}),
      ...(bd.payment_mode  ? { payment_mode:  bd.payment_mode  as BiltyForm['payment_mode']  } : {}),
      ...(bd.from_city_id  ? { from_city_id:  bd.from_city_id  } : {}),
      ...(bd.to_city_id    ? { to_city_id:    bd.to_city_id    } : {}),
      ...(bd.transport_id  ? { transport_id:  bd.transport_id  } : {}),
      ...(bd.bill_charge   ? { bill_charge:   String(bd.bill_charge)  } : {}),
      ...(bd.toll_charge   ? { toll_charge:   String(bd.toll_charge)  } : {}),
    });
    setEwbNumbers(['']);
    setEditBiltyId(null); setSavedJson(null); setSaveError('');
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
    const entries = cityTransportMap[cityId];
    if (entries && entries.length > 0) {
      const first = entries[0];
      selectTransport(first.transport_id);
      // Use branch_mobile from city-transport link if master transport has no mobile
      if (first.mobile) setForm(p => ({ ...p, transport_mobile: first.mobile! }));
    }
  }

  // ── Print (offline-safe) ──────────────────────────────────────────────────

  async function printBilty(biltyId: string) {
    setPrinting(true);
    try {
      let b: BiltyData | null = null;

      if (biltyId.startsWith('offline:')) {
        // Build BiltyData from IndexedDB pending record
        const localId = parseInt(biltyId.split(':')[1], 10);
        const pending = await getPendingBiltyByLocalId(localId);
        if (!pending) { setSaveError('Bilty not found in offline queue.'); return; }
        const cityMap: Record<string, string> = {};
        cities.forEach((c: City) => { cityMap[c.city_id] = c.city_name; });
        b = pendingToBiltyData(pending, cityMap);
      } else if (navigator.onLine) {
        // Fetch fresh and cache for future offline use
        const res = await apiFetch(`/v1/bilty/${biltyId}`);
        if (res.ok) {
          const raw = await res.json();
          b = raw.bilty ?? raw;
          cacheBiltyDetail(biltyId, b!).catch(() => {});
        }
      }

      // Fallback to previously cached detail
      if (!b) b = await loadCachedBiltyDetail(biltyId);

      if (!b) {
        setSaveError('Cannot load bilty for printing — open it online first to cache it.');
        return;
      }

      // Resolve city names from local master if API only returned IDs
      if (b.from_city_id && !b.from_city_name) {
        const cityObj = cities.find((c: City) => c.city_id === b!.from_city_id);
        if (cityObj) b = { ...b, from_city_name: cityObj.city_name };
      }
      if (b.to_city_id && !b.to_city_name) {
        const cityObj = cities.find((c: City) => c.city_id === b!.to_city_id);
        if (cityObj) b = { ...b, to_city_name: cityObj.city_name };
      }

      // Resolve template: state -> IDB cache -> API
      let tpl: PrimaryTemplate | null = primaryTemplate;
      if (!tpl) tpl = await loadMasterCache<PrimaryTemplate>(CACHE_KEYS.PRIMARY_TPL);
      if (!tpl && navigator.onLine) {
        const tr = await apiFetch('/v1/bilty-setting/templates/primary');
        if (tr.ok) { const d = await tr.json(); tpl = d.template ?? d; }
      }

      const emptyTpl: PrimaryTemplate = { template_id: '', code: '', name: '', slug: '', metadata: null, is_primary: false, is_active: true };
      const slug    = tpl?.slug ?? '';
      const blobUrl = slug === 'second-a4-template'
        ? generateSecondA4(b, tpl!)
        : slug === 'third-a4-template'
          ? await generateThirdA4(b, tpl!)
          : generateFirstA4(b, tpl ?? emptyTpl);

      setPreviewUrl(blobUrl);
    } catch (err) {
      console.error('Print error', err);
    } finally { setPrinting(false); }
  }

  // ── Load for edit (offline-safe) ──────────────────────────────────────────

  async function loadForEdit(bilty_id: string) {
    // Offline-pending bilty
    if (bilty_id.startsWith('offline:')) {
      const localId = parseInt(bilty_id.split(':')[1], 10);
      const p = await getPendingBiltyByLocalId(localId);
      if (!p) return;
      setForm({
        bilty_type:       p.bilty_type       as BiltyForm['bilty_type'],
        gr_no:            p.gr_no_provisional,
        bilty_date:       p.bilty_date,
        consignor_id:     p.consignor_id     ?? '',
        consignor_name:   p.consignor_name,
        consignor_gstin:  p.consignor_gstin  ?? '',
        consignor_mobile: p.consignor_mobile ?? '',
        consignee_id:     p.consignee_id     ?? '',
        consignee_name:   p.consignee_name,
        consignee_gstin:  p.consignee_gstin  ?? '',
        consignee_mobile: p.consignee_mobile ?? '',
        transport_id:     p.transport_id     ?? '',
        transport_name:   p.transport_name   ?? '',
        transport_gstin:  p.transport_gstin  ?? '',
        transport_mobile: p.transport_mobile ?? '',
        from_city_id:     p.from_city_id     ?? '',
        to_city_id:       p.to_city_id       ?? '',
        delivery_type:    p.delivery_type    as BiltyForm['delivery_type'],
        payment_mode:     p.payment_mode     as BiltyForm['payment_mode'],
        contain:          p.contain          ?? '',
        invoice_no:       p.invoice_no       ?? '',
        invoice_value:    p.invoice_value    != null ? String(p.invoice_value)    : '',
        invoice_date:     p.invoice_date     ?? '',
        document_number:  p.document_number  ?? '',
        pvt_marks:        p.pvt_marks        ?? '',
        no_of_pkg:        p.no_of_pkg        != null ? String(p.no_of_pkg)        : '',
        weight:           p.weight           != null ? String(p.weight)           : '',
        actual_weight:    p.actual_weight    != null ? String(p.actual_weight)    : '',
        labour_rate:      '',
        rate:             p.rate             != null ? String(p.rate)             : '',
        freight_amount:   p.freight_amount   != null ? String(p.freight_amount)   : '',
        labour_charge:    p.labour_charge    != null ? String(p.labour_charge)    : '',
        bill_charge:      p.bill_charge      != null ? String(p.bill_charge)      : '',
        toll_charge:      p.toll_charge      != null ? String(p.toll_charge)      : '',
        dd_charge:        p.dd_charge        != null ? String(p.dd_charge)        : '',
        pf_charge:        p.pf_charge        != null ? String(p.pf_charge)        : '',
        local_charge:     p.local_charge     != null ? String(p.local_charge)     : '',
        other_charge:     p.other_charge     != null ? String(p.other_charge)     : '',
        total_amount:     p.total_amount     != null ? String(p.total_amount)     : '',
        saving_option:    'SAVE',
        remark:           p.remark           ?? '',
        discount_id:      p.discount_id      ?? '',
      });
      const ewbs = (p.e_way_bills ?? []).map(e => e.ewb_no).filter(Boolean);
      setEwbNumbers(ewbs.length > 0 ? ewbs : ['']);
      setEditBiltyId(bilty_id);
      setSavedJson(null); setSaveError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Server bilty: try API first, fall through to IDB cache on any error
    let raw: Record<string, unknown> | null = null;
    if (navigator.onLine) {
      try {
        const res = await apiFetch(`/v1/bilty/${bilty_id}`);
        if (res.ok) {
          raw = await res.json();
          cacheBiltyDetail(bilty_id, (raw!.bilty ?? raw) as BiltyData).catch(() => {});
        }
      } catch { /* network error — fall through to IDB cache */ }
    }
    if (!raw) {
      const cached = await loadCachedBiltyDetail(bilty_id);
      if (cached) raw = { bilty: cached };
    }
    if (!raw) { setSaveError('Bilty not available offline — open it online first.'); return; }

    const b = (raw.bilty ?? raw) as Record<string, unknown>;
    setForm({
      bilty_type:       ((b.bilty_type as string) ?? 'REGULAR') as BiltyForm['bilty_type'],
      gr_no:            (b.gr_no            as string) ?? '',
      bilty_date:       (b.bilty_date       as string) ?? '',
      consignor_id:     (b.consignor_id     as string) ?? '',
      consignor_name:   (b.consignor_name   as string) ?? '',
      consignor_gstin:  (b.consignor_gstin  as string) ?? '',
      consignor_mobile: (b.consignor_mobile as string) ?? '',
      consignee_id:     (b.consignee_id     as string) ?? '',
      consignee_name:   (b.consignee_name   as string) ?? '',
      consignee_gstin:  (b.consignee_gstin  as string) ?? '',
      consignee_mobile: (b.consignee_mobile as string) ?? '',
      transport_id:     (b.transport_id     as string) ?? '',
      transport_name:   (b.transport_name   as string) ?? '',
      transport_gstin:  (b.transport_gstin  as string) ?? '',
      transport_mobile: (b.transport_mobile as string) ?? '',
      from_city_id:     (b.from_city_id     as string) ?? '',
      to_city_id:       (b.to_city_id       as string) ?? '',
      delivery_type:    (b.delivery_type    as BiltyForm['delivery_type'])  ?? 'DOOR',
      payment_mode:     (b.payment_mode     as BiltyForm['payment_mode'])   ?? 'PAID',
      contain:          (b.contain          as string) ?? '',
      invoice_no:       (b.invoice_no       as string) ?? '',
      invoice_value:    b.invoice_value    != null ? String(b.invoice_value)    : '',
      invoice_date:     (b.invoice_date     as string) ?? '',
      document_number:  (b.document_number  as string) ?? '',
      pvt_marks:        (b.pvt_marks        as string) ?? '',
      no_of_pkg:        b.no_of_pkg         != null ? String(b.no_of_pkg)         : '',
      weight:           b.weight            != null ? String(b.weight)            : '',
      actual_weight:    b.actual_weight     != null ? String(b.actual_weight)     : '',
      labour_rate:      b.labour_rate       != null ? String(b.labour_rate)       : '',
      rate:             b.rate              != null ? String(b.rate)              : '',
      freight_amount:   b.freight_amount    != null ? String(b.freight_amount)    : '',
      labour_charge:    b.labour_charge     != null ? String(b.labour_charge)     : '',
      bill_charge:      b.bill_charge       != null ? String(b.bill_charge)       : '',
      toll_charge:      b.toll_charge       != null ? String(b.toll_charge)       : '',
      dd_charge:        b.dd_charge         != null ? String(b.dd_charge)         : '',
      pf_charge:        b.pf_charge         != null ? String(b.pf_charge)         : '',
      local_charge:     b.local_charge      != null ? String(b.local_charge)      : '',
      other_charge:     b.other_charge      != null ? String(b.other_charge)      : '',
      total_amount:     b.total_amount      != null ? String(b.total_amount)      : '',
      saving_option:    'SAVE',
      remark:           (b.remark           as string) ?? '',
      discount_id:      (b.discount_id      as string) ?? '',
    });
    const ewbs: string[] = ((b.e_way_bills as { ewb_no: string }[] | undefined) ?? []).map(e => e.ewb_no).filter(Boolean);
    setEwbNumbers(ewbs.length > 0 ? ewbs : ['']);
    setEditBiltyId(bilty_id);
    setSavedJson(null); setSaveError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(''); setSaving(true); setSavedJson(null);

    try {
      const validEwbs = ewbNumbers.filter(n => n.trim());

      // Auto-create new consignor if no ID but name provided (online only)
      let consignorId = form.consignor_id;
      if (!consignorId && form.consignor_name.trim() && navigator.onLine) {
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
            consignorId = cd.consignor?.consignor_id ?? cd.consignor_id ?? '';
          }
        } catch { /* non-fatal — bilty saves without ID */ }
      }

      // Auto-create new consignee if no ID but name provided (online only)
      let consigneeId = form.consignee_id;
      if (!consigneeId && form.consignee_name.trim() && navigator.onLine) {
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
            consigneeId = cd.consignee?.consignee_id ?? cd.consignee_id ?? '';
          }
        } catch { /* non-fatal */ }
      }

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
      if (consignorId)           body.consignor_id      = consignorId;
      if (form.consignor_gstin)  body.consignor_gstin   = form.consignor_gstin;
      if (form.consignor_mobile) body.consignor_mobile  = form.consignor_mobile;
      if (consigneeId)           body.consignee_id      = consigneeId;
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
      if (validEwbs.length > 0)  body.e_way_bills       = validEwbs.map(ewb_no => ({ ewb_no }));
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

      // Offline path
      if (!navigator.onLine) {
        if (editBiltyId?.startsWith('offline:')) {
          const localId = parseInt(editBiltyId.split(':')[1], 10);
          await updatePendingBilty(localId, {
            ...(body as Record<string, unknown>),
            e_way_bills: validEwbs.map(ewb_no => ({ ewb_no })),
          });
          setSavedJson({ offline: true, gr_no_provisional: form.gr_no });
        } else if (!editBiltyId) {
          const { gr_no_provisional } = await queueOfflineBilty(body, ewbNumbers);
          setSavedJson({ offline: true, gr_no_provisional });
        } else {
          setSaveError('Cannot edit a synced bilty while offline.');
          return;
        }
        setSaveError('');
        resetForm();
        await loadRecent(0);
        await refreshPendingCount();
        return;
      }

      // Online path
      const isOfflineEdit = editBiltyId?.startsWith('offline:');
      const path   = editBiltyId && !isOfflineEdit ? `/v1/bilty/${editBiltyId}` : '/v1/bilty';
      const method = editBiltyId && !isOfflineEdit ? 'PATCH' : 'POST';

      const res  = await apiFetch(path, { method, body: JSON.stringify(body) });
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
      const wasNew = !editBiltyId || isOfflineEdit;

      setEditBiltyId(null);
      loadRecent(0);
      refreshPendingCount();

      if (biltyId && form.saving_option !== 'DRAFT') await printBilty(biltyId);
      resetForm();
      if (wasNew) await refreshPrimaryBook();
    } catch (err) {
      setSaveError('Unable to reach the server.');
      console.error(err);
    } finally { setSaving(false); }
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {previewUrl && <PdfPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
      {showEwbValidate && <EwbValidateModal onClose={() => setShowEwbValidate(false)} />}
      <OfflineBanner pendingCount={pendingCount} syncing={syncing} />

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
              {editBiltyId.startsWith('offline:') ? `Editing offline draft (${form.gr_no})` : `Editing #${form.gr_no}`}
              <button type="button" onClick={resetForm} className="ml-1 text-amber-500 hover:text-amber-700 text-xs underline">
                Cancel edit
              </button>
            </span>
          )}
          <BiltySearchBar recent={recent} loading={recentLoading} onSelect={id => loadForEdit(id)} />
        </div>
      </div>

      {cancelId && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-red-700">Cancel reason:</span>
          <input
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            className="flex-1 text-sm border border-red-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-300"
            placeholder="Enter deletion reason..."
          />
          <button onClick={handleCancel} disabled={!cancelReason.trim() || cancelling}
            className="px-4 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50">
            {cancelling ? 'Cancelling...' : 'Confirm cancel'}
          </button>
          <button onClick={() => { setCancelId(null); setCancelReason(''); }}
            className="text-sm text-slate-500 hover:text-slate-700 underline">Dismiss</button>
        </div>
      )}

      {hasMorePages && recent.length > 0 && (
        <div className="mb-3 text-right">
          <button type="button" onClick={() => loadRecent(recentPage + 1)} disabled={recentLoading}
            className="text-xs text-indigo-600 hover:underline disabled:opacity-40">
            {recentLoading ? 'Loading...' : 'Load older bilties'}
          </button>
        </div>
      )}

      {dropLoading ? (
        <div className="py-20 text-center text-sm text-slate-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
          <form onSubmit={handleSave} className="space-y-2"
            onKeyDown={(e) => {
              // Enter on any plain input (not handled by TypeaheadInput via stopPropagation)
              // moves focus to the next element; on the last element it reaches the save button
              if (e.key !== 'Enter' || e.defaultPrevented) return;
              const target = e.target as HTMLElement;
              if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
                e.preventDefault();
                focusNextFormElement(target);
              }
            }}
          >
            <SectionGrBook
              form={form} primaryBook={primaryBook} noPrimaryBook={noPrimaryBook}
              grPreview={grPreview} editBiltyId={editBiltyId} sf={sf} cities={cities}
            />
            <SectionRouteTransport form={form} cities={cities} transports={transports} cityTransportMap={cityTransportMap} sf={sf} selectTransport={selectTransport} onToCitySelect={handleToCitySelect} />
            <SectionConsignor form={form} consignors={consignors} sf={sf} selectConsignor={selectConsignor} />
            <SectionConsignee form={form} consignees={consignees} sf={sf} selectConsignee={selectConsignee} />
            <SectionShipment form={form} sf={sf} />
            <SectionInvoice form={form} sf={sf} />
            <SectionEwb ewbNumbers={ewbNumbers} setEwbNumbers={setEwbNumbers} />
            <SectionCharges form={form} sf={sf} />
            <SectionDiscount form={form} discounts={discounts} sf={sf} />
            <SectionRemark form={form} sf={sf} />
            <SectionFormActions
              form={form} saving={saving} printing={printing} editBiltyId={editBiltyId}
              saveError={saveError} savedJson={savedJson}
              sf={sf} onReset={resetForm} onDismiss={() => setSavedJson(null)}
              onPrint={editBiltyId ? () => printBilty(editBiltyId!) : undefined}
            />
          </form>
        </div>
      )}
    </div>
  );
}
