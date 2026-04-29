import { BiltyForm } from '../types';
import { INPUT, SectionTitle, Label } from '../ui';

interface Props {
  form: BiltyForm;
  sf: (key: keyof BiltyForm, val: string) => void;
  ewbNumbers: string[];
  setEwbNumbers: (v: string[]) => void;
}

export default function SectionInvoiceEwb({ form, sf, ewbNumbers, setEwbNumbers }: Props) {
  function updateEwb(i: number, val: string) {
    const next = [...ewbNumbers];
    next[i] = val;
    setEwbNumbers(next);
  }

  function addEwb() {
    setEwbNumbers([...ewbNumbers, '']);
  }

  function removeEwb(i: number) {
    if (ewbNumbers.length === 1) { setEwbNumbers(['']); return; }
    setEwbNumbers(ewbNumbers.filter((_, idx) => idx !== i));
  }

  return (
    <div className="pb-2 border-b border-slate-100">
      <SectionTitle>Invoice &amp; E-Way Bills</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-0">
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
        {/* EWB inline */}
        <div className="col-span-2 sm:col-span-1">
          <Label>E-Way Bills</Label>
          <div className="flex flex-wrap gap-1">
            {ewbNumbers.map((ewb, i) => (
              <div key={i} className="flex items-center gap-1 flex-1 min-w-[130px]">
                <input
                  value={ewb}
                  onChange={e => updateEwb(i, e.target.value)}
                  placeholder={`EWB ${i + 1}`}
                  maxLength={15}
                  className={INPUT}
                />
                <button type="button" onClick={() => removeEwb(i)}
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 text-xs transition-colors"
                >×</button>
              </div>
            ))}
            <button type="button" onClick={addEwb}
              className="h-7 px-2 text-[10px] rounded border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors font-medium whitespace-nowrap self-end">
              + Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
