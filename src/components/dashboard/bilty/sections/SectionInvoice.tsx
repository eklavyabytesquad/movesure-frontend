import { useEffect } from 'react';
import { BiltyForm } from '../types';
import { INPUT, SectionTitle, Label, DateInput } from '../ui';

interface Props {
  form: BiltyForm;
  sf: (key: keyof BiltyForm, val: string) => void;
}

export default function SectionInvoice({ form, sf }: Props) {
  // Auto-set invoice date to today if blank
  useEffect(() => {
    if (!form.invoice_date) {
      sf('invoice_date', new Date().toISOString().split('T')[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <DateInput value={form.invoice_date} onChange={v => sf('invoice_date', v)} />
        </div>
      </div>
    </div>
  );
}
