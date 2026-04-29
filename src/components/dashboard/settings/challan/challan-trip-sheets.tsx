'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';
import { FormInput, SearchableDropdown, SubmitButton, ActionButton } from '../ui';

interface City        { city_id: string; city_name: string; }
interface TripChallan { challan_id: string; challan_no: string | null; challan_date: string; total_bilty_count?: number; total_freight?: number; }
interface AvailChallan { challan_id: string; challan_no: string | null; challan_date: string; challan_status: string; transport_name: string | null; to_branch_id: string | null; }

interface TripSheet {
  trip_sheet_id: string;
  trip_sheet_no: string;
  trip_date: string;
  trip_status: 'DRAFT' | 'OPEN' | 'DISPATCHED' | 'ARRIVED' | 'CLOSED';
  status?: 'DRAFT' | 'OPEN' | 'DISPATCHED' | 'ARRIVED' | 'CLOSED'; // API may return 'status' instead of 'trip_status'
  transport_name: string | null;
  from_city_id: string | null;
  to_city_id: string | null;
  vehicle_info: { vehicle_no?: string; driver?: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:      'bg-gray-100 text-gray-600 border-gray-200',
  OPEN:       'bg-blue-50 text-blue-700 border-blue-200',
  DISPATCHED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ARRIVED:    'bg-green-50 text-green-700 border-green-200',
  CLOSED:     'bg-gray-100 text-gray-500 border-gray-200',
};

const DEFAULT_FORM = {
  trip_sheet_no: '',
  transport_name: '',
  from_city_id: '',
  to_city_id: '',
  vehicle_no: '',
  trip_date: new Date().toISOString().split('T')[0],
};

export default function ChallanTripSheets() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can(SLUGS.CHALLAN_TRIP_SHEETS_CREATE);
  const canUpdate = can(SLUGS.CHALLAN_TRIP_SHEETS_UPDATE);

