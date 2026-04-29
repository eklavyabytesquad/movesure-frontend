'use client';
import { useState } from 'react';
import { SectionTitle, Label } from '../ui';

interface Props {
  ewbNumbers: string[];
  setEwbNumbers: (v: string[]) => void;
}

/** Format 12 raw digits as XXXX-XXXX-XXXX */
function formatEwb(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 12);
  const parts: string[] = [];
  if (d.length > 0) parts.push(d.slice(0, 4));
  if (d.length > 4) parts.push(d.slice(4, 8));
  if (d.length > 8) parts.push(d.slice(8, 12));
  return parts.join('-');
}

export default function SectionEwb({ ewbNumbers, setEwbNumbers }: Props) {
  const [pending, setPending] = useState('');

  const validEwbs = ewbNumbers.filter(e => e.trim());

  function handleChange(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    const formatted = formatEwb(digits);
    if (digits.length === 12) {
      // auto-add when 12 digits complete
      setEwbNumbers([...validEwbs, formatted]);
      setPending('');
    } else {
      setPending(formatted);
    }
  }

  function handleAddManual() {
    const digits = pending.replace(/\D/g, '');
    if (digits.length >= 4) {
      setEwbNumbers([...validEwbs, formatEwb(digits)]);
      setPending('');
    }
  }

  function remove(i: number) {
    const next = [...validEwbs];
    next.splice(i, 1);
    setEwbNumbers(next);
  }

  return (
    <div className="pb-2 border-b border-slate-100">
      <SectionTitle>E-Way Bills</SectionTitle>
      {/* Single row: input + add button + pills all inline */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={pending}
          onChange={e => handleChange(e.target.value)}
          placeholder="1234-5678-9012"
          maxLength={14}
          inputMode="numeric"
          className="w-44 shrink-0 border border-slate-300 rounded-md px-2.5 py-1 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {pending.replace(/\D/g, '').length >= 4 && (
          <button
            type="button"
            onClick={handleAddManual}
            className="shrink-0 px-2.5 py-1 text-xs rounded-md border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors font-medium"
          >
            + Add
          </button>
        )}
        {pending === '' && validEwbs.length === 0 && (
          <span className="text-xs text-slate-400">No EWBs added yet</span>
        )}
        {validEwbs.map((ewb, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-mono text-indigo-700"
          >
            {ewb}
            <button
              type="button"
              onClick={() => remove(i)}
              className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-600 text-slate-400 transition-colors leading-none"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
