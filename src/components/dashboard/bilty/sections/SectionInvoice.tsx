import { BiltyForm } from '../types';
import { INPUT, SectionTitle, Label } from '../ui';

interface Props {
  form: BiltyForm;
  sf: (key: keyof BiltyForm, val: string) => void;
}

export default function SectionInvoice({ form, sf }: Props) {
  return (
    <div className="pb-2 border-b border-slate-100">
      <SectionTitle>Invoice</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label>Invoice No.</Label>
          <input value={form.invoice_no} onChange={e => sf('invoice_no', e.target.value)}
            placeholder="INV-2026-001" className={INPUT} />
        </div>
        <div>
          <Label>Invoice Value (₹)</Label>
          <input type="number" min={0} step="0.01" value={form.invoice_value}
            onChange={e => sf('invoice_value', e.target.value)} className={INPUT} />
        </div>
        <div>
          <Label>Invoice Date</Label>
          <input type="date" value={form.invoice_date}
            onChange={e => sf('invoice_date', e.target.value)} className={INPUT} />
        </div>
      </div>
    </div>
  );
}
