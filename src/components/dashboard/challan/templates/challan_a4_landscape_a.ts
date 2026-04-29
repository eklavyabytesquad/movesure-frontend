/**
 * Template slug: challan-a4-landscape-a
 * Layout: Landscape A4 challan manifest
 *
 * Shows all bilties on a challan in a table, with company header,
 * branch route (From → To), vehicle / driver / owner info, and totals.
 *
 * Required metadata keys (store in DB challan_template.config):
 * {
 *   "COMPANY_NAME":    "RGT Logistics Company",
 *   "COMPANY_GSTIN":   "07ABCPC0876F1Z1",
 *   "COMPANY_MOBILE":  "9211350190",
 *   "COMPANY_ADDRESS": "B-174, Dilshad Garden, New Delhi-110095",
 *   "COMPANY_EMAIL":   "rgtlogisticscompany@gmail.com",   (optional)
 *   "COMPANY_WEBSITE": "www.rgtlogistics.com"             (optional)
 * }
 */

import jsPDF from 'jspdf';

// ── Data shapes ──────────────────────────────────────────────────────────────

export interface ChallanBiltyRow {
  bilty_id?: string;
  gr_no?: string;
  bilty_date?: string;
  consignor_name?: string;
  consignee_name?: string;
  to_city_name?: string;
  contain?: string;
  pvt_marks?: string;
  no_of_pkg?: number;
  weight?: number;
  actual_weight?: number;
  total_amount?: number;
  payment_mode?: string;
  delivery_type?: string;
  invoice_no?: string;
  invoice_value?: number;
}

export interface ChallanPrintData {
  challan_no?: string | null;
  challan_date?: string;
  challan_status?: string;

  // Branch info
  from_branch_name?: string;
  to_branch_name?: string;

  // Transport / vehicle
  transport_name?: string | null;
  transport_gstin?: string | null;
  vehicle_no?: string;
  vehicle_type?: string;
  driver_name?: string;
  driver_mobile?: string;
  owner_name?: string;       // from fleet / vehicle lookup

  // Bilties on this challan
  bilties: ChallanBiltyRow[];

  // Pre-computed totals (optional — computed from bilties if absent)
  total_packages?: number;
  total_weight?: number;
  total_freight?: number;

  remarks?: string;
}

export interface ChallanTemplateDef {
  template_id: string;
  code: string;
  name: string;
  slug: string;
  config: Record<string, unknown> | null;
  is_default: boolean;
  is_active: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const R = String.fromCharCode(8377); // ₹
const NAVY: [number, number, number] = [20, 40, 100];
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT_BG: [number, number, number] = [230, 235, 255];

// ── Column definition ────────────────────────────────────────────────────────

interface ColDef {
  label: string;
  key: keyof ChallanBiltyRow | 'serial';
  w: number; // relative weight, scaled to fit
  align: 'left' | 'center' | 'right';
  render?: (row: ChallanBiltyRow, idx: number) => string;
}

const COLUMNS: ColDef[] = [
  {
    label: 'S.No', key: 'serial', w: 7, align: 'center',
    render: (_, i) => String(i + 1),
  },
  {
    label: 'GR No', key: 'gr_no', w: 22, align: 'center',
    render: (r) => r.gr_no ?? '',
  },
  {
    label: 'Date', key: 'bilty_date', w: 16, align: 'center',
    render: (r) => r.bilty_date ?? '',
  },
  {
    label: 'Consignor', key: 'consignor_name', w: 30, align: 'left',
    render: (r) => r.consignor_name ?? '',
  },
  {
    label: 'Consignee', key: 'consignee_name', w: 30, align: 'left',
    render: (r) => r.consignee_name ?? '',
  },
  {
    label: 'Destination', key: 'to_city_name', w: 24, align: 'left',
    render: (r) => r.to_city_name ?? '',
  },
  {
    label: 'Contents', key: 'contain', w: 32, align: 'left',
    render: (r) => r.contain ?? r.pvt_marks ?? '',
  },
  {
    label: 'Pkgs', key: 'no_of_pkg', w: 10, align: 'center',
    render: (r) => r.no_of_pkg != null ? String(r.no_of_pkg) : '',
  },
  {
    label: 'Wt (kg)', key: 'weight', w: 16, align: 'right',
    render: (r) => r.weight != null ? r.weight.toFixed(1) : '',
  },
  {
    label: 'Freight', key: 'total_amount', w: 18, align: 'right',
    render: (r) => r.total_amount != null ? `${R}${r.total_amount.toFixed(0)}` : '',
  },
  {
    label: 'Mode', key: 'payment_mode', w: 14, align: 'center',
    render: (r) => r.payment_mode ?? '',
  },
];

// ── Helper ───────────────────────────────────────────────────────────────────

function txt(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  align: 'left' | 'center' | 'right' = 'left',
  maxWidth?: number,
) {
  doc.text(text, x, y, { align, maxWidth });
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate a landscape A4 challan manifest PDF.
 * Returns a blob URL string for opening in a new tab or iframe.
 */
export function generateChallanA4LandscapeA(
  data: ChallanPrintData,
  tpl: ChallanTemplateDef,
): string {
  // Resolve metadata from config
  const meta: Record<string, string> = {};
  if (tpl.config) {
    Object.entries(tpl.config).forEach(([k, v]) => { meta[k] = String(v ?? ''); });
  }

  // Landscape A4: 297 × 210 mm
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const PW = doc.internal.pageSize.getWidth();   // 297
  // const PH = doc.internal.pageSize.getHeight();  // 210
  const ML = 8;
  const MR = 8;
  const CW = PW - ML - MR; // usable content width ≈ 281
  let y = 8;

  // ── HEADER ────────────────────────────────────────────────────────────────
  const HDR_H = 18;
  doc.setFillColor(...NAVY);
  doc.rect(ML, y, CW, HDR_H, 'F');

  // Left block — company info
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...WHITE);
  txt(doc, meta.COMPANY_NAME ?? 'Company Name', ML + 3, y + 6);
  doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(200, 220, 255);
  if (meta.COMPANY_GSTIN) txt(doc, `GSTIN: ${meta.COMPANY_GSTIN}`, ML + 3, y + 10.5);
  const contactLine = [meta.COMPANY_MOBILE ? `Ph: ${meta.COMPANY_MOBILE}` : '', meta.COMPANY_EMAIL ?? ''].filter(Boolean).join('   ');
  txt(doc, contactLine, ML + 3, y + 15, 'left', 90);

  // Centre — big title + address
  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(...WHITE);
  txt(doc, 'CHALLAN', PW / 2, y + 8, 'center');
  doc.setFont('helvetica', 'normal').setFontSize(6).setTextColor(200, 220, 255);
  if (meta.COMPANY_ADDRESS) txt(doc, meta.COMPANY_ADDRESS, PW / 2, y + 13, 'center', 90);

  // Right block — challan no, date, website
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...WHITE);
  txt(doc, `Challan No: ${data.challan_no ?? '—'}`, PW - MR - 3, y + 6, 'right');
  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(200, 220, 255);
  txt(doc, `Date: ${data.challan_date ?? ''}`, PW - MR - 3, y + 11, 'right');
  if (meta.COMPANY_WEBSITE) txt(doc, meta.COMPANY_WEBSITE, PW - MR - 3, y + 16, 'right');

