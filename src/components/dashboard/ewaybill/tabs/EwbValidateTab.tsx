'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { getToken, API_BASE } from '@/lib/auth';
import { EwbBilty, EwbRecord, STATUS_COLOR, fmtDate } from '../types';

interface Props {
  bilties: EwbBilty[];
  loading: boolean;
  onValidated: (ewbNo: string, record: EwbRecord) => void;
  cache: Record<string, EwbRecord | string>;
}

function getPdfUrl(ewbNo: string): string {
  const digits = ewbNo.replace(/\D/g, '');
  const token  = getToken();
  return `${API_BASE}/v1/ewaybill/pdf?eway_bill_number=${digits}&token=${token}`;
}

function downloadPdf(ewbNo: string) {
  const a   = document.createElement('a');
  a.href     = getPdfUrl(ewbNo);
  a.download = `EWB_${ewbNo}.pdf`;
  a.click();
}

function printPdf(ewbNo: string) {
  window.open(getPdfUrl(ewbNo), '_blank');
}

export default function EwbValidateTab({ bilties, loading, onValidated, cache }: Props) {
  const [validating, setValidating] = useState<Record<string, boolean>>({});
  const [localCache, setLocalCache] = useState<Record<string, EwbRecord | string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const didLoadHistory = useRef(false);

  const merged = { ...cache, ...localCache };

  // ── On mount: load validation-history from DB (no NIC call) ──────────────
  useEffect(() => {
    if (loading || !bilties.length || didLoadHistory.current) return;
    didLoadHistory.current = true;

    const allEwbNos = bilties.flatMap(b => b.ewbs.map(e => e.ewb_no));
    if (!allEwbNos.length) return;

    // Skip if parent cache already has results (tab re-mounted)
    if (allEwbNos.every(n => cache[n] !== undefined)) return;

    setHistoryLoading(true);
    Promise.allSettled(
      allEwbNos.map(async ewbNo => {
        if (cache[ewbNo] !== undefined) return; // already in parent cache
        const digits = ewbNo.replace(/\D/g, '');
        try {
          const res  = await apiFetch(`/v1/ewaybill/validation-history?eway_bill_number=${digits}`);
          const data = await res.json();
          if (res.ok && data.status === 'success' && data.is_previously_validated) {
            // Map history response into the same shape as a validate response
            const rec: EwbRecord = {
              eway_bill_number:        ewbNo,
              ewb_status:              data.current_ewb_status ?? data.latest_nic_status ?? '',
              valid_upto:              data.current_valid_upto ?? '',
              ewb_date:                data.history?.[data.history.length - 1]?.validated_at ?? '',
              vehicle_number:          data.history?.[0]?.vehicle_number,
              transporter_name:        undefined,
              cewb_id:                 data.cewb_id ?? data.history?.[0]?.cewb_id,
              is_previously_validated: true,
              total_validations:       data.total_validations,
              latest_validated_at:     data.latest_validated_at,
              latest_nic_status:       data.latest_nic_status,
            };
            setLocalCache(p => ({ ...p, [ewbNo]: rec }));
            onValidated(ewbNo, rec);
          }
          // 404 = never validated before — leave as unvalidated, show Validate button
        } catch {
          // silently ignore — user can still click Validate manually
        }
      })
    ).finally(() => setHistoryLoading(false));
  }, [loading, bilties, cache, onValidated]);

  const revalidate = useCallback(async (ewbNo: string) => {
    const digits = ewbNo.replace(/\D/g, '');
    setValidating(p => ({ ...p, [ewbNo]: true }));
    setExpanded(ewbNo);
    try {
      const res  = await apiFetch(`/v1/ewaybill/validate?eway_bill_number=${digits}`);
      const data = await res.json();
      if (res.ok) {
        const rec = {
          ...(data.data ?? data),
          is_previously_validated: data.is_previously_validated,
          total_validations:       data.total_validations,
          latest_validated_at:     data.latest_validated_at,
          latest_nic_status:       data.latest_nic_status,
        };
        setLocalCache(p => ({ ...p, [ewbNo]: rec }));
        onValidated(ewbNo, rec);
      } else {
        const msg = typeof data.detail === 'object'
          ? (data.detail?.error ?? JSON.stringify(data.detail))
          : (data.detail ?? 'Validation failed.');
        setLocalCache(p => ({ ...p, [ewbNo]: msg }));
      }
    } catch {
      setLocalCache(p => ({ ...p, [ewbNo]: 'Unable to reach the server.' }));
    } finally {
      setValidating(p => ({ ...p, [ewbNo]: false }));
    }
  }, [onValidated]);

  const validateAll = useCallback(async () => {
    const allEwbNos = bilties.flatMap(b => b.ewbs.map(e => e.ewb_no));
    if (!allEwbNos.length || bulkRunning) return;
    setBulkRunning(true);
    setValidating(p => Object.fromEntries(allEwbNos.map(n => [n, true])));
    await Promise.allSettled(
      allEwbNos.map(async ewbNo => {
        const digits = ewbNo.replace(/\D/g, '');
        try {
          const res  = await apiFetch(`/v1/ewaybill/validate?eway_bill_number=${digits}`);
          const data = await res.json();
          if (res.ok) {
            const rec = {
              ...(data.data ?? data),
              is_previously_validated: data.is_previously_validated,
              total_validations:       data.total_validations,
              latest_validated_at:     data.latest_validated_at,
              latest_nic_status:       data.latest_nic_status,
            };
            setLocalCache(p => ({ ...p, [ewbNo]: rec }));
            onValidated(ewbNo, rec);
          } else {
            const msg = typeof data.detail === 'object'
              ? (data.detail?.error ?? JSON.stringify(data.detail))
              : (data.detail ?? 'Validation failed.');
            setLocalCache(p => ({ ...p, [ewbNo]: msg }));
          }
        } catch {
          setLocalCache(p => ({ ...p, [ewbNo]: 'Unable to reach the server.' }));
        } finally {
          setValidating(p => ({ ...p, [ewbNo]: false }));
        }
      })
    );
    setBulkRunning(false);
  }, [bilties, bulkRunning, onValidated]);

  const validate = useCallback(async (ewbNo: string) => {
    const digits = ewbNo.replace(/\D/g, '');
    if (merged[ewbNo] !== undefined) {
      setExpanded(e => e === ewbNo ? null : ewbNo);
      return;
    }
    setValidating(p => ({ ...p, [ewbNo]: true }));
    setExpanded(ewbNo);
    try {
      const res  = await apiFetch(`/v1/ewaybill/validate?eway_bill_number=${digits}`);
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.detail === 'object'
          ? (data.detail?.error ?? JSON.stringify(data.detail))
          : (data.detail ?? 'Validation failed.');
        setLocalCache(p => ({ ...p, [ewbNo]: msg }));
      } else {
        const rec = {
          ...(data.data ?? data),
          is_previously_validated: data.is_previously_validated,
          total_validations:       data.total_validations,
          latest_validated_at:     data.latest_validated_at,
          latest_nic_status:       data.latest_nic_status,
        };
        setLocalCache(p => ({ ...p, [ewbNo]: rec }));
        onValidated(ewbNo, rec);
      }
    } catch {
      setLocalCache(p => ({ ...p, [ewbNo]: 'Unable to reach the server.' }));
    } finally {
      setValidating(p => ({ ...p, [ewbNo]: false }));
    }
  }, [merged, onValidated]);

  const totalEwbs = bilties.reduce((s, b) => s + b.ewbs.length, 0);
  const validatedCount = bilties.reduce((s, b) =>
    s + b.ewbs.filter(e => merged[e.ewb_no] !== undefined && typeof merged[e.ewb_no] !== 'string').length, 0);

  if (loading) return <TabLoader />;

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-indigo-800">
            {validatedCount} / {totalEwbs} EWBs validated
          </p>
          <p className="text-xs text-indigo-500 mt-0.5">
            {historyLoading
              ? 'Loading previous validations from database…'
              : 'Use “Validate All” or click Validate on individual EWBs'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {validatedCount === totalEwbs && totalEwbs > 0 && !bulkRunning ? (
            <span className="flex items-center gap-1 text-green-700 text-xs font-semibold bg-green-100 border border-green-200 px-3 py-1.5 rounded-full">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              All validated
            </span>
          ) : null}
          <button
            type="button"
            onClick={validateAll}
            disabled={bulkRunning || totalEwbs === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-300 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {bulkRunning ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {bulkRunning ? 'Validating…' : 'Validate All'}
          </button>
        </div>
      </div>

      {bilties.length === 0 ? (
        <EmptyState message="No bilties with EWB numbers found in your branch." />
      ) : (
        bilties.map(bilty => (
          <div key={bilty.bilty_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Bilty header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-bold text-sm text-slate-800">{bilty.gr_no}</span>
                <span className="text-xs text-slate-400">{fmtDate(bilty.bilty_date)}</span>
                {bilty.bilty_type === 'MANUAL' && (
                  <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium">Manual</span>
                )}
              </div>
              <span className="text-xs text-slate-500 truncate max-w-xs">
                {bilty.consignor_name} → {bilty.consignee_name}
              </span>
            </div>

            {/* EWB rows */}
            <div className="divide-y divide-slate-50">
              {bilty.ewbs.map((ewb, idx) => {
                const result = merged[ewb.ewb_no];
                const isLoading = validating[ewb.ewb_no];
                const isValidated = result !== undefined && !isLoading && typeof result !== 'string';
                const isError = typeof result === 'string';
                const record = isValidated ? result as EwbRecord : null;
                const isOpen = expanded === ewb.ewb_no;

                return (
                  <div key={idx} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      {/* EWB number */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-indigo-700 font-semibold">{ewb.ewb_no}</span>
                        {isValidated && record && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[record.ewb_status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {record.ewb_status}
                          </span>
                        )}
                        {isValidated && record?.is_previously_validated && record.total_validations && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 font-medium">
                            ✓ Validated {record.total_validations}×
                          </span>
                        )}
                        {isError && <span className="text-xs text-red-500">Error</span>}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        {isValidated && (
                          <button
                            type="button"
                            onClick={() => revalidate(ewb.ewb_no)}
                            disabled={isLoading}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors border bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 disabled:opacity-50"
                            title="Re-fetch from NIC"
                          >
                            <svg className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => validate(ewb.ewb_no)}
                          disabled={isLoading}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors border
                            ${isValidated
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                              : isError
                              ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                            }`}
                        >
                          {isLoading ? (
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                          {isLoading ? 'Validating…' : isValidated ? (isOpen ? 'Hide' : 'Details') : 'Validate'}
                        </button>
                      </div>
                    </div>

                    {/* Inline result */}
                    {isOpen && !isLoading && result !== undefined && (
                      <div className="mt-2 rounded-lg border overflow-hidden text-xs">
                        {isError ? (
                          <div className="px-3 py-2 bg-red-50 border-red-200 text-red-700">{result as string}</div>
                        ) : record ? (
                          <>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0 px-3 py-2 bg-slate-50 border-b border-slate-200">
                              <InfoCell label="EWB Date"    value={fmtDate(record.ewb_date)} />
                              <InfoCell label="Valid Until" value={fmtDate(record.valid_upto)} />
                              {record.vehicle_number   && <InfoCell label="Vehicle"     value={record.vehicle_number} />}
                              {record.transporter_name && <InfoCell label="Transporter" value={record.transporter_name} />}
                              {record.total_validations && (
                                <InfoCell label="Times Validated" value={`${record.total_validations}×`} />
                              )}
                              {record.latest_validated_at && (
                                <InfoCell label="Last Checked" value={fmtDate(record.latest_validated_at)} />
                              )}
                            </div>
                            {/* PDF actions */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-100">
                              <button
                                type="button"
                                onClick={() => printPdf(ewb.ewb_no)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Print EWB
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadPdf(ewb.ewb_no)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download PDF
                              </button>
                            </div>
                            <div className="px-3 py-1.5 bg-green-50 text-green-700 text-[10px] font-medium">
                              ✓ Snapshot saved to database.
                            </div>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-1">
      <span className="text-slate-400 block text-[10px]">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <svg className="w-10 h-10 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

function TabLoader() {
  return (
    <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
      <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      Loading…
    </div>
  );
}
