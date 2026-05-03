export interface BiltyTemplate {
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

export interface TemplateBranch {
  branch_id: string;
  name: string;
}

export const TEMPLATE_TYPES = [
  { value: 'REGULAR_BILTY',     label: 'Regular Bilty' },
  { value: 'MANUAL_BILTY',      label: 'Manual Bilty' },
  { value: 'MONTHLY_CONSIGNOR', label: 'Monthly Consignor Bill' },
  { value: 'MONTHLY_CONSIGNEE', label: 'Monthly Consignee Bill' },
];

export const FORM_EMPTY = {
  code: '', name: '', description: '', slug: '',
  template_type: 'REGULAR_BILTY', book_id: '', metadata: '', branch_id: '',
};

export const INPUT_CLS = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';
export const LABEL_CLS = 'block text-sm font-medium text-slate-700 mb-1';