  y += HDR_H + 2;

  // ── ROUTE + VEHICLE STRIP ────────────────────────────────────────────────
  const ROUTE_H = 12;
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(180, 180, 220);
  doc.rect(ML, y, CW, ROUTE_H, 'FD');

  // From → To (left-centre area)
  const fromName = (data.from_branch_name ?? '—').toUpperCase();
  const toName   = (data.to_branch_name   ?? '—').toUpperCase();

  doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(100, 100, 140);
  txt(doc, 'FROM', ML + 4, y + 3);
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...NAVY);
  txt(doc, fromName, ML + 4, y + 9, 'left', 70);

  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...NAVY);
  txt(doc, '→', ML + 78, y + 9, 'center');

  doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(100, 100, 140);
  txt(doc, 'TO', ML + 86, y + 3);
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...NAVY);
  txt(doc, toName, ML + 86, y + 9, 'left', 70);

  // Right side — vehicle / driver / owner / transport (stacked, right-aligned)
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...NAVY);
  const vehicleStr = [data.vehicle_no, data.vehicle_type].filter(Boolean).join(' | ');
  if (vehicleStr) txt(doc, vehicleStr, PW - MR - 3, y + 4.5, 'right');

  doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(40, 40, 80);
  const lines: string[] = [];
  if (data.transport_name)  lines.push(`Transport: ${data.transport_name}`);
  if (data.transport_gstin) lines.push(`GSTIN: ${data.transport_gstin}`);
  if (data.driver_name)     lines.push(`Driver: ${data.driver_name}${data.driver_mobile ? ` (${data.driver_mobile})` : ''}`);
  if (data.owner_name)      lines.push(`Owner: ${data.owner_name}`);
  lines.forEach((line, li) => {
    txt(doc, line, PW - MR - 3, y + 7 + li * 3.5, 'right');
  });

  y += ROUTE_H + 2;

  // ── TABLE HEADER ────────────────────────────────────────────────────────
  // Scale column widths proportionally to fit CW
  const totalRelW = COLUMNS.reduce((s, c) => s + c.w, 0);
  const scaledCols = COLUMNS.map(c => ({ ...c, w: (c.w / totalRelW) * CW }));

  const TH = 7;
  doc.setFillColor(...NAVY);
  doc.rect(ML, y, CW, TH, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(6.5).setTextColor(...WHITE);

  let cx = ML;
  for (const col of scaledCols) {
    const tx =
      col.align === 'right'  ? cx + col.w - 1.5 :
      col.align === 'center' ? cx + col.w / 2    : cx + 1.5;
    txt(doc, col.label, tx, y + 4.5, col.align, col.w - 2);
    // vertical separator
    if (cx > ML) {
      doc.setDrawColor(80, 100, 160);
      doc.line(cx, y, cx, y + TH);
    }
    cx += col.w;
  }

  y += TH;

  // ── TABLE ROWS ──────────────────────────────────────────────────────────
  const ROW_H = 6;
  const bilties = data.bilties ?? [];

  let sumPkgs = 0;
  let sumWt   = 0;
  let sumAmt  = 0;

  bilties.forEach((bilty, idx) => {
    const even = idx % 2 === 0;
    doc.setFillColor(even ? 248 : 255, even ? 250 : 255, even ? 255 : 255);
    doc.rect(ML, y, CW, ROW_H, 'F');
    doc.setDrawColor(210, 215, 230);
    doc.rect(ML, y, CW, ROW_H, 'S');

    doc.setFont('helvetica', 'normal').setFontSize(6).setTextColor(0, 0, 0);

    let cx2 = ML;
    scaledCols.forEach((col, ci) => {
      const colDef = COLUMNS[ci];
      const val = colDef.render ? colDef.render(bilty, idx) : '';
      const tx =
        col.align === 'right'  ? cx2 + col.w - 1.5 :
        col.align === 'center' ? cx2 + col.w / 2    : cx2 + 1.5;

      // Bold GR number
      if (colDef.key === 'gr_no') {
        doc.setFont('helvetica', 'bold');
        txt(doc, val, tx, y + 4, col.align, col.w - 2);
        doc.setFont('helvetica', 'normal');
      } else {
        txt(doc, val, tx, y + 4, col.align, col.w - 2);
      }

      // Vertical separator
      if (cx2 > ML) {
        doc.setDrawColor(210, 215, 230);
        doc.line(cx2, y, cx2, y + ROW_H);
      }
      cx2 += col.w;
    });

    sumPkgs += bilty.no_of_pkg    ?? 0;
    sumWt   += bilty.weight       ?? 0;
    sumAmt  += bilty.total_amount ?? 0;

    y += ROW_H;
  });

  // ── TOTALS ROW ──────────────────────────────────────────────────────────
  const tPkgs = data.total_packages ?? sumPkgs;
  const tWt   = data.total_weight   ?? sumWt;
  const tAmt  = data.total_freight  ?? sumAmt;

  doc.setFillColor(...NAVY);
  doc.rect(ML, y, CW, ROW_H + 1, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(6.5).setTextColor(...WHITE);

  // "TOTAL" label
  txt(doc, `TOTAL — ${bilties.length} Bilti${bilties.length !== 1 ? 'es' : ''}`, ML + 2, y + 4.5);

  // pkgs / weight / freight right-aligned in their columns
  let totX = ML;
  scaledCols.forEach((col, ci) => {
    const key = COLUMNS[ci].key;
    let val = '';
    if (key === 'no_of_pkg')    val = String(tPkgs);
    if (key === 'weight')       val = `${tWt.toFixed(1)} kg`;
    if (key === 'total_amount') val = `${R}${tAmt.toFixed(0)}`;
    if (val) {
      const align = COLUMNS[ci].align;
      const tx =
        align === 'right'  ? totX + col.w - 1.5 :
        align === 'center' ? totX + col.w / 2    : totX + 1.5;
      txt(doc, val, tx, y + 4.5, align);
    }
    totX += col.w;
  });

  y += ROW_H + 1 + 5;

  // ── REMARKS ─────────────────────────────────────────────────────────────
  if (data.remarks) {
    doc.setFont('helvetica', 'italic').setFontSize(6.5).setTextColor(80, 80, 80);
    txt(doc, `Remarks: ${data.remarks}`, ML + 2, y, 'left', CW - 4);
    y += 7;
  }

  // ── SIGNATURE STRIP ─────────────────────────────────────────────────────
  const SIG_LABELS = ['Driver Signature', 'Owner Signature', 'Prepared By', 'Authorised Signatory'];
  const SIG_H = 16;
  const SIG_W = (CW - (SIG_LABELS.length - 1) * 2) / SIG_LABELS.length;

  SIG_LABELS.forEach((lbl, i) => {
    const sx = ML + i * (SIG_W + 2);
    doc.setDrawColor(180, 180, 200);
    doc.setFillColor(250, 250, 255);
    doc.rect(sx, y, SIG_W, SIG_H, 'FD');
    doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(100, 100, 120);
    txt(doc, lbl, sx + SIG_W / 2, y + SIG_H - 2.5, 'center');
  });

  return doc.output('bloburl') as unknown as string;
}
