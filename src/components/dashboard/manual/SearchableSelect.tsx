'use client';

import { useState, useEffect, useRef } from 'react';

const CLS = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white transition-colors';

export default function SearchableSelect<T>({
  items,
  value,
  onChange,
  labelKey,
  valueKey,
  placeholder,
  emptyLabel,
}: {
  items: T[];
  value: string;
  onChange: (val: string, item?: T) => void;
  labelKey: keyof T;
  valueKey: keyof T;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selectedItem = items.find(i => String(i[valueKey]) === value);
  const label = selectedItem?.[labelKey];

  const filtered = q
    ? items.filter(i => String(i[labelKey]).toLowerCase().includes(q.toLowerCase()))
    : items;

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQ(''); }}
        className={`${CLS} text-left flex items-center justify-between gap-2`}
      >
        <span className={value ? 'text-slate-900 truncate' : 'text-slate-400'}>
          {value ? String(label ?? value) : (placeholder ?? '— Select —')}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-70 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {emptyLabel && (
              <button
                type="button"
                onClick={() => { onChange('', undefined); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-50"
              >
                {emptyLabel}
              </button>
            )}
            {filtered.length === 0 && (
              <p className="text-xs text-center text-slate-400 py-5">No results found</p>
            )}
            {filtered.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { onChange(String(item[valueKey]), item); setOpen(false); setQ(''); }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-violet-50 transition-colors ${
                  String(item[valueKey]) === value
                    ? 'bg-violet-50 text-violet-700 font-semibold'
                    : 'text-slate-800'
                }`}
              >
                {String(item[labelKey])}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
