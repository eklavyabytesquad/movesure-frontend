'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';

import { BiltyTemplate, TemplateBranch, TEMPLATE_TYPES, FORM_EMPTY } from './types';
import { TemplateCard, AddTemplateCard } from './TemplateCard';
import { PreviewModal } from './PreviewModal';
import { FormPanel } from './FormPanel';

export default function BiltyTemplates() {
  const router  = useRouter();
  const { can } = usePermissions();
  const canCreate = can(SLUGS.BILTY_TEMPLATES_CREATE);
  const canUpdate = can(SLUGS.BILTY_TEMPLATES_UPDATE);
  const canDelete = can(SLUGS.BILTY_TEMPLATES_DELETE);

  const [templates,        setTemplates]        = useState<BiltyTemplate[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [showForm,         setShowForm]         = useState(false);
  const [editItem,         setEditItem]         = useState<BiltyTemplate | null>(null);
  const [previewTemplate,  setPreviewTemplate]  = useState<BiltyTemplate | null>(null);
  const [form,             setForm]             = useState({ ...FORM_EMPTY });
  const [saving,           setSaving]           = useState(false);
  const [deletingId,       setDeletingId]       = useState<string | null>(null);
  const [error,            setError]            = useState('');
  const [success,          setSuccess]          = useState('');
  const [metaError,        setMetaError]        = useState('');
  const [branches,         setBranches]         = useState<TemplateBranch[]>([]);
  const [booksList,        setBooksList]        = useState<{ book_id: string; book_name: string | null }[]>([]);
  const [filterType,       setFilterType]       = useState('');
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('template_type', filterType);
      const res = await apiFetch(`/v1/bilty-setting/templates?${params}`);
      if (res.status === 401) { router.replace('/auth/login'); return; }
      const data = await res.json();
      setTemplates(data.templates ?? data ?? []);
    } catch { setError('Failed to load templates.'); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  useEffect(() => {
    async function loadBranches() {
      const [brRes, bkRes] = await Promise.all([
        apiFetch('/v1/staff/branches'),
        apiFetch('/v1/bilty-setting/books'),
      ]);
      if (brRes.ok) { const d = await brRes.json(); setBranches(d.branches ?? d ?? []); }
      if (bkRes.ok) { const d = await bkRes.json(); setBooksList(d.books ?? d ?? []); }
    }
    loadBranches();
  }, []);

  function openCreate() {
    setEditItem(null);
    setForm({ ...FORM_EMPTY });
    setError(''); setSuccess(''); setMetaError('');
    setPreviewTemplate(null);
    setShowForm(true);
  }

  function openEdit(t: BiltyTemplate) {
    setEditItem(t);
    setForm({
      code:          t.code,
      name:          t.name,
      description:   t.description ?? '',
      slug:          t.slug,
      template_type: t.template_type ?? 'REGULAR_BILTY',
      book_id:       t.book_id ?? '',
      metadata:      t.metadata ? JSON.stringify(t.metadata, null, 2) : '',
      branch_id:     t.branch_id ?? '',
    });
    setError(''); setSuccess(''); setMetaError('');
    setPreviewTemplate(null);
    setShowForm(true);
  }

  function sf(k: string, v: string) {
    if (k === 'name' && !editItem) {
      setForm(p => ({ ...p, name: v, slug: v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }));
    } else {
      setForm(p => ({ ...p, [k]: v }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMetaError('');
    let metaParsed: Record<string, unknown> | null = null;
    if (form.metadata.trim()) {
      try { metaParsed = JSON.parse(form.metadata); }
      catch { setMetaError('Metadata must be valid JSON.'); return; }
    }
    setSaving(true); setError(''); setSuccess('');
    const body: Record<string, unknown> = {
      code:          form.code.trim(),
      name:          form.name.trim(),
      slug:          form.slug.trim(),
      template_type: form.template_type,
    };
    if (form.description.trim()) body.description = form.description.trim();
    if (metaParsed)              body.metadata     = metaParsed;
    if (form.branch_id.trim())   body.branch_id    = form.branch_id.trim();
    if (form.book_id.trim())     body.book_id      = form.book_id.trim();
    try {
      const url    = editItem ? `/v1/bilty-setting/templates/${editItem.template_id}` : '/v1/bilty-setting/templates';
      const method = editItem ? 'PATCH' : 'POST';
      const res  = await apiFetch(url, { method, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.detail)
          ? data.detail.map((d: { msg: string }) => d.msg).join('. ')
          : (data.detail ?? 'Failed to save template.');
        setError(msg); return;
      }
      setSuccess(editItem ? 'Template updated.' : 'Template created.');
      setShowForm(false);
      fetchTemplates();
    } catch { setError('Unable to reach the server.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;
    setDeletingId(id); setError(''); setSuccess('');
    try {
      const res = await apiFetch(`/v1/bilty-setting/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); setError(d.detail ?? 'Failed to delete.'); return; }
      setSuccess('Template deleted.'); fetchTemplates();
    } catch { setError('Unable to reach the server.'); }
    finally { setDeletingId(null); }
  }

  async function handleSetPrimary(id: string) {
    setSettingPrimaryId(id); setError(''); setSuccess('');
    try {
      const res = await apiFetch(`/v1/bilty-setting/templates/${id}/set-primary`, { method: 'PATCH' });
      if (!res.ok) { const d = await res.json(); setError(d.detail ?? 'Failed to set primary.'); return; }
      setSuccess('Primary template updated.'); fetchTemplates();
    } catch { setError('Unable to reach the server.'); }
    finally { setSettingPrimaryId(null); }
  }

  const filtered = filterType ? templates.filter(t => t.template_type === filterType) : templates;

  return (
    <div className="w-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Bilty Templates</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {loading ? 'Loading…' : `${filtered.length} template${filtered.length !== 1 ? 's' : ''}`}
              {filterType ? ` · ${TEMPLATE_TYPES.find(t => t.value === filterType)?.label}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
              {[{ value: '', label: 'All' }, ...TEMPLATE_TYPES].map(t => (
                <button key={t.value} type="button" onClick={() => setFilterType(t.value)}
                  className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors
                    ${filterType === t.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            {canCreate && (
              <button onClick={openCreate}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Template
              </button>
            )}
          </div>
        </div>
        {/* Mobile filters */}
        <div className="flex sm:hidden items-center gap-1.5 mt-3 flex-wrap">
          {[{ value: '', label: 'All' }, ...TEMPLATE_TYPES].map(t => (
            <button key={t.value} type="button" onClick={() => setFilterType(t.value)}
              className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors
                ${filterType === t.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {(error || success) && (
        <div className="px-6 pt-4 space-y-2">
          {error   && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          {success && <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}
        </div>
      )}

      {/* Template Grid */}
      <div className="p-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl overflow-hidden border-2 border-slate-100 bg-white animate-pulse">
                <div className="bg-slate-100" style={{ aspectRatio: '1 / 1.414' }} />
                <div className="px-3 py-3 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 && !canCreate ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-500 font-semibold">No templates yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filtered.map(t => (
              <TemplateCard
                key={t.template_id}
                template={t}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onEdit={openEdit}
                onDelete={handleDelete}
                onSetPrimary={handleSetPrimary}
                onPreview={setPreviewTemplate}
                deletingId={deletingId}
                settingPrimaryId={settingPrimaryId}
              />
            ))}
            {canCreate && <AddTemplateCard onClick={openCreate} />}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onEdit={() => openEdit(previewTemplate)}
          canUpdate={canUpdate}
        />
      )}

      {/* Create / Edit Slide-over */}
      {showForm && (
        <FormPanel
          editItem={editItem}
          form={form}
          saving={saving}
          error={error}
          metaError={metaError}
          branches={branches}
          booksList={booksList}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
          onChange={sf}
        />
      )}
    </div>
  );
}

