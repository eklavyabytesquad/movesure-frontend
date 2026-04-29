'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';
import { FormInput, SearchableDropdown, SubmitButton, ActionButton } from '../ui';

const TEMPLATE_TYPES = ['CHALLAN', 'SUMMARY', 'KAAT_RECEIPT', 'LOADING_CHALLAN'] as const;
type TemplateType = typeof TEMPLATE_TYPES[number];

interface ChallanTemplate {
  template_id: string;
  code: string;
  name: string;
  slug: string;
  template_type: TemplateType;
  config: Record<string, unknown> | null;
  is_default: boolean;
  is_active: boolean;
}

const DEFAULT_FORM = {
  code: '',
  name: '',
  slug: '',
  template_type: 'CHALLAN' as TemplateType,
  config_json: '',
  is_default: false,
};

export default function ChallanTemplates() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can(SLUGS.CHALLAN_TEMPLATES_CREATE);
  const canUpdate = can(SLUGS.CHALLAN_TEMPLATES_UPDATE);
  const canDelete = can(SLUGS.CHALLAN_TEMPLATES_DELETE);

  const [templates, setTemplates]   = useState<ChallanTemplate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<TemplateType | ''>('');
  const [showForm, setShowForm]     = useState(false);
  const [editItem, setEditItem]     = useState<ChallanTemplate | null>(null);
  const [form, setForm]             = useState({ ...DEFAULT_FORM });
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filter ? `?template_type=${filter}` : '';
      const res = await apiFetch(`/v1/challan/template${q}`);
      if (res.ok) {
        const d = await res.json();
        setTemplates(d.templates ?? d ?? []);
      }
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    if (!getUser()) { router.replace('/auth/login'); return; }
    load();
  }, [load, router]);

  function openCreate() {
    setEditItem(null);
    setForm({ ...DEFAULT_FORM });
    setError(''); setSuccess('');
    setShowForm(true);
  }

  function openEdit(t: ChallanTemplate) {
    setEditItem(t);
    setForm({
      code:          t.code,
      name:          t.name,
      slug:          t.slug,
      template_type: t.template_type,
      config_json:   t.config ? JSON.stringify(t.config, null, 2) : '',
      is_default:    t.is_default,
    });
    setError(''); setSuccess('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      let config: Record<string, unknown> | null = null;
      if (form.config_json.trim()) {
        try { config = JSON.parse(form.config_json); }
        catch { setError('Config JSON is invalid.'); setSaving(false); return; }
      }
      const body = {
        code: form.code,
        name: form.name,
        slug: form.slug || form.code.toLowerCase().replace(/\s+/g, '-'),
        template_type: form.template_type,
        config,
        is_default: form.is_default,
      };
      const url    = editItem ? `/v1/challan/template/${editItem.template_id}` : `/v1/challan/template`;
      const method = editItem ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data.detail) ? data.detail.map((d: { msg: string }) => d.msg).join('. ') : (data.detail ?? 'Failed'));
        return;
      }
      setSuccess(editItem ? 'Template updated.' : 'Template created.');
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;
    setDeletingId(id);
    try {
      await apiFetch(`/v1/challan/template/${id}`, {
        method: 'DELETE',
      });
      load();
    } finally { setDeletingId(null); }
  }

  async function setPrimary(id: string) {
    await apiFetch(`/v1/challan/template/${id}/set-primary`, {
      method: 'POST',
    });
    load();
  }

  const TYPE_COLORS: Record<TemplateType, string> = {
    CHALLAN:          'bg-blue-50 text-blue-700 border-blue-200',
    SUMMARY:          'bg-indigo-50 text-indigo-700 border-indigo-200',
    KAAT_RECEIPT:     'bg-amber-50 text-amber-700 border-amber-200',
    LOADING_CHALLAN:  'bg-green-50 text-green-700 border-green-200',
  };

  const templateTypeOptions = TEMPLATE_TYPES.map(t => ({ value: t, label: t.replace(/_/g, ' ') }));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">Challan Templates</h1>
        <span className="text-sm text-gray-400">{templates.length} template{templates.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-sm text-gray-500 mb-6">Manage print layout templates for challans, summaries and loading receipts.</p>

      {error   && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {(['', ...TEMPLATE_TYPES] as const).map(t => (
            <button key={t} onClick={() => setFilter(t as TemplateType | '')}
              className={`px-3 py-1 text-xs rounded-full font-medium border transition-colors ${
                filter === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}>
              {t || 'All'}
            </button>
          ))}
        </div>
        {canCreate && (
          <button onClick={openCreate}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            + New Template
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">{editItem ? 'Edit Template' : 'New Template'}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormInput
              label="Code *"
              required
              value={form.code}
              onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
              placeholder="CHLN-A4"
            />
            <FormInput
              label="Name *"
              required
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Standard Challan A4"
            />
            <SearchableDropdown
              label="Type *"
              required
              value={form.template_type}
              onChange={val => setForm(p => ({ ...p, template_type: val as TemplateType }))}
              options={templateTypeOptions}
              placeholder="Select type"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">Config JSON <span className="font-normal text-gray-400 text-xs">(optional)</span></label>
            <textarea
              value={form.config_json}
              onChange={e => setForm(p => ({ ...p, config_json: e.target.value }))}
              rows={3}
              placeholder='{"paper_size":"A4","show_logo":true}'
              className="w-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 px-4 py-2.5 text-sm rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input type="checkbox" id="is_default_tpl" checked={form.is_default}
              onChange={e => setForm(p => ({ ...p, is_default: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <label htmlFor="is_default_tpl" className="text-sm text-gray-700">Set as default for this template type</label>
          </div>
          <div className="mt-4 flex gap-3">
            <SubmitButton loading={saving} loadingText="Saving…">
              {editItem ? 'Update Template' : 'Create Template'}
            </SubmitButton>
            <ActionButton variant="cancel" onClick={() => setShowForm(false)}>Cancel</ActionButton>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No templates found.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <div key={t.template_id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{t.code}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[t.template_type]}`}>
                  {t.template_type.replace(/_/g, ' ')}
                </span>
              </div>
              {t.is_default && (
                <span className="self-start text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">DEFAULT</span>
              )}
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100">
                {canUpdate && !t.is_default && (
                  <ActionButton variant="primary" size="sm" onClick={() => setPrimary(t.template_id)}>Set Default</ActionButton>
                )}
                {canUpdate && (
                  <ActionButton variant="edit" size="sm" onClick={() => openEdit(t)} className="ml-auto">Edit</ActionButton>
                )}
                {canDelete && (
                  <ActionButton variant="danger" size="sm" disabled={deletingId === t.template_id} onClick={() => handleDelete(t.template_id)}>
                    {deletingId === t.template_id ? '…' : 'Delete'}
                  </ActionButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
