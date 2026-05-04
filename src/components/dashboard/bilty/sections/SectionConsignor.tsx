import { Consignor, BiltyForm } from '../types';
import { SectionTitle, Label, TypeaheadInput, INPUT } from '../ui';

interface Props {
  form: BiltyForm;
  consignors: Consignor[];
  sf: (key: keyof BiltyForm, val: string) => void;
  selectConsignor: (id: string) => void;
}

export default function SectionConsignor({ form, consignors, sf, selectConsignor }: Props) {
  const items = consignors.map(c => ({
    id:    c.consignor_id ?? c.id ?? '',
    label: c.consignor_name,
    sub:   c.mobile ?? c.gstin ?? undefined,
  }));

  function handleChange(text: string) {
    // If a consignor was selected and user starts typing, deselect and start fresh
    if (form.consignor_id) {
      sf('consignor_id', '');
      sf('consignor_gstin', '');
      sf('consignor_mobile', '');
    }
    sf('consignor_name', text);
    if (!text) return;
    // Auto-select on exact GSTIN or mobile match
    const q = text.trim().toLowerCase();
    const exact = consignors.find(
      c =>
        (c.gstin  && c.gstin.toLowerCase()  === q) ||
        (c.mobile && c.mobile.toLowerCase() === q)
    );
    if (exact) selectConsignor(exact.consignor_id ?? exact.id ?? '');
  }

  return (
    <div className="pb-2 border-b border-slate-100">
      <SectionTitle>Consignor (Sender)</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <Label>Consignor Name *</Label>
          <TypeaheadInput
            items={items}
            value={form.consignor_name}
            onChange={handleChange}
            onSelect={item => selectConsignor(item.id)}
            placeholder="Search by name, GSTIN or mobile"
            required
          />
        </div>
        <div>
          <Label>GSTIN</Label>
          <input value={form.consignor_gstin} onChange={e => sf('consignor_gstin', e.target.value)}
            placeholder="27AABCS1234Z5" maxLength={15} className={INPUT} />
        </div>
        <div>
          <Label>Mobile</Label>
          <input value={form.consignor_mobile} onChange={e => sf('consignor_mobile', e.target.value)}
            placeholder="9000000000" className={INPUT} />
        </div>
      </div>
    </div>
  );
}
