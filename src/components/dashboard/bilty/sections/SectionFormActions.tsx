import { BiltyForm } from '../types';

interface Props {
  form: BiltyForm;
  saving: boolean;
  editBiltyId: string | null;
  saveError: string;
  savedJson: object | null;
  sf: (key: keyof BiltyForm, val: string) => void;
  onReset: () => void;
  onDismiss: () => void;
}

export default function SectionFormActions({
  form, saving, editBiltyId, saveError, savedJson, sf, onReset, onDismiss,
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
      )}
    </>
  );
}
