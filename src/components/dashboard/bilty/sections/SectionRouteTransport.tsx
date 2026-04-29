import { useState, useEffect } from 'react';
import { City, Transport, BiltyForm } from '../types';
import { SectionTitle, Label, TypeaheadInput, INPUT } from '../ui';

interface Props {
  form: BiltyForm;
  cities: City[];
  transports: Transport[];
  sf: (key: keyof BiltyForm, val: string) => void;
  selectTransport: (id: string) => void;
  onToCitySelect?: (cityId: string) => void;
}

export default function SectionRouteTransport({ form, cities, transports, sf, selectTransport, onToCitySelect }: Props) {
  const [toText, setToText] = useState('');
  const [tpText, setTpText] = useState('');

  useEffect(() => {
    setToText(cities.find(c => c.city_id === form.to_city_id)?.city_name ?? '');
  }, [form.to_city_id, cities]);

  useEffect(() => {
    setTpText(transports.find(t => t.transport_id === form.transport_id)?.transport_name ?? form.transport_name ?? '');
  }, [form.transport_id, form.transport_name, transports]);

  const cityItems = cities.map(c => ({ id: c.city_id, label: c.city_name, sub: c.city_code ?? undefined }));
  const tpItems   = transports.map(t => ({ id: t.transport_id, label: t.transport_name, sub: t.mobile ?? undefined }));

  return (
    <div className="pb-2 border-b border-slate-100">
      <SectionTitle>To City &amp; Transport</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <Label>To City</Label>
          <TypeaheadInput
            items={cityItems}
            value={toText}
            onChange={text => { setToText(text); if (!text) sf('to_city_id', ''); }}
            onSelect={item => { sf('to_city_id', item.id); setToText(item.label); onToCitySelect?.(item.id); }}
            placeholder="Search city"
          />
        </div>
        <div>
          <Label>Transporter</Label>
          <TypeaheadInput
            items={tpItems}
            value={tpText}
            onChange={text => { setTpText(text); sf('transport_name', text); if (!text) sf('transport_id', ''); }}
            onSelect={item => { selectTransport(item.id); setTpText(item.label); }}
            placeholder="Search transporter"
          />
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
