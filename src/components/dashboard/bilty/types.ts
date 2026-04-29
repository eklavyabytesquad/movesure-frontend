export interface BookDefaults {
  delivery_type?: string | null;
  payment_mode?: string | null;
  from_city_id?: string | null;
  to_city_id?: string | null;
  transport_id?: string | null;
  bill_charge?: number | null;
  toll_charge?: number | null;
}

export interface Book {
  id?: string;
  book_id?: string;
  book_name: string | null;
  bilty_type: 'REGULAR' | 'MANUAL';
  prefix: string | null;
  postfix: string | null;
  digits: number;
  current_number: number;
  from_number: number;
  to_number: number;
  book_defaults?: BookDefaults | null;
}

export interface Consignor {
  id?: string;
  consignor_id?: string;
  consignor_name: string;
  gstin?: string | null;
  mobile?: string | null;
}

export interface Consignee {
  id?: string;
  consignee_id?: string;
  consignee_name: string;
  gstin?: string | null;
  mobile?: string | null;
}

export interface City {
  city_id: string;
  city_name: string;
  city_code?: string | null;
}

export interface Transport {
  transport_id: string;
  transport_name: string;
  gstin?: string | null;
  mobile?: string | null;
}

export interface BiltyTemplate {
  id: string;
  template_id?: string;
  name: string;
  code: string;
}

export interface PrimaryTemplate {
  template_id: string;
  code: string;
  name: string;
  slug: string;
  metadata: Record<string, unknown> | null;
  is_primary: boolean;
  is_active: boolean;
}

export interface BiltyDiscount {
  id: string;
  discount_id?: string;
  discount_code: string;
  percentage: number;
  bill_book_id: string | null;
  minimum_amount: number;
  max_amount_discounted: number | null;
}

export interface BiltySummary {
  bilty_id: string;
  gr_no: string;
  bilty_date: string;
  bilty_type: string;
  consignor_name: string;
  consignee_name: string;
  payment_mode: string;
  total_amount: number;
  status: string;
  no_of_pkg: number;
  weight: number;
}

export const BLANK = {
  bilty_type:        'REGULAR' as 'REGULAR' | 'MANUAL',
  gr_no:             '',
  bilty_date:        new Date().toISOString().split('T')[0],

  consignor_id:      '',
  consignor_name:    '',
  consignor_gstin:   '',
  consignor_mobile:  '',

  consignee_id:      '',
  consignee_name:    '',
  consignee_gstin:   '',
  consignee_mobile:  '',

  transport_id:      '',
  transport_name:    '',
  transport_gstin:   '',
  transport_mobile:  '',

  from_city_id:      '',
  to_city_id:        '',

  delivery_type:     'DOOR' as 'DOOR' | 'GODOWN',
  payment_mode:      'PAID' as 'PAID' | 'TO-PAY' | 'FOC',
  contain:           '',
  invoice_no:        '',
  invoice_value:     '',
  invoice_date:      '',
  document_number:   '',
  pvt_marks:         '',
  no_of_pkg:         '',
  weight:            '',
  actual_weight:     '',
  labour_rate:       '',
  rate:              '',

  freight_amount:    '',
  labour_charge:     '',
  bill_charge:       '',
  toll_charge:       '',
  dd_charge:         '',
  pf_charge:         '',
  local_charge:      '',
  other_charge:      '',
  total_amount:      '',

  discount_id:       '',

  saving_option:     'SAVE',
  remark:            '',
};

export type BiltyForm = typeof BLANK;

export const STATUS_COLORS: Record<string, string> = {
  DRAFT:            'bg-slate-100 text-slate-600 border-slate-200',
  SAVED:            'bg-blue-50 text-blue-700 border-blue-200',
  DISPATCHED:       'bg-indigo-50 text-indigo-700 border-indigo-200',
  REACHED_HUB:      'bg-purple-50 text-purple-700 border-purple-200',
  AT_GODOWN:        'bg-orange-50 text-orange-700 border-orange-200',
  OUT_FOR_DELIVERY: 'bg-amber-50 text-amber-700 border-amber-200',
  DELIVERED:        'bg-green-50 text-green-700 border-green-200',
  UNDELIVERED:      'bg-red-50 text-red-700 border-red-200',
  CANCELLED:        'bg-red-50 text-red-600 border-red-200',
  LOST:             'bg-red-100 text-red-800 border-red-300',
};

export const PAY_COLORS: Record<string, string> = {
  PAID:     'bg-green-50 text-green-700 border-green-200',
  'TO-PAY': 'bg-amber-50 text-amber-700 border-amber-200',
  FOC:      'bg-blue-50 text-blue-700 border-blue-200',
};
