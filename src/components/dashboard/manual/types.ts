export interface City { city_id: string; city_name: string; city_code?: string | null; }
export interface Consignor { consignor_id?: string; id?: string; consignor_name: string; gstin?: string | null; mobile?: string | null; }
export interface Consignee { consignee_id?: string; id?: string; consignee_name: string; gstin?: string | null; mobile?: string | null; }
export interface Transport { transport_id: string; transport_name: string; gstin?: string | null; mobile?: string | null; }

export interface ManualBilty {
  bilty_id: string;
  gr_no: string;
  bilty_date: string;
  bilty_type: string;
  consignor_name: string;
  consignee_name: string;
  from_city_id?: string | null;
  to_city_id?: string | null;
  payment_mode: string;
  delivery_type?: string;
  no_of_pkg?: number | null;
  weight?: number | null;
  total_amount?: number | null;
  freight_amount?: number | null;
  labour_charge?: number | null;
  bill_charge?: number | null;
  toll_charge?: number | null;
  dd_charge?: number | null;
  pf_charge?: number | null;
  local_charge?: number | null;
  other_charge?: number | null;
  contain?: string | null;
  invoice_no?: string | null;
  invoice_value?: number | null;
  pvt_marks?: string | null;
  ewb_no?: string | null;
  remark?: string | null;
  status: string;
  consignor_id?: string | null;
  consignee_id?: string | null;
  transport_id?: string | null;
  transport_name?: string | null;
  consignor_mobile?: string | null;
  consignee_mobile?: string | null;
  consignor_gstin?: string | null;
  consignee_gstin?: string | null;
  book_id?: string | null;
  book_name?: string | null;
}

export interface BookDefaults {
  delivery_type?: string | null;
  payment_mode?: string | null;
  from_city_id?: string | null;
  to_city_id?: string | null;
  transport_id?: string | null;
  bill_charge?: number | null;
  toll_charge?: number | null;
  show_invoice?: boolean | null;
  show_eway_bill?: boolean | null;
  show_itemized_charges?: boolean | null;
  show_pvt_marks?: boolean | null;
  show_contain?: boolean | null;
}

export interface ManualBook {
  book_id: string;
  book_name: string | null;
  bilty_type: string;
  prefix: string | null;
  postfix: string | null;
  digits: number;
  current_number: number;
  from_number: number;
  to_number: number;
  is_primary: boolean;
  is_active: boolean;
  branch_id?: string | null;
  branch_name?: string | null;
  book_defaults?: BookDefaults | null;
}

export interface VisFlags {
  show_invoice: boolean;
  show_eway_bill: boolean;
  show_itemized_charges: boolean;
  show_pvt_marks: boolean;
  show_contain: boolean;
}

export const BLANK_FORM = {
  gr_no:            '',
  book_id:          '',
  bilty_date:       new Date().toISOString().split('T')[0],
  consignor_id:     '',
  consignor_name:   '',
  consignor_gstin:  '',
  consignor_mobile: '',
  consignee_id:     '',
  consignee_name:   '',
  consignee_gstin:  '',
  consignee_mobile: '',
  transport_id:     '',
  transport_name:   '',
  from_city_id:     '',
  to_city_id:       '',
  delivery_type:    'DOOR',
  payment_mode:     'TO-PAY',
  contain:          '',
  invoice_no:       '',
  invoice_value:    '',
  pvt_marks:        '',
  ewb_no:           '',
  no_of_pkg:        '',
  weight:           '',
  freight_amount:   '',
  labour_charge:    '',
  bill_charge:      '',
  toll_charge:      '',
  dd_charge:        '',
  pf_charge:        '',
  local_charge:     '',
  other_charge:     '',
  total_amount:     '',
  remark:           '',
  saving_option:    'SAVE',
};

export type ManualForm = typeof BLANK_FORM;

export const STATUS_CHIP: Record<string, string> = {
  DRAFT:      'bg-gray-100 text-gray-600',
  SAVED:      'bg-blue-100 text-blue-700',
  DISPATCHED: 'bg-indigo-100 text-indigo-700',
  DELIVERED:  'bg-green-100 text-green-700',
  CANCELLED:  'bg-red-100 text-red-600',
};

export const PAY_CHIP: Record<string, string> = {
  PAID:     'bg-green-100 text-green-700',
  'TO-PAY': 'bg-amber-100 text-amber-700',
  FOC:      'bg-blue-100 text-blue-700',
};
