'use client';

import { useEffect } from 'react';
import { City, Consignor, Consignee, Transport, ManualBilty, ManualForm, VisFlags } from './types';
import SearchableSelect from './SearchableSelect';

const CLS = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white transition-colors';
const LABEL = 'block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide';

function SectionHeader({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon && <span className="text-slate-400">{icon}</span>}
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{children}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  form: ManualForm;
  vis: VisFlags;
  cities: City[];
  consignors: Consignor[];
  consignees: Consignee[];
  transports: Transport[];
  editItem: ManualBilty | null;
  saving: boolean;
  error: string;
  grError: string;
  onChange: (k: keyof ManualForm, v: string) => void;
  onChangeMulti: (patch: Partial<ManualForm>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClearError: () => void;
}

export default function ManualBiltyModal({
  open, onClose, form, vis, cities, consignors, consignees, transports,
  editItem, saving, error, grError,
  onChange, onChangeMulti, onSubmit, onClearError,
}: Props) {

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editItem ? `Edit Bilty — ${editItem.gr_no}` : 'Create Manual Bilty'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {editItem
                ? 'Update the details below and click Update Bilty'
                : 'Fill in the shipment details to create a manual bilty'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-xl leading-none shrink-0 mt-0.5"
          >
            ×
          </button>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="mx-6 mt-4 flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 shrink-0">
            <span>{error}</span>
            <button onClick={onClearError} className="text-red-400 hover:text-red-600 text-base shrink-0">×</button>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <form id="manual-bilty-form" onSubmit={onSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-7">

          {/* Section 1: GR & Date */}
          <div>
            <SectionHeader>GR & Date</SectionHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>GR Number *</label>
                <input
                  type="text"
                  value={form.gr_no}
                  onChange={e => onChange('gr_no', e.target.value)}
                  placeholder="e.g. 1234 or SB/25/001"
                  maxLength={50}
                  required
                  className={`${CLS} ${grError ? 'border-red-400 focus:ring-red-400 bg-red-50' : ''}`}
                />
                {grError && <p className="mt-1.5 text-xs text-red-600">{grError}</p>}
              </div>
              <div>
                <label className={LABEL}>Bilty Date *</label>
                <input
                  type="date"
                  value={form.bilty_date}
                  onChange={e => onChange('bilty_date', e.target.value)}
                  required
                  className={CLS}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Route & Options */}
          <div>
            <SectionHeader>Route & Shipment Options</SectionHeader>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={LABEL}>From City</label>
                <SearchableSelect
                  items={cities}
                  value={form.from_city_id}
                  onChange={id => onChange('from_city_id', id)}
                  labelKey="city_name"
                  valueKey="city_id"
                  placeholder="From city"
                  emptyLabel="— None —"
                />
              </div>
              <div>
                <label className={LABEL}>To City</label>
                <SearchableSelect
                  items={cities}
                  value={form.to_city_id}
                  onChange={id => onChange('to_city_id', id)}
                  labelKey="city_name"
                  valueKey="city_id"
                  placeholder="To city"
                  emptyLabel="— None —"
                />
              </div>
              <div>
                <label className={LABEL}>Transporter</label>
                <SearchableSelect
                  items={transports}
                  value={form.transport_id}
                  onChange={(id, item) => onChangeMulti({ transport_id: id, transport_name: item?.transport_name ?? '' })}
                  labelKey="transport_name"
                  valueKey="transport_id"
                  placeholder="— Transporter —"
                  emptyLabel="— None —"
                />
              </div>
              <div>
                <label className={LABEL}>Payment Mode</label>
                <select value={form.payment_mode} onChange={e => onChange('payment_mode', e.target.value)} className={CLS}>
                  <option value="TO-PAY">TO-PAY</option>
                  <option value="PAID">PAID</option>
                  <option value="FOC">FOC</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Delivery Type</label>
                <select value={form.delivery_type} onChange={e => onChange('delivery_type', e.target.value)} className={CLS}>
                  <option value="DOOR">DOOR</option>
                  <option value="GODOWN">GODOWN</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Consignor & Consignee */}
          <div>
            <SectionHeader>Parties</SectionHeader>
            <div className="grid grid-cols-2 gap-6">

              {/* Consignor */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-lg">
                    Consignor — Sender
                  </span>
                </div>
                <SearchableSelect
                  items={consignors}
                  value={form.consignor_id}
                  onChange={(id, item) => onChangeMulti({
                    consignor_id: id,
                    consignor_name:   item?.consignor_name ?? '',
                    consignor_gstin:  item?.gstin ?? '',
                    consignor_mobile: item?.mobile ?? '',
                  })}
                  labelKey="consignor_name"
                  valueKey="consignor_id"
                  placeholder="Search consignor…"
                  emptyLabel="— None —"
                />
                {!form.consignor_id && (
                  <input
                    type="text"
                    value={form.consignor_name}
                    onChange={e => onChange('consignor_name', e.target.value)}
                    placeholder="Or type name manually"
                    className={CLS}
                  />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>GSTIN</label>
                    <input type="text" value={form.consignor_gstin} onChange={e => onChange('consignor_gstin', e.target.value)} maxLength={15} placeholder="15-digit GSTIN" className={CLS} />
                  </div>
                  <div>
                    <label className={LABEL}>Mobile</label>
                    <input type="text" value={form.consignor_mobile} onChange={e => onChange('consignor_mobile', e.target.value)} placeholder="Mobile no." className={CLS} />
                  </div>
                </div>
              </div>

              {/* Consignee */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
                    Consignee — Receiver
                  </span>
                </div>
                <SearchableSelect
                  items={consignees}
                  value={form.consignee_id}
                  onChange={(id, item) => onChangeMulti({
                    consignee_id: id,
                    consignee_name:   item?.consignee_name ?? '',
                    consignee_gstin:  item?.gstin ?? '',
                    consignee_mobile: item?.mobile ?? '',
                  })}
                  labelKey="consignee_name"
                  valueKey="consignee_id"
                  placeholder="Search consignee…"
                  emptyLabel="— None —"
                />
                {!form.consignee_id && (
                  <input
                    type="text"
                    value={form.consignee_name}
                    onChange={e => onChange('consignee_name', e.target.value)}
                    placeholder="Or type name manually"
                    className={CLS}
                  />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>GSTIN</label>
                    <input type="text" value={form.consignee_gstin} onChange={e => onChange('consignee_gstin', e.target.value)} maxLength={15} placeholder="15-digit GSTIN" className={CLS} />
                  </div>
                  <div>
                    <label className={LABEL}>Mobile</label>
                    <input type="text" value={form.consignee_mobile} onChange={e => onChange('consignee_mobile', e.target.value)} placeholder="Mobile no." className={CLS} />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Section 4: Shipment Details */}
          <div>
            <SectionHeader>Shipment Details</SectionHeader>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={LABEL}>Packages</label>
                <input type="number" min={0} value={form.no_of_pkg} onChange={e => onChange('no_of_pkg', e.target.value)} placeholder="0" className={CLS} />
              </div>
              <div>
                <label className={LABEL}>Weight (kg)</label>
                <input type="number" min={0} step="0.01" value={form.weight} onChange={e => onChange('weight', e.target.value)} placeholder="0.00" className={CLS} />
              </div>

              {vis.show_contain && (
                <div className="col-span-2">
                  <label className={LABEL}>Contain / Goods</label>
                  <input type="text" value={form.contain} onChange={e => onChange('contain', e.target.value)} placeholder="e.g. Clothes, Electronics" className={CLS} />
                </div>
              )}

              {vis.show_pvt_marks && (
                <div className="col-span-2">
                  <label className={LABEL}>Pvt Marks</label>
                  <input type="text" value={form.pvt_marks} onChange={e => onChange('pvt_marks', e.target.value)} className={CLS} />
                </div>
              )}

              {vis.show_invoice && (
                <>
                  <div className="col-span-2">
                    <label className={LABEL}>Invoice No.</label>
                    <input type="text" value={form.invoice_no} onChange={e => onChange('invoice_no', e.target.value)} className={CLS} />
                  </div>
                  <div className="col-span-2">
                    <label className={LABEL}>Invoice Value (₹)</label>
                    <input type="number" min={0} step="0.01" value={form.invoice_value} onChange={e => onChange('invoice_value', e.target.value)} placeholder="0.00" className={CLS} />
                  </div>
                </>
              )}

              {vis.show_eway_bill && (
                <div className="col-span-2">
                  <label className={LABEL}>E-Way Bill No.</label>
                  <input type="text" value={form.ewb_no} onChange={e => onChange('ewb_no', e.target.value)} placeholder="EWB number" className={CLS} />
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Charges */}
          <div>
            <SectionHeader>Charges (₹)</SectionHeader>
            {vis.show_itemized_charges ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {([
                    ['freight_amount', 'Freight'],
                    ['labour_charge',  'Labour'],
                    ['bill_charge',    'Bill'],
                    ['toll_charge',    'Toll'],
                    ['dd_charge',      'DD'],
                    ['pf_charge',      'PF'],
                    ['local_charge',   'Local'],
                    ['other_charge',   'Other'],
                  ] as [keyof ManualForm, string][]).map(([k, lbl]) => (
                    <div key={k}>
                      <label className={LABEL}>{lbl}</label>
                      <input
                        type="number" min={0} step="0.01"
                        value={String(form[k])}
                        onChange={e => onChange(k, e.target.value)}
                        placeholder="0.00"
                        className={CLS}
                      />
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Total Amount (₹) — auto-calculated</label>
                  <input
                    type="number" min={0} step="0.01"
                    value={form.total_amount}
                    onChange={e => onChange('total_amount', e.target.value)}
                    placeholder="0.00"
                    className="w-full max-w-xs border-2 border-green-300 rounded-lg px-3 py-2.5 text-sm font-bold text-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 bg-green-50 transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div className="max-w-xs">
                <label className="block text-sm font-bold text-slate-700 mb-2">Total Amount (₹)</label>
                <input
                  type="number" min={0} step="0.01"
                  value={form.total_amount}
                  onChange={e => onChange('total_amount', e.target.value)}
                  placeholder="0.00"
                  className="w-full border-2 border-green-300 rounded-lg px-3 py-2.5 text-sm font-bold text-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 bg-green-50 transition-colors"
                />
              </div>
            )}
          </div>

          {/* Section 6: Remark */}
          <div>
            <SectionHeader>Additional Notes</SectionHeader>
            <div>
              <label className={LABEL}>Remark</label>
              <textarea
                rows={2}
                value={form.remark}
                onChange={e => onChange('remark', e.target.value)}
                placeholder="Optional remarks…"
                className={`${CLS} resize-none`}
              />
            </div>
          </div>

        </form>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl flex items-center justify-between gap-4 shrink-0">
          {/* Save mode */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-500">Save as:</span>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="modal_saving_option"
                value="SAVE"
                checked={form.saving_option === 'SAVE'}
                onChange={() => onChange('saving_option', 'SAVE')}
                className="accent-violet-600"
              />
              Saved
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="modal_saving_option"
                value="DRAFT"
                checked={form.saving_option === 'DRAFT'}
                onChange={() => onChange('saving_option', 'DRAFT')}
                className="accent-violet-600"
              />
              Draft
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="manual-bilty-form"
              disabled={saving}
              className="px-6 py-2 text-sm font-bold text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-60 transition-colors flex items-center gap-2 min-w-32 justify-center"
            >
              {saving && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              )}
              {saving
                ? 'Saving…'
                : editItem
                  ? 'Update Bilty'
                  : form.saving_option === 'DRAFT'
                    ? 'Save as Draft'
                    : 'Create Bilty'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
