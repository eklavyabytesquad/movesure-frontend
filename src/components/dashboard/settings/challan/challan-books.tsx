'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';
import { FormInput, SearchableDropdown, SubmitButton, ActionButton } from '../ui';
import type { DropdownOption } from '../ui';

interface Branch { branch_id: string; name: string; branch_code: string; }

interface ChallanBook {
  book_id: string;
  book_name: string;
  branch_id: string | null;
  route_scope: 'OPEN' | 'FIXED_ROUTE';
  prefix: string | null;
  from_number: number;
  to_number: number;
  current_number: number;
  digits: number;
  is_primary: boolean;
  is_active: boolean;
  is_completed: boolean;
  from_branch_id?: string | null;
  to_branch_id?: string | null;
}

const DEFAULT_FORM = {
  book_name: '',
  branch_id: '',
  route_scope: 'OPEN' as 'OPEN' | 'FIXED_ROUTE',
  prefix: '',
  from_number: '1',
  to_number: '999',
  digits: '4',
  is_primary: false,
  from_branch_id: '',
  to_branch_id: '',
};

export default function ChallanBooks() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can(SLUGS.CHALLAN_BOOKS_CREATE);
  const canUpdate = can(SLUGS.CHALLAN_BOOKS_UPDATE);
  const canDelete = can(SLUGS.CHALLAN_BOOKS_DELETE);

  const [books, setBooks]           = useState<ChallanBook[]>([]);
  const [branches, setBranches]     = useState<Branch[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editItem, setEditItem]     = useState<ChallanBook | null>(null);
  const [form, setForm]             = useState({ ...DEFAULT_FORM });
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [filterBranch, setFilterBranch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const booksEndpoint = filterBranch
        ? `/v1/challan/book?branch_id=${filterBranch}`
        : `/v1/challan/book/all`;
      const [booksRes, branchRes] = await Promise.all([
        apiFetch(booksEndpoint),
        apiFetch(`/v1/master/branches?is_active=true`),
      ]);
      if (booksRes.ok)  { const d = await booksRes.json();  setBooks(d.books ?? d ?? []); }
      if (branchRes.ok) { const d = await branchRes.json(); setBranches(d.branches ?? d ?? []); }
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterBranch]);

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

  function openEdit(b: ChallanBook) {
    setEditItem(b);
    setForm({
      book_name:      b.book_name,
      branch_id:      b.branch_id ?? '',
      route_scope:    b.route_scope,
      prefix:         b.prefix ?? '',
      from_number:    String(b.from_number),
      to_number:      String(b.to_number),
      digits:         String(b.digits),
      is_primary:     b.is_primary,
      from_branch_id: b.from_branch_id ?? '',
      to_branch_id:   b.to_branch_id ?? '',
    });
    setError(''); setSuccess('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const body: Record<string, unknown> = {
        book_name:   form.book_name,
        route_scope: form.route_scope,
        from_number: Number(form.from_number),
        to_number:   Number(form.to_number),
        digits:      Number(form.digits),
        is_primary:  form.is_primary,
      };
      if (form.prefix) body.prefix = form.prefix;
      if (form.branch_id) body.branch_id = form.branch_id;
      if (form.route_scope === 'FIXED_ROUTE') {
        if (form.from_branch_id) body.from_branch_id = form.from_branch_id;
        if (form.to_branch_id)   body.to_branch_id   = form.to_branch_id;
      }

      const url    = editItem ? `/v1/challan/book/${editItem.book_id}` : `/v1/challan/book`;
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
      setSuccess(editItem ? 'Book updated.' : 'Book created.');
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this challan book?')) return;
    setDeletingId(id);
    try {
      await apiFetch(`/v1/challan/book/${id}`, {
        method: 'DELETE',
      });
      load();
    } finally { setDeletingId(null); }
  }

  async function setPrimary(id: string) {
    await apiFetch(`/v1/challan/book/${id}/set-primary`, {
      method: 'POST',
    });
    load();
  }

  const branchOptions: DropdownOption[] = branches.map(b => ({ value: b.branch_id, label: `${b.name} (${b.branch_code})` }));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">Challan Books</h1>
        <span className="text-sm text-gray-400">{books.length} book{books.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-sm text-gray-500 mb-6">Manage challan number sequences. Set a primary book to auto-number challans.</p>

      {error   && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

      {canCreate && (
        <div className="mb-5 flex items-center gap-3">
          <button onClick={openCreate}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            + New Book
          </button>
          {branches.length > 0 && (
            <select
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.name} ({b.branch_code})</option>)}
            </select>
          )}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">{editItem ? 'Edit Book' : 'New Challan Book'}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormInput
              label="Book Name *"
              required
              value={form.book_name}
              onChange={e => setForm(p => ({ ...p, book_name: e.target.value }))}
              placeholder="FY25-26 Batch A"
            />
            <SearchableDropdown
              label={`Branch${!editItem ? ' *' : ''}`}
              required={!editItem}
              value={form.branch_id}
              onChange={val => setForm(p => ({ ...p, branch_id: val }))}
              options={branchOptions}
              placeholder="Select branch"
            />
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Route Scope</label>
              <select
                value={form.route_scope}
                onChange={e => setForm(p => ({ ...p, route_scope: e.target.value as 'OPEN' | 'FIXED_ROUTE', from_branch_id: '', to_branch_id: '' }))}
                className="w-full border border-gray-300 bg-white text-gray-900 px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="OPEN">OPEN — any destination</option>
                <option value="FIXED_ROUTE">FIXED ROUTE — branch-to-branch</option>
              </select>
            </div>
            <FormInput
              label="Prefix"
              value={form.prefix}
              onChange={e => setForm(p => ({ ...p, prefix: e.target.value }))}
              placeholder="e.g. MUM/"
            />
            <FormInput
              label="From Number *"
              required
              type="number"
              min={1}
              value={form.from_number}
              onChange={e => setForm(p => ({ ...p, from_number: e.target.value }))}
            />
            <FormInput
              label="To Number *"
              required
              type="number"
              min={1}
              value={form.to_number}
              onChange={e => setForm(p => ({ ...p, to_number: e.target.value }))}
            />
            <FormInput
              label="Digits (zero-padding)"
              type="number"
              min={1}
              max={10}
              value={form.digits}
              onChange={e => setForm(p => ({ ...p, digits: e.target.value }))}
            />

            {form.route_scope === 'FIXED_ROUTE' && (
              <>
                <SearchableDropdown
                  label="From Branch *"
                  required
                  value={form.from_branch_id}
                  onChange={val => setForm(p => ({ ...p, from_branch_id: val }))}
                  options={branchOptions}
                  placeholder="Select origin branch"
                />
                <SearchableDropdown
                  label="To Branch *"
                  required
                  value={form.to_branch_id}
                  onChange={val => setForm(p => ({ ...p, to_branch_id: val }))}
                  options={branchOptions}
                  placeholder="Select destination branch"
                />
              </>
            )}

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.is_primary}
                  onChange={e => setForm(p => ({ ...p, is_primary: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                Set as primary book
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <SubmitButton loading={saving} loadingText="Saving…">
              {editItem ? 'Update Book' : 'Create Book'}
            </SubmitButton>
            <ActionButton variant="cancel" onClick={() => setShowForm(false)}>Cancel</ActionButton>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : books.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No challan books yet. Create one to get started.</div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Book Name</th>
                <th className="px-4 py-3 text-left">Branch</th>
                <th className="px-4 py-3 text-left">Scope</th>
                <th className="px-4 py-3 text-left">Range</th>
                <th className="px-4 py-3 text-left">Current</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {books.map(b => (
                <tr key={b.book_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {b.book_name}
                    {b.is_primary && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full">PRIMARY</span>
                    )}
                    {b.prefix && <span className="ml-1 text-xs text-gray-400 font-mono">{b.prefix}{'*'.repeat(b.digits ?? 4)}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {b.branch_id ? (branches.find(br => br.branch_id === b.branch_id)?.name ?? <span className="font-mono text-gray-300">{b.branch_id.slice(0,8)}…</span>) : <span className="text-gray-300 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{b.route_scope.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-600">{b.from_number} – {b.to_number}</td>
                  <td className="px-4 py-3 font-mono text-gray-800">{b.current_number}</td>
                  <td className="px-4 py-3">
                    {b.is_completed
                      ? <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500 border border-gray-200">Completed</span>
                      : b.is_active
                      ? <span className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700 border border-green-200">Active</span>
                      : <span className="px-2 py-0.5 text-xs rounded-full bg-red-50 text-red-600 border border-red-200">Inactive</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {canUpdate && !b.is_primary && (
                        <ActionButton variant="primary" size="sm" onClick={() => setPrimary(b.book_id)}>Set Primary</ActionButton>
                      )}
                      {canUpdate && (
                        <ActionButton variant="edit" size="sm" onClick={() => openEdit(b)}>Edit</ActionButton>
                      )}
                      {canDelete && (
                        <ActionButton variant="danger" size="sm" disabled={deletingId === b.book_id} onClick={() => handleDelete(b.book_id)}>
                          {deletingId === b.book_id ? '…' : 'Delete'}
                        </ActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
