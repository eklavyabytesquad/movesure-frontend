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

  return (
    <div className="pb-2 border-b border-slate-100">
      <SectionTitle>Consignor (Sender)</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <Label>Consignor Name *</Label>
          <TypeaheadInput
            items={items}
            value={form.consignor_name}
            onChange={text => { sf('consignor_name', text); sf('consignor_id', ''); }}
            onSelect={item => selectConsignor(item.id)}
            placeholder="Search or enter consignor name"
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
