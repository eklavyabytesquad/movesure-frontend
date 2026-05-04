'use client';

import { useState, useEffect, useRef } from 'react';
import type { BiltySummary } from '../types';

interface Props {
  recent:   BiltySummary[];
  loading:  boolean;
  onSelect: (id: string) => void;
}

export default function BiltySearchBar({ recent, loading, onSelect }: Props) {
  const [query,      setQuery]      = useState('');
  const [open,       setOpen]       = useState(false);
  const [hi,         setHi]         = useState(0);
  const [shownCount, setShownCount] = useState(10);
  const ref = useRef<HTMLDivElement>(null);

  const q = query.toLowerCase().trim();
  const regularRecent = recent.filter(b => b.bilty_type !== 'MANUAL');
  const results = q.length === 0
    ? regularRecent.slice(0, shownCount)
    : regularRecent.filter(b =>
        b.gr_no.toLowerCase().includes(q) ||
        b.consignor_name.toLowerCase().includes(q) ||
        b.consignee_name.toLowerCase().includes(q)
      ).slice(0, 50);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); setHi(0); return; }
      setHi(h => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && results[hi]) {
        e.preventDefault();
        onSelect(results[hi].bilty_id);
        setOpen(false); setQuery('');
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative w-72 sm:w-80">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setHi(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? 'Loading bilties…' : 'Search bilty in this book…'}
          autoComplete="off"
          suppressHydrationWarning
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 right-0 w-88 bg-white border border-slate-200 rounded-xl shadow-xl max-h-96 overflow-y-auto">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            {q ? 'Search results' : 'Recent bilties'} — click to edit
          </p>
          {results.map((b, i) => (
            <button
              key={b.bilty_id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(b.bilty_id); setOpen(false); setQuery(''); }}
              onMouseEnter={() => setHi(i)}
              className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-slate-100 last:border-b-0 ${
                i === hi ? 'bg-indigo-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold font-mono text-slate-900 text-xs">{b.gr_no}</span>
                <span className="text-[11px] text-slate-400">
                  {b.bilty_date
                    ? new Date(b.bilty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                    : ''}
                </span>
              </div>
              <div className="text-xs text-slate-600 truncate">{b.consignor_name} → {b.consignee_name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold text-slate-800">₹{b.total_amount?.toLocaleString('en-IN') ?? '—'}</span>
                <span className="text-[10px] text-slate-400 uppercase">{b.payment_mode}</span>
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                  b.status === 'SAVED'        ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  b.status === 'CANCELLED'    ? 'bg-red-50 text-red-600 border-red-200' :
                  b.status === 'PENDING_SYNC' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                  'bg-slate-100 text-slate-600 border-slate-200'
                }`}>{b.status === 'PENDING_SYNC' ? '⏳ Pending Sync' : b.status}</span>
              </div>
            </button>
          ))}
          {!q && regularRecent.length > shownCount && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setShownCount(n => n + 10); setOpen(true); }}
              className="w-full text-center px-3 py-2 text-xs text-indigo-600 font-medium hover:bg-indigo-50 border-t border-slate-100 transition-colors"
            >
              Load 10 more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
