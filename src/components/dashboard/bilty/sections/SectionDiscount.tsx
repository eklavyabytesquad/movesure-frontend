import { BiltyDiscount, BiltyForm } from '../types';
import { INPUT, Label } from '../ui';

interface Props {
  form: BiltyForm;
  discounts: BiltyDiscount[];
  sf: (key: keyof BiltyForm, val: string) => void;
}

export default function SectionDiscount({ form, discounts, sf }: Props) {
  if (discounts.length === 0) return null;

  const disc = discounts.find(d => d.id === form.discount_id);
  const total = parseFloat(form.total_amount) || 0;

  return (
    <div className="pb-2 border-b border-slate-100">
      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1.5">
        Discount
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <Label>Apply Discount</Label>
          <select value={form.discount_id} onChange={e => sf('discount_id', e.target.value)} tabIndex={-1} className={INPUT}>
            <option value="">— No discount —</option>
            {discounts.map(d => (
              <option key={d.id} value={d.id}>
                {d.discount_code} — {d.percentage}%
                {d.minimum_amount > 0 ? ` (min ₹${d.minimum_amount})` : ''}
              </option>
            ))}
          </select>
        </div>

        {disc && (
          <div className="sm:col-span-2 flex items-center gap-6 text-sm">
            {total >= disc.minimum_amount ? (() => {
              const raw = total * (disc.percentage / 100);
              const amt = disc.max_amount_discounted != null ? Math.min(raw, disc.max_amount_discounted) : raw;
              return (
                <>
                  <span className="text-green-700 font-medium">Discount: ₹{amt.toFixed(2)}</span>
                  <span className="text-slate-600">Final: ₹{(total - amt).toFixed(2)}</span>
                </>
              );
            })() : (
              <span className="text-amber-600">Min amount ₹{disc.minimum_amount} not met</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
