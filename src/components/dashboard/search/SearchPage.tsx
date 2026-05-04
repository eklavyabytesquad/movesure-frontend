'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { generateFirstA4 } from '../bilty/templates/first-a4-template';
import { generateSecondA4 } from '../bilty/templates/second-a4-template';
import { generateThirdA4 } from '../bilty/templates/third-a4-template';
import type { BiltyData } from '../bilty/templates/first-a4-template';
import type { PrimaryTemplate } from '../bilty/types';

// ── Types ────────────────────────────────────────────────────────────────────

interface BiltyResult {
  bilty_id: string;
  gr_no: string;
  bilty_date: string;
  bilty_type: 'REGULAR' | 'MANUAL';
  consignor_name?: string | null;
  consignee_name?: string | null;
  from_city_id?: string | null;
  from_city_name?: string | null;
  to_city_id?: string | null;
  to_city_name?: string | null;
  payment_mode?: string | null;
  delivery_type?: string | null;
  total_amount?: number | null;
  freight_amount?: number | null;
  status?: string | null;
  e_way_bills?: { ewb_no?: string }[];
  consignor_gstin?: string | null;
  consignee_gstin?: string | null;
}

interface City { city_id: string; city_name: string; }

interface SearchFilters {
  gr_no: string;
  from_date: string;
  to_date: string;
  payment_mode: string;
  delivery_type: string;
  bilty_type: string;
  consignor: string;
  consignee: string;
  from_city_id: string;
  to_city_id: string;
  // advanced
  ewb_no: string;
  gstin: string;
  min_freight: string;
  max_freight: string;
}

const EMPTY_FILTERS: SearchFilters = {
  gr_no: '', from_date: '', to_date: '', payment_mode: '', delivery_type: '',
  bilty_type: '', consignor: '', consignee: '', from_city_id: '', to_city_id: '',
  ewb_no: '', gstin: '', min_freight: '', max_freight: '',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT:            'bg-slate-100 text-slate-600',
  SAVED:            'bg-blue-50 text-blue-700',
  DISPATCHED:       'bg-indigo-50 text-indigo-700',
  REACHED_HUB:      'bg-purple-50 text-purple-700',
  AT_GODOWN:        'bg-yellow-50 text-yellow-700',
  OUT_FOR_DELIVERY: 'bg-orange-50 text-orange-700',
  DELIVERED:        'bg-green-50 text-green-700',
  UNDELIVERED:      'bg-red-50 text-red-700',
  CANCELLED:        'bg-red-100 text-red-600',
};

// ── Main Component ───────────────────────────────────────────────────────────

