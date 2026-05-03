'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { EwbRecord, STATUS_COLOR, TRANSPORT_MODES, INDIAN_STATES, fmtDate, toNicDate } from '../types';

interface Props {
  validatedEwbs: Record<string, EwbRecord>;
  vehicleNo?: string;
  tripNo?: string;
}

interface ConsolidateForm {
  place_of_consignor: string;
  state_of_consignor: string;
  vehicle_number: string;
  mode_of_transport: string;
  transporter_document_number: string;
  transporter_document_date: string;
}

interface CewbResult {
  cewb_number: string | number;
  ewb_numbers?: string[];
  vehicle_number?: string;
  valid_upto?: string;
}

export default function EwbConsolidateTab({ validatedEwbs, vehicleNo, tripNo }: Props) {
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [form, setForm]           = useState<ConsolidateForm>(() => ({
    place_of_consignor: '',
    state_of_consignor: '07',
    vehicle_number: vehicleNo ?? '',
    mode_of_transport: '1',
    transporter_document_number: tripNo ?? '',
    transporter_document_date: '',
  }));
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [result, setResult]       = useState<CewbResult | null>(null);
  const [sessionCewbs, setSessionCewbs] = useState<CewbResult[]>([]);

  // ── Derive existing consolidated EWBs from validated records ──
  // EWBs with ewb_status === 'CONSOLIDATED' were already consolidated before this session.
  // We group them by cewb_id (if known) or list individually.
  const consolidatedEwbs = Object.entries(validatedEwbs)
    .filter(([, r]) => r.ewb_status === 'CONSOLIDATED')
    .map(([ewbNo, rec]) => ({ ewbNo, cewb_id: rec.cewb_id }));

  // Group by cewb_id to merge member EWBs under one CEWB card
  const cewbGroups: Record<string, { ewbNos: string[]; cewb_id: string }> = {};
  consolidatedEwbs.forEach(({ ewbNo, cewb_id }) => {
    const key = cewb_id ?? `_unknown_${ewbNo}`;
    if (!cewbGroups[key]) cewbGroups[key] = { cewb_id: cewb_id ?? '', ewbNos: [] };
    cewbGroups[key].ewbNos.push(ewbNo);
  });
  const existingCewbs = Object.values(cewbGroups);

  // Only ACTIVE EWBs eligible for consolidation
  const activeEwbs = Object.entries(validatedEwbs)
    .filter(([, r]) => r.ewb_status === 'ACTIVE')
    .map(([ewbNo, rec]) => ({ ewbNo, rec }));

  function toggleSelect(ewbNo: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(ewbNo) ? next.delete(ewbNo) : next.add(ewbNo);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === activeEwbs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(activeEwbs.map(e => e.ewbNo)));
    }
  }

  function set(k: keyof ConsolidateForm, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size < 2) { setError('Select at least 2 EWBs to consolidate.'); return; }
    const effectiveVehicle = vehicleNo ?? form.vehicle_number;
    if (!effectiveVehicle.trim()) { setError('Vehicle number is required.'); return; }
    if (!form.place_of_consignor.trim()) { setError('Place of consignor is required.'); return; }
    if (!form.transporter_document_number.trim()) { setError('Transporter document number is required.'); return; }
    if (!form.transporter_document_date) { setError('Transporter document date is required.'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const body = {
        place_of_consignor:           form.place_of_consignor.trim(),
        state_of_consignor:           form.state_of_consignor,
        vehicle_number:               effectiveVehicle.trim().toUpperCase(),
        mode_of_transport:            form.mode_of_transport,
        transporter_document_number:  form.transporter_document_number.trim(),
        transporter_document_date:    toNicDate(form.transporter_document_date),
        data_source:                  'E',
        list_of_eway_bills:           Array.from(selected).map(n => n.replace(/\D/g, '')),
      };
      const res = await apiFetch('/v1/ewaybill/consolidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const d = data.detail;
        setError(typeof d === 'object' ? (d?.error ?? JSON.stringify(d)) : (d ?? 'Consolidation failed.'));
        return;
      }
      const cewb = data.data ?? data;
      setResult(cewb);
      setSessionCewbs(h => [cewb, ...h]);
      setSelected(new Set());
      setForm({
        place_of_consignor: '',
        state_of_consignor: '07',
        vehicle_number: vehicleNo ?? '',
        mode_of_transport: '1',
        transporter_document_number: tripNo ?? '',
        transporter_document_date: '',
      });
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 w-full">

      {/* ── EWB selection ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Select Active EWBs</h3>
          {activeEwbs.length > 0 && (
            <button type="button" onClick={toggleAll}
              className="text-xs text-indigo-600 hover:underline">
              {selected.size === activeEwbs.length ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>

        {activeEwbs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            No active validated EWBs yet.<br />
            <span className="text-xs">Go to Validate tab first.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {activeEwbs.map(({ ewbNo, rec }) => (
              <label key={ewbNo}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                  ${selected.has(ewbNo) ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}
              >
                <input type="checkbox" checked={selected.has(ewbNo)} onChange={() => toggleSelect(ewbNo)}
                  className="w-4 h-4 rounded accent-indigo-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-indigo-700">{ewbNo}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${STATUS_COLOR[rec.ewb_status] ?? ''}`}>
                      {rec.ewb_status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Valid until {fmtDate(rec.valid_upto)}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        {selected.size > 0 && (
          <p className="mt-2 text-xs text-indigo-600 font-medium">{selected.size} EWBs selected for consolidation</p>
        )}
      </div>

      {/* ── Form + results ── */}
      <div className="space-y-5">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 w-full">
          <h3 className="text-sm font-semibold text-slate-700">Consolidation Details</h3>

          {/* Vehicle number — auto-filled from trip, read-only */}
          {vehicleNo ? (
            <Field label="Vehicle Number (from trip)">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-mono text-sm font-semibold text-slate-800">{vehicleNo}</span>
                <span className="text-xs text-slate-400 ml-auto">Auto-filled</span>
              </div>
            </Field>
          ) : (
            <Field label="Vehicle Number *">
              <input value={form.vehicle_number} onChange={e => set('vehicle_number', e.target.value.toUpperCase())}
                placeholder="UP32AB1234" className={`${inputCls} uppercase`} />
            </Field>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Place of Consignor *">
              <input value={form.place_of_consignor} onChange={e => set('place_of_consignor', e.target.value)}
                placeholder="New Delhi" className={inputCls} />
            </Field>

            <Field label="State of Consignor *">
              <select value={form.state_of_consignor} onChange={e => set('state_of_consignor', e.target.value)}
                className={inputCls}>
                {INDIAN_STATES.map(s => <option key={s.code} value={s.code}>{s.code} – {s.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Mode of Transport">
              <select value={form.mode_of_transport} onChange={e => set('mode_of_transport', e.target.value)}
                className={inputCls}>
                {TRANSPORT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>

            <Field label="Transporter Document Date *">
              <input type="date" value={form.transporter_document_date} onChange={e => set('transporter_document_date', e.target.value)}
                className={inputCls} />
            </Field>
          </div>

          <Field label="Transporter Document No. *">
            <input value={form.transporter_document_number} onChange={e => set('transporter_document_number', e.target.value)}
              placeholder="TR/2025/001" className={inputCls} />
            {tripNo && form.transporter_document_number === tripNo && (
              <p className="text-xs text-slate-400 mt-1">Auto-filled from trip sheet no.</p>
            )}
          </Field>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>}

          <button type="submit" disabled={loading || selected.size < 2}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
            {loading ? <Spinner /> : null}
            {loading ? 'Creating CEWB…' : `Consolidate ${selected.size} EWBs`}
          </button>
        </form>

        {/* Latest result */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-green-700 mb-2">✓ Consolidated EWB Created</p>
            <p className="font-mono text-lg font-bold text-green-800">{result.cewb_number}</p>
            {result.vehicle_number && <p className="text-xs text-green-600 mt-1">Vehicle: {result.vehicle_number}</p>}
          </div>
        )}

        {/* ── Existing CEWBs section ────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Consolidated EWBs for this trip</p>

          {existingCewbs.length === 0 && sessionCewbs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
              <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-slate-500 font-medium">No consolidated CEWB yet</p>
              <p className="text-xs text-slate-400 mt-1">Select active EWBs above and create one.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* EWBs already consolidated (derived from validated records) */}
              {existingCewbs.map((g, i) => (
                <div key={i} className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full">
                      CONSOLIDATED
                    </span>
                    {g.cewb_id ? (
                      <span className="font-mono text-sm font-bold text-purple-900">{g.cewb_id}</span>
                    ) : (
                      <span className="text-xs text-purple-500 italic">CEWB number not in local cache</span>
                    )}
                  </div>
                  <p className="text-xs text-purple-600">
                    Member EWBs: {g.ewbNos.join(', ')}
                  </p>
                </div>
              ))}
              {/* CEWBs created this session */}
              {sessionCewbs.map((c, i) => (
                <div key={i} className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">
                      CREATED THIS SESSION
                    </span>
                    <span className="font-mono text-sm font-bold text-green-900">{c.cewb_number}</span>
                  </div>
                  {c.vehicle_number && (
                    <p className="text-xs text-green-600">Vehicle: {c.vehicle_number}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

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
