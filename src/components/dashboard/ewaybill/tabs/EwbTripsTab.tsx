'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface TripSheet {
  trip_sheet_id: string;
  trip_sheet_no: string;
  status: string;
  trip_date?: string;
  transport_name?: string;
  vehicle_info?: { vehicle_no?: string };
  total_challan_count?: number;
  total_bilty_count?: number;
  total_freight?: number;
}

const STATUS_CLS: Record<string, string> = {
  DRAFT:      'bg-slate-100  text-slate-600  border-slate-200',
  OPEN:       'bg-blue-100   text-blue-700   border-blue-200',
  DISPATCHED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  ARRIVED:    'bg-green-100  text-green-700  border-green-200',
  CLOSED:     'bg-slate-100  text-slate-500  border-slate-200',
};

function fmtDate(d?: string) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return d; }
}

export default function EwbTripsTab() {
  const [trips, setTrips]     = useState<TripSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/v1/challan/trip-sheet?limit=100');
      if (!res.ok) { setError('Failed to load trip sheets.'); return; }
      const d = await res.json();
      setTrips(d.trip_sheets ?? d ?? []);
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
      Loading trip sheets...
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-48 text-red-500 text-sm">{error}</div>
  );

  if (trips.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <svg className="w-10 h-10 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.5-2H13z" />
      </svg>
      <p className="text-sm">No trip sheets found.</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Trip Sheets
          <span className="ml-2 text-xs font-normal text-slate-400">{trips.length} total</span>
        </h2>
        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {trips.map(t => (
          <Link
            key={t.trip_sheet_id}
            href={`/dashboard/ewaybill/${t.trip_sheet_id}`}
            className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">
                    {t.trip_sheet_no}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_CLS[t.status] ?? STATUS_CLS.DRAFT}`}>
                    {t.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{fmtDate(t.trip_date)}</span>
                  {t.vehicle_info?.vehicle_no && (
                    <span className="font-mono text-slate-600">{t.vehicle_info.vehicle_no}</span>
                  )}
                  {t.transport_name && <span>{t.transport_name}</span>}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {t.total_challan_count != null && (
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-700">{t.total_challan_count}</div>
                    <div className="text-[10px] text-slate-400">challans</div>
                  </div>
                )}
                {t.total_bilty_count != null && (
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-700">{t.total_bilty_count}</div>
                    <div className="text-[10px] text-slate-400">bilties</div>
                  </div>
                )}
                <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}