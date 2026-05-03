import { BiltyTemplate, TEMPLATE_TYPES } from './types';
import TemplatePreviewSvg from './TemplatePreviewSvg';

export function PreviewModal({
  template, onClose, onEdit, canUpdate,
}: {
  template: BiltyTemplate;
  onClose: () => void;
  onEdit: () => void;
  canUpdate: boolean;
}) {
  const typeLabel = TEMPLATE_TYPES.find(x => x.value === template.template_type)?.label ?? template.template_type;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900">{template.name}</h2>
              {template.is_primary && (
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full font-bold">★ Primary</span>
              )}
              {!template.is_active && (
                <span className="text-xs bg-slate-100 text-slate-500 border border-slate-300 px-2 py-0.5 rounded-full font-bold">Inactive</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-medium">{typeLabel}</span>
              <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{template.slug}</code>
              <code className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-mono">{template.code}</code>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canUpdate && (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Edit Template
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 flex gap-8">
          {/* Large preview */}
          <div className="shrink-0 w-72 drop-shadow-[0_8px_24px_rgba(0,0,0,0.15)] rounded overflow-hidden border border-slate-100 bg-white">
            <TemplatePreviewSvg slug={template.slug} name={template.name} />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Template Details</h3>
            <dl className="space-y-0 divide-y divide-slate-100">
              {[
                { label: 'Name',        value: template.name },
                { label: 'Code',        value: template.code },
                { label: 'Slug',        value: template.slug },
                { label: 'Type',        value: typeLabel },
                { label: 'Description', value: template.description ?? '—' },
                { label: 'Branch',      value: template.branch_name ?? '— All branches —' },
                { label: 'Status',      value: template.is_active ? 'Active' : 'Inactive' },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-4 py-2.5">
                  <dt className="text-xs text-slate-400 w-28 shrink-0 pt-0.5">{label}</dt>
                  <dd className="text-sm font-semibold text-slate-800 break-all">{value}</dd>
                </div>
              ))}
            </dl>

            {template.metadata && Object.keys(template.metadata).length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Metadata</h3>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(template.metadata).map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <span className="text-xs text-slate-500 font-mono w-40 shrink-0 truncate">{k}</span>
                      <span className="text-xs text-slate-800 font-mono break-all">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700 font-medium">
                ℹ Preview uses sample data — actual prints use real bilty information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
