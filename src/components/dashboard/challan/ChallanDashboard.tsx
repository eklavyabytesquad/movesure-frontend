'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';

import {
  Challan, BiltySummary, Branch, ChallanBook,
  isChallanEditable, bookLabel,
} from './types';
import {
  generateChallanA4LandscapeA,
  type ChallanPrintData,
  type ChallanTemplateDef,
} from './templates/challan_a4_landscape_a';

// Section components
import ChallanTopBar        from './components/ChallanTopBar';
import ChallanAlerts        from './components/ChallanAlerts';
import ChallanStatsBar      from './components/ChallanStatsBar';
import NewChallanForm, { ChallanFormState } from './components/NewChallanForm';
import ChallanBiltiesTable  from './components/ChallanBiltiesTable';
import AvailableBiltiesPanel from './components/AvailableBiltiesPanel';
import DraftBiltyDashboard  from './draft/DraftBiltyDashboard';
import TripSheetDashboard   from './TripSheetDashboard';

const DEFAULT_FORM: ChallanFormState = {
  to_branch_id: '', from_branch_id: '', book_id: '',
  transport_name: '', vehicle_no: '',
  challan_date: new Date().toISOString().split('T')[0],
  is_primary: false,
  fleet_id: '', driver_id: '', remarks: '',
};

