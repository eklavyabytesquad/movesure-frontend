// ── Shared EWB types ────────────────────────────────────────────────────────

export interface EwbRecord {
  eway_bill_number: string | number;
  ewb_status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'EXTENDED' | 'PART_DELIVERED' | 'CONSOLIDATED' | string;
  ewb_date: string;
  valid_upto: string;
  vehicle_number?: string;
  transporter_id?: string;
  transporter_name?: string;
  bilty_id?: string;
  cewb_id?: string;
  // Validation history metadata from /validate response
  is_previously_validated?: boolean;
  total_validations?: number;
  latest_validated_at?: string;
  latest_nic_status?: string;
}

export interface EwbEntry {
  ewb_no: string;
  valid_upto?: string;
  vehicle_no?: string;
}

export interface EwbBilty {
  bilty_id: string;
  gr_no: string;
  bilty_date: string;
  bilty_type: 'REGULAR' | 'MANUAL' | string;
  consignor_name: string;
  consignee_name: string;
  payment_mode: string;
  status: string;
  total_amount?: number;
  ewbs: EwbEntry[];
  to_city_id?: string | null;
  from_city_id?: string | null;
  to_city_name?: string | null;
  from_city_name?: string | null;
}

export const STATUS_COLOR: Record<string, string> = {
  ACTIVE:         'bg-green-100 text-green-700 border-green-200',
  EXPIRED:        'bg-red-100   text-red-700   border-red-200',
  CANCELLED:      'bg-red-100   text-red-700   border-red-200',
  EXTENDED:       'bg-blue-100  text-blue-700  border-blue-200',
  PART_DELIVERED: 'bg-amber-100 text-amber-700 border-amber-200',
  CONSOLIDATED:   'bg-purple-100 text-purple-700 border-purple-200',
};

export const TRANSPORT_MODES = [
  { value: '1', label: 'Road' },
  { value: '2', label: 'Rail' },
  { value: '3', label: 'Air' },
  { value: '4', label: 'Ship' },
  { value: '5', label: 'In Transit' },
];

export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh (new)' },
  { code: '38', name: 'Ladakh' },
];

export function fmtDate(d?: string | null) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return d; }
}

export function today() {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .split('/').reverse().join('/').replace(/\//g, '/');
}

/** Format dd/mm/yyyy for NIC */
export function toNicDate(isoOrDdMm: string) {
  if (!isoOrDdMm) return '';
  if (isoOrDdMm.includes('-')) {
    const [y, m, d] = isoOrDdMm.split('-');
    return `${d}/${m}/${y}`;
  }
  return isoOrDdMm;
}
