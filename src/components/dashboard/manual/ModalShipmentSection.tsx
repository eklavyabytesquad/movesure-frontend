'use client';

import { ManualForm, VisFlags } from './types';
import SectionEwb from '@/components/dashboard/bilty/sections/SectionEwb';

const CLS_TOTAL = 'w-full border-2 border-green-300 rounded-lg px-2.5 py-1.5 text-sm font-bold text-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 bg-green-50';
const CLS       = 'w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white transition-colors';
const LABEL     = 'block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide';
const SEC       = 'text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-2 pb-1 border-b border-slate-100';

interface Props {
  form: ManualForm;
  vis: VisFlags;
  ewbNumbers: string[];
  setEwbNumbers: (v: string[]) => void;
  onChange: (k: keyof ManualForm, v: string) => void;
  /** Called when user presses Tab/Enter on the Total field to jump to Save */
  onTotalNext: () => void;
}

const CHARGE_ROWS: [keyof ManualForm, string][] = [
  ['freight_amount', 'Freight'],
  ['labour_charge',  'Labour'],
  ['bill_charge',    'Bill'],
  ['toll_charge',    'Toll'],
  ['dd_charge',      'DD'],
  ['pf_charge',      'PF'],
  ['local_charge',   'Local'],
  ['other_charge',   'Other'],
];

export default function ModalShipmentSection({
  form, vis, ewbNumbers, setEwbNumbers, onChange, onTotalNext,
}: Props) {

  function handleTotalKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      onTotalNext();
    }
  }

  return (
    <div className="space-y-4">

      {/* Shipment Details */}
      <div>
        <p className={SEC}>Shipment Details</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={LABEL}>Packages</label>
            <input type="number" min={0} value={form.no_of_pkg} placeholder="0"
              onChange={e => onChange('no_of_pkg', e.target.value)} className={CLS} />
          </div>
          <div>
            <label className={LABEL}>Weight (kg)</label>
            <input type="number" min={0} step="0.01" value={form.weight} placeholder="0.00"
              onChange={e => onChange('weight', e.target.value)} className={CLS} />
          </div>
          {vis.show_contain && (
            <div className="col-span-2">
              <label className={LABEL}>Contain / Goods</label>
              <input type="text" value={form.contain}
                onChange={e => onChange('contain', e.target.value)}
                placeholder="e.g. Clothes, Electronics" className={CLS} />
            </div>
          )}
          {vis.show_pvt_marks && (
            <div className="col-span-2">
              <label className={LABEL}>Pvt Marks</label>
              <input type="text" value={form.pvt_marks}
                onChange={e => onChange('pvt_marks', e.target.value)} className={CLS} />
            </div>
          )}
          {vis.show_invoice && (
            <>
              <div>
                <label className={LABEL}>Invoice No.</label>
                <input type="text" value={form.invoice_no}
                  onChange={e => onChange('invoice_no', e.target.value)} className={CLS} />
              </div>
              <div>
                <label className={LABEL}>Invoice Value (₹)</label>
                <input type="number" min={0} step="0.01" value={form.invoice_value} placeholder="0.00"
                  onChange={e => onChange('invoice_value', e.target.value)} className={CLS} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* E-Way Bills — always visible */}
      <div>
        <p className={SEC}>E-Way Bills</p>
        <SectionEwb ewbNumbers={ewbNumbers} setEwbNumbers={setEwbNumbers} />
      </div>

      {/* Charges */}
      <div>
        <p className={SEC}>Charges (₹)</p>
        {vis.show_itemized_charges ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {CHARGE_ROWS.map(([k, lbl]) => (
                <div key={k}>
                  <label className={LABEL}>{lbl}</label>
                  <input type="number" min={0} step="0.01" placeholder="0.00"
                    value={String(form[k])} onChange={e => onChange(k, e.target.value)}
                    className={CLS} />
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-slate-100">
              <label className={LABEL}>Total (₹)</label>
              <input type="number" min={0} step="0.01" value={form.total_amount} placeholder="0.00"
                onChange={e => onChange('total_amount', e.target.value)}
                onKeyDown={handleTotalKeyDown}
                className={CLS_TOTAL} />
            </div>
          </div>
        ) : (
          <div>
            <label className={LABEL}>Total Amount (₹)</label>
            <input type="number" min={0} step="0.01" value={form.total_amount} placeholder="0.00"
              onChange={e => onChange('total_amount', e.target.value)}
              onKeyDown={handleTotalKeyDown}
              className={CLS_TOTAL} />
          </div>
        )}
      </div>

      {/* Remark — rare, out of tab flow */}
      <div>
        <label className={LABEL}>Remark <span className="text-slate-300 font-normal normal-case">(optional)</span></label>
        <textarea rows={2} value={form.remark} tabIndex={-1}
          onChange={e => onChange('remark', e.target.value)}
          placeholder="Optional remarks…"
          className={`${CLS} resize-none`} />
      </div>

    </div>
  );
}
