'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

function getFormFocusable(el: HTMLElement): HTMLElement[] {
  const form = el.closest('form');
  if (!form) return [];
  return Array.from(
    form.querySelectorAll<HTMLElement>(
      'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
    )
  ).filter(e => e.tabIndex !== -1);
}

/** Move focus to the next focusable element inside the closest <form>.
 *  Elements with tabIndex=-1 are intentionally skipped (they are not in the tab order). */
export function focusNextFormElement(current: HTMLElement) {
  const focusable = getFormFocusable(current);
  const idx = focusable.indexOf(current);
  if (idx >= 0 && idx < focusable.length - 1) focusable[idx + 1].focus();
}

/** Move focus to the previous focusable element inside the closest <form>. */
export function focusPrevFormElement(current: HTMLElement) {
  const focusable = getFormFocusable(current);
  const idx = focusable.indexOf(current);
  if (idx > 0) focusable[idx - 1].focus();
}

export const INPUT    = 'w-full border border-slate-300 rounded-md px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';
export const INPUT_RO = 'w-full border border-slate-200 rounded-md px-2.5 py-1 text-sm bg-slate-50 text-slate-500 cursor-not-allowed';

// ─── DateInput ───────────────────────────────────────────────────────────────
// Single-field date input: Tab/Shift+Tab moves as one unit (no segment cycling),
// ↑ = tomorrow, ↓ = yesterday, Enter = move to next field.

export interface DateInputProps {
  value: string;           // YYYY-MM-DD
  onChange: (val: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export function DateInput({ value, onChange, className, required, disabled }: DateInputProps) {
  function todayStr() {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }

  function adjust(days: number) {
    // Parse YYYY-MM-DD as UTC integers to avoid any timezone offset
    const str = value || todayStr();
    const [y, m, d] = str.split('-').map(Number);
    const result = new Date(Date.UTC(y, m - 1, d + days));
    const yy = result.getUTCFullYear();
    const mm = String(result.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(result.getUTCDate()).padStart(2, '0');
    onChange(`${yy}-${mm}-${dd}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      adjust(1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      adjust(-1);
    } else if (e.key === 'Tab') {
      // Prevent browser segment cycling — treat the whole input as one stop
      e.preventDefault();
      if (e.shiftKey) focusPrevFormElement(e.currentTarget);
      else            focusNextFormElement(e.currentTarget);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      focusNextFormElement(e.currentTarget);
    }
  }

  return (
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      required={required}
      disabled={disabled}
      className={className ?? INPUT}
    />
  );
}

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
  const ref     = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const q = value.toLowerCase().trim();
  const filtered = useMemo<TypeaheadItem[]>(() => {
    if (q.length === 0) return items.slice(0, 20);
    return [
      ...items.filter(i =>
        i.label.toLowerCase().startsWith(q) ||
        (i.sub ?? '').toLowerCase().startsWith(q)
      ),
      ...items.filter(i =>
        !i.label.toLowerCase().startsWith(q) &&
        !(i.sub ?? '').toLowerCase().startsWith(q) &&
        (i.label.toLowerCase().includes(q) || (i.sub ?? '').toLowerCase().includes(q))
      ),
    ].slice(0, 30);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, q]);

  // Auto-select when search narrows list to exactly one result
  useEffect(() => {
    if (q.length > 0 && filtered.length === 1 && filtered[0].label.toLowerCase() !== q) {
      onSelect(filtered[0]);
      setOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  // Scroll highlighted item into view on arrow-key navigation
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-hi="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [hi]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
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
        e.stopPropagation(); // prevent form-level Enter handler from also firing
        onSelect(filtered[hi]);
        setOpen(false);
        // Defer so React can flush the dropdown removal before we query DOM
        const target = e.currentTarget;
        setTimeout(() => focusNextFormElement(target), 0);
      }
      // if dropdown is closed, fall through to form-level Enter handler
    } else if (e.key === 'Tab') {
      if (open && filtered[hi]) {
        // select current highlight, let native Tab move focus
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
        <div ref={listRef} className="absolute z-50 mt-0.5 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((item, i) => (
            <button
              key={item.id}
              type="button"
              data-hi={i === hi ? 'true' : undefined}
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
