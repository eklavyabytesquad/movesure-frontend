'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { EwbRecord, TRANSPORT_MODES, INDIAN_STATES, fmtDate } from '../types';

interface Props {
  validatedEwbs: Record<string, EwbRecord>;
}

interface ExtendForm {
  eway_bill_number: string;
  vehicle_number: string;
  place_of_consignor: string;
  state_of_consignor: string;
  remaining_distance: string;
  mode_of_transport: string;
  extend_validity_reason: string;
  from_pincode: string;
}

const EMPTY: ExtendForm = {
  eway_bill_number: '',
  vehicle_number: '',
  place_of_consignor: '',
  state_of_consignor: '07',
  remaining_distance: '',
  mode_of_transport: '1',
  extend_validity_reason: 'Natural Calamity',
  from_pincode: '',
};

const REASONS = [
  'Natural Calamity',
  'Law and Order Situation',
  'Transhipment',
  'Accident',
  'Others',
];

export default function EwbExtendTab({ validatedEwbs }: Props) {
  const [form, setForm]       = useState<ExtendForm>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [result, setResult]   = useState<{ eway_bill_number?: string | number; valid_upto?: string } | null>(null);

  // Expiring / expired EWBs shown with warning
  const expiringEwbs = Object.entries(validatedEwbs).filter(([, r]) => {
    if (!r.valid_upto) return false;
    const expiry = new Date(r.valid_upto).getTime();
    const now = Date.now();
    const eightHours = 8 * 60 * 60 * 1000;
    return Math.abs(expiry - now) <= eightHours;
  });

  function set(k: keyof ExtendForm, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = form.eway_bill_number.replace(/\D/g, '');
    if (digits.length !== 12) { setError('Valid 12-digit EWB number required.'); return; }
    if (!form.vehicle_number.trim()) { setError('Vehicle number is required.'); return; }
    if (!form.place_of_consignor.trim()) { setError('Place of consignor is required.'); return; }
    if (!form.remaining_distance || Number(form.remaining_distance) <= 0) {
      setError('Remaining distance must be a positive number.');
      return;
    }
    if (!form.from_pincode.trim()) { setError('From pincode is required.'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const body = {
        eway_bill_number:        Number(digits),
        vehicle_number:          form.vehicle_number.trim().toUpperCase(),
        place_of_consignor:      form.place_of_consignor.trim(),
        state_of_consignor:      form.state_of_consignor,
        remaining_distance:      Number(form.remaining_distance),
        mode_of_transport:       form.mode_of_transport,
        extend_validity_reason:  form.extend_validity_reason,
        from_pincode:            Number(form.from_pincode),
      };
      const res = await apiFetch('/v1/ewaybill/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const d = data.detail;
        setError(typeof d === 'object' ? (d?.error ?? JSON.stringify(d)) : (d ?? 'Extension failed.'));
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
    <div className="max-w-lg mx-auto space-y-4">

      {/* Warning: NIC 8-hour window */}
      <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
        <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <p className="font-semibold text-amber-800">NIC Extension Window</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Extension is only allowed <strong>8 hours before</strong> to <strong>8 hours after</strong> expiry.
          </p>
        </div>
      </div>

      {/* Expiring EWBs quick-fill */}
      {expiringEwbs.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-xs font-semibold text-amber-700 mb-2">EWBs in extension window:</p>
          <div className="space-y-1.5">
            {expiringEwbs.map(([ewbNo, rec]) => (
              <button key={ewbNo} type="button"
                onClick={() => setForm(f => ({ ...f, eway_bill_number: ewbNo }))}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-colors
                  ${form.eway_bill_number === ewbNo ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200 hover:border-amber-200'}`}>
                <span className="font-mono font-semibold text-slate-700">{ewbNo}</span>
                <span className="text-amber-600">Expires {fmtDate(rec.valid_upto)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="EWB Number *">
            <input
              value={form.eway_bill_number}
              onChange={e => set('eway_bill_number', e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="321012345678"
              inputMode="numeric"
              className={`${inputCls} font-mono`}
            />
          </Field>

          <Field label="Vehicle Number *">
            <input value={form.vehicle_number} onChange={e => set('vehicle_number', e.target.value.toUpperCase())}
              placeholder="UP32AB1234" className={`${inputCls} uppercase`} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Place of Consignor *">
              <input value={form.place_of_consignor} onChange={e => set('place_of_consignor', e.target.value)}
                placeholder="New Delhi" className={inputCls} />
            </Field>

            <Field label="State *">
              <select value={form.state_of_consignor} onChange={e => set('state_of_consignor', e.target.value)}
                className={inputCls}>
                {INDIAN_STATES.map(s => <option key={s.code} value={s.code}>{s.code} – {s.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Remaining Distance (km) *">
              <input value={form.remaining_distance} onChange={e => set('remaining_distance', e.target.value)}
                type="number" min="1" placeholder="200" className={inputCls} />
            </Field>

            <Field label="From Pincode *">
              <input value={form.from_pincode} onChange={e => set('from_pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric" placeholder="110001" className={`${inputCls} font-mono`} />
            </Field>
          </div>

          <Field label="Mode of Transport">
            <select value={form.mode_of_transport} onChange={e => set('mode_of_transport', e.target.value)} className={inputCls}>
              {TRANSPORT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>

          <Field label="Extension Reason">
            <select value={form.extend_validity_reason} onChange={e => set('extend_validity_reason', e.target.value)} className={inputCls}>
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>}

          <button type="submit" disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
            {loading ? <Spinner /> : null}
            {loading ? 'Extending…' : 'Extend EWB Validity'}
          </button>
        </form>

        {result && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-green-700 mb-1">✓ Validity Extended</p>
            <p className="text-sm font-mono font-bold text-green-800">{result.eway_bill_number}</p>
            {result.valid_upto && (
              <p className="text-xs text-green-600 mt-1">New validity: {fmtDate(result.valid_upto)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>
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
