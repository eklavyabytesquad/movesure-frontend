'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { City, Consignor, Consignee, Transport, ManualBilty, ManualForm, VisFlags, ManualBook } from './types';
import { TypeaheadInput, TypeaheadItem, focusNextFormElement } from '@/components/dashboard/bilty/ui';
import ModalPartyRow        from './ModalPartyRow';
import ModalRouteSection    from './ModalRouteSection';
import ModalShipmentSection from './ModalShipmentSection';

const CLS   = 'w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white transition-colors';
const LABEL = 'block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide';
const SEC   = 'text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-2 pb-1 border-b border-slate-100';

interface Props {
  open: boolean;
  onClose: () => void;
  form: ManualForm;
  vis: VisFlags;
  cities: City[];
  consignors: Consignor[];
  consignees: Consignee[];
  transports: Transport[];
  manualBooks: ManualBook[];
  cityTransportMap: Record<string, { transport_id: string; mobile?: string }[]>;
  editItem: ManualBilty | null;
  saving: boolean;
  error: string;
  grError: string;
  ewbNumbers: string[];
  setEwbNumbers: (v: string[]) => void;
  onChange: (k: keyof ManualForm, v: string) => void;
  onChangeMulti: (patch: Partial<ManualForm>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClearError: () => void;
  onFetchNextGr: (bookId: string) => Promise<void>;
}

export default function ManualBiltyModal({
  open, onClose, form, vis, cities, consignors, consignees, transports, manualBooks, cityTransportMap,
  editItem, saving, error, grError, ewbNumbers, setEwbNumbers,
  onChange, onChangeMulti, onSubmit, onClearError, onFetchNextGr,
}: Props) {

  const saveBtnRef = useRef<HTMLButtonElement>(null);
  const [grLoading, setGrLoading] = useState(false);

  // ── Display-text state for all typeahead fields ────────────────────────────
  const [fromCityText,  setFromCityText]  = useState('');
  const [toCityText,    setToCityText]    = useState('');
  const [transportText, setTransportText] = useState('');
  const [consignorText, setConsignorText] = useState('');
  const [consigneeText, setConsigneeText] = useState('');

  useEffect(() => {
    setFromCityText(cities.find(c => c.city_id === form.from_city_id)?.city_name ?? '');
  }, [form.from_city_id, cities]);

  useEffect(() => {
    setToCityText(cities.find(c => c.city_id === form.to_city_id)?.city_name ?? '');
  }, [form.to_city_id, cities]);

  useEffect(() => {
    setTransportText(
      transports.find(t => t.transport_id === form.transport_id)?.transport_name ??
      form.transport_name ?? ''
    );
  }, [form.transport_id, form.transport_name, transports]);

  useEffect(() => {
    setConsignorText(
      form.consignor_id
        ? (consignors.find(c => (c.consignor_id ?? c.id) === form.consignor_id)?.consignor_name ?? form.consignor_name)
        : form.consignor_name
    );
  }, [form.consignor_id, form.consignor_name, consignors]);

  useEffect(() => {
    setConsigneeText(
      form.consignee_id
        ? (consignees.find(c => (c.consignee_id ?? c.id) === form.consignee_id)?.consignee_name ?? form.consignee_name)
        : form.consignee_name
    );
  }, [form.consignee_id, form.consignee_name, consignees]);

  // ── TypeaheadItem lists ────────────────────────────────────────────────────
  const cityItems = useMemo<TypeaheadItem[]>(
    () => cities.map(c => ({ id: c.city_id, label: c.city_name, sub: c.city_code ?? undefined })),
    [cities]
  );
  const consignorItems = useMemo<TypeaheadItem[]>(
    () => consignors.map(c => ({
      id: c.consignor_id ?? c.id ?? '', label: c.consignor_name,
      sub: c.mobile ?? c.gstin ?? undefined,
    })),
    [consignors]
  );
  const consigneeItems = useMemo<TypeaheadItem[]>(
    () => consignees.map(c => ({
      id: c.consignee_id ?? c.id ?? '', label: c.consignee_name,
      sub: c.mobile ?? c.gstin ?? undefined,
    })),
    [consignees]
  );

  // ── Consignor ──────────────────────────────────────────────────────────────
  function handleConsignorChange(text: string) {
    if (form.consignor_id) onChangeMulti({ consignor_id: '', consignor_gstin: '', consignor_mobile: '' });
    setConsignorText(text);
    onChange('consignor_name', text);
    if (!text) return;
    const q = text.trim().toLowerCase();
    const exact = consignors.find(
      c => (c.gstin && c.gstin.toLowerCase() === q) || (c.mobile && c.mobile.toLowerCase() === q)
    );
    if (exact) handleConsignorSelect({ id: exact.consignor_id ?? exact.id ?? '', label: exact.consignor_name });
  }
  function handleConsignorSelect(item: TypeaheadItem) {
    const c = consignors.find(c => (c.consignor_id ?? c.id) === item.id);
    onChangeMulti({ consignor_id: item.id, consignor_name: item.label, consignor_gstin: c?.gstin ?? '', consignor_mobile: c?.mobile ?? '' });
    setConsignorText(item.label);
  }

  // ── Consignee ──────────────────────────────────────────────────────────────
  function handleConsigneeChange(text: string) {
    if (form.consignee_id) onChangeMulti({ consignee_id: '', consignee_gstin: '', consignee_mobile: '' });
    setConsigneeText(text);
    onChange('consignee_name', text);
    if (!text) return;
    const q = text.trim().toLowerCase();
    const exact = consignees.find(
      c => (c.gstin && c.gstin.toLowerCase() === q) || (c.mobile && c.mobile.toLowerCase() === q)
    );
    if (exact) handleConsigneeSelect({ id: exact.consignee_id ?? exact.id ?? '', label: exact.consignee_name });
  }
  function handleConsigneeSelect(item: TypeaheadItem) {
    const c = consignees.find(c => (c.consignee_id ?? c.id) === item.id);
    onChangeMulti({ consignee_id: item.id, consignee_name: item.label, consignee_gstin: c?.gstin ?? '', consignee_mobile: c?.mobile ?? '' });
    setConsigneeText(item.label);
  }

  // ── Escape → close ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // ── Form-level Enter → advance focus ──────────────────────────────────────
  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (
      e.key === 'Enter' &&
      !e.defaultPrevented &&
      (e.target as HTMLElement).tagName !== 'TEXTAREA' &&
      (e.target as HTMLElement).tagName !== 'BUTTON'
    ) {
      e.preventDefault();
      focusNextFormElement(e.target as HTMLElement);
    }
  }

