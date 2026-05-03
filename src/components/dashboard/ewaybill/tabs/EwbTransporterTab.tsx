'use client';
import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import { EwbRecord, EwbBilty, STATUS_COLOR, fmtDate } from '../types';

interface Props {
  validatedEwbs: Record<string, EwbRecord>;
  bilties: EwbBilty[];
}

interface TransportMaster {
  transport_id: string;
  transport_name: string;
  transport_code?: string;
  gstin?: string;
}

interface CityTransportLink {
  id: string;
  city_id: string;
  transport_id: string;
  manager_name?: string;
  address?: string;
  branch_mobile?: { label: string; mobile: string }[];
}

interface CityTransportSuggestion {
  id: string;
  transport_id: string;
  transport_name: string;
  gstin?: string;
  manager_name?: string;
}

interface TransferRecord {
  ewbNo: string;
  grNo: string;
  consignorName: string;
  consigneeName: string;
  transporterName: string;
  transporterId: string;
  pdfFetched: boolean;
  updatedAt: string;
  pdf_url?: string;
}

const EMPTY_FORM = { transporter_id: '', transporter_name: '', fetchPdf: false };

export default function EwbTransporterTab({ validatedEwbs, bilties }: Props) {
  const [selectedEwb, setSelectedEwb]       = useState('');
  const [form, setForm]                     = useState(EMPTY_FORM);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [lookupLoading, setLookupLoading]   = useState(false);
  const [lookupName, setLookupName]         = useState('');
  const [transportMaster, setTransportMaster] = useState<TransportMaster[]>([]);
  const [suggestions, setSuggestions]       = useState<CityTransportSuggestion[]>([]);
  const [cityLoading, setCityLoading]       = useState(false);
  const [transfers, setTransfers]           = useState<TransferRecord[]>([]);

  // Pre-load transport master (for GSTIN cross-reference when suggestions come back)
  useEffect(() => {
    apiFetch('/v1/master/transports')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setTransportMaster(data.transports ?? []); })
      .catch(() => {});
  }, []);

  // Build ewbNo → bilty lookup
  const ewbBiltyMap = useMemo(() => {
    const m: Record<string, EwbBilty> = {};
    bilties.forEach(b => { b.ewbs.forEach(e => { m[e.ewb_no] = b; }); });
    return m;
  }, [bilties]);

  // All EWBs: bilty order first, then any extra validated-only
  const allEwbNos = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    bilties.forEach(b => {
      b.ewbs.forEach(e => {
        if (!seen.has(e.ewb_no)) { seen.add(e.ewb_no); out.push(e.ewb_no); }
      });
    });
    Object.keys(validatedEwbs).forEach(n => {
      if (!seen.has(n)) { seen.add(n); out.push(n); }
    });
    return out;
  }, [bilties, validatedEwbs]);

  // Fetch city-transport suggestions when EWB is selected
  useEffect(() => {
    setSuggestions([]);
    if (!selectedEwb) return;
    const bilty = ewbBiltyMap[selectedEwb];
    if (!bilty?.to_city_id) return;

    setCityLoading(true);
    apiFetch(`/v1/master/city-transports?city_id=${bilty.to_city_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const links: CityTransportLink[] = data.city_transports ?? data.links ?? [];
        setSuggestions(links.filter(l => l.transport_id).map(l => {
          const t = transportMaster.find(tm => tm.transport_id === l.transport_id);
          return {
            id:             l.id,
            transport_id:   l.transport_id,
            transport_name: t?.transport_name ?? 'Unknown Transport',
            gstin:          t?.gstin,
            manager_name:   l.manager_name,
          };
        }));
      })
      .catch(() => {})
      .finally(() => setCityLoading(false));
  }, [selectedEwb, ewbBiltyMap, transportMaster]);

  function selectEwb(ewbNo: string) {
    const next = ewbNo === selectedEwb ? '' : ewbNo;
    setSelectedEwb(next);
    setForm(EMPTY_FORM);
    setError('');
    setLookupName('');
    setSuggestions([]);
  }

  function set(k: keyof typeof EMPTY_FORM, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }));
    setError('');
  }

  function useSuggestion(s: CityTransportSuggestion) {
    if (s.gstin) set('transporter_id', s.gstin.toUpperCase());
    set('transporter_name', s.transport_name);
  }

  async function lookupTransporter() {
    const gstin = form.transporter_id.trim();
    if (gstin.length < 15) return;
    setLookupLoading(true);
    setLookupName('');
    try {
      const res  = await apiFetch(`/v1/ewaybill/transporter?gstin=${gstin}`);
      const data = await res.json();
      if (res.ok) {
        const name = data.data?.lgnm ?? data.lgnm ?? '';
        setLookupName(name);
        if (name) set('transporter_name', name);
      }
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = selectedEwb.replace(/\D/g, '');
    if (digits.length !== 12) { setError('Select a valid 12-digit EWB.'); return; }
    if (!form.transporter_id.trim()) { setError('Transporter GSTIN is required.'); return; }

    setLoading(true);
    setError('');
    try {
      const endpoint = form.fetchPdf
        ? '/v1/ewaybill/transporter-update-pdf'
        : '/v1/ewaybill/transporter-update';

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eway_bill_number: Number(digits),
          transporter_id:   form.transporter_id.trim().toUpperCase(),
          transporter_name: form.transporter_name.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const d = data.detail;
        setError(typeof d === 'object' ? (d?.error ?? JSON.stringify(d)) : (d ?? 'Update failed.'));
        return;
      }

      const result = data.data ?? data;
      const bilty  = ewbBiltyMap[selectedEwb];
      setTransfers(h => [{
        ewbNo:           selectedEwb,
        grNo:            bilty?.gr_no ?? '',
        consignorName:   bilty?.consignor_name ?? '',
        consigneeName:   bilty?.consignee_name ?? '',
        transporterName: form.transporter_name.trim() || result.transporter_name || '',
        transporterId:   form.transporter_id.trim().toUpperCase(),
        pdfFetched:      form.fetchPdf,
        updatedAt:       new Date().toISOString(),
        pdf_url:         result.pdf_url,
      }, ...h]);

      setSelectedEwb('');
      setForm(EMPTY_FORM);
      setLookupName('');
      setSuggestions([]);
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setLoading(false);
    }
  }

  const selectedBilty = ewbBiltyMap[selectedEwb];
  const selectedRec   = validatedEwbs[selectedEwb];

  return (
    <div className="space-y-4 max-w-3xl mx-auto">

      {/* ── All EWBs grid ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            All E-Way Bills — select one to transfer
          </p>
          <span className="text-xs text-slate-400">{allEwbNos.length} EWBs</span>
        </div>

        {allEwbNos.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-4 text-center">
            No EWBs found in this trip. Validate EWBs first.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {allEwbNos.map(ewbNo => {
              const rec          = validatedEwbs[ewbNo];
              const bilty        = ewbBiltyMap[ewbNo];
              const isSelected   = selectedEwb === ewbNo;
              const statusCls    = rec
                ? (STATUS_COLOR[rec.ewb_status] ?? 'bg-slate-100 text-slate-600 border-slate-200')
                : 'bg-slate-100 text-slate-500 border-slate-200';
              const ewbTransfers = transfers.filter(t => t.ewbNo === ewbNo);

              return (
                <button
                  key={ewbNo}
                  type="button"
                  onClick={() => selectEwb(ewbNo)}
                  className={`text-left rounded-xl border-2 p-3 transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-mono text-sm font-bold text-slate-800 leading-tight">{ewbNo}</span>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {rec && (
                        <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded-full ${statusCls}`}>
                          {rec.ewb_status}
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded-full">
                          SELECTED
                        </span>
                      )}
                    </div>
                  </div>

                  {bilty && (bilty.consignor_name || bilty.consignee_name) && (
                    <div className="text-xs text-slate-500 mb-1 truncate">
                      <span className="font-medium text-slate-700">{bilty.consignor_name}</span>
                      {bilty.consignor_name && bilty.consignee_name && (
                        <span className="mx-1 text-slate-300">→</span>
                      )}
                      <span className="font-medium text-slate-700">{bilty.consignee_name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {bilty?.gr_no && (
                      <span className="text-[10px] text-slate-400 font-mono">GR: {bilty.gr_no}</span>
                    )}
                    {bilty?.to_city_name && (
                      <span className="text-[10px] text-blue-600 font-medium">📍 {bilty.to_city_name}</span>
                    )}
                    {rec?.valid_upto && (
                      <span className="text-[10px] text-slate-400">Valid till {fmtDate(rec.valid_upto)}</span>
                    )}
                  </div>

                  {rec?.transporter_name && (
                    <p className="text-[10px] text-indigo-500 mt-1 truncate">Current: {rec.transporter_name}</p>
                  )}

                  {ewbTransfers.length > 0 && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-0.5">
                      {ewbTransfers.map((t, i) => (
                        <p key={i} className="text-[10px] text-green-700 font-medium truncate">
                          ✓ Transferred → {t.transporterName}
                        </p>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Assignment form ────────────────────────────────────── */}
      {selectedEwb && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Assign Transporter</h3>
              <div className="flex items-center flex-wrap gap-2 mt-1">
                <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                  {selectedEwb}
                </span>
                {selectedBilty?.consignee_name && (
                  <span className="text-xs text-slate-500">
                    → <span className="font-medium text-slate-700">{selectedBilty.consignee_name}</span>
                    {selectedBilty.to_city_name && (
                      <span className="ml-1 text-blue-600">({selectedBilty.to_city_name})</span>
                    )}
                  </span>
                )}
                {selectedRec && (
                  <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded-full ${
                    STATUS_COLOR[selectedRec.ewb_status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {selectedRec.ewb_status}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedEwb(''); setForm(EMPTY_FORM); setError(''); setLookupName(''); }}
              className="shrink-0 text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-2 py-1 rounded-lg transition-colors"
            >
              ✕ Deselect
            </button>
          </div>

          {cityLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Spinner /> Looking up transporters for destination city…
            </div>
          )}

          {!cityLoading && suggestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Suggested transporters for this destination:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions.map(s => (
                  <button key={s.id} type="button" onClick={() => useSuggestion(s)}
                    className="text-left rounded-lg border border-amber-200 bg-amber-50 p-2.5 hover:border-amber-400 hover:bg-amber-100 transition-all">
                    <p className="text-xs font-semibold text-amber-900">{s.transport_name}</p>
                    {s.gstin
                      ? <p className="text-[10px] font-mono text-amber-700 mt-0.5">{s.gstin}</p>
                      : <p className="text-[10px] text-amber-500 italic mt-0.5">GSTIN not on file — enter manually</p>
                    }
                    {s.manager_name && (
                      <p className="text-[10px] text-amber-600 mt-0.5">Manager: {s.manager_name}</p>
                    )}
                    <p className="text-[10px] text-amber-500 font-medium mt-1">↑ Click to use</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!cityLoading && selectedBilty?.to_city_id && suggestions.length === 0 && (
            <p className="text-xs text-slate-400 italic">
              No city-transport links configured for this destination. Enter transporter manually.
            </p>
          )}
          {!cityLoading && !selectedBilty?.to_city_id && (
            <p className="text-xs text-slate-400 italic">
              No destination city on this bilty — enter transporter manually.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Transporter GSTIN *">
              <div className="flex gap-2">
                <input
                  value={form.transporter_id}
                  onChange={e => set('transporter_id', e.target.value.toUpperCase())}
                  onBlur={lookupTransporter}
                  placeholder="29AABCU9603R1ZX"
                  maxLength={15}
                  className={`${inputCls} flex-1 font-mono`}
                />
                <button type="button" onClick={lookupTransporter} disabled={lookupLoading}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
                  {lookupLoading ? <Spinner /> : 'Lookup'}
                </button>
              </div>
              {lookupName && <p className="text-xs text-green-700 mt-1 font-medium">✓ {lookupName}</p>}
            </Field>

            <Field label="Transporter Name">
              <input
                value={form.transporter_name}
                onChange={e => set('transporter_name', e.target.value)}
                placeholder="Fast Carriers Pvt Ltd"
                className={inputCls}
              />
            </Field>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={form.fetchPdf}
                onChange={e => set('fetchPdf', e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600" />
              <span className="text-sm text-slate-700">Also fetch updated PDF (Part-B filled)</span>
            </label>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
              {loading ? <Spinner /> : null}
              {loading ? 'Updating…' : 'Assign Transporter'}
            </button>
          </form>
        </div>
      )}

      {/* ── Transfer history (session) ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
          Transfer History — this session
        </p>
        {transfers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
            <svg className="w-7 h-7 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <p className="text-sm text-slate-500 font-medium">No transfers yet</p>
            <p className="text-xs text-slate-400 mt-1">Select an EWB above and assign a transporter.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transfers.map((t, i) => (
              <div key={i}
                className="flex items-start justify-between gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-sm font-bold text-slate-800">{t.ewbNo}</span>
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 px-1.5 py-0.5 rounded-full">
                      TRANSFERRED
                    </span>
                    {t.pdfFetched && (
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                        + PDF
                      </span>
                    )}
                  </div>
                  {(t.consignorName || t.consigneeName) && (
                    <p className="text-xs text-slate-500 mb-0.5 truncate">
                      <span className="font-medium text-slate-700">{t.consignorName}</span>
                      {t.consignorName && t.consigneeName && <span className="mx-1 text-slate-300">→</span>}
                      <span className="font-medium text-slate-700">{t.consigneeName}</span>
                    </p>
                  )}
                  {t.grNo && <p className="text-[10px] text-slate-400 font-mono mb-0.5">GR: {t.grNo}</p>}
                  <p className="text-xs font-semibold text-slate-700 truncate">{t.transporterName}</p>
                  <p className="text-[10px] font-mono text-slate-500">{t.transporterId}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(t.updatedAt).toLocaleString('en-IN')}
                  </p>
                </div>
                {t.pdf_url && (
                  <a href={t.pdf_url} target="_blank" rel="noreferrer"
                    className="shrink-0 flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium border border-indigo-200 bg-indigo-50 px-2.5 py-2 rounded-lg">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDF
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
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
