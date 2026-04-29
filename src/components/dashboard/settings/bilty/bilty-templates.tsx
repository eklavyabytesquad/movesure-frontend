'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';

/* ─── types ─── */
interface BiltyTemplate {
  template_id: string;
  code: string;
  name: string;
  description: string | null;
  slug: string;
  template_type: string;
  book_id?: string | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  is_primary?: boolean;
  branch_id?: string | null;
  branch_name?: string | null;
}

const TEMPLATE_TYPES = [
  { value: 'REGULAR_BILTY',       label: 'Regular Bilty' },
  { value: 'MANUAL_BILTY',        label: 'Manual Bilty' },
  { value: 'MONTHLY_CONSIGNOR',   label: 'Monthly Consignor Bill' },
  { value: 'MONTHLY_CONSIGNEE',   label: 'Monthly Consignee Bill' },
];

interface TemplateBranch { branch_id: string; name: string; }

const EMPTY = {
  code:          '',
  name:          '',
  description:   '',
  slug:          '',
  template_type: 'REGULAR_BILTY',
  book_id:       '',
  metadata:      '',
  branch_id:     '',
};

const INPUT    = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';
const LABEL    = 'block text-sm font-medium text-slate-700 mb-1';

export default function BiltyTemplates() {
  const router    = useRouter();
  const { can }   = usePermissions();
  const canCreate = can(SLUGS.BILTY_TEMPLATES_CREATE);
  const canUpdate = can(SLUGS.BILTY_TEMPLATES_UPDATE);
  const canDelete = can(SLUGS.BILTY_TEMPLATES_DELETE);

  const [templates,   setTemplates]   = useState<BiltyTemplate[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editItem,    setEditItem]    = useState<BiltyTemplate | null>(null);
  const [form,        setForm]        = useState({ ...EMPTY });
  const [saving,      setSaving]      = useState(false);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const [metaError,   setMetaError]   = useState('');
  const [branches,    setBranches]    = useState<TemplateBranch[]>([]);
  const [booksList,   setBooksList]   = useState<{ book_id: string; book_name: string | null }[]>([]);
  const [filterType,  setFilterType]  = useState('');
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
        apiFetch(`/v1/staff/branches`),
        apiFetch(`/v1/bilty-setting/books`),
      ]);
      if (brRes.ok) { const d = await brRes.json(); setBranches(d.branches ?? d ?? []); }
      if (bkRes.ok) { const d = await bkRes.json(); setBooksList(d.books ?? d ?? []); }
    }
    loadBranches();
  }, []);

  function openCreate() {
    setEditItem(null);
    setForm({ ...EMPTY });
    setError(''); setSuccess(''); setMetaError('');
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
    setShowForm(true);
  }

  function sf(k: string, v: string) {
    setForm(p => ({ ...p, [k]: v }));
    if (k === 'name' && !editItem) {
      // auto-slug from name
      setForm(p => ({ ...p, name: v, slug: v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMetaError('');

    // Validate JSON metadata if provided
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
    if (form.book_id.trim())     body.book_id       = form.book_id.trim();

    try {
      const url    = editItem ? `/v1/bilty-setting/templates/${editItem.template_id}` : `/v1/bilty-setting/templates`;
      const method = editItem ? 'PATCH' : 'POST';
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(body),
      });
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
      const res = await apiFetch(`/v1/bilty-setting/templates/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) { const d = await res.json(); setError(d.detail ?? 'Failed to delete.'); return; }
      setSuccess('Template deleted.'); fetchTemplates();
    } catch { setError('Unable to reach the server.'); }
    finally { setDeletingId(null); }
  }

  async function handleSetPrimary(id: string) {
    setSettingPrimaryId(id); setError(''); setSuccess('');
    try {
      const res = await apiFetch(`/v1/bilty-setting/templates/${id}/set-primary`, {
        method: 'PATCH',
      });
      if (!res.ok) { const d = await res.json(); setError(d.detail ?? 'Failed to set primary.'); return; }
      setSuccess('Primary template updated.'); fetchTemplates();
    } catch { setError('Unable to reach the server.'); }
    finally { setSettingPrimaryId(null); }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Bilty Templates</h2>
          <p className="text-sm text-slate-500 mt-0.5">Print format templates for bilty books.</p>
        </div>
        {canCreate && !showForm && (
          <button onClick={openCreate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            + New Template
          </button>
        )}
      </div>

      {/* Filter by type */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {([{ value: '', label: 'All' }, ...TEMPLATE_TYPES]).map(t => (
          <button key={t.value} type="button" onClick={() => setFilterType(t.value)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${filterType === t.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error   && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6 space-y-4">
          <p className="text-sm font-semibold text-slate-700">{editItem ? 'Edit Template' : 'New Template'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Code * <span className="text-slate-400 font-normal">(max 50 chars)</span></label>
              <input required maxLength={50} value={form.code} onChange={e => sf('code', e.target.value)}
                placeholder="A4_STD" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Name * <span className="text-slate-400 font-normal">(max 150 chars)</span></label>
              <input required maxLength={150} value={form.name} onChange={e => sf('name', e.target.value)}
                placeholder="A4 Standard Format" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Slug * <span className="text-slate-400 font-normal">(URL-safe, max 100)</span></label>
              <input required maxLength={100} value={form.slug} onChange={e => sf('slug', e.target.value)}
                placeholder="a4-standard" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Template Type</label>
              <select value={form.template_type} onChange={e => sf('template_type', e.target.value)} className={INPUT}>
                {TEMPLATE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Description</label>
              <input value={form.description ?? ''} onChange={e => sf('description', e.target.value)}
                placeholder="Optional description" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Pin to Book <span className="text-slate-400 font-normal">(optional — leave blank for branch-wide)</span></label>
              <select value={form.book_id} onChange={e => sf('book_id', e.target.value)} className={INPUT}>
                <option value="">— Branch-wide —</option>
                {booksList.map(b => <option key={b.book_id} value={b.book_id}>{b.book_name ?? b.book_id}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Branch <span className="text-slate-400 font-normal">(optional)</span></label>
              <select value={form.branch_id} onChange={e => sf('branch_id', e.target.value)} className={INPUT}>
                <option value="">— All branches —</option>
                {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Metadata <span className="text-slate-400 font-normal">(JSON, optional)</span></label>
              <textarea value={form.metadata} onChange={e => sf('metadata', e.target.value)}
                rows={4} placeholder={'{\n  "page_size": "A4",\n  "logo_url": "..."\n}'}
                className={`${INPUT} font-mono text-xs resize-none`} />
              {metaError && <p className="text-xs text-red-600 mt-1">{metaError}</p>}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : (editItem ? 'Update' : 'Create')}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="py-20 text-center text-sm text-slate-400">Loading templates…</div>
      ) : templates.length === 0 ? (
        <div className="py-20 text-center text-sm text-slate-400">No templates yet. Create one to get started.</div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.template_id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {t.is_primary && (
                    <span className="text-xs px-2 py-0.5 rounded-full border font-semibold bg-amber-50 text-amber-700 border-amber-300">
                      ★ Primary
                    </span>
                  )}
                  <span className="font-semibold text-slate-800 text-sm">{t.name}</span>
                  <code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t.code}</code>
                  <code className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{t.slug}</code>
                  {t.template_type && (
                    <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-purple-50 text-purple-700 border-purple-200">
                      {TEMPLATE_TYPES.find(x => x.value === t.template_type)?.label ?? t.template_type}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${t.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {t.description && <p className="text-xs text-slate-500 mt-1">{t.description}</p>}
                {t.metadata && (
                  <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">
                    metadata: {JSON.stringify(t.metadata)}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {canUpdate && !t.is_primary && (
                  <button onClick={() => handleSetPrimary(t.template_id)} disabled={settingPrimaryId === t.template_id}
                    className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 transition-colors font-medium">
                    {settingPrimaryId === t.template_id ? '…' : 'Set Primary'}
                  </button>
                )}
                {canUpdate && (
                  <button onClick={() => openEdit(t)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors font-medium">
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => handleDelete(t.template_id)} disabled={deletingId === t.template_id}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors font-medium">
                    {deletingId === t.template_id ? '…' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