export default function SearchPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [results, setResults] = useState<BiltyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [cities, setCities] = useState<City[]>([]);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const PAGE_SIZE = 25;

  // Load cities for dropdowns
  useEffect(() => {
    apiFetch('/v1/master/cities?limit=500')
      .then((res) => res.json())
      .then((d: any) => setCities(d.cities ?? d.data ?? []))
      .catch(() => {});
  }, []);

  const cityMap = Object.fromEntries(cities.map((c) => [c.city_id, c.city_name]));

  const setF = (key: keyof SearchFilters, val: string) =>
    setFilters((f) => ({ ...f, [key]: val }));

  const buildQuery = useCallback((f: SearchFilters, pg: number) => {
    const params = new URLSearchParams();
    if (f.bilty_type)     params.set('bilty_type', f.bilty_type);
    if (f.payment_mode)   params.set('payment_mode', f.payment_mode);
    if (f.from_date)      params.set('from_date', f.from_date);
    if (f.to_date)        params.set('to_date', f.to_date);
    // from_city_id / to_city_id not supported by API — filtered client-side
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(pg * PAGE_SIZE));
    return params.toString();
  }, [])

  const doSearch = useCallback(async (pg = 0) => {
    setLoading(true);
    setSearched(true);
    try {
      const qs = buildQuery(filters, pg);
      const res = await apiFetch(`/v1/bilty?${qs}`);
      const d: any = await res.json();
      let rows: BiltyResult[] = d.bilties ?? d.data ?? [];

      // Client-side filters for fields not supported by API
      const grQ      = filters.gr_no.toLowerCase().trim();
      const cnorQ    = filters.consignor.toLowerCase().trim();
      const cneeQ    = filters.consignee.toLowerCase().trim();
      const ewbQ     = filters.ewb_no.trim();
      const gstinQ   = filters.gstin.toLowerCase().trim();
      const minAmt   = filters.min_freight ? Number(filters.min_freight) : null;
      const maxAmt   = filters.max_freight ? Number(filters.max_freight) : null;
      const dtQ      = filters.delivery_type;
      const fromCityQ = filters.from_city_id;
      const toCityQ   = filters.to_city_id;

      rows = rows.filter((b) => {
        if (grQ && !b.gr_no.toLowerCase().includes(grQ)) return false;
        if (cnorQ && !(b.consignor_name ?? '').toLowerCase().includes(cnorQ)) return false;
        if (cneeQ && !(b.consignee_name ?? '').toLowerCase().includes(cneeQ)) return false;
        if (dtQ && b.delivery_type !== dtQ) return false;
        if (fromCityQ && b.from_city_id !== fromCityQ) return false;
        if (toCityQ   && b.to_city_id   !== toCityQ)   return false;
        if (ewbQ) {
          const ewbs = (b.e_way_bills ?? []).map((e) => e.ewb_no ?? '').join(' ');
          if (!ewbs.includes(ewbQ)) return false;
        }
        if (gstinQ) {
          const combined = `${b.consignor_gstin ?? ''} ${b.consignee_gstin ?? ''}`.toLowerCase();
          if (!combined.includes(gstinQ)) return false;
        }
        // min/max filter on total_amount (full bilty amount)
        if (minAmt !== null && (b.total_amount ?? 0) < minAmt) return false;
        if (maxAmt !== null && (b.total_amount ?? 0) > maxAmt) return false;
        return true;
      });

      setResults(rows);
      setTotal(d.total ?? rows.length);
      setPage(pg);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [filters, buildQuery]);

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setResults([]);
    setSearched(false);
    setPage(0);
  };

  // Print a REGULAR bilty
  const handlePrint = async (biltyId: string) => {
    setPrintingId(biltyId);
    try {
      const [biltyRes, tplRes] = await Promise.all([
        apiFetch(`/v1/bilty/${biltyId}`),
        apiFetch('/v1/bilty-setting/templates?is_primary=true&is_active=true&limit=1'),
      ]);
      const biltyData: any = await biltyRes.json();
      const tplData: any = await tplRes.json();
      const b: BiltyData = biltyData.bilty ?? biltyData;
      const tpls: PrimaryTemplate[] = tplData.templates ?? tplData.data ?? [];
      const tpl = tpls[0];
      if (!tpl) { alert('No active template found.'); return; }

      let url = '';
      if (tpl.slug === 'second-a4-template') url = await generateSecondA4(b, tpl);
      else if (tpl.slug === 'third-a4-template') url = await generateThirdA4(b, tpl);
      else url = await generateFirstA4(b, tpl);

      setPdfUrl(url);
    } catch (e) {
      alert('Print failed. Please try again.');
    } finally {
      setPrintingId(null);
    }
  };

  const handleEdit = (b: BiltyResult) => {
    if (b.bilty_type === 'MANUAL') {
      router.push(`/dashboard/manual?edit=${b.bilty_id}`);
    } else {
      router.push(`/dashboard/bilty?edit=${b.bilty_id}`);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto bg-slate-50">
      {/* PDF Preview Modal */}
      {pdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-5xl h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <span className="font-semibold text-slate-800">Bilty Preview</span>
              <button onClick={() => setPdfUrl(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
            </div>
            <iframe src={pdfUrl} className="flex-1 rounded-b-xl" />
          </div>
        </div>
      )}

<div className="px-4 sm:px-6 lg:px-8 py-5 w-full space-y-4">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bilty Search</h1>
          <p className="text-sm text-slate-500 mt-0.5">Search across all REGULAR and MANUAL bilties</p>
        </div>

        {/* ── Filter card ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">

          {/* Basic filters — row 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            <FilterInput label="GR No" placeholder="e.g. MUM/0042" value={filters.gr_no} onChange={(v) => setF('gr_no', v)} />
            <FilterInput label="From Date" type="date" value={filters.from_date} onChange={(v) => setF('from_date', v)} />
            <FilterInput label="To Date" type="date" value={filters.to_date} onChange={(v) => setF('to_date', v)} />
            <FilterSelect label="Payment Mode" value={filters.payment_mode} onChange={(v) => setF('payment_mode', v)}
              options={[{ label: 'All', value: '' }, { label: 'PAID', value: 'PAID' }, { label: 'TO-PAY', value: 'TO-PAY' }, { label: 'FOC', value: 'FOC' }]} />
            <FilterSelect label="Delivery Type" value={filters.delivery_type} onChange={(v) => setF('delivery_type', v)}
              options={[{ label: 'All', value: '' }, { label: 'DOOR', value: 'DOOR' }, { label: 'GODOWN', value: 'GODOWN' }]} />
            <FilterSelect label="Bilty Type" value={filters.bilty_type} onChange={(v) => setF('bilty_type', v)}
              options={[{ label: 'All', value: '' }, { label: 'REGULAR', value: 'REGULAR' }, { label: 'MANUAL', value: 'MANUAL' }]} />
          </div>

          {/* Basic filters — row 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <FilterInput label="Consignor" placeholder="Consignor name…" value={filters.consignor} onChange={(v) => setF('consignor', v)} />
            <FilterInput label="Consignee" placeholder="Consignee name…" value={filters.consignee} onChange={(v) => setF('consignee', v)} />
            <FilterSelect label="From City" value={filters.from_city_id} onChange={(v) => setF('from_city_id', v)}
              options={[{ label: 'All Cities', value: '' }, ...cities.map((c) => ({ label: c.city_name, value: c.city_id }))]} />
            <FilterSelect label="To City" value={filters.to_city_id} onChange={(v) => setF('to_city_id', v)}
              options={[{ label: 'All Cities', value: '' }, ...cities.map((c) => ({ label: c.city_name, value: c.city_id }))]} />
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
          </button>

          {/* Advanced filters */}
          {showAdvanced && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
              <FilterInput label="E-Way Bill No" placeholder="EWB number…" value={filters.ewb_no} onChange={(v) => setF('ewb_no', v)} />
              <FilterInput label="GSTIN" placeholder="Consignor / consignee GSTIN…" value={filters.gstin} onChange={(v) => setF('gstin', v)} />
              <FilterInput label="Min Amount (₹)" type="number" placeholder="0" value={filters.min_freight} onChange={(v) => setF('min_freight', v)} />
              <FilterInput label="Max Amount (₹)" type="number" placeholder="99999" value={filters.max_freight} onChange={(v) => setF('max_freight', v)} />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
            <button
              onClick={() => doSearch(0)}
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              Search
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Reset
            </button>
            {searched && !loading && (
              <span className="text-sm text-slate-500 ml-auto">
                {results.length === 0 ? 'No results' : `${results.length} result${results.length !== 1 ? 's' : ''}${total > PAGE_SIZE ? ` (page ${page + 1})` : ''}`}
              </span>
            )}
          </div>
        </div>

        {/* ── Results table ── */}
        {searched && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-slate-400">
                <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">No bilties found matching your filters</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">GR No</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">From → To</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Consignor</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Consignee</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.map((b) => {
                        const fromCity = b.from_city_name ?? cityMap[b.from_city_id ?? ''] ?? b.from_city_id ?? '—';
                        const toCity   = b.to_city_name   ?? cityMap[b.to_city_id   ?? ''] ?? b.to_city_id   ?? '—';
                        const isReg    = b.bilty_type === 'REGULAR';
                        const isPrinting = printingId === b.bilty_id;
                        return (
                          <tr key={b.bilty_id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">{b.gr_no}</td>
                            <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{b.bilty_date}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-wide ${isReg ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                                {isReg ? 'REG' : 'MNL'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-700 whitespace-nowrap">
                              <span className="font-medium">{fromCity}</span>
                              <span className="text-slate-400 mx-1">→</span>
                              <span className="font-medium">{toCity}</span>
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-700 max-w-30 truncate">{b.consignor_name ?? '—'}</td>
                            <td className="px-3 py-3 text-xs text-slate-700 max-w-30 truncate">{b.consignee_name ?? '—'}</td>
                            <td className="px-3 py-3">
                              <span className={`text-xs font-semibold ${b.payment_mode === 'PAID' ? 'text-green-600' : b.payment_mode === 'FOC' ? 'text-slate-500' : 'text-orange-600'}`}>
                                {b.payment_mode ?? '—'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-xs text-right font-semibold text-slate-800 whitespace-nowrap">
                              {b.total_amount != null ? `₹${b.total_amount.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="px-3 py-3">
                              {b.status ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[b.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                  {b.status.replace(/_/g, ' ')}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {/* Print — REGULAR only */}
                                {isReg && (
                                  <button
                                    onClick={() => handlePrint(b.bilty_id)}
                                    disabled={isPrinting}
                                    title="Print bilty"
                                    className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                                  >
                                    {isPrinting ? (
                                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                      </svg>
                                    )}
                                  </button>
                                )}
                                {/* Edit — both types */}
                                <button
                                  onClick={() => handleEdit(b)}
                                  title="Edit bilty"
                                  className="p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {total > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                    <span className="text-xs text-slate-500">Page {page + 1}</span>
                    <div className="flex gap-2">
                      <button
                        disabled={page === 0 || loading}
                        onClick={() => doSearch(page - 1)}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
                      >
                        ← Previous
                      </button>
                      <button
                        disabled={results.length < PAGE_SIZE || loading}
                        onClick={() => doSearch(page + 1)}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
      />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
