/**
 * Template slug: challan-a4-landscape-a
 * Clean black-and-white landscape A4 challan — RGT Logistics
 *
 * Required metadata keys (store in DB challan_template.config):
 * {
 *   "COMPANY_NAME":    "RGT Logistics Company",
 *   "COMPANY_GSTIN":   "07ABCPC0876F1Z1",
 *   "COMPANY_MOBILE":  "9211350190",
 *   "COMPANY_ADDRESS": "B-174, Dilshad Garden, New Delhi-110095",
 *   "COMPANY_EMAIL":   "rgtlogisticscompany@gmail.com",
 *   "COMPANY_WEBSITE": "www.rgtlogistics.com"
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
  from_branch_city?: string;
  to_branch_name?: string;
  to_branch_city?: string;

  // Fleet / transport
  transport_name?: string | null;
  transport_gstin?: string | null;
  vehicle_no?: string;
  vehicle_type?: string;
  driver_name?: string;
  driver_mobile?: string;
  owner_name?: string;

  bilties: ChallanBiltyRow[];

  // Pre-computed totals (computed from bilties if absent)
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

// ── B&W Palette ──────────────────────────────────────────────────────────────

const BK:  [number,number,number] = [0,   0,   0  ];
const D40: [number,number,number] = [40,  40,  40 ];
const D80: [number,number,number] = [80,  80,  80 ];
const D130:[number,number,number] = [130, 130, 130];
const ALT: [number,number,number] = [245, 245, 245];
const WHT: [number,number,number] = [255, 255, 255];

const RS = 'Rs.'; // jsPDF built-in fonts do not support ₹ glyph

// ── Column definitions ────────────────────────────────────────────────────────

interface ColDef {
  label: string;
  key: keyof ChallanBiltyRow | 'serial';
  w: number;
  align: 'left' | 'center' | 'right';
  render?: (row: ChallanBiltyRow, idx: number) => string;
}

const COLUMNS: ColDef[] = [
  { label: 'S.No',        key: 'serial',        w: 7,  align: 'center', render: (_,i) => String(i+1) },
  { label: 'GR No',       key: 'gr_no',          w: 22, align: 'center', render: r => r.gr_no ?? '' },
  { label: 'Date',        key: 'bilty_date',     w: 14, align: 'center', render: r => r.bilty_date ?? '' },
  { label: 'Consignor',   key: 'consignor_name', w: 28, align: 'left',   render: r => r.consignor_name ?? '' },
  { label: 'Consignee',   key: 'consignee_name', w: 28, align: 'left',   render: r => r.consignee_name ?? '' },
  { label: 'Destination', key: 'to_city_name',   w: 22, align: 'left',   render: r => r.to_city_name ?? '' },
  { label: 'Contents',    key: 'contain',        w: 24, align: 'left',   render: r => r.contain ?? r.pvt_marks ?? '' },
  { label: 'Pkgs',        key: 'no_of_pkg',      w: 9,  align: 'center', render: r => r.no_of_pkg != null ? String(r.no_of_pkg) : '' },
  { label: 'Wt(kg)',      key: 'weight',         w: 14, align: 'right',  render: r => r.weight != null ? r.weight.toFixed(1) : '' },
  { label: 'Freight',     key: 'total_amount',   w: 18, align: 'right',  render: r => r.total_amount != null ? `${RS} ${r.total_amount.toFixed(0)}` : '' },
  { label: 'Mode',        key: 'payment_mode',   w: 13, align: 'center', render: r => r.payment_mode ?? '' },
  { label: 'Del.Type',    key: 'delivery_type',  w: 13, align: 'center', render: r => r.delivery_type ?? '' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function pt(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  align: 'left' | 'center' | 'right' = 'left',
  mw?: number,
) {
  doc.text(text, x, y, { align, maxWidth: mw });
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate a landscape A4 challan PDF (pure B&W).
 * @param logoDataUrl  Optional base64 data-URL of the company logo (PNG).
 * Returns a blob URL string.
 */
