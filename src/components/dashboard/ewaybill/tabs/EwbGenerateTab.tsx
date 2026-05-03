'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { INDIAN_STATES, toNicDate } from '../types';

interface GenerateForm {
  supply_type: string;
  sub_supply_type: string;
  document_type: string;
  document_number: string;
  document_date: string;
  gstin_of_consignor: string;
  gstin_of_consignee: string;
  pincode_of_consignor: string;
  state_of_consignor: string;
  pincode_of_consignee: string;
  state_of_supply: string;
  taxable_amount: string;
  total_invoice_value: string;
  transportation_mode: string;
  transportation_distance: string;
  vehicle_number: string;
  // Single item fields (simplified)
  product_name: string;
  hsn_code: string;
  quantity: string;
  unit: string;
  taxable_value: string;
  cgst_rate: string;
  sgst_rate: string;
  igst_rate: string;
  bilty_id: string;
}

const EMPTY: GenerateForm = {
  supply_type: 'O',
  sub_supply_type: '1',
  document_type: 'Tax Invoice',
  document_number: '',
  document_date: '',
  gstin_of_consignor: '',
  gstin_of_consignee: '',
  pincode_of_consignor: '',
  state_of_consignor: '07',
  pincode_of_consignee: '',
  state_of_supply: '27',
  taxable_amount: '',
  total_invoice_value: '',
  transportation_mode: 'Road',
  transportation_distance: '',
  vehicle_number: '',
  product_name: 'Goods',
  hsn_code: '',
  quantity: '1',
  unit: 'NOS',
  taxable_value: '',
  cgst_rate: '9',
  sgst_rate: '9',
  igst_rate: '0',
  bilty_id: '',
};

const SUPPLY_TYPES   = [{ v: 'O', l: 'Outward' }, { v: 'I', l: 'Inward' }];
const SUB_TYPES      = ['1','2','3','4','5','6','7','8','9','10','11','12'].map(v => ({ v, l: v }));
const DOC_TYPES      = ['Tax Invoice', 'Bill of Supply', 'Bill of Entry', 'Challan', 'Credit Note', 'Bill of Exchange', 'Others'];
const TRANSPORT_MODES_LABEL = ['Road', 'Rail', 'Air', 'Ship'];
const UNITS          = ['NOS', 'KGS', 'LTR', 'MTR', 'BOX', 'PKT', 'SET', 'TUN', 'OTH'];

