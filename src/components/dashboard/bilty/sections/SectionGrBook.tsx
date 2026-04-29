import { useState, useEffect } from 'react';
import { Book, City, BiltyForm } from '../types';
import { INPUT, SectionTitle, Label, TypeaheadInput } from '../ui';

interface Props {
  form: BiltyForm;
  primaryBook: Book | null;
  noPrimaryBook: boolean;
  grPreview: string;
  editBiltyId: string | null;
  sf: (key: keyof BiltyForm, val: string) => void;
  cities: City[];
}

export default function SectionGrBook({ form, primaryBook, noPrimaryBook, grPreview, editBiltyId, sf, cities }: Props) {
  const [fromText, setFromText] = useState('');

  useEffect(() => {
    setFromText(cities.find(c => c.city_id === form.from_city_id)?.city_name ?? '');
  }, [form.from_city_id, cities]);

  const cityItems = cities.map(c => ({ id: c.city_id, label: c.city_name, sub: c.city_code ?? undefined }));

  return (
    <div className="pb-2 border-b border-slate-100">
      <SectionTitle>GR / Book</SectionTitle>

      {noPrimaryBook && !editBiltyId && (
        <div className="mb-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800">
          No primary book set. Go to <strong>Settings → Books</strong> and mark one as primary.
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label>GR No</Label>
          <input
            readOnly
            value={editBiltyId ? form.gr_no : (grPreview || (noPrimaryBook ? 'No primary book' : 'Loading…'))}
            className="w-full border border-slate-200 rounded-md px-2.5 py-1 text-sm bg-slate-50 font-bold text-slate-900 cursor-not-allowed"
          />
          {!editBiltyId && grPreview && (
            <p className="text-[10px] text-slate-400 mt-0.5">Auto-assigned · {primaryBook?.book_name ?? ''}</p>
          )}
        </div>
        <div>
          <Label>Bilty Date</Label>
          <input type="date" value={form.bilty_date} onChange={e => sf('bilty_date', e.target.value)} className={INPUT} />
        </div>
        <div>
          <Label>From City</Label>
          <TypeaheadInput
            items={cityItems}
            value={fromText}
            onChange={text => { setFromText(text); if (!text) sf('from_city_id', ''); }}
            onSelect={item => { sf('from_city_id', item.id); setFromText(item.label); }}
            placeholder="Search city"
          />
        </div>
      </div>
    </div>
  );
}
