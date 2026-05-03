'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';

interface EwbRecord {
  eway_bill_number: string | number;
  ewb_status: string;
  ewb_date: string;
  valid_upto: string;
  vehicle_number?: string;
  transporter_id?: string;
  transporter_name?: string;
  bilty_id?: string;
  // Validation history metadata
  is_previously_validated?: boolean;
  total_validations?: number;
  latest_validated_at?: string;
}

interface Props {
  onClose: () => void;
  prefillEwbNumber?: string;
  /** If provided, links this EWB snapshot to the bilty in the DB */
  biltyId?: string;
}

function formatEwb(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 12);
  const parts: string[] = [];
  if (d.length > 0) parts.push(d.slice(0, 4));
  if (d.length > 4) parts.push(d.slice(4, 8));
  if (d.length > 8) parts.push(d.slice(8, 12));
  return parts.join('-');
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:         'bg-green-100 text-green-700 border-green-200',
  EXPIRED:        'bg-red-100 text-red-700 border-red-200',
  CANCELLED:      'bg-red-100 text-red-700 border-red-200',
  EXTENDED:       'bg-blue-100 text-blue-700 border-blue-200',
  PART_DELIVERED: 'bg-amber-100 text-amber-700 border-amber-200',
  CONSOLIDATED:   'bg-purple-100 text-purple-700 border-purple-200',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-xs font-semibold text-slate-800 text-right break-all">{value}</span>
    </div>
  );
}

export default function EwbValidateModal({ onClose, prefillEwbNumber = '', biltyId }: Props) {
  const [ewbNumber, setEwbNumber] = useState(prefillEwbNumber ? formatEwb(prefillEwbNumber.replace(/\D/g, '')) : '');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [result,    setResult]    = useState<EwbRecord | null>(null);
  const [mounted,   setMounted]   = useState(false);
  const portalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    portalRef.current = document.body;
    setMounted(true);
  }, []);

  function handleEwbChange(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    setEwbNumber(formatEwb(digits));
  }

  async function handleValidate(e: React.FormEvent) {
    e.preventDefault();
    const digits = ewbNumber.replace(/\D/g, '');
    if (digits.length !== 12) { setError('EWB number must be exactly 12 digits.'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const params = new URLSearchParams({ eway_bill_number: digits });
      if (biltyId) params.set('bilty_id', biltyId);
      const res = await apiFetch(`/v1/ewaybill/validate?${params}`);
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail;
        setError(
          typeof detail === 'object'
            ? (detail?.error ?? JSON.stringify(detail))
            : (detail ?? 'Validation failed.')
        );
        return;
      }
      setResult({
        ...(data.data ?? data),
        is_previously_validated: data.is_previously_validated,
        total_validations:       data.total_validations,
        latest_validated_at:     data.latest_validated_at,
      });
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setLoading(false);
    }
  }

  if (!mounted || !portalRef.current) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">Validate E-Way Bill</h2>
            <p className="text-xs text-slate-500 mt-0.5">Fetch EWB details from NIC and save a snapshot.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <form onSubmit={handleValidate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                EWB Number
              </label>
              <input
                type="text"
                value={ewbNumber}
                onChange={e => handleEwbChange(e.target.value)}
                placeholder="1234-5678-9012"
                inputMode="numeric"
                maxLength={14}
                autoFocus
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <p className="text-xs text-slate-400 mt-1">
                Company GSTIN is resolved automatically from your EWB settings.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Validating…
                </>
              ) : (
                'Validate EWB'
              )}
            </button>
          </form>

          {/* Result card */}
          {result && (
            <div className="mt-5 border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-800 font-mono">{result.eway_bill_number}</span>
                <div className="flex items-center gap-2">
                  {result.is_previously_validated && result.total_validations && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 font-medium">
                      ✓ {result.total_validations}× validated
                    </span>
                  )}
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${STATUS_COLOR[result.ewb_status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {result.ewb_status}
                  </span>
                </div>
              </div>
              <div className="px-4 py-3">
                <Row label="EWB Date"    value={result.ewb_date} />
                <Row label="Valid Until" value={result.valid_upto} />
                {result.vehicle_number   && <Row label="Vehicle"     value={result.vehicle_number} />}
                {result.transporter_name && <Row label="Transporter" value={result.transporter_name} />}
                {result.transporter_id   && <Row label="Transporter GSTIN" value={result.transporter_id} />}
                {result.latest_validated_at && (
                  <Row label="Last Validated" value={new Date(result.latest_validated_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })} />
                )}
              </div>
              <div className="px-4 py-2 bg-green-50 border-t border-green-100">
                <p className="text-xs text-green-700 font-medium">
                  ✓ EWB validated and snapshot saved to database.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    portalRef.current
  );
}