  const [sheets, setSheets]         = useState<TripSheet[]>([]);
  const [cities, setCities]         = useState<City[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editItem, setEditItem]     = useState<TripSheet | null>(null);
  const [form, setForm]             = useState({ ...DEFAULT_FORM });
  const [saving, setSaving]         = useState(false);
  const [actionId, setActionId]     = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  // Expand challans panel
  const [expandedTripId, setExpandedTripId]       = useState<string | null>(null);
  const [expandedChallans, setExpandedChallans]   = useState<TripChallan[]>([]);
  const [loadingExpanded, setLoadingExpanded]     = useState(false);
  // Manage challans modal
  const [manageTripId, setManageTripId]           = useState<string | null>(null);
  const [availChallans, setAvailChallans]         = useState<AvailChallan[]>([]);
  const [loadingAvail, setLoadingAvail]           = useState(false);
  const [challanFilter, setChallanFilter]         = useState('');
  const [addingChallanId, setAddingChallanId]     = useState<string | null>(null);
  const [removingChallanId, setRemovingChallanId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sheetsRes, cityRes] = await Promise.all([
        apiFetch(`/v1/challan/trip-sheet`),
        apiFetch(`/v1/master/cities?is_active=true`),
      ]);
      if (sheetsRes.ok) {
        const d = await sheetsRes.json();
        // Normalize: API may return 'status' or 'trip_status'
        const raw = d.trip_sheets ?? d ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSheets(raw.map((s: any) => ({ ...s, trip_status: s.trip_status ?? s.status ?? 'DRAFT' })));
      }
      if (cityRes.ok)   { const d = await cityRes.json();   setCities(d.cities ?? d ?? []); }
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!getUser()) { router.replace('/auth/login'); return; }
    load();
  }, [load, router]);

  function openCreate() {
    setEditItem(null);
    setForm({ ...DEFAULT_FORM, trip_date: new Date().toISOString().split('T')[0] });
    setError(''); setSuccess('');
    setShowForm(true);
  }

  function openEdit(s: TripSheet) {
    setEditItem(s);
    setForm({
      trip_sheet_no:  s.trip_sheet_no,
      transport_name: s.transport_name ?? '',
      from_city_id:   s.from_city_id ?? '',
      to_city_id:     s.to_city_id ?? '',
      vehicle_no:     s.vehicle_info?.vehicle_no ?? '',
      trip_date:      s.trip_date,
    });
    setError(''); setSuccess('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const body: Record<string, unknown> = {
        trip_sheet_no:  form.trip_sheet_no || undefined,
        transport_name: form.transport_name || undefined,
        trip_date:      form.trip_date,
      };
      if (form.from_city_id) body.from_city_id = form.from_city_id;
      if (form.to_city_id)   body.to_city_id   = form.to_city_id;
      if (form.vehicle_no)   body.vehicle_info  = { vehicle_no: form.vehicle_no };
      const url    = editItem ? `/v1/challan/trip-sheet/${editItem.trip_sheet_id}` : `/v1/challan/trip-sheet`;
      const method = editItem ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data.detail) ? data.detail.map((d: { msg: string }) => d.msg).join('. ') : (data.detail ?? 'Failed'));
        return;
      }
      setSuccess(editItem ? 'Trip sheet updated.' : 'Trip sheet created.');
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  }

  async function doAction(id: string, action: 'dispatch' | 'arrive') {
    setActionId(id);
    try {
      await apiFetch(`/v1/challan/trip-sheet/${id}/${action}`, {
        method: 'POST',
      });
      load();
    } finally { setActionId(null); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this trip sheet?')) return;
    setDeletingId(id);
    try {
      await apiFetch(`/v1/challan/trip-sheet/${id}`, {
        method: 'DELETE',
      });
      load();
    } finally { setDeletingId(null); }
  }

  async function toggleExpandChallans(trip_sheet_id: string) {
    if (expandedTripId === trip_sheet_id) { setExpandedTripId(null); return; }
    setExpandedTripId(trip_sheet_id);
    setExpandedChallans([]);
    setLoadingExpanded(true);
    try {
      const res = await apiFetch(`/v1/challan/trip-sheet/${trip_sheet_id}`);
      if (res.ok) { const d = await res.json(); setExpandedChallans(d.challans ?? []); }
    } finally { setLoadingExpanded(false); }
  }

  async function openManageChallans(trip_sheet_id: string) {
    setManageTripId(trip_sheet_id);
    setChallanFilter('');
    setLoadingAvail(true);
    try {
      const res = await apiFetch(`/v1/challan`);
      if (res.ok) { const d = await res.json(); setAvailChallans(d.challans ?? d ?? []); }
    } finally { setLoadingAvail(false); }
  }

  async function addChallanToSheet(challanId: string) {
    if (!manageTripId) return;
    setAddingChallanId(challanId);
    try {
      await apiFetch(`/v1/challan/${challanId}/move-to-trip-sheet`, {
        method: 'POST',
        body: JSON.stringify({ trip_sheet_id: manageTripId }),
      });
      setAvailChallans(prev => prev.filter(c => c.challan_id !== challanId));
      if (expandedTripId === manageTripId) {
        const res2 = await apiFetch(`/v1/challan/trip-sheet/${manageTripId}`);
        if (res2.ok) { const d = await res2.json(); setExpandedChallans(d.challans ?? []); }
      }
      load();
    } finally { setAddingChallanId(null); }
  }

  async function removeChallanFromSheet(challanId: string) {
    setRemovingChallanId(challanId);
    try {
      await apiFetch(`/v1/challan/${challanId}/remove-from-trip-sheet`, {
        method: 'POST',
      });
      setExpandedChallans(prev => prev.filter(c => c.challan_id !== challanId));
      load();
    } finally { setRemovingChallanId(null); }
  }

  function cityName(id: string | null) {
    return id ? (cities.find(c => c.city_id === id)?.city_name ?? id) : '—';
  }

  const cityOptions = cities.map(c => ({ value: c.city_id, label: c.city_name }));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">Challan Trip Sheets</h1>
        <span className="text-sm text-gray-400">{sheets.length} sheet{sheets.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-sm text-gray-500 mb-6">Group challans into truck journeys. Dispatch and track deliveries.</p>

      {error   && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      {canCreate && (
        <div className="mb-5">
          <button onClick={openCreate}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            + New Trip Sheet
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">{editItem ? 'Edit Trip Sheet' : 'New Trip Sheet'}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormInput
              label="Trip Sheet No"
              value={form.trip_sheet_no}
              onChange={e => setForm(p => ({ ...p, trip_sheet_no: e.target.value }))}
              placeholder="Auto-generated if blank"
            />
            <FormInput
              label="Trip Date *"
              required
              type="date"
              value={form.trip_date}
              onChange={e => setForm(p => ({ ...p, trip_date: e.target.value }))}
            />
            <FormInput
              label="Transport Name"
              value={form.transport_name}
              onChange={e => setForm(p => ({ ...p, transport_name: e.target.value }))}
              placeholder="Sharma Transport"
            />
            <FormInput
              label="Vehicle No"
              value={form.vehicle_no}
              onChange={e => setForm(p => ({ ...p, vehicle_no: e.target.value }))}
              placeholder="MH04AB1234"
            />
            <SearchableDropdown
              label="From City"
              value={form.from_city_id}
              onChange={val => setForm(p => ({ ...p, from_city_id: val }))}
              options={cityOptions}
              placeholder="Select city"
            />
            <SearchableDropdown
              label="To City"
              value={form.to_city_id}
              onChange={val => setForm(p => ({ ...p, to_city_id: val }))}
              options={cityOptions}
              placeholder="Select city"
            />
          </div>
          <div className="mt-4 flex gap-3">
            <SubmitButton loading={saving} loadingText="Saving…">
              {editItem ? 'Update' : 'Create Trip Sheet'}
            </SubmitButton>
            <ActionButton variant="cancel" onClick={() => setShowForm(false)}>Cancel</ActionButton>
          </div>
        </form>
      )}

      {/* Manage Challans Modal */}
      {manageTripId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Add Challans to Trip Sheet</h3>
              <button onClick={() => setManageTripId(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="px-5 py-3 border-b border-gray-100">
              <FormInput
                value={challanFilter}
                onChange={e => setChallanFilter(e.target.value)}
                placeholder="Filter by challan no or transport…"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {loadingAvail ? (
                <div className="py-8 text-center text-sm text-gray-400">Loading challans…</div>
              ) : availChallans.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">No challans available to add.</div>
              ) : (
                <div className="space-y-2">
                  {availChallans
                    .filter(c => {
                      const q = challanFilter.toLowerCase();
                      return !q || (c.challan_no ?? '').toLowerCase().includes(q) ||
                        (c.transport_name ?? '').toLowerCase().includes(q);
                    })
                    .map(c => (
                      <div key={c.challan_id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-semibold text-xs text-gray-900">{c.challan_no ?? 'Pending No.'}</span>
                            <span className="text-xs text-gray-400">{c.challan_date}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[c.challan_status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>{c.challan_status}</span>
                          </div>
                          {c.transport_name && <p className="text-xs text-gray-500 mt-0.5">{c.transport_name}</p>}
                        </div>
                        <ActionButton variant="primary" size="sm" disabled={addingChallanId === c.challan_id} onClick={() => addChallanToSheet(c.challan_id)}>
                          {addingChallanId === c.challan_id ? '…' : '+ Add'}
                        </ActionButton>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
              <ActionButton variant="cancel" onClick={() => setManageTripId(null)}>Done</ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : sheets.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No trip sheets found.</div>
      ) : (
        <div className="space-y-3">
          {sheets.map(s => (
            <div key={s.trip_sheet_id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold font-mono text-gray-900 text-sm">{s.trip_sheet_no}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[s.trip_status]}`}>
                        {s.trip_status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>📅 {s.trip_date}</span>
                      {s.transport_name && <span>🚛 {s.transport_name}</span>}
                      {s.vehicle_info?.vehicle_no && <span>🚘 {s.vehicle_info.vehicle_no}</span>}
                      <span>📍 {cityName(s.from_city_id)} → {cityName(s.to_city_id)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {canUpdate && s.trip_status === 'OPEN' && (
                      <ActionButton variant="primary" size="sm" disabled={actionId === s.trip_sheet_id} onClick={() => doAction(s.trip_sheet_id, 'dispatch')}>
                        {actionId === s.trip_sheet_id ? '…' : 'Dispatch'}
                      </ActionButton>
                    )}
                    {canUpdate && s.trip_status === 'DISPATCHED' && (
                      <ActionButton variant="save" size="sm" disabled={actionId === s.trip_sheet_id} onClick={() => doAction(s.trip_sheet_id, 'arrive')}>
                        {actionId === s.trip_sheet_id ? '…' : 'Mark Arrived'}
                      </ActionButton>
                    )}
                    {canUpdate && !['ARRIVED', 'CLOSED'].includes(s.trip_status) && (
                      <ActionButton variant="edit" size="sm" onClick={() => openEdit(s)}>Edit</ActionButton>
                    )}
                    {canUpdate && ['DRAFT', 'OPEN'].includes(s.trip_status) && (
                      <ActionButton variant="primary" size="sm" onClick={() => openManageChallans(s.trip_sheet_id)}>+ Add Challans</ActionButton>
                    )}
                    {canUpdate && ['DRAFT', 'OPEN'].includes(s.trip_status) && (
                      <ActionButton variant="danger" size="sm" disabled={deletingId === s.trip_sheet_id} onClick={() => handleDelete(s.trip_sheet_id)}>
                        {deletingId === s.trip_sheet_id ? '…' : 'Delete'}
                      </ActionButton>
                    )}
                    <button
                      onClick={() => toggleExpandChallans(s.trip_sheet_id)}
                      className="px-3 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium transition-colors">
                      {expandedTripId === s.trip_sheet_id ? 'Hide Challans ▲' : 'View Challans ▼'}
                    </button>
                  </div>
                </div>
              </div>
              {/* Expanded challans */}
              {expandedTripId === s.trip_sheet_id && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Challans on this trip sheet</p>
                    {canUpdate && ['DRAFT', 'OPEN'].includes(s.trip_status) ? (
                      <button
                        onClick={() => openManageChallans(s.trip_sheet_id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                        + Add Challans
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">
                        {['DISPATCHED', 'ARRIVED', 'CLOSED'].includes(s.trip_status) ? `Locked — trip sheet is ${s.trip_status}` : ''}
                      </span>
                    )}
                  </div>
                  {loadingExpanded ? (
                    <div className="text-center text-xs text-gray-400 py-4">Loading…</div>
                  ) : expandedChallans.length === 0 ? (
                    <div className="text-center text-xs text-gray-400 py-6">
                      {['DRAFT', 'OPEN'].includes(s.trip_status)
                        ? 'No challans yet. Click \'+ Add Challans\' above to assign challans from any branch.'
                        : `No challans were assigned to this trip sheet.`}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {expandedChallans.map(c => (
                        <div key={c.challan_id} className="flex items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 px-3 py-2">
                          <div className="flex items-center gap-3 min-w-0 flex-wrap">
                            <span className="font-mono text-xs font-semibold text-gray-900">{c.challan_no ?? 'Pending No.'}</span>
                            <span className="text-xs text-gray-500">{c.challan_date}</span>
                            {c.total_bilty_count != null && <span className="text-xs text-gray-400">{c.total_bilty_count} bilties</span>}
                            {c.total_freight != null && <span className="text-xs font-medium text-gray-700">₹{c.total_freight.toLocaleString('en-IN')}</span>}
                          </div>
                          {canUpdate && ['DRAFT', 'OPEN'].includes(s.trip_status) && (
                            <ActionButton variant="danger" size="sm" disabled={removingChallanId === c.challan_id} onClick={() => removeChallanFromSheet(c.challan_id)}>
                              {removingChallanId === c.challan_id ? '…' : 'Remove'}
                            </ActionButton>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
