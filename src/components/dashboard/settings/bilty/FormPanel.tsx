import { BiltyTemplate, TemplateBranch, TEMPLATE_TYPES, FORM_EMPTY, INPUT_CLS, LABEL_CLS } from './types';

export function FormPanel({
  editItem, form, saving, error, metaError,
  branches, booksList, onClose, onSubmit, onChange,
}: {
  editItem: BiltyTemplate | null;
  form: typeof FORM_EMPTY;
  saving: boolean;
  error: string;
  metaError: string;
  branches: TemplateBranch[];
  booksList: { book_id: string; book_name: string | null }[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (k: string, v: string) => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">{editItem ? 'Edit Template' : 'New Template'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{editItem ? `Editing: ${editItem.name}` : 'Create a new bilty print format'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <form id="tpl-form" onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Code *</label>
                <input required maxLength={50} value={form.code} onChange={e => onChange('code', e.target.value)} placeholder="A4_STD" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Slug *</label>
                <input required maxLength={100} value={form.slug} onChange={e => onChange('slug', e.target.value)} placeholder="a4-standard" className={INPUT_CLS} />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Name *</label>
              <input required maxLength={150} value={form.name} onChange={e => onChange('name', e.target.value)} placeholder="A4 Standard Format" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Template Type</label>
              <select value={form.template_type} onChange={e => onChange('template_type', e.target.value)} className={INPUT_CLS}>
                {TEMPLATE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Description</label>
              <input value={form.description} onChange={e => onChange('description', e.target.value)} placeholder="Optional description" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Pin to Book <span className="text-slate-400 font-normal">(leave blank for branch-wide)</span></label>
              <select value={form.book_id} onChange={e => onChange('book_id', e.target.value)} className={INPUT_CLS}>
                <option value="">— Branch-wide —</option>
                {booksList.map(b => <option key={b.book_id} value={b.book_id}>{b.book_name ?? b.book_id}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Branch <span className="text-slate-400 font-normal">(optional)</span></label>
              <select value={form.branch_id} onChange={e => onChange('branch_id', e.target.value)} className={INPUT_CLS}>
                <option value="">— All branches —</option>
                {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Metadata <span className="text-slate-400 font-normal">(JSON, optional)</span></label>
              <textarea
                value={form.metadata}
                onChange={e => onChange('metadata', e.target.value)}
                rows={5}
                placeholder={'{\n  "COMPANY_NAME": "RGT Logistics",\n  "COMPANY_GSTIN": "07ABCPC0876F1Z1"\n}'}
                className={`${INPUT_CLS} font-mono text-xs resize-none`}
              />
              {metaError && <p className="text-xs text-red-600 mt-1">{metaError}</p>}
            </div>
          </form>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-200 bg-white shrink-0">
          <button form="tpl-form" type="submit" disabled={saving}
            className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : editItem ? 'Update Template' : 'Create Template'}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors font-medium">
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
