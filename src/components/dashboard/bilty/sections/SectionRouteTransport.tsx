import { useState, useEffect, useMemo } from 'react';
import { City, Transport, BiltyForm } from '../types';
import { SectionTitle, Label, TypeaheadInput, INPUT } from '../ui';

interface CityTransportEntry { transport_id: string; mobile?: string; }

interface Props {
  form: BiltyForm;
  cities: City[];
  transports: Transport[];
  cityTransportMap: Record<string, CityTransportEntry[]>;
  sf: (key: keyof BiltyForm, val: string) => void;
  selectTransport: (id: string) => void;
  onToCitySelect?: (cityId: string) => void;
}

export default function SectionRouteTransport({ form, cities, transports, cityTransportMap, sf, selectTransport, onToCitySelect }: Props) {
  const [toText, setToText]           = useState('');
  const [tpText, setTpText]           = useState('');
  const [useManualSearch, setUseManualSearch] = useState(false);

  useEffect(() => {
    setToText(cities.find(c => c.city_id === form.to_city_id)?.city_name ?? '');
    // Reset to dropdown mode whenever city changes
    setUseManualSearch(false);
  }, [form.to_city_id, cities]);

  useEffect(() => {
    setTpText(transports.find(t => t.transport_id === form.transport_id)?.transport_name ?? form.transport_name ?? '');
  }, [form.transport_id, form.transport_name, transports]);

  // Transports linked to the selected city (ordered oldest-first as returned by API)
  const cityTransports = useMemo<(Transport & { branchMobile?: string })[]>(() => {
    const raw = cityTransportMap[form.to_city_id] ?? [];
    // Normalize: old cache may have stored plain strings instead of objects
    const entries: CityTransportEntry[] = Array.isArray(raw)
      ? raw.map(r => (typeof r === 'string' ? { transport_id: r } : r as CityTransportEntry))
      : [{ transport_id: raw as unknown as string }];
    const mapped = entries.map(e => {
      const t = transports.find(t => t.transport_id === e.transport_id);
      if (!t) return undefined;
      return { ...t, branchMobile: e.mobile } as Transport & { branchMobile?: string };
    });
    return mapped.filter((t): t is Transport & { branchMobile?: string } => t !== undefined);
  }, [form.to_city_id, cityTransportMap, transports]);

  const cityItems = cities.map(c => ({ id: c.city_id, label: c.city_name, sub: c.city_code ?? undefined }));
  const tpItems   = transports.map(t => ({ id: t.transport_id, label: t.transport_name, sub: t.mobile ?? undefined }));

  const showDropdown = cityTransports.length > 0 && !useManualSearch;

  return (
    <div className="pb-2 border-b border-slate-100">
      <SectionTitle>To City &amp; Transport</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">

        {/* To City — searchable by name OR city code; auto-selects on exact code match */}
        <div>
          <Label>To City</Label>
          <TypeaheadInput
            items={cityItems}
            value={toText}
            onChange={text => {
              setToText(text);
              if (!text) { sf('to_city_id', ''); return; }
              // Auto-select when typed text is an exact city_code match
              const exactCode = cities.find(
                c => c.city_code && c.city_code.toLowerCase() === text.trim().toLowerCase()
              );
              if (exactCode) {
                sf('to_city_id', exactCode.city_id);
                setToText(exactCode.city_name);
                onToCitySelect?.(exactCode.city_id);
              }
            }}
            onSelect={item => {
              sf('to_city_id', item.id);
              setToText(item.label);
              onToCitySelect?.(item.id);
            }}
            placeholder="Name or city code"
          />
        </div>

        {/* Transporter — dropdown when city has linked transports, typeahead otherwise */}
        <div>
          <Label>Transporter</Label>

          {showDropdown ? (
            <>
              <select
                value={form.transport_id}
                onChange={e => {
                  selectTransport(e.target.value);
                  const entry = cityTransports.find(t => t.transport_id === e.target.value);
                  const mobile = entry?.branchMobile ?? entry?.mobile;
                  if (mobile) sf('transport_mobile', mobile);
                }}
                className={INPUT}
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
                className="text-[10px] text-indigo-500 hover:text-indigo-700 mt-0.5 underline"
              >
                Search all transports
              </button>
            </>
          ) : (
            <>
              <TypeaheadInput
                items={tpItems}
                value={tpText}
                onChange={text => { setTpText(text); sf('transport_name', text); if (!text) sf('transport_id', ''); }}
                onSelect={item => {
                  selectTransport(item.id);
                  setTpText(item.label);
                  // Populate branch_mobile if this transport is linked to the current city
                  const cityEntries = cityTransportMap[form.to_city_id] ?? [];
                  const entries: CityTransportEntry[] = Array.isArray(cityEntries)
                    ? cityEntries.map(r => (typeof r === 'string' ? { transport_id: r } : r as CityTransportEntry))
                    : [];
                  const linked = entries.find(e => e.transport_id === item.id);
                  if (linked?.mobile) sf('transport_mobile', linked.mobile);
                }}
                placeholder="Search transporter"
              />
              {cityTransports.length > 0 && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setUseManualSearch(false)}
                  className="text-[10px] text-indigo-500 hover:text-indigo-700 mt-0.5 underline"
                >
                  ← City transports ({cityTransports.length})
                </button>
              )}
            </>
          )}
        </div>

        <div>
          <Label>Transport GSTIN</Label>
          <input value={form.transport_gstin} onChange={e => sf('transport_gstin', e.target.value)}
            maxLength={15} className={INPUT} />
        </div>
        <div>
          <Label>Transport Mobile</Label>
          <input value={form.transport_mobile} onChange={e => sf('transport_mobile', e.target.value)} className={INPUT} />
        </div>
      </div>
    </div>
  );
}