  // ── From-city handler (outside tab flow) ──────────────────────────────────
  function handleFromCityChange(text: string) {
    setFromCityText(text);
    if (!text) { onChange('from_city_id', ''); return; }
    const exact = cities.find(
      c => (c.city_code && c.city_code.toLowerCase() === text.trim().toLowerCase()) ||
           c.city_name.toLowerCase() === text.trim().toLowerCase()
    );
    if (exact) { onChange('from_city_id', exact.city_id); setFromCityText(exact.city_name); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-275 flex flex-col" style={{ maxHeight: '96vh' }}>

        {/* ── Header ── */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {editItem ? `Edit Bilty — ${editItem.gr_no}` : 'Create Manual Bilty'}
            </h2>
            <p className="text-xs text-slate-400">
              {editItem ? 'Update the details below' : 'Fill in the shipment details'}
            </p>
          </div>
          <button type="button" onClick={onClose} tabIndex={-1}
            className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-lg leading-none">
            ×
          </button>
        </div>

        {/* ── Secondary bar: Bilty Date + From City (rarely changed, outside tab flow) ── */}
        <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-6 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Bilty Date</span>
            <input type="date" value={form.bilty_date} tabIndex={-1}
              onChange={e => onChange('bilty_date', e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white" />
          </div>
          {/* Bill Book selector */}
          {!editItem && manualBooks.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Bill Book</span>
              <select
                value={form.book_id}
                tabIndex={-1}
                onChange={async e => {
                  const bookId = e.target.value;
                  if (bookId) {
                    setGrLoading(true);
                    try { await onFetchNextGr(bookId); } finally { setGrLoading(false); }
                  } else {
                    onChange('book_id', '');
                    onChange('gr_no', '');
                  }
                }}
                className="border border-slate-200 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
              >
                <option value="">— None (free entry) —</option>
                {manualBooks.map(b => (
                  <option key={b.book_id} value={b.book_id}>
                    {b.book_name ?? b.book_id}
                    {b.branch_name ? ` [${b.branch_name}]` : ''}
                    {b.is_primary ? ' ★' : ''}
                  </option>
                ))}
              </select>
              {grLoading && <span className="text-[10px] text-violet-500 animate-pulse">Fetching GR…</span>}
              {!grLoading && grError && <span className="text-[10px] text-red-500 font-semibold">{grError}</span>}
              {!grLoading && !grError && form.book_id && form.gr_no && (
                <span className="text-[10px] text-emerald-600">GR: <strong>{form.gr_no}</strong> (editable)</span>
              )}
              {!grLoading && !grError && form.book_id && !form.gr_no && (
                <span className="text-[10px] text-slate-400 italic">No series — enter GR freely</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">From City</span>
            <div className="w-52">
              <TypeaheadInput
                items={cityItems}
                value={fromCityText}
                onChange={handleFromCityChange}
                onSelect={item => { onChange('from_city_id', item.id); setFromCityText(item.label); }}
                placeholder="Name or code…"
              />
            </div>
          </div>
          <span className="text-[10px] text-slate-300 italic hidden lg:inline">Rarely changed — not in Tab flow</span>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="mx-5 mt-3 flex items-center justify-between gap-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 shrink-0">
            <span>{error}</span>
            <button onClick={onClearError} tabIndex={-1} className="text-red-400 hover:text-red-600 shrink-0">×</button>
          </div>
        )}

        {/* ── Body ── */}
        <form
          id="manual-bilty-form"
          onSubmit={onSubmit}
          onKeyDown={handleFormKeyDown}
          className="flex-1 overflow-hidden"
        >
          <div className="flex gap-0 h-full">

            {/* ─── LEFT COLUMN ─── */}
            <div className="flex-1 px-5 py-4 space-y-4 border-r border-slate-100 overflow-y-auto">

              {/* GR Number */}
              <div>
                <p className={SEC}>GR Number</p>
                <label className={LABEL}>GR No. *</label>
                <input
                  type="text" value={form.gr_no} required maxLength={50}
                  onChange={e => onChange('gr_no', e.target.value)}
                  placeholder="e.g. 1234 or SB/25/001"
                  className={`${CLS} ${grError ? 'border-red-400 focus:ring-red-400 bg-red-50' : ''}`}
                />
                {grError && <p className="mt-1 text-xs text-red-600">{grError}</p>}
              </div>

              {/* Destination & Transport */}
              <div>
                <p className={SEC}>Destination &amp; Transport</p>
                <ModalRouteSection
                  form={form}
                  cities={cities}
                  transports={transports}
                  cityTransportMap={cityTransportMap}
                  toCityText={toCityText}
                  transportText={transportText}
                  onToCityTextChange={setToCityText}
                  onToCitySelect={(item: TypeaheadItem) => { onChange('to_city_id', item.id); setToCityText(item.label); }}
                  onTransportTextChange={setTransportText}
                  onTransportSelect={(item: TypeaheadItem) => { onChangeMulti({ transport_id: item.id, transport_name: item.label }); setTransportText(item.label); }}
                  onChange={onChange}
                  onChangeMulti={onChangeMulti}
                />
              </div>

              {/* Consignor */}
              <div>
                <p className={SEC}>Consignor — Sender</p>
                <ModalPartyRow
                  title="Consignor — Sender"
                  badgeClass="text-violet-700 bg-violet-50 border-violet-100"
                  items={consignorItems}
                  text={consignorText}
                  onTextChange={handleConsignorChange}
                  onSelect={handleConsignorSelect}
                  gstin={form.consignor_gstin}
                  onGstinChange={v => onChange('consignor_gstin', v)}
                  mobile={form.consignor_mobile}
                  onMobileChange={v => onChange('consignor_mobile', v)}
                />
              </div>

              {/* Consignee */}
              <div>
                <p className={SEC}>Consignee — Receiver</p>
                <ModalPartyRow
                  title="Consignee — Receiver"
                  badgeClass="text-blue-700 bg-blue-50 border-blue-100"
                  items={consigneeItems}
                  text={consigneeText}
                  onTextChange={handleConsigneeChange}
                  onSelect={handleConsigneeSelect}
                  gstin={form.consignee_gstin}
                  onGstinChange={v => onChange('consignee_gstin', v)}
                  mobile={form.consignee_mobile}
                  onMobileChange={v => onChange('consignee_mobile', v)}
                />
              </div>

            </div>{/* end LEFT */}

            {/* ─── RIGHT COLUMN ─── */}
            <div className="w-95 shrink-0 px-5 py-4 overflow-y-auto">
              <ModalShipmentSection
                form={form}
                vis={vis}
                ewbNumbers={ewbNumbers}
                setEwbNumbers={setEwbNumbers}
                onChange={onChange}
                onTotalNext={() => saveBtnRef.current?.focus()}
              />
            </div>

          </div>
        </form>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-500">Save as:</span>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="modal_saving_option" value="SAVE" tabIndex={-1}
                checked={form.saving_option === 'SAVE'} onChange={() => onChange('saving_option', 'SAVE')}
                className="accent-violet-600" />
              Saved
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="modal_saving_option" value="DRAFT" tabIndex={-1}
                checked={form.saving_option === 'DRAFT'} onChange={() => onChange('saving_option', 'DRAFT')}
                className="accent-violet-600" />
              Draft
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} tabIndex={-1}
              className="px-4 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
              Cancel
            </button>
            <button
              ref={saveBtnRef}
              type="submit" form="manual-bilty-form" disabled={saving}
              onKeyDown={e => {
                if (e.key === 'Tab' || e.key === 'Enter') {
                  e.preventDefault();
                  (e.currentTarget as HTMLButtonElement).click();
                }
              }}
              className="px-5 py-1.5 text-sm font-bold text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-60 transition-colors flex items-center gap-2 min-w-32 justify-center">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />}
              {saving ? 'Saving…' : editItem ? 'Update Bilty' : form.saving_option === 'DRAFT' ? 'Save as Draft' : 'Create Bilty'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
