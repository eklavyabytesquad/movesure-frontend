'use client';

import { useState, useEffect, useMemo } from 'react';
import { City, Transport, ManualForm } from './types';
import { TypeaheadInput, TypeaheadItem } from '@/components/dashboard/bilty/ui';

const CLS   = 'w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white transition-colors';
const LABEL = 'block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide';

interface CityTransportEntry { transport_id: string; mobile?: string; }

interface Props {
  form: ManualForm;
  cities: City[];
  transports: Transport[];
  cityTransportMap: Record<string, CityTransportEntry[]>;
  toCityText: string;
  transportText: string;
  onToCityTextChange: (t: string) => void;
  onToCitySelect: (item: TypeaheadItem) => void;
  onTransportTextChange: (t: string) => void;
  onTransportSelect: (item: TypeaheadItem) => void;
  onChange: (k: keyof ManualForm, v: string) => void;
  onChangeMulti: (patch: Partial<ManualForm>) => void;
}

export default function ModalRouteSection({
  form, cities, transports, cityTransportMap,
  toCityText, transportText,
  onToCityTextChange, onToCitySelect,
  onTransportTextChange, onTransportSelect,
  onChange, onChangeMulti,
}: Props) {
  const [useManualSearch, setUseManualSearch] = useState(false);

  // Reset to dropdown mode whenever city changes
  useEffect(() => {
    setUseManualSearch(false);
  }, [form.to_city_id]);

  // Transports linked to the selected To City
  type CityTransport = Transport & { branchMobile?: string };
  const cityTransports = useMemo<CityTransport[]>(() => {
    const raw = cityTransportMap[form.to_city_id ?? ''] ?? [];
    const result: CityTransport[] = [];
    raw.forEach(e => {
      const t = transports.find(x => x.transport_id === e.transport_id);
      if (t) result.push({ ...t, branchMobile: e.mobile ?? undefined });
    });
    return result;
  }, [form.to_city_id, cityTransportMap, transports]);

  // Auto-select: if exactly one transport linked to city, select it automatically
  useEffect(() => {
    if (cityTransports.length === 1) {
      const t = cityTransports[0];
      onChangeMulti({ transport_id: t.transport_id, transport_name: t.transport_name });
      onTransportTextChange(t.transport_name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityTransports]);

  const cityItems: TypeaheadItem[] = useMemo(
    () => cities.map(c => ({ id: c.city_id, label: c.city_name, sub: c.city_code ?? undefined })),
    [cities]
  );
  const tpItems: TypeaheadItem[] = useMemo(
    () => transports.map(t => ({ id: t.transport_id, label: t.transport_name, sub: t.mobile ?? undefined })),
    [transports]
  );

  const showDropdown = cityTransports.length > 0 && !useManualSearch;

  function handleToCityChange(text: string) {
    onToCityTextChange(text);
    if (!text) { onChange('to_city_id', ''); return; }
    // Auto-select on exact city_code match
    const exact = cities.find(
      c => c.city_code && c.city_code.toLowerCase() === text.trim().toLowerCase()
    );
    if (exact) {
      onChange('to_city_id', exact.city_id);
      onToCityTextChange(exact.city_name);
    }
  }

  function handleTransportChange(text: string) {
    onTransportTextChange(text);
    if (!text) onChangeMulti({ transport_id: '', transport_name: '' });
  }

  function handleTransportDropdownChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const t = cityTransports.find(t => t.transport_id === e.target.value);
    if (!t) return;
    onChangeMulti({ transport_id: t.transport_id, transport_name: t.transport_name });
    onTransportTextChange(t.transport_name);
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* To City */}
      <div>
        <label className={LABEL}>To City *</label>
        <TypeaheadInput
          items={cityItems}
          value={toCityText}
          onChange={handleToCityChange}
          onSelect={item => { onChange('to_city_id', item.id); onToCitySelect(item); }}
          placeholder="Name or code…"
        />
      </div>

      {/* Transporter */}
      <div>
        <label className={LABEL}>Transporter</label>

        {showDropdown ? (
          <>
            <select
              value={form.transport_id ?? ''}
              onChange={handleTransportDropdownChange}
              className={CLS}
            >
              {cityTransports.map((t, i) => (
                <option key={t.transport_id} value={t.transport_id}>
                  {t.transport_name}{t.branchMobile ? ` — ${t.branchMobile}` : ''}{i === 0 ? ' (default)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setUseManualSearch(true)}
              className="text-[10px] text-violet-500 hover:text-violet-700 mt-0.5 underline"
            >
              Search all transports
            </button>
          </>
        ) : (
          <>
            <TypeaheadInput
              items={tpItems}
              value={transportText}
              onChange={handleTransportChange}
              onSelect={item => { onTransportSelect(item); onTransportTextChange(item.label); }}
              placeholder="Search transporter…"
            />
            {cityTransports.length > 0 && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setUseManualSearch(false)}
                className="text-[10px] text-violet-500 hover:text-violet-700 mt-0.5 underline"
              >
                ← City transports ({cityTransports.length})
              </button>
            )}
          </>
        )}
      </div>

      {/* Payment Mode */}
      <div>
        <label className={LABEL}>Payment Mode</label>
        <select value={form.payment_mode} onChange={e => onChange('payment_mode', e.target.value)} className={CLS}>
          <option value="TO-PAY">TO-PAY</option>
          <option value="PAID">PAID</option>
          <option value="FOC">FOC</option>
        </select>
      </div>

      {/* Delivery Type */}
      <div>
        <label className={LABEL}>Delivery Type</label>
        <select value={form.delivery_type} onChange={e => onChange('delivery_type', e.target.value)} className={CLS}>
          <option value="DOOR">DOOR</option>
          <option value="GODOWN">GODOWN</option>
        </select>
      </div>
    </div>
  );
}
