import { BiltyForm } from '../types';
import { INPUT, SectionTitle, Label } from '../ui';

interface Props {
  form: BiltyForm;
  sf: (key: keyof BiltyForm, val: string) => void;
}

interface ChargeRowProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  bold?: boolean;
  highlight?: boolean;
}

const INPUT_SM = 'w-full border border-slate-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';
const INPUT_CHARGE = 'w-36 border rounded-md px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400';

function ChargeRow({ label, value, onChange, bold, highlight }: ChargeRowProps) {
  return (
    <div className={`flex items-center justify-between gap-1.5 ${bold ? 'border-t border-slate-200 pt-2 mt-1' : ''}`}>
      <span className={`text-xs shrink-0 ${bold ? 'font-bold text-slate-800' : 'text-slate-500'}`}>{label}</span>
      <span className="text-xs text-slate-400 shrink-0">₹</span>
      <input
        type="number" min={0} step="0.01"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0.00"
        className={`${INPUT_CHARGE} ${
          highlight
            ? 'font-bold text-indigo-700 bg-indigo-50 border-indigo-200'
            : 'border-slate-300 bg-white text-slate-800'
        }`}
      />
    </div>
  );
}

export default function SectionCharges({ form, sf }: Props) {
  const isDoor = form.delivery_type === 'DOOR';

  return (
    <div className="pb-2 border-b border-slate-100 overflow-hidden">
      <SectionTitle>Goods &amp; Charges</SectionTitle>
      <div className="flex gap-4 min-w-0">

        {/* Left: Goods details — compact inputs */}
        <div className="min-w-0" style={{ width: 'calc(100% - 316px)' }}>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Goods</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <Label>Pvt Marks</Label>
              <input value={form.pvt_marks} onChange={e => sf('pvt_marks', e.target.value)} className={INPUT_SM} />
            </div>
            <div>
              <Label>Packages</Label>
              <input type="number" min={0} value={form.no_of_pkg} onChange={e => sf('no_of_pkg', e.target.value)} className={INPUT_SM} />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <input type="number" min={0} step="0.01" value={form.weight} onChange={e => sf('weight', e.target.value)} className={INPUT_SM} />
            </div>
            <div>
              <Label>Actual Wt (kg)</Label>
              <input type="number" min={0} step="0.01" value={form.actual_weight} onChange={e => sf('actual_weight', e.target.value)} className={INPUT_SM} />
            </div>
            <div>
              <Label>Labour Rate</Label>
              <input type="number" min={0} step="0.01" value={form.labour_rate} onChange={e => sf('labour_rate', e.target.value)} className={INPUT_SM} />
            </div>
            <div>
              <Label>Rate (/kg)</Label>
              <input type="number" min={0} step="0.01" value={form.rate} onChange={e => sf('rate', e.target.value)} className={INPUT_SM} />
            </div>
          </div>
        </div>

        {/* Right: Charges vertical (invoice style) — fixed 172px, won't overflow */}
        <div className="shrink-0" style={{ width: '308px' }}>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Charges</p>
          <div className="space-y-1.5">
            <ChargeRow label="Freight"     value={form.freight_amount} onChange={v => sf('freight_amount', v)} />
            <ChargeRow label="Labour"      value={form.labour_charge}  onChange={v => sf('labour_charge', v)} />
            <ChargeRow label="Bill Charge" value={form.bill_charge}    onChange={v => sf('bill_charge', v)} />
            <ChargeRow label="Toll"        value={form.toll_charge}    onChange={v => sf('toll_charge', v)} />
            <ChargeRow label="PF"          value={form.pf_charge}      onChange={v => sf('pf_charge', v)} />
            <ChargeRow label="Local"       value={form.local_charge}   onChange={v => sf('local_charge', v)} />
            {isDoor && (
              <ChargeRow label="DD Charge" value={form.dd_charge}      onChange={v => sf('dd_charge', v)} />
            )}
            <ChargeRow label="TOTAL"       value={form.total_amount}   onChange={v => sf('total_amount', v)} bold highlight />
          </div>
        </div>

      </div>
    </div>
  );
}
