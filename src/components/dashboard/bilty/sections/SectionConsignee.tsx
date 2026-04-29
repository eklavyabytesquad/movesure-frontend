import { Consignee, BiltyForm } from '../types';
import { SectionTitle, Label, TypeaheadInput, INPUT } from '../ui';

interface Props {
  form: BiltyForm;
  consignees: Consignee[];
  sf: (key: keyof BiltyForm, val: string) => void;
  selectConsignee: (id: string) => void;
}

export default function SectionConsignee({ form, consignees, sf, selectConsignee }: Props) {
  const items = consignees.map(c => ({
    id:    c.consignee_id ?? c.id ?? '',
    label: c.consignee_name,
    sub:   c.mobile ?? c.gstin ?? undefined,
  }));

  return (
    <div className="pb-2 border-b border-slate-100">
      <SectionTitle>Consignee (Receiver)</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <Label>Consignee Name</Label>
          <TypeaheadInput
            items={items}
            value={form.consignee_name}
            onChange={text => { sf('consignee_name', text); sf('consignee_id', ''); }}
            onSelect={item => selectConsignee(item.id)}
            placeholder="Search or enter consignee name"
          />
        </div>
        <div>
          <Label>GSTIN</Label>
          <input value={form.consignee_gstin} onChange={e => sf('consignee_gstin', e.target.value)}
            placeholder="27AABCT1234Z5" maxLength={15} className={INPUT} />
        </div>
        <div>
          <Label>Mobile</Label>
          <input value={form.consignee_mobile} onChange={e => sf('consignee_mobile', e.target.value)}
            placeholder="8000000010" className={INPUT} />
        </div>
      </div>
    </div>
  );
}
