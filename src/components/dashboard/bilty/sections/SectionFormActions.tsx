import { BiltyForm } from '../types';

interface Props {
  form: BiltyForm;
  saving: boolean;
  printing?: boolean;
  editBiltyId: string | null;
  saveError: string;
  savedJson: object | null;
  sf: (key: keyof BiltyForm, val: string) => void;
  onReset: () => void;
  onDismiss: () => void;
  onPrint?: () => void;
}

export default function SectionFormActions({
  form, saving, printing, editBiltyId, saveError, savedJson, sf, onReset, onDismiss, onPrint,
}: Props) {
  return (
    <>
      {saveError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {saveError}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600">Save as:</label>
          <select
            value={form.saving_option}
            onChange={e => sf('saving_option', e.target.value)}
            className="border border-slate-300 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="SAVE">SAVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PRINT">SAVE &amp; PRINT</option>
          </select>
        </div>
        <div className="flex gap-2">
          {onPrint && (
            <button type="button" onClick={onPrint} disabled={printing || saving}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {printing ? 'Printing…' : 'Print'}
            </button>
          )}
          <button type="button" onClick={onReset}
            className="px-3 py-1 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Reset
          </button>
          <button type="submit" disabled={saving}
            className="px-5 py-1 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : editBiltyId ? 'Update Bilty' : 'Save Bilty'}
          </button>
        </div>
      </div>

      {savedJson && (
        ('offline' in (savedJson as Record<string, unknown>) && (savedJson as Record<string, unknown>).offline) ? (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-800">Saved offline</p>
              <p className="text-[11px] text-amber-700">
                GR: <span className="font-mono">{String((savedJson as Record<string, unknown>).gr_no_provisional ?? '')}</span>
                {' '}— will sync automatically when connected.
              </p>
            </div>
            <button type="button" onClick={onDismiss} className="text-amber-500 hover:text-amber-800 text-xs">✕</button>
          </div>
        ) : (
        <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700">
            <span className="text-xs font-mono font-semibold text-green-400">
              ✓ {editBiltyId ? 'Updated' : 'Created'} — API Response
            </span>
            <button type="button" onClick={onDismiss}
              className="text-slate-400 hover:text-white text-xs">
              Dismiss
            </button>
          </div>
          <pre className="p-4 text-xs text-slate-200 font-mono overflow-auto max-h-96 leading-relaxed">
            {JSON.stringify(savedJson, null, 2)}
          </pre>
        </div>
        )
      )}
    </>
  );
}
