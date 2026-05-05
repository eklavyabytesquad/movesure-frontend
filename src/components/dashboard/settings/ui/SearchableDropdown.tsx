'use client';

import { useState, useRef, useEffect } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface SearchableDropdownProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** 'sm' for filter bars, 'md' (default) for forms */
  size?: 'sm' | 'md';
  className?: string;
}

export default function SearchableDropdown({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  required,
  disabled,
  size = 'md',
  className = '',
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelId = useRef(`sdd-${Math.random().toString(36).slice(2)}`);

  const selected = options.find((o) => o.value === value);
  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  // Position the panel using fixed coords so it escapes any overflow:hidden ancestor
  function updatePanelPosition() {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const panelHeight = 260;
    if (spaceBelow < panelHeight && rect.top > panelHeight) {
      setPanelStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 2,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    } else {
      setPanelStyle({
        position: 'fixed',
        top: rect.bottom + 2,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        // also check if click is inside the fixed panel
        const panel = document.getElementById(panelId.current);
        if (panel && panel.contains(e.target as Node)) return;
        setOpen(false);
        setSearch('');
      }
    }
    function handleScroll() {
      if (open) updatePanelPosition();
    }
    if (open) {
      updatePanelPosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      setTimeout(() => searchRef.current?.focus(), 10);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const triggerClasses =
    size === 'sm'
      ? 'px-3 py-1.5 text-sm rounded-lg'
      : 'px-4 py-2.5 text-sm rounded-xl';

  function select(val: string) {
    onChange(val);
    setOpen(false);
    setSearch('');
  }

  return (
    <div className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen((v) => !v); }}
        className={`w-full border border-gray-300 bg-white text-left text-gray-900
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition
          disabled:bg-gray-50 disabled:text-gray-400 flex items-center justify-between gap-2 ${triggerClasses}`}
      >
        <span className={selected ? 'text-gray-900 truncate' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel — rendered with fixed positioning to escape overflow:hidden ancestors */}
      {open && (
        <div
          id={panelId.current}
          style={panelStyle}
          className="min-w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-900
                placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
          </div>

          {/* Options */}
          <ul className="max-h-52 overflow-y-auto">
            {/* Clear option (when not required) */}
            {!required && (
              <li
                onClick={() => select('')}
                className="px-4 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
              >
                {placeholder}
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">No results found</li>
            ) : (
              filtered.map((o) => (
                <li
                  key={o.value}
                  onClick={() => select(o.value)}
                  className={`px-4 py-2 text-sm cursor-pointer transition-colors
                    ${o.value === value
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  {o.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
