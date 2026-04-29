import { BiltyForm } from '../types';
import { INPUT, SectionTitle, Label } from '../ui';

interface Props {
  form: BiltyForm;
  sf: (key: keyof BiltyForm, val: string) => void;
}

export default function SectionShipment({ form, sf }: Props) {
  return (
    <div className="pb-2 border-b border-slate-100">
      <SectionTitle>Delivery</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label>Delivery Type</Label>
          <select value={form.delivery_type} onChange={e => sf('delivery_type', e.target.value as 'DOOR' | 'GODOWN')} className={INPUT}>
            <option value="DOOR">DOOR</option>
            <option value="GODOWN">GODOWN</option>
          </select>
        </div>
        <div>
          <Label>Payment Mode</Label>
          <select value={form.payment_mode} onChange={e => sf('payment_mode', e.target.value as 'PAID' | 'TO-PAY' | 'FOC')} className={INPUT}>
            <option value="PAID">PAID</option>
            <option value="TO-PAY">TO-PAY</option>
            <option value="FOC">FOC</option>
          </select>
        </div>
        <div>
          <Label>Contain (Goods)</Label>
          <input value={form.contain} onChange={e => sf('contain', e.target.value)}
            placeholder="e.g. Electronics" className={INPUT} />
        </div>
      </div>
    </div>
  );
}
