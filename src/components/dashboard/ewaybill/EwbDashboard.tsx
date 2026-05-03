'use client';
import { useEffect, useCallback, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { EwbBilty } from './types';
import EwbTripsTab from './tabs/EwbTripsTab';

function extractEwbs(b: Record<string, unknown>) {
  const result: { ewb_no: string; valid_upto?: string; vehicle_no?: string }[] = [];
  const list = b.e_way_bills as Array<{ ewb_no?: string; valid_upto?: string; vehicle_no?: string }> | undefined;
  if (Array.isArray(list)) list.forEach(e => { if (e.ewb_no) result.push(e as { ewb_no: string; valid_upto?: string; vehicle_no?: string }); });
  const n = b.ewb_no as string | undefined;
  if (n?.trim()) result.push({ ewb_no: n });
  return result;
}

export default function EwbDashboard() {
  const [bilties, setBilties]     = useState<EwbBilty[]>([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        apiFetch('/v1/bilty?limit=500'),
        apiFetch('/v1/bilty?bilty_type=MANUAL&limit=500'),
      ]);
      const map = new Map<string, EwbBilty>();
      const process = async (res: Response) => {
        if (!res.ok) return;
        const d = await res.json();
        const arr: Record<string, unknown>[] = d.bilties ?? d ?? [];
        arr.forEach(b => {
          const ewbs = extractEwbs(b);
          if (!ewbs.length) return;
          map.set(b.bilty_id as string, {
            bilty_id:       b.bilty_id       as string,
            gr_no:          b.gr_no          as string,
            bilty_date:     b.bilty_date     as string,
            bilty_type:     (b.bilty_type    as string) ?? 'REGULAR',
            consignor_name: b.consignor_name as string,
            consignee_name: b.consignee_name as string,
            payment_mode:   b.payment_mode   as string,
            status:         b.status         as string,
            total_amount:   b.total_amount   as number | undefined,
            ewbs,
          });
        });
      };
      await Promise.all([process(r1), process(r2)]);
      setBilties(Array.from(map.values()).sort(
        (a, b) => new Date(b.bilty_date).getTime() - new Date(a.bilty_date).getTime()
      ));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalEwbCount = bilties.reduce((s, b) => s + b.ewbs.length, 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Stat bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4 flex-wrap">
        <StatChip label="Bilties with EWB" value={bilties.length}  color="bg-indigo-50 text-indigo-700" />
        <StatChip label="Total EWBs"        value={totalEwbCount}  color="bg-blue-50   text-blue-700"   />
        <button onClick={load} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-6">
        <EwbTripsTab />
      </div>
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${color}`}>
      <span className="text-base font-bold leading-none">{value}</span>
      {label}
    </div>
  );
}
