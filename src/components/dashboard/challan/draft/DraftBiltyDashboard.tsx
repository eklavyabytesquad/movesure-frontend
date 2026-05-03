'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';
import { BiltySummary } from '../types';
import DraftBiltyTable  from './DraftBiltyTable';
import SavedBiltiesPanel from './SavedBiltiesPanel';

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  onAvailRefresh?: () => void; // called after any DRAFT↔SAVED status change so ChallanDashboard can sync
}

export default function DraftBiltyDashboard({ onAvailRefresh }: Props) {
  const { can } = usePermissions();
  const canUpdate = can(SLUGS.BILTY_UPDATE);

  const [draftBilties, setDraftBilties] = useState<BiltySummary[]>([]);
  const [savedBilties, setSavedBilties] = useState<BiltySummary[]>([]);
  const [cityMap,      setCityMap]      = useState<Record<string, string>>({});
  const [loading,      setLoading]      = useState(true);

  // IDs of in-flight status-change requests
  const [promotingId, setPromotingId] = useState<string | null>(null); // DRAFT → SAVED
  const [movingId,    setMovingId]    = useState<string | null>(null);  // SAVED → DRAFT

  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  // ── Helpers ────────────────────────────────────────────────────────────────

  function withCity(b: BiltySummary): BiltySummary {
    return {
      ...b,
      to_city_name: b.to_city_name ?? (b.to_city_id ? cityMap[b.to_city_id] : undefined),
    };
  }

  // ── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const [draftRes, savedRes, cityRes] = await Promise.all([
        apiFetch('/v1/bilty?status=DRAFT&limit=500'),
        apiFetch('/v1/challan/available-bilties?limit=500'),
        apiFetch('/v1/master/cities?is_active=true'),
      ]);

      let map: Record<string, string> = {};
      if (cityRes.ok) {
        const d = await cityRes.json();
        const cities: { city_id: string; city_name: string }[] = d.cities ?? d ?? [];
        cities.forEach(c => { map[c.city_id] = c.city_name; });
        setCityMap(map);
      }

      if (draftRes.ok) {
        const d = await draftRes.json();
        const list: BiltySummary[] = d.bilties ?? d ?? [];
        setDraftBilties(list.map(b => ({
          ...b,
          to_city_name: b.to_city_name ?? (b.to_city_id ? map[b.to_city_id] : undefined),
        })));
      }

      if (savedRes.ok) {
        const d = await savedRes.json();
        const list: BiltySummary[] = d.bilties ?? d ?? [];
        setSavedBilties(list
          .filter(b => !b.status || b.status === 'SAVED')
          .map(b => ({
            ...b,
            to_city_name: b.to_city_name ?? (b.to_city_id ? map[b.to_city_id] : undefined),
          })));
      }
    } catch {
      setError('Failed to load bilties.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Move SAVED → DRAFT ─────────────────────────────────────────────────────

  async function moveToDraft(biltyId: string) {
    setMovingId(biltyId); setError(''); setSuccess('');
    try {
      const res = await apiFetch(`/v1/bilty/${biltyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'DRAFT', saving_option: 'DRAFT' }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.detail ?? 'Failed to move bilty to draft.');
        return;
      }
      // Optimistic update
      const bilty = savedBilties.find(b => b.bilty_id === biltyId);
      if (bilty) {
        setSavedBilties(prev => prev.filter(b => b.bilty_id !== biltyId));
        setDraftBilties(prev => [withCity(bilty), ...prev]);
      }
      setSuccess('Bilty moved to Draft.');
      onAvailRefresh?.();
    } finally { setMovingId(null); }
  }

  // ── Promote DRAFT → SAVED ──────────────────────────────────────────────────

  async function promoteToSaved(biltyId: string) {
    setPromotingId(biltyId); setError(''); setSuccess('');
    try {
      const res = await apiFetch(`/v1/bilty/${biltyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'SAVED', saving_option: 'SAVE' }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.detail ?? 'Failed to move bilty to saved.');
        return;
      }
      // Optimistic update
      const bilty = draftBilties.find(b => b.bilty_id === biltyId);
      if (bilty) {
        setDraftBilties(prev => prev.filter(b => b.bilty_id !== biltyId));
        setSavedBilties(prev => [withCity(bilty), ...prev]);
      }
      setSuccess('Bilty moved to Saved — now available for challan.');
      onAvailRefresh?.();
    } finally { setPromotingId(null); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50 overflow-hidden">

      {/* Top bar */}
      <div className="px-5 pt-3 pb-2.5 bg-white border-b border-gray-200 shrink-0 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">Draft Bilties</h1>
            <p className="text-[11px] text-gray-400 leading-tight">
              Hold bilties in draft before assigning to a challan
            </p>
          </div>
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-2 ml-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
            {draftBilties.length} drafts
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 font-semibold bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
            {savedBilties.length} saved available
          </span>
        </div>

        <div className="flex-1" />

        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-[11px] text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 transition-colors">
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh All
        </button>
      </div>

      {/* Alerts */}
      {(error || success) && (
        <div className={`mx-4 mt-2 shrink-0 rounded-lg px-4 py-2 text-xs font-medium flex items-center justify-between gap-3 ${
          error
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          <span>{error || success}</span>
          <button onClick={() => { setError(''); setSuccess(''); }} className="opacity-60 hover:opacity-100 font-bold">✕</button>
        </div>
      )}

      {/* Stats bar */}
      <div className="shrink-0 bg-white border-b border-gray-200 flex items-stretch overflow-x-auto text-center divide-x divide-gray-100">
        {[
          { label: 'Total Drafts',   value: draftBilties.length,   cls: 'text-amber-600' },
          { label: 'Total Pkgs',     value: draftBilties.reduce((s, b) => s + (b.no_of_pkg ?? 0), 0), cls: 'text-violet-600' },
          { label: 'Total Weight',   value: `${draftBilties.reduce((s, b) => s + (b.weight ?? b.actual_weight ?? 0), 0)} kg`, cls: 'text-orange-500' },
          { label: 'Total Freight',  value: `₹${draftBilties.reduce((s, b) => s + (b.total_amount ?? 0), 0).toLocaleString('en-IN')}`, cls: 'text-green-600' },
          { label: 'Available Bilties', value: savedBilties.length,  cls: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center px-5 py-2.5 min-w-0">
            <span className={`text-sm font-extrabold leading-tight ${s.cls}`}>{s.value}</span>
            <span className="text-[10px] font-medium text-gray-400 mt-0.5 whitespace-nowrap">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Main body */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">

        {/* Draft bilties table (top 60%) */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <DraftBiltyTable
            bilties={draftBilties}
            loading={loading}
            promotingId={promotingId}
            canUpdate={canUpdate}
            onPromote={promoteToSaved}
            onRefresh={load}
          />
        </div>

        {/* Saved bilties panel (bottom 40%) */}
        <SavedBiltiesPanel
          bilties={savedBilties}
          canUpdate={canUpdate}
          movingId={movingId}
          onMoveToDraft={moveToDraft}
        />
      </div>
    </div>
  );
}
