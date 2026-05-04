'use client';

import { TypeaheadInput, TypeaheadItem } from '@/components/dashboard/bilty/ui';

const CLS   = 'w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white transition-colors';
const LABEL = 'block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide';

interface Props {
  /** Display label e.g. "Consignor — Sender" */
  title: string;
  badgeClass: string;
  items: TypeaheadItem[];
  text: string;
  onTextChange: (t: string) => void;
  onSelect: (item: TypeaheadItem) => void;
  gstin: string;
  onGstinChange: (v: string) => void;
  mobile: string;
  onMobileChange: (v: string) => void;
}

export default function ModalPartyRow({
  title, badgeClass, items, text, onTextChange, onSelect,
  gstin, onGstinChange, mobile, onMobileChange,
}: Props) {
  return (
    <div className="space-y-2">
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeClass}`}>{title}</span>
      <TypeaheadInput
        items={items}
        value={text}
        onChange={onTextChange}
        onSelect={onSelect}
        placeholder="Search by name, GSTIN or mobile…"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={LABEL}>GSTIN</label>
          <input type="text" value={gstin} maxLength={15}
            onChange={e => onGstinChange(e.target.value)}
            placeholder="15-digit GSTIN" className={CLS} />
        </div>
        <div>
          <label className={LABEL}>Mobile</label>
          <input type="text" value={mobile}
            onChange={e => onMobileChange(e.target.value)}
            placeholder="Mobile no." className={CLS} />
        </div>
      </div>
    </div>
  );
}
