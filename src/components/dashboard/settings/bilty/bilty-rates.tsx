'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';

/* ─── types ─── */

interface BiltyRate {
  id: string;
  party_type: 'CONSIGNOR' | 'CONSIGNEE' | 'COMMON';
  consignor_id?: string | null;
  consignee_id?: string | null;
  consignor_name?: string | null;
  consignee_name?: string | null;
  destination_city_id: string;
  destination_city_name?: string | null;
  transport_id?: string | null;
  transport_name?: string | null;
  rate?: number | null;
  rate_unit?: string | null;
  minimum_weight_kg?: number | null;
  freight_minimum_amount?: number | null;
  labour_rate?: number | null;
  labour_unit?: string | null;
  dd_charge_per_kg?: number | null;
  dd_charge_per_nag?: number | null;
  bilty_charge?: number | null;
  receiving_slip_charge?: number | null;
  is_toll_tax_applicable: boolean;
  toll_tax_amount?: number | null;
  is_no_charge: boolean;
  is_active: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
}

interface RateCity      { city_id: string; city_name: string; }
interface RateConsignor { id?: string; consignor_id?: string; consignor_name: string; }
interface RateConsignee { id?: string; consignee_id?: string; consignee_name: string; }
interface RateTransport { transport_id: string; transport_name: string; }

const EMPTY_FORM = {
  party_type: 'COMMON' as 'COMMON' | 'CONSIGNOR' | 'CONSIGNEE',
  consignor_id: '',
  consignee_id: '',
  destination_city_id: '',
  transport_id: '',
  rate: '',
  rate_unit: '',
  minimum_weight_kg: '',
  freight_minimum_amount: '',
  labour_rate: '',
  labour_unit: '',
  dd_charge_per_kg: '',
  dd_charge_per_nag: '',
  bilty_charge: '',
  receiving_slip_charge: '',
  is_toll_tax_applicable: false,
  toll_tax_amount: '',
  is_no_charge: false,
  effective_from: '',
  effective_to: '',
};

