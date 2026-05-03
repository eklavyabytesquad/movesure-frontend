// Searchable challan combobox — handles 100+ challans comfortably
'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Challan, isChallanEditable } from '../types';

interface Props {
  challans: Challan[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading?: boolean;
}

export default function ChallanSelector({ challans, selectedId, onSelect, loading }: Props) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const inputRef            = useRef<HTMLInputElement>(null);
  const containerRef        = useRef<HTMLDivElement>(null);

  const selected = challans.find(c => c.challan_id === selectedId) ?? null;

  const filtered = query.trim()
    ? challans.filter(c => {
        const q = query.toLowerCase();
        return (
          (c.challan_no ?? '').toLowerCase().includes(q) ||
          (c.challan_date ?? '').includes(q) ||
          (c.transport_name ?? '').toLowerCase().includes(q) ||
          (c.vehicle_info?.vehicle_no ?? '').toLowerCase().includes(q)
        );
      })
    : challans;

  // Close on outside click
  const handleOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
      setQuery('');
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleOutside);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.removeEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open, handleOutside]);

  function pick(id: string) {
    onSelect(id);
    setOpen(false);
    setQuery('');
  }

  // Label for trigger button
  function triggerLabel() {
    if (!selected) return '— Select challan —';
    const status = selected.challan_status ?? selected.status ?? '';
    return `${selected.is_primary ? '★ ' : ''}${selected.challan_no ?? selected.challan_id}${status ? ` [${status}]` : ''}`;
  }

  return (
    <div ref={containerRef} className="flex items-center gap-2 min-w-0">
      <label className="text-[11px] font-semibold text-gray-500 whitespace-nowrap shrink-0">
        Challan
      </label>

      <div className="relative">
        {/* Trigger button */}
        <button
          type="button"
          disabled={loading}
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 border border-gray-300 rounded-lg pl-3 pr-2.5 py-1.5 text-xs font-semibold text-gray-800 bg-white hover:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60 min-w-52 max-w-72 transition-colors"
        >
          <span className="flex-1 text-left truncate">{loading ? 'Loading…' : triggerLabel()}</span>
          <svg className={`h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown panel */}
        {open && (
          <div className="absolute z-50 mt-1 w-80 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">

            {/* Search input */}
            <div className="px-3 pt-2.5 pb-2 border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by challan no, date, transport…"
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                {query && (
                  <button onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm leading-none">
                    ✕
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[10px] text-gray-400">
                {filtered.length} of {challans.length} challans
              </p>
            </div>

            {/* Options list */}
            <div className="overflow-y-auto max-h-64">
              {filtered.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">No challans match</div>
              ) : (
                filtered.map(c => {
                  const status   = c.challan_status ?? c.status ?? '';
                  const editable = isChallanEditable(c);
                  const active   = c.challan_id === selectedId;
                  return (
                    <button
                      key={c.challan_id}
                      type="button"
                      onClick={() => pick(c.challan_id)}
                      className={`w-full text-left px-3 py-2.5 flex items-start gap-3 hover:bg-violet-50 transition-colors border-b border-gray-50 last:border-0 ${active ? 'bg-violet-50' : ''}`}
                    >
                      {/* Left: challan number + date */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {c.is_primary && (
                            <span className="text-[10px] text-yellow-600 font-bold">★</span>
                          )}
                          <span className={`text-xs font-bold ${active ? 'text-violet-700' : 'text-gray-800'}`}>
                            {c.challan_no ?? c.challan_id}
                          </span>
                          {status && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                              status === 'OPEN'  ? 'bg-blue-50 text-blue-600 border-blue-200' :
                              status === 'DRAFT' ? 'bg-gray-100 text-gray-500 border-gray-300' :
                              'bg-gray-100 text-gray-500 border-gray-200'
                            }`}>
                              {status}
                            </span>
                          )}
                          {!editable && (
                            <span className="text-[9px] text-orange-400 font-semibold">closed</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {c.challan_date && (
                            <span className="text-[10px] text-gray-400">{c.challan_date}</span>
                          )}
                          {c.transport_name && (
                            <span className="text-[10px] text-gray-500 truncate">{c.transport_name}</span>
                          )}
                          {c.vehicle_info?.vehicle_no && (
                            <span className="text-[10px] text-blue-500 font-medium">{c.vehicle_info.vehicle_no}</span>
                          )}
                        </div>
                      </div>
                      {/* Right: bilty count */}
                      {(c.bilty_count ?? 0) > 0 && (
                        <span className="shrink-0 text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full mt-0.5">
                          {c.bilty_count} bilties
                        </span>
                      )}
                      {active && (
                        <svg className="shrink-0 h-3.5 w-3.5 text-violet-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {!loading && challans.length === 0 && (
        <span className="text-[11px] text-orange-500 font-medium">No active challans</span>
      )}
    </div>
  );
}
