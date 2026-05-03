import { BiltyTemplate, TEMPLATE_TYPES } from './types';
import TemplatePreviewSvg from './TemplatePreviewSvg';

/* ─── Template Card ─────────────────────────────────────────────────────── */
export function TemplateCard({
  template, canUpdate, canDelete,
  onEdit, onDelete, onSetPrimary, onPreview,
  deletingId, settingPrimaryId,
}: {
  template: BiltyTemplate;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (t: BiltyTemplate) => void;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onPreview: (t: BiltyTemplate) => void;
  deletingId: string | null;
  settingPrimaryId: string | null;
}) {
  const typeLabel = TEMPLATE_TYPES.find(x => x.value === template.template_type)?.label ?? template.template_type;
  return (
    <div className={`group relative flex flex-col rounded-xl overflow-hidden border-2 bg-white transition-all duration-200 hover:shadow-2xl hover:-translate-y-0.5
      ${template.is_primary
        ? 'border-amber-400 shadow-amber-100 shadow-lg'
        : 'border-slate-200 hover:border-indigo-300'
      }`}
    >
      {/* Preview area */}
      <div
        className="relative bg-linear-to-br from-slate-100 to-slate-200 p-3 cursor-pointer"
        style={{ aspectRatio: '1 / 1.414' }}
        onClick={() => onPreview(template)}
      >
        <div className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.18)] rounded-sm overflow-hidden bg-white">
          <TemplatePreviewSvg slug={template.slug} name={template.name} />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="bg-white text-slate-800 rounded-lg px-4 py-2 text-xs font-bold shadow-lg flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </span>
        </div>

        {/* Primary badge */}
        {template.is_primary && (
          <div className="absolute top-2 left-2 bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
            ★ Primary
          </div>
        )}

        {/* Inactive badge */}
        {!template.is_active && (
          <div className="absolute top-2 right-2 bg-slate-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            Inactive
          </div>
        )}
      </div>

      {/* Card info */}
      <div className="px-3 pt-2.5 pb-1">
        <p className="font-bold text-slate-800 text-sm truncate">{template.name}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-medium">{typeLabel}</span>
          <code className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{template.code}</code>
        </div>
        {template.description && (
          <p className="text-xs text-slate-400 mt-1 truncate">{template.description}</p>
        )}
      </div>

      {/* Action row — visible on hover */}
      <div className="px-3 pb-3 pt-1.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 min-h-10">
        {canUpdate && !template.is_primary && (
          <button
            onClick={e => { e.stopPropagation(); onSetPrimary(template.template_id); }}
            disabled={settingPrimaryId === template.template_id}
            className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 font-semibold transition-colors"
          >
            {settingPrimaryId === template.template_id ? '…' : '★ Primary'}
          </button>
        )}
        {canUpdate && (
          <button
            onClick={e => { e.stopPropagation(); onEdit(template); }}
            className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 font-semibold transition-colors"
          >
            Edit
          </button>
        )}
        {canDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(template.template_id); }}
            disabled={deletingId === template.template_id}
            className="text-xs px-2 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 font-semibold transition-colors"
          >
            {deletingId === template.template_id ? '…' : 'Del'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Add New Card ──────────────────────────────────────────────────────── */
export function AddTemplateCard({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex flex-col rounded-xl overflow-hidden border-2 border-dashed border-slate-300 hover:border-indigo-400 cursor-pointer transition-all duration-200 hover:shadow-xl group bg-white"
    >
      <div
        className="flex-1 bg-slate-50 group-hover:bg-indigo-50/60 flex flex-col items-center justify-center gap-3 transition-colors p-4"
        style={{ aspectRatio: '1 / 1.414' }}
      >
        <div className="w-14 h-14 rounded-full bg-slate-200 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
          <svg className="w-7 h-7 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <p className="text-sm font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">New Template</p>
        <p className="text-xs text-slate-300 group-hover:text-indigo-400 transition-colors text-center">Add a print format for bilty books</p>
      </div>
    </div>
  );
}