export default function BiltyRates() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can(SLUGS.BILTY_RATES_CREATE);
  const canUpdate = can(SLUGS.BILTY_RATES_UPDATE);
  const canDelete = can(SLUGS.BILTY_RATES_DELETE);

  const [rates, setRates]           = useState<BiltyRate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editItem, setEditItem]     = useState<BiltyRate | null>(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [cities,      setCities]      = useState<RateCity[]>([]);
  const [consignors,  setConsignors]  = useState<RateConsignor[]>([]);
  const [consignees,  setConsignees]  = useState<RateConsignee[]>([]);
  const [transports,  setTransports]  = useState<RateTransport[]>([]);

  /* ── Load dropdown data once ── */
  useEffect(() => {
    async function loadDropdowns() {
      const [cityRes, crRes, ceRes, tpRes] = await Promise.all([
        apiFetch(`/v1/master/cities?is_active=true`,               { headers: h }),
        apiFetch(`/v1/bilty-setting/consignors?is_active=true`,    { headers: h }),
        apiFetch(`/v1/bilty-setting/consignees?is_active=true`,    { headers: h }),
        apiFetch(`/v1/master/transports?is_active=true`,           { headers: h }),
      ]);
      if (cityRes.ok) { const d = await cityRes.json(); setCities(Array.isArray(d.cities ?? d) ? (d.cities ?? d) : []); }
      if (crRes.ok)   { const d = await crRes.json();   setConsignors(Array.isArray(d.consignors ?? d) ? (d.consignors ?? d) : []); }
      if (ceRes.ok)   { const d = await ceRes.json();   setConsignees(Array.isArray(d.consignees ?? d) ? (d.consignees ?? d) : []); }
      if (tpRes.ok)   { const d = await tpRes.json();   setTransports(Array.isArray(d.transports ?? d) ? (d.transports ?? d) : []); }
    }
    loadDropdowns();
  }, []);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterParty) params.set('party_type', filterParty);
    try {
      const res = await apiFetch(`/v1/bilty-setting/rates?${params}`);
      if (res.status === 401) { router.replace('/auth/login'); return; }
      const data = await res.json();
      const list = data.rates ?? data;
      setRates(Array.isArray(list) ? list : []);
    } catch { setError('Failed to load rates.'); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterParty]);

  useEffect(() => {
    if (!getUser()) { router.replace('/auth/login'); return; }
    fetchRates();
  }, [fetchRates, router]);

  function openCreate() {
    setEditItem(null); setForm({ ...EMPTY_FORM });
    setError(''); setSuccess(''); setShowForm(true);
  }

  function openEdit(r: BiltyRate) {
    setEditItem(r);
    setForm({
      party_type:               r.party_type,
      consignor_id:             r.consignor_id ?? '',
      consignee_id:             r.consignee_id ?? '',
      destination_city_id:      r.destination_city_id,
      transport_id:             r.transport_id ?? '',
      rate:                     r.rate != null ? String(r.rate) : '',
      rate_unit:                r.rate_unit ?? '',
      minimum_weight_kg:        r.minimum_weight_kg != null ? String(r.minimum_weight_kg) : '',
      freight_minimum_amount:   r.freight_minimum_amount != null ? String(r.freight_minimum_amount) : '',
      labour_rate:              r.labour_rate != null ? String(r.labour_rate) : '',
      labour_unit:              r.labour_unit ?? '',
      dd_charge_per_kg:         r.dd_charge_per_kg != null ? String(r.dd_charge_per_kg) : '',
      dd_charge_per_nag:        r.dd_charge_per_nag != null ? String(r.dd_charge_per_nag) : '',
      bilty_charge:             r.bilty_charge != null ? String(r.bilty_charge) : '',
      receiving_slip_charge:    r.receiving_slip_charge != null ? String(r.receiving_slip_charge) : '',
      is_toll_tax_applicable:   r.is_toll_tax_applicable,
      toll_tax_amount:          r.toll_tax_amount != null ? String(r.toll_tax_amount) : '',
      is_no_charge:             r.is_no_charge,
      effective_from:           r.effective_from ?? '',
      effective_to:             r.effective_to ?? '',
    });
    setError(''); setSuccess(''); setShowForm(true);
  }

  function closeForm() {
    setShowForm(false); setEditItem(null);
    setForm({ ...EMPTY_FORM }); setError('');
  }

  function setF<K extends keyof typeof EMPTY_FORM>(key: K, val: (typeof EMPTY_FORM)[K]) {
    setForm(p => ({ ...p, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');

    // Build body — only include non-empty optional fields
    const body: Record<string, unknown> = {
      party_type: form.party_type,
      destination_city_id: form.destination_city_id.trim(),
      is_toll_tax_applicable: form.is_toll_tax_applicable,
      is_no_charge: form.is_no_charge,
    };
    if (form.party_type === 'CONSIGNOR' && form.consignor_id.trim()) body.consignor_id = form.consignor_id.trim();
    if (form.party_type === 'CONSIGNEE' && form.consignee_id.trim()) body.consignee_id = form.consignee_id.trim();
    if (form.transport_id.trim())           body.transport_id          = form.transport_id.trim();
    if (form.rate.trim())                   body.rate                  = Number(form.rate);
    if (form.rate_unit.trim())              body.rate_unit             = form.rate_unit.trim();
    if (form.minimum_weight_kg.trim())      body.minimum_weight_kg     = Number(form.minimum_weight_kg);
    if (form.freight_minimum_amount.trim()) body.freight_minimum_amount = Number(form.freight_minimum_amount);
    if (form.labour_rate.trim())            body.labour_rate           = Number(form.labour_rate);
    if (form.labour_unit.trim())            body.labour_unit           = form.labour_unit.trim();
    if (form.dd_charge_per_kg.trim())       body.dd_charge_per_kg      = Number(form.dd_charge_per_kg);
    if (form.dd_charge_per_nag.trim())      body.dd_charge_per_nag     = Number(form.dd_charge_per_nag);
    if (form.bilty_charge.trim())           body.bilty_charge          = Number(form.bilty_charge);
    if (form.receiving_slip_charge.trim())  body.receiving_slip_charge = Number(form.receiving_slip_charge);
    if (form.toll_tax_amount.trim())        body.toll_tax_amount       = Number(form.toll_tax_amount);
    if (form.effective_from.trim())         body.effective_from        = form.effective_from.trim();
    if (form.effective_to.trim())           body.effective_to          = form.effective_to.trim();

    try {
      const url = editItem
        ? `/v1/bilty-setting/rates/${editItem.id}`
        : `/v1/bilty-setting/rates`;
      const res = await apiFetch(url, {
        method: editItem ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail)
          ? data.detail.map((d: { msg: string }) => d.msg).join('. ')
          : (data.detail ?? 'Operation failed.');
        setError(msg); return;
      }
      setSuccess(editItem ? 'Rate updated.' : 'Rate created.');
      closeForm(); fetchRates();
    } catch { setError('Unable to reach the server.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this rate?')) return;
    setDeletingId(id); setError('');
    try {
      const res = await apiFetch(`/v1/bilty-setting/rates/${id}`, {
        method: 'DELETE',      });
      if (!res.ok && res.status !== 204) { setError('Failed to delete.'); return; }
      setSuccess('Rate deleted.'); fetchRates();
    } catch { setError('Unable to reach the server.'); }
    finally { setDeletingId(null); }
  }

  const filtered = filterParty ? rates.filter(r => r.party_type === filterParty) : rates;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Bilty Rates</h1>
          <p className="text-sm text-slate-500">Configure freight rates and surcharges per party and destination.</p>
        </div>
        {canCreate && (
          <button type="button" onClick={openCreate}
            className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
            + New Rate
          </button>
        )}
      </div>

      {error   && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      {/* Filter */}
      <div className="flex gap-2 mb-5">
        {(['', 'COMMON', 'CONSIGNOR', 'CONSIGNEE'] as const).map(t => (
          <button key={t} type="button" onClick={() => setFilterParty(t)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${filterParty === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {t || 'All'}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
          <p className="text-sm font-semibold text-slate-700">{editItem ? 'Edit Rate' : 'New Rate'}</p>

          {/* Party + Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Party Type *</label>
              <select required value={form.party_type} onChange={e => setF('party_type', e.target.value as 'COMMON' | 'CONSIGNOR' | 'CONSIGNEE')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="COMMON">COMMON</option>
                <option value="CONSIGNOR">CONSIGNOR</option>
                <option value="CONSIGNEE">CONSIGNEE</option>
              </select>
            </div>
            {form.party_type === 'CONSIGNOR' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Consignor</label>
                <select value={form.consignor_id} onChange={e => setF('consignor_id', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— Select consignor —</option>
                  {consignors.map((c, i) => {
                    const id = c.consignor_id ?? c.id ?? String(i);
                    return <option key={id} value={id}>{c.consignor_name}</option>;
                  })}
                </select>
              </div>
            )}
            {form.party_type === 'CONSIGNEE' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Consignee</label>
                <select value={form.consignee_id} onChange={e => setF('consignee_id', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— Select consignee —</option>
                  {consignees.map((c, i) => {
                    const id = c.consignee_id ?? c.id ?? String(i);
                    return <option key={id} value={id}>{c.consignee_name}</option>;
                  })}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Destination City *</label>
              <select required value={form.destination_city_id} onChange={e => setF('destination_city_id', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Select city —</option>
                {cities.map(c => <option key={c.city_id} value={c.city_id}>{c.city_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Transporter <span className="text-slate-400 font-normal">(optional)</span></label>
              <select value={form.transport_id} onChange={e => setF('transport_id', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Any transporter —</option>
                {transports.map(t => <option key={t.transport_id} value={t.transport_id}>{t.transport_name}</option>)}
              </select>
            </div>
          </div>

          {/* Rate fields */}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Freight Charges</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              ['rate',                  'Rate'],
              ['rate_unit',             'Rate Unit'],
              ['minimum_weight_kg',     'Min Weight (kg)'],
              ['freight_minimum_amount','Min Freight Amt'],
              ['labour_rate',           'Labour Rate'],
              ['labour_unit',           'Labour Unit'],
              ['dd_charge_per_kg',      'DD/kg'],
              ['dd_charge_per_nag',     'DD/nag'],
              ['bilty_charge',          'Bilty Charge'],
              ['receiving_slip_charge', 'Receiving Slip'],
            ] as [keyof typeof EMPTY_FORM, string][]).map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input value={form[key] as string} onChange={e => setF(key, e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ))}
          </div>

          {/* Tolls + effective dates */}
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_toll_tax_applicable} onChange={e => setF('is_toll_tax_applicable', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
              Toll Tax Applicable
            </label>
            {form.is_toll_tax_applicable && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-700">Toll Amount</label>
                <input value={form.toll_tax_amount} onChange={e => setF('toll_tax_amount', e.target.value)} type="number" min={0}
                  className="w-28 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_no_charge} onChange={e => setF('is_no_charge', e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
              No Charge
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Effective From</label>
              <input type="date" value={form.effective_from} onChange={e => setF('effective_from', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Effective To</label>
              <input type="date" value={form.effective_to} onChange={e => setF('effective_to', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeForm}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {saving ? 'Saving…' : editItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-14 text-center text-sm text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center text-sm text-slate-400 bg-white rounded-xl border border-slate-200">
          No rates found.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Party</th>
                <th className="px-5 py-3 text-left">Destination</th>
                <th className="px-5 py-3 text-left">Rate</th>
                <th className="px-5 py-3 text-left">Labour</th>
                <th className="px-5 py-3 text-left">Bilty Charge</th>
                <th className="px-5 py-3 text-left">Toll</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-700 text-xs">{r.party_type}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{r.consignor_name ?? r.consignee_name ?? '—'}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{r.destination_city_name ?? r.destination_city_id}</td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {r.rate != null ? `₹${r.rate}${r.rate_unit ? ` / ${r.rate_unit}` : ''}` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {r.labour_rate != null ? `₹${r.labour_rate}${r.labour_unit ? ` / ${r.labour_unit}` : ''}` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {r.bilty_charge != null ? `₹${r.bilty_charge}` : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    {r.is_toll_tax_applicable ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        ₹{r.toll_tax_amount ?? '—'}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">N/A</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {r.is_no_charge ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">No Charge</span>
                    ) : r.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">Active</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">Inactive</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {(canUpdate || canDelete) && (
                      <div className="flex items-center justify-end gap-2">
                        {canUpdate && (
                          <button type="button" onClick={() => openEdit(r)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button type="button" disabled={deletingId === r.id}
                            onClick={() => handleDelete(r.id)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors">
                            {deletingId === r.id ? '…' : 'Delete'}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
