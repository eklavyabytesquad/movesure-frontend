'use client';
import { useState } from 'react';
import { SectionTitle, focusNextFormElement } from '../ui';
import { apiFetch } from '@/lib/api';

interface Props {
  ewbNumbers: string[];
  setEwbNumbers: (v: string[]) => void;
}

interface EwbResult {
  eway_bill_number: string | number;
  ewb_status: string;
  ewb_date: string;
  valid_upto: string;
  vehicle_number?: string;
  transporter_name?: string;
  transporter_id?: string;
  // Validation history metadata
  is_previously_validated?: boolean;
  total_validations?: number;
  latest_validated_at?: string;
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:         'bg-green-100 text-green-700 border-green-200',
  EXPIRED:        'bg-red-100   text-red-700   border-red-200',
  CANCELLED:      'bg-red-100   text-red-700   border-red-200',
  EXTENDED:       'bg-blue-100  text-blue-700  border-blue-200',
  PART_DELIVERED: 'bg-amber-100 text-amber-700 border-amber-200',
  CONSOLIDATED:   'bg-purple-100 text-purple-700 border-purple-200',
};

/** Format 12 raw digits as XXXX-XXXX-XXXX */
function formatEwb(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 12);
  const parts: string[] = [];
  if (d.length > 0) parts.push(d.slice(0, 4));
  if (d.length > 4) parts.push(d.slice(4, 8));
  if (d.length > 8) parts.push(d.slice(8, 12));
  return parts.join('-');
}

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return d; }
}

export default function SectionEwb({ ewbNumbers, setEwbNumbers }: Props) {
  const [pending, setPending] = useState('');
  const [cache, setCache]     = useState<Record<string, EwbResult | string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const validEwbs = ewbNumbers.filter(e => e.trim());

  function handleChange(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    const formatted = formatEwb(digits);
    if (digits.length === 12) {
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

  async function handleValidate(ewb: string) {
    if (loading[ewb]) return; // already in flight
    if (cache[ewb] !== undefined) return; // already validated — pill colour already shows result
    const digits = ewb.replace(/\D/g, '');
    setLoading(prev => ({ ...prev, [ewb]: true }));
    try {
      const res = await apiFetch(`/v1/ewaybill/validate?eway_bill_number=${digits}`);
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail;
        const msg = typeof detail === 'object'
          ? (detail?.error ?? JSON.stringify(detail))
          : (detail ?? 'Validation failed.');
        setCache(prev => ({ ...prev, [ewb]: msg }));
      } else {
        const rec = {
          ...(data.data ?? data),
          is_previously_validated: data.is_previously_validated,
          total_validations:       data.total_validations,
          latest_validated_at:     data.latest_validated_at,
        };
        setCache(prev => ({ ...prev, [ewb]: rec }));
      }
    } catch {
      setCache(prev => ({ ...prev, [ewb]: 'Unable to reach the server.' }));
    } finally {
      setLoading(prev => ({ ...prev, [ewb]: false }));
    }
  }

  return (
    <div className="pb-2 border-b border-slate-100">
      <SectionTitle>E-Way Bills</SectionTitle>

      {/* Input row */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={pending}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === 'Tab') {
              // If there's a partial EWB (≥4 digits), add it first
              if (pending.replace(/\D/g, '').length >= 4) {
                e.preventDefault();
                handleAddManual();
              }
              // Always move to next field (never land on pill buttons)
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
              }
              const input = e.currentTarget; // capture before React nullifies it
              setTimeout(() => focusNextFormElement(input), 0);
            }
          }}
          placeholder="1234-5678-9012"
          maxLength={14}
          inputMode="numeric"
          className="w-44 shrink-0 border border-slate-300 rounded-md px-2.5 py-1 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {pending.replace(/\D/g, '').length >= 4 && pending.replace(/\D/g, '').length < 12 && (
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
      </div>

      {/* Pills */}
      {validEwbs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {validEwbs.map((ewb, i) => {
            const isLoad  = loading[ewb];
            const result  = cache[ewb];
            const isDone  = result !== undefined && !isLoad;
            const isError = typeof result === 'string';
            const record  = isDone && !isError ? result as EwbResult : undefined;
            const status  = record?.ewb_status ?? '';

            // Pill colour: default indigo → loading slate → error red → validated (status-based or green)
            const pillCls = isLoad
              ? 'bg-slate-50  border-slate-200 text-slate-400'
              : isError
                ? 'bg-red-50   border-red-300   text-red-700'
                : record
                  ? (STATUS_COLOR[status] ?? 'bg-green-50 border-green-300 text-green-800')
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700';

            const title = isLoad  ? 'Validating…'
              : isError  ? result as string
                : record   ? [
                    `${status} · valid until ${fmtDate(record.valid_upto)}`,
                    record.vehicle_number ? `· ${record.vehicle_number}` : '',
                    record.is_previously_validated && record.total_validations ? `· validated ${record.total_validations}×` : '',
                  ].filter(Boolean).join(' ')
                  : 'Click ✓ to validate';

            return (
              <span key={i} title={title}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-mono transition-colors ${pillCls}`}>
                {ewb}

                {/* Validate tick — visible only when not yet validated */}
                {!isDone && (
                  <button type="button" tabIndex={-1} onClick={() => handleValidate(ewb)}
                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-green-100 hover:text-green-700 text-current transition-colors"
                    title="Validate EWB">
                    {isLoad ? (
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Remove */}
                <button type="button" tabIndex={-1} onClick={() => remove(i)}
                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-600 text-current opacity-60 hover:opacity-100 transition-colors leading-none">
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

