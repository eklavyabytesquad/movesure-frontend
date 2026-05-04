import { BiltyForm } from '../types';
import { INPUT, SectionTitle } from '../ui';

interface Props {
  form: BiltyForm;
  sf: (key: keyof BiltyForm, val: string) => void;
}

export default function SectionRemark({ form, sf }: Props) {
  return (
    <div className="pb-1">
      <SectionTitle>Remark</SectionTitle>
      <textarea
        tabIndex={-1}
        value={form.remark}
        onChange={e => sf('remark', e.target.value)}
        rows={1}
        placeholder="Optional note…"
        className="w-full border border-slate-300 rounded-md px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
      />
    </div>
  );
}