export default function EwbGenerateTab() {
  const [form, setForm]       = useState<GenerateForm>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [result, setResult]   = useState<{ eway_bill_number?: string | number; valid_upto?: string } | null>(null);

  function set(k: keyof GenerateForm, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.document_number.trim()) { setError('Document number required.'); return; }
    if (!form.document_date) { setError('Document date required.'); return; }
    if (!form.gstin_of_consignor.trim()) { setError('Consignor GSTIN required.'); return; }
    if (!form.pincode_of_consignor.trim()) { setError('Consignor pincode required.'); return; }
    if (!form.pincode_of_consignee.trim()) { setError('Consignee pincode required.'); return; }
    if (!form.vehicle_number.trim()) { setError('Vehicle number required.'); return; }
    if (!form.taxable_amount || !form.total_invoice_value) { setError('Amounts required.'); return; }
    if (!form.transportation_distance) { setError('Transportation distance required.'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        supply_type:              form.supply_type,
        sub_supply_type:          form.sub_supply_type,
        document_type:            form.document_type,
        document_number:          form.document_number.trim(),
        document_date:            toNicDate(form.document_date),
        gstin_of_consignor:       form.gstin_of_consignor.trim().toUpperCase(),
        gstin_of_consignee:       form.gstin_of_consignee.trim().toUpperCase() || undefined,
        pincode_of_consignor:     form.pincode_of_consignor.trim(),
        state_of_consignor:       form.state_of_consignor,
        pincode_of_consignee:     form.pincode_of_consignee.trim(),
        state_of_supply:          form.state_of_supply,
        taxable_amount:           Number(form.taxable_amount),
        total_invoice_value:      Number(form.total_invoice_value),
        transportation_mode:      form.transportation_mode,
        transportation_distance:  Number(form.transportation_distance),
        vehicle_number:           form.vehicle_number.trim().toUpperCase(),
        itemList: [{
          product_name:   form.product_name.trim() || 'Goods',
          hsn_code:       form.hsn_code.trim(),
          quantity:       Number(form.quantity) || 1,
          unit:           form.unit,
          taxable_value:  Number(form.taxable_value) || Number(form.taxable_amount),
          cgst_rate:      Number(form.cgst_rate),
          sgst_rate:      Number(form.sgst_rate),
          igst_rate:      Number(form.igst_rate),
        }],
      };
      if (form.bilty_id.trim()) body.bilty_id = form.bilty_id.trim();

      const res = await apiFetch('/v1/ewaybill/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const d = data.detail;
        setError(typeof d === 'object' ? (d?.error ?? d?.message ?? 'Generation failed.') : (d ?? 'Generation failed.'));
        return;
      }
      setResult(data.data ?? data);
      setForm(EMPTY);
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Generate New EWB</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Use only when NIC hasn&apos;t generated the EWB automatically. Requires full invoice details.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Document */}
          <Section title="Document Details">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Supply Type">
                <select value={form.supply_type} onChange={e => set('supply_type', e.target.value)} className={inputCls}>
                  {SUPPLY_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </Field>
              <Field label="Sub Type">
                <select value={form.sub_supply_type} onChange={e => set('sub_supply_type', e.target.value)} className={inputCls}>
                  {SUB_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </Field>
              <Field label="Document Type">
                <select value={form.document_type} onChange={e => set('document_type', e.target.value)} className={inputCls}>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Document Number *">
                <input value={form.document_number} onChange={e => set('document_number', e.target.value)}
                  placeholder="INV/2025/001" className={inputCls} />
              </Field>
              <Field label="Document Date *">
                <input type="date" value={form.document_date} onChange={e => set('document_date', e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* Parties */}
          <Section title="Parties">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Consignor GSTIN *">
                <input value={form.gstin_of_consignor} onChange={e => set('gstin_of_consignor', e.target.value.toUpperCase())}
                  placeholder="07AAACR5055K1Z5" maxLength={15} className={`${inputCls} font-mono`} />
              </Field>
              <Field label="Consignee GSTIN">
                <input value={form.gstin_of_consignee} onChange={e => set('gstin_of_consignee', e.target.value.toUpperCase())}
                  placeholder="27AAACR5055K1Z5" maxLength={15} className={`${inputCls} font-mono`} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="From Pincode *">
                  <input value={form.pincode_of_consignor} onChange={e => set('pincode_of_consignor', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="110001" inputMode="numeric" className={`${inputCls} font-mono`} />
                </Field>
                <Field label="From State *">
                  <select value={form.state_of_consignor} onChange={e => set('state_of_consignor', e.target.value)} className={inputCls}>
                    {INDIAN_STATES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="To Pincode *">
                  <input value={form.pincode_of_consignee} onChange={e => set('pincode_of_consignee', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="400001" inputMode="numeric" className={`${inputCls} font-mono`} />
                </Field>
                <Field label="To State *">
                  <select value={form.state_of_supply} onChange={e => set('state_of_supply', e.target.value)} className={inputCls}>
                    {INDIAN_STATES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          </Section>

          {/* Amounts */}
          <Section title="Invoice Amounts">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Taxable Amount (₹) *">
                <input value={form.taxable_amount} onChange={e => set('taxable_amount', e.target.value)}
                  type="number" min="0" placeholder="10000" className={inputCls} />
              </Field>
              <Field label="Total Invoice Value (₹) *">
                <input value={form.total_invoice_value} onChange={e => set('total_invoice_value', e.target.value)}
                  type="number" min="0" placeholder="11800" className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* Transport */}
          <Section title="Transport">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Vehicle No. *">
                <input value={form.vehicle_number} onChange={e => set('vehicle_number', e.target.value.toUpperCase())}
                  placeholder="UP32AB1234" className={`${inputCls} uppercase`} />
              </Field>
              <Field label="Mode">
                <select value={form.transportation_mode} onChange={e => set('transportation_mode', e.target.value)} className={inputCls}>
                  {TRANSPORT_MODES_LABEL.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Distance (km) *">
                <input value={form.transportation_distance} onChange={e => set('transportation_distance', e.target.value)}
                  type="number" min="1" placeholder="1500" className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* Item */}
          <Section title="Goods Item">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Product Name">
                <input value={form.product_name} onChange={e => set('product_name', e.target.value)}
                  placeholder="Goods" className={inputCls} />
              </Field>
              <Field label="HSN Code">
                <input value={form.hsn_code} onChange={e => set('hsn_code', e.target.value)}
                  placeholder="8471" className={`${inputCls} font-mono`} />
              </Field>
              <Field label="Unit">
                <select value={form.unit} onChange={e => set('unit', e.target.value)} className={inputCls}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <Field label="Qty">
                <input value={form.quantity} onChange={e => set('quantity', e.target.value)}
                  type="number" min="1" className={inputCls} />
              </Field>
              <Field label="Taxable Value">
                <input value={form.taxable_value} onChange={e => set('taxable_value', e.target.value)}
                  type="number" placeholder="= taxable amt" className={inputCls} />
              </Field>
              <Field label="CGST %">
                <input value={form.cgst_rate} onChange={e => set('cgst_rate', e.target.value)}
                  type="number" min="0" className={inputCls} />
              </Field>
              <Field label="IGST %">
                <input value={form.igst_rate} onChange={e => set('igst_rate', e.target.value)}
                  type="number" min="0" className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* Optional bilty link */}
          <Field label="Link to Bilty ID (optional)">
            <input value={form.bilty_id} onChange={e => set('bilty_id', e.target.value)}
              placeholder="UUID of the related bilty" className={inputCls} />
          </Field>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>}

          <button type="submit" disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
            {loading ? <Spinner /> : null}
            {loading ? 'Generating EWB…' : 'Generate E-Way Bill'}
          </button>
        </form>

        {result && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-green-700 mb-1">✓ EWB Generated</p>
            <p className="font-mono text-xl font-bold text-green-800">{result.eway_bill_number}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