export function generateChallanA4LandscapeA(
  data: ChallanPrintData,
  tpl: ChallanTemplateDef,
  logoDataUrl?: string,
): string {
  const meta: Record<string, string> = {};
  if (tpl.config) Object.entries(tpl.config).forEach(([k, v]) => { meta[k] = String(v ?? ''); });

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const PW  = doc.internal.pageSize.getWidth();   // 297
  const PH  = doc.internal.pageSize.getHeight();  // 210
  const ML  = 10, MR = 10;
  const CW  = PW - ML - MR; // 277
  let y     = 10;

  const totalRelW  = COLUMNS.reduce((s, c) => s + c.w, 0);
  const scaledCols = COLUMNS.map(c => ({ ...c, w: (c.w / totalRelW) * CW }));

  // ── Reusable table-header painter ────────────────────────────────────────
  function drawTableHeader() {
    const TH = 7;
    doc.setFillColor(20, 20, 20);
    doc.rect(ML, y, CW, TH, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(6.5).setTextColor(...WHT);
    let cx = ML;
    for (const col of scaledCols) {
      const tx =
        col.align === 'right'  ? cx + col.w - 1.5 :
        col.align === 'center' ? cx + col.w / 2    : cx + 1.5;
      pt(doc, col.label, tx, y + 4.5, col.align, col.w - 2);
      if (cx > ML) { doc.setDrawColor(120, 120, 120); doc.line(cx, y, cx, y + TH); }
      cx += col.w;
    }
    y += TH;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  const HDR_H = 24;
  const LC_W  = 100;
  const RC_W  = 55;
  const MC_W  = CW - LC_W - RC_W;

  // Outer border
  doc.setDrawColor(...BK).setLineWidth(0.5);
  doc.rect(ML, y, CW, HDR_H);

  // Internal vertical dividers
  doc.setLineWidth(0.3);
  doc.line(ML + LC_W, y, ML + LC_W, y + HDR_H);
  doc.line(ML + LC_W + MC_W, y, ML + LC_W + MC_W, y + HDR_H);

  // — Left col: Logo + company details —
  let logoEndX = ML + 2;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', ML + 2, y + 3, 16, 16);
      logoEndX = ML + 20;
    } catch { /* logo optional */ }
  }
  const cpX   = logoEndX + 1;
  const cpMax = LC_W - (cpX - ML) - 2;

  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...BK);
  pt(doc, meta.COMPANY_NAME ?? '', cpX, y + 7, 'left', cpMax);
  doc.setFont('helvetica', 'normal').setFontSize(6).setTextColor(...D40);
  if (meta.COMPANY_GSTIN)   pt(doc, `GSTIN: ${meta.COMPANY_GSTIN}`,   cpX, y + 11.5, 'left', cpMax);
  if (meta.COMPANY_MOBILE)  pt(doc, `Ph: ${meta.COMPANY_MOBILE}`,     cpX, y + 15,   'left', cpMax);
  if (meta.COMPANY_EMAIL)   pt(doc, meta.COMPANY_EMAIL,                cpX, y + 18.5, 'left', cpMax);
  if (meta.COMPANY_ADDRESS) pt(doc, meta.COMPANY_ADDRESS,              cpX, y + 22,   'left', cpMax);

  // — Centre col: CHALLAN title —
  const midX = ML + LC_W + MC_W / 2;
  doc.setFont('helvetica', 'bold').setFontSize(22).setTextColor(...BK);
  pt(doc, 'CHALLAN', midX, y + 14, 'center');
  if (meta.COMPANY_WEBSITE) {
    doc.setFont('helvetica', 'normal').setFontSize(6).setTextColor(...D80);
    pt(doc, meta.COMPANY_WEBSITE, midX, y + 21, 'center', MC_W - 4);
  }

  // — Right col: Challan number + date —
  const rColX = ML + LC_W + MC_W + RC_W / 2;
  doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(...D130);
  pt(doc, 'Challan No.', rColX, y + 6, 'center');
  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...BK);
  pt(doc, data.challan_no ?? '---', rColX, y + 14, 'center');
  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...D40);
  pt(doc, `Date: ${data.challan_date ?? ''}`, rColX, y + 20, 'center');

  y += HDR_H;

  // ═══════════════════════════════════════════════════════════════════════════
  // ROUTE + FLEET STRIP
  // ═══════════════════════════════════════════════════════════════════════════
  const INFO_H = 15;
  doc.setDrawColor(...BK).setLineWidth(0.3);
  doc.rect(ML, y, CW, INFO_H);

  const ROUTE_W = Math.round(CW * 0.52);
  doc.line(ML + ROUTE_W, y, ML + ROUTE_W, y + INFO_H);

  const fromName = data.from_branch_name ?? '-';
  const fromCity = data.from_branch_city ?? '';
  const toName   = data.to_branch_name   ?? '-';
  const toCity   = data.to_branch_city   ?? '';

  // Layout: FROM block | arrow 8mm | TO block  (all inside ROUTE_W)
  const ARROW_W  = 10;
  const SIDE_W   = (ROUTE_W - ARROW_W) / 2;
  const fromX    = ML + 3;
  const arrowX   = ML + SIDE_W + ARROW_W / 2;
  const toX      = ML + SIDE_W + ARROW_W + 2;

  // FROM
  doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(...D130);
  pt(doc, 'FROM', fromX, y + 4);
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...BK);
  pt(doc, fromName, fromX, y + 9.5, 'left', SIDE_W - 4);
  if (fromCity) {
    doc.setFont('helvetica', 'normal').setFontSize(6).setTextColor(...D80);
    pt(doc, fromCity, fromX, y + 13.5, 'left', SIDE_W - 4);
  }

  // Arrow (drawn, not text — avoids font glyph issues)
  const arrowY = y + 8;
  doc.setDrawColor(...BK).setLineWidth(0.5);
  doc.line(arrowX - 4, arrowY, arrowX + 3, arrowY);
  doc.line(arrowX + 3, arrowY, arrowX, arrowY - 2);
  doc.line(arrowX + 3, arrowY, arrowX, arrowY + 2);

  // TO
  doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(...D130);
  pt(doc, 'TO', toX, y + 4);
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...BK);
  pt(doc, toName, toX, y + 9.5, 'left', SIDE_W - 4);
  if (toCity) {
    doc.setFont('helvetica', 'normal').setFontSize(6).setTextColor(...D80);
    pt(doc, toCity, toX, y + 13.5, 'left', SIDE_W - 4);
  }

  // Fleet details (right section)
  const flX   = ML + ROUTE_W + 3;
  const flMax = CW - ROUTE_W - 5;
  let   fy    = y + 3.5;

  if (data.vehicle_no) {
    doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...BK);
    pt(doc, `Vehicle: ${data.vehicle_no}${data.vehicle_type ? '  [' + data.vehicle_type + ']' : ''}`, flX, fy, 'left', flMax);
    fy += 3.5;
  }
  doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(...D40);
  if (data.transport_name)  { pt(doc, `Transport: ${data.transport_name}`,  flX, fy, 'left', flMax); fy += 3; }
  if (data.driver_name)     { pt(doc, `Driver: ${data.driver_name}${data.driver_mobile ? '  ' + data.driver_mobile : ''}`, flX, fy, 'left', flMax); fy += 3; }
  if (data.owner_name)      { pt(doc, `Owner: ${data.owner_name}`,          flX, fy, 'left', flMax); }

  y += INFO_H;

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  drawTableHeader();

  const ROW_H      = 6;
  const bilties    = data.bilties ?? [];
  const STOP_Y     = PH - 38; // reserve bottom for totals + sigs
  let   sumPkgs    = 0;
  let   sumWt      = 0;
  let   sumAmt     = 0;

  bilties.forEach((bilty, idx) => {
    // Page break
    if (y + ROW_H > STOP_Y) {
      doc.addPage();
      y = 10;
      drawTableHeader();
    }

    // Row background (alternating)
    if (idx % 2 === 0) {
      doc.setFillColor(...ALT);
      doc.rect(ML, y, CW, ROW_H, 'F');
    }
    doc.setDrawColor(190, 190, 190).setLineWidth(0.2);
    doc.rect(ML, y, CW, ROW_H, 'S');

    doc.setFont('helvetica', 'normal').setFontSize(6).setTextColor(...BK);

    let cx = ML;
    scaledCols.forEach((col, ci) => {
      const colDef = COLUMNS[ci];
      const val    = colDef.render ? colDef.render(bilty, idx) : '';
      const tx     =
        col.align === 'right'  ? cx + col.w - 1.5 :
        col.align === 'center' ? cx + col.w / 2    : cx + 1.5;

      if (colDef.key === 'gr_no') {
        doc.setFont('helvetica', 'bold');
        pt(doc, val, tx, y + 4, col.align, col.w - 2);
        doc.setFont('helvetica', 'normal');
      } else {
        pt(doc, val, tx, y + 4, col.align, col.w - 2);
      }

      if (cx > ML) { doc.setDrawColor(200, 200, 200); doc.line(cx, y, cx, y + ROW_H); }
      cx += col.w;
    });

    sumPkgs += bilty.no_of_pkg    ?? 0;
    sumWt   += bilty.weight       ?? 0;
    sumAmt  += bilty.total_amount ?? 0;
    y += ROW_H;
  });

  // ── Totals row ────────────────────────────────────────────────────────────
  const tPkgs = data.total_packages ?? sumPkgs;
  const tWt   = data.total_weight   ?? sumWt;
  const tAmt  = data.total_freight  ?? sumAmt;
  const TR    = ROW_H + 1;

  doc.setFillColor(20, 20, 20);
  doc.rect(ML, y, CW, TR, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...WHT);
  pt(doc, `Total — ${bilties.length} ${bilties.length === 1 ? 'Bilty' : 'Bilties'}`, ML + 2, y + TR - 2);

  let totX = ML;
  scaledCols.forEach((col, ci) => {
    const key = COLUMNS[ci].key;
    let val   = '';
    if (key === 'no_of_pkg')    val = String(tPkgs);
    if (key === 'weight')       val = `${tWt.toFixed(1)} kg`;
    if (key === 'total_amount') val = `${RS} ${tAmt.toFixed(0)}`;
    if (val) {
      const al = COLUMNS[ci].align;
      const tx = al === 'right'  ? totX + col.w - 1.5 :
                 al === 'center' ? totX + col.w / 2    : totX + 1.5;
      pt(doc, val, tx, y + TR - 2, al);
    }
    totX += col.w;
  });
  y += TR + 5;

  // ── Remarks ───────────────────────────────────────────────────────────────
  if (data.remarks) {
    doc.setFont('helvetica', 'italic').setFontSize(6.5).setTextColor(...D80);
    pt(doc, `Remarks: ${data.remarks}`, ML, y, 'left', CW);
    y += 6;
  }

  // ── Signature strip — Authorised Signatory only ─────────────────────────
  const SIG_H = 18;
  const SW    = 70;
  const sx    = ML + CW - SW;
  doc.setDrawColor(...BK).setLineWidth(0.3);
  doc.rect(sx, y, SW, SIG_H, 'D');
  doc.setFont('helvetica', 'normal').setFontSize(6).setTextColor(...D130);
  pt(doc, 'Authorised Signatory', sx + SW / 2, y + SIG_H - 3, 'center');

  return doc.output('bloburl') as unknown as string;
}

