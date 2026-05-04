'use client';
import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import { API_BASE, getToken } from '@/lib/auth';
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
  transporterName: string;
  transporterId: string;
  pdfFetched: boolean;
  updatedAt: string;
  pdf_url?: string;
}

const EMPTY_FORM = { transporter_id: '', transporter_name: '', fetchPdf: false };

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export default function EwbTransporterTab({ validatedEwbs, bilties }: Props) {
  const [selectedEwb, setSelectedEwb]           = useState('');
  const [form, setForm]                         = useState(EMPTY_FORM);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState('');
  const [lookupLoading, setLookupLoading]       = useState(false);
  const [lookupName, setLookupName]             = useState('');
  const [transportMaster, setTransportMaster]   = useState<TransportMaster[]>([]);
  const [suggestions, setSuggestions]           = useState<CityTransportSuggestion[]>([]);
  const [cityLoading, setCityLoading]           = useState(false);
  const [transfers, setTransfers]               = useState<TransferRecord[]>([]);
  const [showAllTransports, setShowAllTransports] = useState(false);
  const [allTransportSearch, setAllTransportSearch] = useState('');

  // Pre-load transport master list
  useEffect(() => {
    apiFetch('/v1/master/transports')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setTransportMaster(data.transports ?? []); })
      .catch(() => {});
  }, []);

  // ewbNo → bilty lookup map
  const ewbBiltyMap = useMemo(() => {
    const m: Record<string, EwbBilty> = {};
    bilties.forEach(b => { b.ewbs.forEach(e => { m[e.ewb_no] = b; }); });
    return m;
  }, [bilties]);

  // Flat list of EWB rows — bilties first, then any extra validated-only
  const rows = useMemo(() => {
    const seen = new Set<string>();
    const out: { ewbNo: string; bilty: EwbBilty | undefined }[] = [];
    bilties.forEach(b => {
      b.ewbs.forEach(e => {
        if (!seen.has(e.ewb_no)) {
          seen.add(e.ewb_no);
          out.push({ ewbNo: e.ewb_no, bilty: b });
        }
      });
    });
    Object.keys(validatedEwbs).forEach(n => {
      if (!seen.has(n)) { seen.add(n); out.push({ ewbNo: n, bilty: undefined }); }
    });
    return out;
  }, [bilties, validatedEwbs]);

  // Fetch city-transport suggestions when an EWB is selected
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
    setSelectedEwb(prev => prev === ewbNo ? '' : ewbNo);
    setForm(EMPTY_FORM);
    setError('');
    setLookupName('');
    setSuggestions([]);
    setShowAllTransports(false);
    setAllTransportSearch('');
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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          eway_bill_number: Number(digits),
          transporter_id:   form.transporter_id.trim().toUpperCase(),
          transporter_name: form.transporter_name.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const d = data.detail;
        setError(typeof d === 'object' ? (d?.error ?? d?.message ?? 'Update failed.') : (d ?? 'Update failed.'));
        return;
      }

      const result = data.data ?? data;
      const bilty  = ewbBiltyMap[selectedEwb];
      setTransfers(h => [{
        ewbNo:           selectedEwb,
        grNo:            bilty?.gr_no ?? '',
        transporterName: form.transporter_name.trim() || result.transporter_name || '',
        transporterId:   form.transporter_id.trim().toUpperCase(),
        pdfFetched:      form.fetchPdf,
        updatedAt:       new Date().toISOString(),
        pdf_url:         result.pdf_url,
      }, ...h]);

      // Keep selectedEwb so user sees the success panel; form resets
      setForm(EMPTY_FORM);
      setLookupName('');
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setLoading(false);
    }
  }

  const selectedBilty     = ewbBiltyMap[selectedEwb];
  const selectedRec       = validatedEwbs[selectedEwb];
  const selectedTransfers = transfers.filter(t => t.ewbNo === selectedEwb);

  return (
    <div className="flex gap-4 items-start">

      {/* ══════════════════ LEFT: EWB list table ══════════════════ */}
      <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 overflow-hidden">

        {/* Table title bar */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">E-Way Bills</p>
          <span className="text-xs text-slate-400">{rows.length} total</span>
        </div>

        {rows.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-400 italic">
            No EWBs found. Validate EWBs in the Validate tab first.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">EWB No.</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">GR No.</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">From → Destination</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Transporter</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(({ ewbNo, bilty }) => {
                  const rec            = validatedEwbs[ewbNo];
                  const isSelected     = selectedEwb === ewbNo;
                  const rowTransfers   = transfers.filter(t => t.ewbNo === ewbNo);
                  const wasTransferred = rowTransfers.length > 0;
                  const latest         = rowTransfers[0];

                  return (
                    <tr
                      key={ewbNo}
                      onClick={() => selectEwb(ewbNo)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200'
                          : wasTransferred
                          ? 'bg-green-50 hover:bg-green-100'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* EWB No */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />}
                          <span className="font-mono font-bold text-indigo-700">{ewbNo}</span>
                        </div>
                      </td>

                      {/* GR No */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {bilty ? (
                          <div>
                            <p className="font-mono font-semibold text-slate-800">{bilty.gr_no}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(bilty.bilty_date)}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* From → To */}
                      <td className="px-3 py-3 min-w-40">
                        {bilty ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-slate-600 font-medium truncate max-w-18"
                              title={bilty.consignor_name}>
                              {bilty.from_city_name ?? bilty.consignor_name ?? '—'}
                            </span>
                            <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-indigo-600 font-semibold truncate max-w-18"
                              title={bilty.consignee_name}>
                              {bilty.to_city_name ?? bilty.consignee_name ?? '—'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {rec ? (
                          <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded-full
                            ${STATUS_COLOR[rec.ewb_status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {rec.ewb_status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Not validated</span>
                        )}
                      </td>

                      {/* Transporter */}
                      <td className="px-3 py-3 min-w-30">
                        {wasTransferred ? (
                          <div>
                            <p className="font-medium text-green-700 truncate max-w-35"
                              title={latest.transporterName}>
                              ✓ {latest.transporterName || latest.transporterId}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{latest.transporterId}</p>
                          </div>
                        ) : rec?.transporter_name ? (
                          <p className="text-slate-500 truncate max-w-35" title={rec.transporter_name}>
                            {rec.transporter_name}
                          </p>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Print button (only after session transfer) */}
                      <td className="px-3 py-3 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                        {wasTransferred && (
                          <a
                            href={`${API_BASE}/v1/ewaybill/pdf?eway_bill_number=${ewbNo.replace(/\D/g, '')}&token=${getToken() ?? ''}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-indigo-200
                              bg-indigo-50 text-indigo-700 text-[10px] font-semibold hover:bg-indigo-100 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════ RIGHT: Assignment form ══════════════════ */}
      <div className="w-80 shrink-0 space-y-3">

        <div className={`bg-white rounded-xl border p-4 space-y-4 ${
          selectedEwb
            ? selectedTransfers.length > 0
              ? 'border-green-300'
              : 'border-indigo-300'
            : 'border-slate-200'
        }`}>

          {/* ── Header ── */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Assign Transporter</h3>
            {selectedEwb ? (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50
                    border border-indigo-200 px-2 py-0.5 rounded-lg">
                    {selectedEwb}
                  </span>
                  {selectedRec && (
                    <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded-full
                      ${STATUS_COLOR[selectedRec.ewb_status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {selectedRec.ewb_status}
                    </span>
                  )}
                </div>
                {selectedBilty && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 flex-wrap">
                    <span className="font-medium text-slate-700">
                      {selectedBilty.from_city_name ?? selectedBilty.consignor_name}
                    </span>
                    <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-semibold text-indigo-600">
                      {selectedBilty.to_city_name ?? selectedBilty.consignee_name}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-1">← Select an EWB from the list</p>
            )}
          </div>

          {/* ── Success + PDF panel (after assignment) ── */}
          {selectedTransfers.length > 0 && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-2">
              <p className="text-xs font-semibold text-green-800 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Transporter assigned
              </p>
              {selectedTransfers.map((t, i) => (
                <div key={i}>
                  <p className="text-xs font-semibold text-slate-700 truncate">{t.transporterName}</p>
                  <p className="text-[10px] font-mono text-slate-500">{t.transporterId}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <a
                      href={`${API_BASE}/v1/ewaybill/pdf?eway_bill_number=${selectedEwb.replace(/\D/g, '')}&token=${getToken() ?? ''}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200
                        bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print EWB
                    </a>
                    {t.pdf_url && (
                      <a href={t.pdf_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-300
                          bg-white text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── City transport suggestions ── */}
          {selectedEwb && cityLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Spinner /> Loading suggestions…
            </div>
          )}

          {selectedEwb && !cityLoading && suggestions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1.5">
                Suggested for destination
              </p>
              <div className="space-y-1.5">
                {suggestions.map(s => (
                  <button key={s.id} type="button" onClick={() => useSuggestion(s)}
                    className="w-full text-left rounded-lg border border-amber-200 bg-amber-50 px-3 py-2
                      hover:border-amber-400 hover:bg-amber-100 transition-all">
                    <p className="text-xs font-semibold text-amber-900">{s.transport_name}</p>
                    {s.gstin
                      ? <p className="text-[10px] font-mono text-amber-700">{s.gstin}</p>
                      : <p className="text-[10px] text-amber-500 italic">No GSTIN — enter manually</p>
                    }
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Other transports collapsible picker ── */}
          {selectedEwb && !cityLoading && transportMaster.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => setShowAllTransports(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 text-xs
                  font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                <span>Other Transports ({transportMaster.length})</span>
                <svg className={`w-3.5 h-3.5 transition-transform ${showAllTransports ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showAllTransports && (
                <div className="p-2.5 space-y-2">
                  <input value={allTransportSearch}
                    onChange={e => setAllTransportSearch(e.target.value)}
                    placeholder="Search name or GSTIN…"
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs
                      focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
                    {transportMaster
                      .filter(t => {
                        const q = allTransportSearch.trim().toLowerCase();
                        if (!q) return true;
                        return t.transport_name.toLowerCase().includes(q)
                          || (t.gstin ?? '').toLowerCase().includes(q)
                          || (t.transport_code ?? '').toLowerCase().includes(q);
                      })
                      .map(t => (
                        <button key={t.transport_id} type="button"
                          onClick={() => {
                            if (t.gstin) set('transporter_id', t.gstin.toUpperCase());
                            set('transporter_name', t.transport_name);
                            setShowAllTransports(false);
                            setAllTransportSearch('');
                          }}
                          className="w-full text-left rounded-lg border border-slate-200 bg-white px-2.5 py-1.5
                            hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                          <p className="text-xs font-semibold text-slate-800">{t.transport_name}</p>
                          {t.gstin
                            ? <p className="text-[10px] font-mono text-slate-500">{t.gstin}</p>
                            : <p className="text-[10px] text-slate-400 italic">No GSTIN</p>
                          }
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Assignment form ── */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                Transporter GSTIN *
              </label>
              <div className="flex gap-1.5">
                <input
                  value={form.transporter_id}
                  onChange={e => set('transporter_id', e.target.value.toUpperCase())}
                  onBlur={lookupTransporter}
                  placeholder="29AABCU9603R1ZX"
                  maxLength={15}
                  disabled={!selectedEwb}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono
                    focus:outline-none focus:ring-2 focus:ring-indigo-400
                    disabled:bg-slate-50 disabled:text-slate-400"
                />
                <button type="button" onClick={lookupTransporter}
                  disabled={lookupLoading || !selectedEwb}
                  className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-600
                    hover:bg-slate-50 disabled:opacity-50 transition-colors shrink-0">
                  {lookupLoading ? <Spinner /> : 'Lookup'}
                </button>
              </div>
              {lookupName && <p className="text-xs text-green-700 mt-1 font-medium">✓ {lookupName}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                Transporter Name
              </label>
              <input
                value={form.transporter_name}
                onChange={e => set('transporter_name', e.target.value)}
                placeholder="Fast Carriers Pvt Ltd"
                disabled={!selectedEwb}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs
                  focus:outline-none focus:ring-2 focus:ring-indigo-400
                  disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.fetchPdf}
                onChange={e => set('fetchPdf', e.target.checked)}
                disabled={!selectedEwb}
                className="w-4 h-4 rounded accent-indigo-600"
              />
              <span className="text-xs text-slate-700">Fetch updated PDF (Part-B)</span>
            </label>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !selectedEwb}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300
                text-white font-semibold py-2.5 rounded-lg text-sm transition-colors
                flex items-center justify-center gap-2">
              {loading && <Spinner />}
              {loading ? 'Updating…' : 'Assign Transporter'}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
