// ── Shared types for the Challan module ─────────────────────────────────

export interface Branch { branch_id: string; name: string; }

export interface ChallanBook {
  book_id: string;
  book_name: string;
  route_scope: string;
  is_primary: boolean;
  prefix: string | null;
  postfix: string | null;
  current_number: number;
  digits: number;
  to_number: number;
}

export interface TripSheetSummary {
  trip_sheet_id: string;
  trip_sheet_no: string;
  trip_date: string;
  status?: string;
  trip_status?: string;
  vehicle_info?: { vehicle_no?: string; driver_name?: string } | null;
}

export interface BiltySummary {
  bilty_id: string;
  gr_no: string;
  bilty_date: string;
  bilty_type?: string;        // 'REGULAR' | 'MANUAL'
  status?: string;            // 'DRAFT' | 'SAVED' | 'DISPATCHED' | ...
  consignor_name: string;
  consignee_name: string;
  payment_mode: string;       // 'PAID' | 'TO-PAY' | 'FOC'
  delivery_type?: string;     // 'DOOR' | 'GODOWN'
  total_amount: number;
  no_of_pkg?: number;
  weight?: number;
  actual_weight?: number;
  pvt_marks?: string;         // API field: pvt_marks
  contain?: string;           // API field: contain (goods description)
  to_city_id?: string;
  to_city_name?: string;      // resolved client-side from cityMap
}

export type ChallanStatus = 'DRAFT' | 'OPEN' | 'DISPATCHED' | 'ARRIVED_HUB' | 'CLOSED';

export interface Challan {
  challan_id: string;
  challan_no: string | null;
  challan_date: string;
  challan_status: ChallanStatus;
  status?: ChallanStatus;     // some endpoints return `status` instead of `challan_status`
  is_primary: boolean;
  transport_name: string | null;
  vehicle_info: { vehicle_no?: string; driver_name?: string; vehicle_type?: string } | null;
  to_branch_id: string | null;
  from_branch_id: string | null;
  trip_sheet_id: string | null;
  bilty_count?: number;
  total_bilty_count?: number;
  total_freight?: number;
  total_weight?: number;
  total_packages?: number;
}

// A challan is "editable" (can add/remove bilties) if not yet dispatched
export function isChallanEditable(c: Challan): boolean {
  const s = c.challan_status ?? c.status;
  return s !== 'DISPATCHED' && s !== 'ARRIVED_HUB' && s !== 'CLOSED';
}

export const STATUS_COLORS: Record<string, string> = {
  DRAFT:       'bg-gray-100 text-gray-600 border-gray-300',
  OPEN:        'bg-blue-50 text-blue-700 border-blue-200',
  DISPATCHED:  'bg-indigo-50 text-indigo-700 border-indigo-200',
  ARRIVED_HUB: 'bg-green-50 text-green-700 border-green-200',
  CLOSED:      'bg-gray-100 text-gray-500 border-gray-200',
};

export function bookLabel(b: ChallanBook): string {
  const n = b.prefix
    ? `${b.prefix}${String(b.current_number).padStart(b.digits, '0')}${b.postfix ?? ''}`
    : String(b.current_number).padStart(b.digits, '0');
  return `${b.book_name || 'Book'} · Next: ${n} · ${b.to_number - b.current_number + 1} left`;
}