export default function ChallanDashboard() {
  const router    = useRouter();
  const { can }   = usePermissions();
  const canCreate = can(SLUGS.CHALLAN_CREATE);
  const canUpdate = can(SLUGS.CHALLAN_UPDATE);

  const [challans, setChallans]           = useState<Challan[]>([]);
  const [availBilties, setAvailBilties]   = useState<BiltySummary[]>([]);
  const [branches, setBranches]           = useState<Branch[]>([]);
  const [books, setBooks]                 = useState<ChallanBook[]>([]);
  const [primaryBook, setPrimaryBook]     = useState<ChallanBook | null>(null);
  const [cityMap, setCityMap]             = useState<Record<string, string>>({});

  const [selectedId, setSelectedId]           = useState<string>('');
  const [challanBilties, setChallanBilties]   = useState<BiltySummary[]>([]);
  const [loadingBilties, setLoadingBilties]   = useState(false);
  const [selectedBilties, setSelectedBilties] = useState<Set<string>>(new Set());

  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [addingBilty, setAddingBilty] = useState<string | null>(null);
  const [removingBilty, setRemovingBilty] = useState<string | null>(null);
  const [actionId, setActionId]       = useState<string | null>(null);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState<ChallanFormState>({ ...DEFAULT_FORM });
  const [saving, setSaving]           = useState(false);
  const [printing, setPrinting]       = useState(false);
  const [printUrl, setPrintUrl]       = useState<string | null>(null);
  const [activeTab, setActiveTab]     = useState<'challan' | 'draft' | 'tripsheet'>('challan');

  const selectedChallan = challans.find(c => c.challan_id === selectedId) ?? null;
  const isEditable = selectedChallan ? isChallanEditable(selectedChallan) : false;

  const clearAlerts = () => { setError(''); setSuccess(''); };

  const handleSelectChallan = (id: string) => {
    setSelectedId(id);
    setSelectedBilties(new Set());
    clearAlerts();
  };

  const fetchChallans = useCallback(async (): Promise<Challan[]> => {
    const r = await apiFetch('/v1/challan?limit=200');
    if (!r.ok) return [];
    const d = await r.json();
    return (d.challans ?? d ?? []) as Challan[];
  }, []);

  const load = useCallback(async () => {
    setLoading(true); clearAlerts();
    try {
      const [challanRes, biltyRes, branchRes, bookRes, cityRes] = await Promise.all([
        apiFetch('/v1/challan?limit=200'),
        apiFetch('/v1/challan/available-bilties?limit=500'),
        apiFetch('/v1/master/branches?is_active=true'),
        apiFetch('/v1/challan/book?is_active=true'),
        apiFetch('/v1/master/cities?is_active=true'),
      ]);

      // Build city id→name map
      let loadedCityMap: Record<string, string> = {};
      if (cityRes.ok) {
        const d = await cityRes.json();
        const cities: { city_id: string; city_name: string }[] = d.cities ?? d ?? [];
        cities.forEach(c => { loadedCityMap[c.city_id] = c.city_name; });
        setCityMap(loadedCityMap);
      }

      let loadedChallans: Challan[] = [];
      if (challanRes.ok) {
        const d = await challanRes.json();
        loadedChallans = (d.challans ?? d ?? []) as Challan[];
        setChallans(loadedChallans);
      }
      if (biltyRes.ok)  {
        const d = await biltyRes.json();
        const raw: BiltySummary[] = d.bilties ?? d ?? [];
        setAvailBilties(raw
          .filter(b => !b.status || b.status === 'SAVED')
          .map(b => ({
            ...b,
            to_city_name: b.to_city_name ?? (b.to_city_id ? loadedCityMap[b.to_city_id] : undefined),
          })));
      }
      if (branchRes.ok) { const d = await branchRes.json(); setBranches(d.branches ?? d ?? []); }
      if (bookRes.ok) {
        const d = await bookRes.json();
        const allBooks: ChallanBook[] = d.books ?? d ?? [];
        setBooks(allBooks);
        const primary = allBooks.find(b => b.is_primary) ?? allBooks[0] ?? null;
        setPrimaryBook(primary);
        if (primary) setForm(f => ({ ...f, book_id: primary.book_id }));
      }

      // Auto-select: prefer primary editable challan, then first editable, then first overall
      setSelectedId(prev => {
        if (prev && loadedChallans.some(c => c.challan_id === prev)) return prev;
        const primaryEditable = loadedChallans.find(c => c.is_primary && isChallanEditable(c));
        const anyEditable     = loadedChallans.find(c => isChallanEditable(c));
        return primaryEditable?.challan_id ?? anyEditable?.challan_id ?? loadedChallans[0]?.challan_id ?? '';
      });
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Standalone refresh of available bilties (called from Draft tab after status changes)
  const refreshAvailBilties = useCallback(async () => {
    const res = await apiFetch('/v1/challan/available-bilties?limit=500');
    if (res.ok) {
      const d = await res.json();
      const raw: BiltySummary[] = d.bilties ?? d ?? [];
      setAvailBilties(raw
        .filter(b => !b.status || b.status === 'SAVED')
        .map(b => ({
          ...b,
          to_city_name: b.to_city_name ?? (b.to_city_id ? cityMap[b.to_city_id] : undefined),
        })));
    }
  }, [cityMap]);

  useEffect(() => {
    if (!getUser()) { router.replace('/auth/login'); return; }
    load();
  }, [load, router]);

  useEffect(() => {
    if (!selectedId) { setChallanBilties([]); return; }
    setSelectedBilties(new Set());
    setLoadingBilties(true);
    apiFetch(`/v1/challan/${selectedId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          const raw: BiltySummary[] = d.bilties ?? [];
          setChallanBilties(raw.map(b => ({
            ...b,
            to_city_name: b.to_city_name ?? (b.to_city_id ? cityMap[b.to_city_id] : undefined),
          })));
        }
      })
      .finally(() => setLoadingBilties(false));
  }, [selectedId, cityMap]);

  async function addBilty(biltyId: string) {
    if (!selectedId || !isEditable) return;
    setAddingBilty(biltyId); clearAlerts();
    try {
      const res = await apiFetch(`/v1/challan/${selectedId}/add-bilty`, {
        method: 'POST', body: JSON.stringify({ bilty_id: biltyId }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.detail ?? 'Failed to add bilty.'); return; }
      const added = availBilties.find(b => b.bilty_id === biltyId);
      if (added) {
        setAvailBilties(prev => prev.filter(b => b.bilty_id !== biltyId));
        setChallanBilties(prev => [...prev, added]);
      }
      setChallans(prev => prev.map(c =>
        c.challan_id === selectedId ? { ...c, bilty_count: (c.bilty_count ?? 0) + 1 } : c));
    } finally { setAddingBilty(null); }
  }

  async function removeBilty(biltyId: string) {
    if (!selectedId || !isEditable) return;
    setRemovingBilty(biltyId); clearAlerts();
    try {
      const res = await apiFetch(`/v1/challan/${selectedId}/remove-bilty/${biltyId}`, { method: 'POST' });
      if (!res.ok) { const d = await res.json(); setError(d.detail ?? 'Failed.'); return; }
      const removed = challanBilties.find(b => b.bilty_id === biltyId);
      if (removed) {
        setChallanBilties(prev => prev.filter(b => b.bilty_id !== biltyId));
        setAvailBilties(prev => [removed, ...prev]);
      }
      setChallans(prev => prev.map(c =>
        c.challan_id === selectedId ? { ...c, bilty_count: Math.max(0, (c.bilty_count ?? 1) - 1) } : c));
      setSelectedBilties(prev => { const n = new Set(prev); n.delete(biltyId); return n; });
    } finally { setRemovingBilty(null); }
  }

  async function removeSelectedBilties() {
    for (const id of Array.from(selectedBilties)) await removeBilty(id);
    setSelectedBilties(new Set());
  }

  async function doAction(action: 'dispatch' | 'arrive-hub' | 'set-primary') {
    if (!selectedId) return;
    setActionId(selectedId + action); clearAlerts();
    try {
      const res = await apiFetch(`/v1/challan/${selectedId}/${action}`, { method: 'POST' });
      if (!res.ok) { const d = await res.json(); setError(d.detail ?? 'Failed.'); return; }
      setSuccess(
        action === 'dispatch'   ? 'Challan dispatched.' :
        action === 'arrive-hub' ? 'Arrived at hub.'     : 'Set as primary.',
      );
      if (action === 'dispatch') {
        // Reload all challans — dispatched one stays in list but becomes locked
        const updated = await fetchChallans();
        setChallans(updated);
        // Auto-switch to next editable challan
        const nextEditable = updated.find(c => isChallanEditable(c));
        setSelectedId(nextEditable?.challan_id ?? updated[0]?.challan_id ?? '');
        setChallanBilties([]);
      } else {
        const updated = await fetchChallans();
        setChallans(updated);
      }
    } finally { setActionId(null); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); clearAlerts();
    try {
      const body: Record<string, unknown> = {
        challan_date: form.challan_date, is_primary: form.is_primary,
      };
      if (form.book_id)        body.book_id        = form.book_id;
      if (form.to_branch_id)   body.to_branch_id   = form.to_branch_id;
      if (form.from_branch_id) body.from_branch_id = form.from_branch_id;
      if (form.transport_name) body.transport_name = form.transport_name;
      if (form.vehicle_no)     body.vehicle_info   = { vehicle_no: form.vehicle_no };
      if (form.fleet_id)       body.fleet_id       = form.fleet_id;
      if (form.driver_id)      body.driver_id      = form.driver_id;
      if (form.remarks)        body.remarks        = form.remarks;

      const res  = await apiFetch('/v1/challan', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data.detail)
          ? data.detail.map((d: { msg: string }) => d.msg).join('. ')
          : (data.detail ?? 'Failed'));
        return;
      }
      setSuccess('Challan created.');
      setShowForm(false);
      setForm({ ...DEFAULT_FORM, book_id: primaryBook?.book_id ?? '' });
      const updated = await fetchChallans();
      setChallans(updated);
      const newId = data.challan?.challan_id ?? data.challan_id;
      if (newId) setSelectedId(newId);
    } finally { setSaving(false); }
  }

  async function handlePrint() {
    if (!selectedId || !selectedChallan) return;
    setPrinting(true); clearAlerts();
    try {
      // Fetch default template and full challan detail in parallel
      const [tplRes, cRes] = await Promise.all([
        apiFetch('/v1/challan/template/primary?template_type=CHALLAN'),
        apiFetch(`/v1/challan/${selectedId}`),
      ]);
      if (!tplRes.ok) {
        setError('No default challan template set. Go to Settings → Challan → Templates and set one as default.');
        return;
      }
      if (!cRes.ok) { setError('Failed to load challan details.'); return; }

      const tpl: ChallanTemplateDef = await tplRes.json();
      const challanData             = await cRes.json();

      const fromBranch = branches.find(b => b.branch_id === selectedChallan.from_branch_id);
      const toBranch   = branches.find(b => b.branch_id === selectedChallan.to_branch_id);

      // Resolve branch cities from cityMap
      const fromBranchCity = fromBranch?.city_id ? cityMap[fromBranch.city_id] : undefined;
      const toBranchCity   = toBranch?.city_id   ? cityMap[toBranch.city_id]   : undefined;

      // Fetch fleet vehicle, driver, and trip sheet remarks in parallel (all optional)
      const fleetId      = challanData.fleet_id   ?? selectedChallan.fleet_id;
      const driverId     = challanData.driver_id  ?? selectedChallan.driver_id;
      const tripSheetId  = challanData.trip_sheet_id ?? selectedChallan.trip_sheet_id;

      const [fleetRes, driverRes, tripRes] = await Promise.all([
        fleetId    ? apiFetch(`/v1/fleet/${fleetId}`)                           : Promise.resolve(null),
        driverId   ? apiFetch(`/v1/fleet/staff/${driverId}`)                    : Promise.resolve(null),
        tripSheetId ? apiFetch(`/v1/challan/trip-sheet/${tripSheetId}`)         : Promise.resolve(null),
      ]);

      const fleetDetail  = fleetRes   && fleetRes.ok   ? await fleetRes.json()   : null;
      const driverDetail = driverRes  && driverRes.ok  ? await driverRes.json()  : null;
      const tripDetail   = tripRes    && tripRes.ok    ? await tripRes.json()    : null;

      // Resolve vehicle info — prefer fleet FK, fallback to vehicle_info JSONB
      const vInfo       = selectedChallan.vehicle_info ?? {};
      const vehicleNo   = fleetDetail?.vehicle_no   ?? vInfo.vehicle_no;
      const vehicleType = fleetDetail?.vehicle_type ?? fleetDetail?.truck_type ?? vInfo.vehicle_type;
      const driverName  = driverDetail?.name   ?? fleetDetail?.current_driver?.name   ?? vInfo.driver_name;
      const driverMobile = driverDetail?.mobile ?? fleetDetail?.current_driver?.mobile ?? undefined;
      const driverAadhar = driverDetail?.aadhar_no ?? undefined;

      // Load company logo (optional — silently ignored if unavailable)
      let logoDataUrl: string | undefined;
      try {
        const logoRes = await fetch('/logo-assets/RGT.png');
        if (logoRes.ok) {
          const blob = await logoRes.blob();
          logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror  = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch { /* logo is optional */ }

      const rawBilties: BiltySummary[] = challanData.bilties ?? challanBilties;

      // The challan detail API does not include e_way_bills in embedded bilties.
      // Fetch each bilty individually in parallel to get the full e_way_bills array.
      const ewbMap: Record<string, BiltySummary['e_way_bills']> = {};
      await Promise.allSettled(
        rawBilties.map(async (b: BiltySummary) => {
          try {
            const r = await apiFetch(`/v1/bilty/${b.bilty_id}`);
            if (r.ok) {
              const d = await r.json();
              if (d.e_way_bills) ewbMap[b.bilty_id] = d.e_way_bills;
            }
          } catch { /* non-fatal — row will just show empty EWB */ }
        })
      );

      const printBilties = rawBilties.map((b: BiltySummary) => ({
        ...b,
        e_way_bills: ewbMap[b.bilty_id] ?? b.e_way_bills,
        to_city_name: b.to_city_name ?? (b.to_city_id ? cityMap[b.to_city_id] : undefined),
      }));

      const printData: ChallanPrintData = {
        challan_no:          selectedChallan.challan_no ?? undefined,
        challan_date:        selectedChallan.challan_date,
        challan_status:      selectedChallan.challan_status ?? selectedChallan.status,
        from_branch_name:    fromBranch?.name,
        from_branch_city:    fromBranchCity,
        to_branch_name:      toBranch?.name,
        to_branch_city:      toBranchCity,
        transport_name:      selectedChallan.transport_name ?? undefined,
        vehicle_no:          vehicleNo,
        vehicle_type:        vehicleType,
        driver_name:         driverName,
        driver_mobile:       driverMobile,
        driver_aadhar:       driverAadhar,
        remarks:             challanData.remarks ?? selectedChallan.remarks ?? undefined,
        trip_sheet_remarks:  tripDetail?.remarks ?? undefined,
        bilties: printBilties,
        total_packages: printBilties.reduce((s: number, b: BiltySummary) => s + (b.no_of_pkg ?? 0), 0),
        total_weight:   printBilties.reduce((s: number, b: BiltySummary) => s + (b.weight ?? b.actual_weight ?? 0), 0),
        total_freight:  printBilties.reduce((s: number, b: BiltySummary) => s + (b.total_amount ?? 0), 0),
      };

      const blobUrl = generateChallanA4LandscapeA(printData, tpl, logoDataUrl);
      setPrintUrl(blobUrl);
    } catch {
      setError('Failed to generate challan PDF.');
    } finally {
      setPrinting(false);
    }
  }

  function refreshBilties() {
    if (!selectedId) return;
    setLoadingBilties(true);
    apiFetch(`/v1/challan/${selectedId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setChallanBilties(d.bilties ?? []); })
      .finally(() => setLoadingBilties(false));
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading…</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50 overflow-hidden">

      {/* Print preview modal */}
      {printUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden"
               style={{ width: '90vw', height: '90vh', maxWidth: '1200px' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50 shrink-0">
              <span className="text-sm font-semibold text-gray-800">Challan Preview</span>
              <div className="flex items-center gap-2">
                <a
                  href={printUrl}
                  download={`challan-${selectedChallan?.challan_no ?? 'print'}.pdf`}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
                <button
                  onClick={() => { URL.revokeObjectURL(printUrl); setPrintUrl(null); }}
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* iframe */}
            <iframe
              src={printUrl}
              className="flex-1 w-full border-0"
              title="Challan Preview"
            />
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => setActiveTab('challan')}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'challan'
              ? 'border-violet-600 text-violet-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          Challan
        </button>
        <button
          onClick={() => setActiveTab('draft')}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'draft'
              ? 'border-amber-500 text-amber-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          Draft Bilties
        </button>
        <button
          onClick={() => setActiveTab('tripsheet')}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'tripsheet'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          Trip Sheets
        </button>
      </div>

      {/* Draft Bilties view */}
      {activeTab === 'draft' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <DraftBiltyDashboard onAvailRefresh={refreshAvailBilties} />
        </div>
      )}

      {/* Trip Sheets view */}
      {activeTab === 'tripsheet' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <TripSheetDashboard />
        </div>
      )}

      {/* Challan view */}
      {activeTab === 'challan' && <>

      {/* Section 1: Top bar — title + challan dropdown + status + action buttons */}
      <ChallanTopBar
        challans={challans}
        selectedId={selectedId}
        selectedChallan={selectedChallan}
        primaryBook={primaryBook}
        branches={branches}
        actionId={actionId}
        canCreate={canCreate}
        canUpdate={canUpdate}
        showForm={showForm}
        onSelectChallan={handleSelectChallan}
        onDoAction={doAction}
        onToggleForm={() => { setShowForm(v => !v); clearAlerts(); }}
      />

      {/* Section 2: Alert bar */}
      <ChallanAlerts error={error} success={success} onDismiss={clearAlerts} />

      {/* Section 3: New Challan form (collapsible) */}
      {showForm && (
        <NewChallanForm
          form={form} setForm={setForm}
          branches={branches} books={books}
          saving={saving}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Section 4: Stats bar */}
      <ChallanStatsBar
        availBilties={availBilties}
        challanBilties={challanBilties}
        selectedCount={selectedBilties.size}
      />

      {/* Section 5 + 6: Main body — bilties table + available bilties */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">

        {/* Section 5: Challan bilties table */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChallanBiltiesTable
            bilties={challanBilties}
            challanNo={selectedChallan?.challan_no ?? null}
            isEditable={isEditable}
            canUpdate={canUpdate}
            removingBilty={removingBilty}
            selectedBilties={selectedBilties}
            loading={loadingBilties}
            printing={printing}
            onToggleSelect={id =>
              setSelectedBilties(prev => {
                const n = new Set(prev);
                n.has(id) ? n.delete(id) : n.add(id);
                return n;
              })
            }
            onSelectAll={all =>
              setSelectedBilties(all ? new Set(challanBilties.map(b => b.bilty_id)) : new Set())
            }
            onRemove={removeBilty}
            onRemoveSelected={removeSelectedBilties}
            onRefresh={refreshBilties}
            onPrint={handlePrint}
          />
        </div>

        {/* Section 6: Available bilties panel */}
        <AvailableBiltiesPanel
          bilties={availBilties}
          isEditable={isEditable}
          canUpdate={canUpdate}
          addingBilty={addingBilty}
          challanNo={selectedChallan?.challan_no ?? null}
          onAdd={addBilty}
        />
      </div>

      </>}

    </div>
  );
}
