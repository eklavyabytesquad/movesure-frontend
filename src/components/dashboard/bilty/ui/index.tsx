'use client';

import { useState, useRef, useEffect } from 'react';

export const INPUT    = 'w-full border border-slate-300 rounded-md px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';
export const INPUT_RO = 'w-full border border-slate-200 rounded-md px-2.5 py-1 text-sm bg-slate-50 text-slate-500 cursor-not-allowed';

// ─── TypeaheadInput ──────────────────────────────────────────────────────────
// Standard invoicing-style combobox: starts-with first, then contains.
// Keyboard: ↑ ↓ navigate · Enter select · Escape close.
// Shows top items on focus so user can browse by clicking.

export interface TypeaheadItem {
  id: string;
  label: string;
  sub?: string; // secondary info shown right-aligned in dropdown
}

export interface TypeaheadInputProps {
  items: TypeaheadItem[];
  /** Controlled display text (free-type or derived from selected item) */
  value: string;
  onChange: (text: string) => void;
  onSelect: (item: TypeaheadItem) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function TypeaheadInput({
  items, value, onChange, onSelect, placeholder, required, disabled,
}: TypeaheadInputProps) {
  const [open, setOpen] = useState(false);
  const [hi,   setHi]   = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const q = value.toLowerCase().trim();
  const filtered: TypeaheadItem[] = q.length === 0
    ? items.slice(0, 20)
    : [
        ...items.filter(i => i.label.toLowerCase().startsWith(q)),
        ...items.filter(i => !i.label.toLowerCase().startsWith(q) && i.label.toLowerCase().includes(q)),
      ].slice(0, 30);

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
      setHi(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filtered[hi]) {
        e.preventDefault();
        onSelect(filtered[hi]);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        className={INPUT + (disabled ? ' opacity-60 cursor-not-allowed' : '')}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-0.5 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(item); setOpen(false); }}
              onMouseEnter={() => setHi(i)}
              className={`w-full text-left px-2.5 py-1 text-xs transition-colors flex justify-between items-center gap-2 ${
                i === hi ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="font-medium">{item.label}</span>
              {item.sub && <span className="text-xs text-slate-400 shrink-0">{item.sub}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {label}
    </span>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1.5">
      {children}
    </p>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-slate-500 mb-0.5">{children}</label>;
}

export function PdfPreviewModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900">
        <span className="text-white font-semibold text-sm">Bilty Preview</span>
        <div className="flex gap-2">
          <a href={url} download="bilty.pdf"
            className="text-xs px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium">
            Download
          </a>
          <button type="button" onClick={onClose}
            className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-500 transition-colors font-medium">
            Close
          </button>
        </div>
      </div>
      <iframe src={url} className="flex-1 w-full" title="Bilty PDF Preview" />
    </div>
  );
}
