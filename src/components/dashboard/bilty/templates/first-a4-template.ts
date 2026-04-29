/**
 * Template slug: first-a4-template
 * Layout: Classic two-copy A4 (Consignor Copy on top, Driver Copy below)
 * Closely matches the physical RGT Logistics bilty format.
 *
 * Required metadata keys (store in DB bilty_template.metadata):
 * {
 *   "COMPANY_NAME":    "RGT Logistics Company",
 *   "COMPANY_GSTIN":   "07ABCPC0876F1Z1",
 *   "COMPANY_MOBILE":  "074BCB...",
 *   "COMPANY_ADDRESS": "B-174, Dilshad Garden, New Delhi-110095",
 *   "COMPANY_EMAIL":   "rgtlogisticscompany@gmail.com",
 *   "COMPANY_WEBSITE": "www.rgtlogistics.com",
 *   "CUSTOMER_CARE":   "9211350190"
 * }
 */

import jsPDF from 'jspdf';
import { PrimaryTemplate } from '../types';

// ── bilty data shape (subset we care about) ────────────────────────────────
export interface BiltyData {
  gr_no?: string;
  bilty_date?: string;
  bilty_type?: string;
  payment_mode?: string;
  delivery_type?: string;

  consignor_name?: string;
  consignor_gstin?: string;
  consignor_mobile?: string;
  consignee_name?: string;
  consignee_gstin?: string;
  consignee_mobile?: string;

  transport_name?: string;
  transport_gstin?: string;
  transport_mobile?: string;

  from_city_name?: string;
  from_city_id?: string;
  to_city_name?: string;
  to_city_id?: string;

  contain?: string;
  no_of_pkg?: number;
  weight?: number;
  actual_weight?: number;
  rate?: number;
  pvt_marks?: string;
  document_number?: string;

  invoice_no?: string;
  invoice_value?: number;
  invoice_date?: string;

  e_way_bills?: { ewb_no?: string; valid_upto?: string }[];
  e_way_bill?:  { ewb_no?: string; valid_upto?: string };

  freight_amount?: number;
  labour_charge?: number;
  bill_charge?: number;
  toll_charge?: number;
  dd_charge?: number;
  pf_charge?: number;
  local_charge?: number;
  other_charge?: number;
  total_amount?: number;

  remark?: string;
}

const R = String.fromCharCode(8377); // ₹

/** Render ONE copy of the bilty onto the given doc starting at y=startY.
 *  Returns the final y position. */
function renderCopy(
  doc: jsPDF,
  b: BiltyData,
  meta: Record<string, string>,
  copyLabel: string,
  startY: number,
  pageW: number,
): number {
  const ML = 8;   // margin left
  const MR = 8;   // margin right
  const W  = pageW - ML - MR;
  let y    = startY;

  const HL = 14; // header height

  // ── Header bar ─────────────────────────────────────────────────────────
  doc.setFillColor(20, 40, 100);
  doc.rect(ML, y, W, HL, 'F');

  // Logo area (left white box)
  const logoW = 42;
  doc.setFillColor(255, 255, 255);
  doc.rect(ML, y, logoW, HL, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(20, 40, 100);
  doc.text(meta.COMPANY_NAME ?? 'RGT Logistics Company', ML + 1, y + 5, { maxWidth: logoW - 2 });
  doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(80, 80, 80);
  doc.text(`GSTIN: ${meta.COMPANY_GSTIN ?? ''}`, ML + 1, y + 9.5);
  doc.text(`Ph: ${meta.COMPANY_MOBILE ?? ''}`, ML + 1, y + 12.5);

  // Company details (centre)
  doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(220, 220, 255);
  const cx = ML + logoW + 2;
  doc.text(meta.COMPANY_ADDRESS ?? '', cx, y + 4, { maxWidth: W - logoW - 30 });
  doc.text(`Email: ${meta.COMPANY_EMAIL ?? ''}`, cx, y + 7.5, { maxWidth: W - logoW - 30 });

  // GR + copy label (right)
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(255, 255, 255);
  doc.text(`GR NO : ${b.gr_no ?? ''}`, pageW - MR - 2, y + 5, { align: 'right' });
  doc.setFontSize(6).setTextColor(200, 220, 255);
  doc.text(copyLabel, pageW - MR - 2, y + 9, { align: 'right' });

  y += HL + 1;
  doc.setTextColor(0, 0, 0);

  // ── Route strip ────────────────────────────────────────────────────────
  doc.setFillColor(230, 235, 255);
  doc.rect(ML, y, W, 8, 'F');
  doc.setDrawColor(180, 180, 220);
  doc.rect(ML, y, W, 8, 'S');

  const fromCity = (b.from_city_name ?? b.from_city_id ?? '').toUpperCase();
  const toCity   = (b.to_city_name   ?? b.to_city_id   ?? '').toUpperCase();

  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(20, 40, 100);
  doc.text(fromCity, ML + 3, y + 5.5);
  doc.text('➜', pageW / 2 - 3, y + 5.5, { align: 'center' });
  doc.text(toCity, pageW - MR - 3, y + 5.5, { align: 'right' });

  // sub-labels
  doc.setFont('helvetica', 'normal').setFontSize(5).setTextColor(80, 80, 80);
  doc.text('FROM', ML + 3, y + 1.8);
  doc.text('TO', pageW - MR - 3, y + 1.8, { align: 'right' });

  y += 9;
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  // ── Date / Delivery / Payment row ──────────────────────────────────────
  doc.setFillColor(248, 248, 250);
  doc.rect(ML, y, W, 7, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(ML, y, W, 7, 'S');
  doc.setFont('helvetica', 'bold').setFontSize(6).setTextColor(0, 0, 0);

  const cells = [
    ['DATE', b.bilty_date ?? ''],
    ['DELIVERY TYPE', b.delivery_type ?? ''],
    ['PAYMENT', b.payment_mode ?? ''],
  ];
  const cellW = W / cells.length;
  cells.forEach(([label, val], i) => {
    const cx2 = ML + i * cellW + cellW / 2;
    doc.setFont('helvetica', 'normal').setFontSize(5).setTextColor(100, 100, 100);
    doc.text(label, cx2, y + 2.5, { align: 'center' });
    doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(0, 0, 0);
    doc.text(val, cx2, y + 5.8, { align: 'center' });
    if (i > 0) { doc.setDrawColor(200, 200, 200); doc.line(ML + i * cellW, y, ML + i * cellW, y + 7); }
  });
  y += 8;
  doc.setDrawColor(0, 0, 0);

  // ── Consignor | Consignee block ─────────────────────────────────────────
  const halfW = W / 2 - 0.5;
  const blockH = 22;

  // Header bars
  doc.setFillColor(20, 40, 100);
  doc.rect(ML, y, halfW, 5, 'F');
  doc.rect(ML + halfW + 1, y, halfW, 5, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(6.5).setTextColor(255, 255, 255);
  doc.text('CONSIGNOR (Sender)', ML + 2, y + 3.5);
  doc.text('CONSIGNEE (Receiver)', ML + halfW + 3, y + 3.5);
  y += 5;

  const partyBox = (x: number, name = '', gstin = '', mob = '') => {
    doc.setFillColor(252, 252, 254);
    doc.rect(x, y, halfW, blockH, 'F');
    doc.setDrawColor(200, 200, 220);
    doc.rect(x, y, halfW, blockH, 'S');
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(0, 0, 0);
    doc.text(name || '—', x + 2, y + 5, { maxWidth: halfW - 4 });
    doc.setFont('helvetica', 'normal').setFontSize(6).setTextColor(80, 80, 80);
    if (gstin) doc.text(`GSTIN: ${gstin}`, x + 2, y + 10, { maxWidth: halfW - 4 });
    if (mob)   doc.text(`MOB: ${mob}`,   x + 2, y + 14, { maxWidth: halfW - 4 });
  };

  partyBox(ML,               b.consignor_name ?? '', b.consignor_gstin ?? '', b.consignor_mobile ?? '');
  partyBox(ML + halfW + 1,   b.consignee_name ?? '', b.consignee_gstin ?? '', b.consignee_mobile ?? '');
  y += blockH + 1;
  doc.setTextColor(0, 0, 0); doc.setDrawColor(0, 0, 0);

  // ── Delivery AT (transport company) ────────────────────────────────────
  doc.setFillColor(240, 245, 255);
  doc.rect(ML, y, W, 7, 'F');
  doc.setDrawColor(180, 180, 220); doc.rect(ML, y, W, 7, 'S');
  doc.setFont('helvetica', 'bold').setFontSize(6).setTextColor(60, 60, 120);
  doc.text('DELIVERY AT :', ML + 2, y + 4.5);
  doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(0, 0, 0);
  doc.text(b.transport_name ?? meta.TRANSPORT ?? '', ML + 28, y + 4.5, { maxWidth: W - 30 });
  if (b.transport_gstin) {
    doc.setFontSize(5.5).setTextColor(80, 80, 80);
    doc.text(`GSTIN: ${b.transport_gstin}`, pageW - MR - 2, y + 4.5, { align: 'right' });
  }
  y += 8; doc.setTextColor(0, 0, 0); doc.setDrawColor(0, 0, 0);

  // ── Invoice details + Freight details (two columns) ────────────────────
  const invW  = W * 0.62;
  const frtW  = W - invW - 1;
  const secHd = 6;

  // Invoice header
  doc.setFillColor(20, 40, 100);
  doc.rect(ML, y, invW, secHd, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(6.5).setTextColor(255, 255, 255);
  doc.text('INVOICE DETAILS', ML + 2, y + 4);

  // Freight header
  doc.setFillColor(20, 40, 100);
  doc.rect(ML + invW + 1, y, frtW, secHd, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(6.5).setTextColor(255, 255, 255);
  doc.text('FREIGHT DETAILS', ML + invW + 3, y + 4);
  y += secHd;

  // Invoice table rows
  const invRows: [string, string][] = [
    ['INVOICE DATE', b.invoice_date ?? ''],
    ['INV NO',       b.invoice_no ?? ''],
    ['VALUE',        b.invoice_value != null ? `${R}${b.invoice_value}` : ''],
    ['CONTENT',      b.contain ?? ''],
    ['CYCLE LOCK',   ''],
  ];
  // EWB
  const ewb0 = b.e_way_bills?.[0] ?? b.e_way_bill;
  if (ewb0?.ewb_no) invRows.push(['EWB', ewb0.ewb_no]);
  if (ewb0?.valid_upto) invRows.push(['EWB VALID', ewb0.valid_upto]);

  // Freight table rows
  const freightRows: [string, string | number][] = [
    ['NO. OF PCKG',  b.no_of_pkg  ?? ''],
    ['CHRG WT',      b.weight     != null ? `${b.weight} KG` : ''],
    ['FREIGHT',      b.freight_amount  ?? ''],
    ['LABOUR',       b.labour_charge   ?? ''],
    ['BILTY CHRG',   b.bill_charge     ?? ''],
    ['LOCAL CHRG',   b.local_charge    ?? ''],
    ['OTHER CHRG',   b.other_charge    ?? ''],
    ['TOTAL',        b.total_amount    ?? ''],
    ['PAID',         b.payment_mode === 'PAID' ? `${R} ${b.total_amount ?? ''}` : ''],
  ];

  const rowH = 5.5;
  const maxRows = Math.max(invRows.length, freightRows.length);

  for (let i = 0; i < maxRows; i++) {
    const ry = y + i * rowH;
    const bg = i % 2 === 0 ? [248, 250, 255] : [255, 255, 255];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(ML, ry, invW, rowH, 'F');
    doc.rect(ML + invW + 1, ry, frtW, rowH, 'F');

    doc.setDrawColor(210, 210, 220);
    doc.rect(ML, ry, invW, rowH, 'S');
    doc.rect(ML + invW + 1, ry, frtW, rowH, 'S');

    // invoice cell
    if (invRows[i]) {
      doc.setFont('helvetica', 'bold').setFontSize(5.5).setTextColor(80, 80, 120);
      doc.text(invRows[i][0], ML + 1.5, ry + 3.8);
      doc.setFont('helvetica', 'normal').setFontSize(6).setTextColor(0, 0, 0);
      const valX = ML + 20;
      doc.text(String(invRows[i][1] ?? ''), valX, ry + 3.8, { maxWidth: invW - 22 });
    }

    // freight cell
    if (freightRows[i]) {
      const [flbl, fval] = freightRows[i];
      const isTotalRow = flbl === 'TOTAL' || flbl === 'PAID';
      doc.setFont('helvetica', isTotalRow ? 'bold' : 'normal').setFontSize(6).setTextColor(isTotalRow ? 20 : 80, isTotalRow ? 40 : 80, isTotalRow ? 100 : 80);
      doc.text(flbl, ML + invW + 2.5, ry + 3.8);
      doc.setFont('helvetica', isTotalRow ? 'bold' : 'normal').setFontSize(6.5).setTextColor(0, 0, 0);
      doc.text(String(fval ?? ''), pageW - MR - 2, ry + 3.8, { align: 'right' });
    }
  }
  y += maxRows * rowH + 1;
  doc.setTextColor(0, 0, 0); doc.setDrawColor(0, 0, 0);

  // ── Daily Parcel Service strip ──────────────────────────────────────────
  if (meta.PARCEL_SERVICE) {
    doc.setFillColor(245, 245, 245);
    doc.rect(ML, y, W, 5, 'F');
    doc.setDrawColor(200, 200, 200); doc.rect(ML, y, W, 5, 'S');
    doc.setFont('helvetica', 'bold').setFontSize(5.5).setTextColor(20, 40, 100);
    doc.text('DAILY PARCEL SERVICE :', ML + 2, y + 3.3);
    doc.setFont('helvetica', 'normal').setFontSize(5).setTextColor(60, 60, 60);
    doc.text(meta.PARCEL_SERVICE, ML + 38, y + 3.3, { maxWidth: W - 40 });
    y += 6;
  }

  // ── Notice block ───────────────────────────────────────────────────────
  const noticeText = meta.NOTICE ??
    'The consignment will not be detained, diverted, re-routed, or re-booked without the consignee\'s written permission and will be delivered at the destination.';
  doc.setFillColor(252, 252, 252);
  doc.rect(ML, y, W, 12, 'F');
  doc.setDrawColor(200, 200, 200); doc.rect(ML, y, W, 12, 'S');
  doc.setFont('helvetica', 'italic').setFontSize(5).setTextColor(80, 80, 80);
  doc.text(noticeText, ML + 2, y + 3, { maxWidth: W - 4 });
  if (meta.COMPANY_WEBSITE) {
    doc.setFont('helvetica', 'bold').setFontSize(6).setTextColor(20, 40, 100);
    doc.text(`Website: ${meta.COMPANY_WEBSITE}`, ML + 2, y + 9.5);
  }
  if (meta.CUSTOMER_CARE) {
    doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(80, 80, 80);
    doc.text(`Customer Care: ${meta.CUSTOMER_CARE}`, ML + 2, y + 12.5);
  }
  doc.setFont('helvetica', 'bold').setFontSize(6).setTextColor(0, 0, 0);
  doc.text('Auth. Signatory', pageW - MR - 2, y + 11, { align: 'right' });
  y += 14;

  if (b.remark) {
    doc.setFont('helvetica', 'italic').setFontSize(5.5).setTextColor(80, 80, 80);
    doc.text(`Remark: ${b.remark}`, ML + 2, y, { maxWidth: W - 4 });
    y += 5;
  }

  return y;
}

/** Generate two-copy A4 PDF (Consignor Copy + Driver Copy) */
export function generateFirstA4(
  b: BiltyData,
  tpl: PrimaryTemplate,
): string {
  const meta: Record<string, string> = {};
  if (tpl.metadata) {
    Object.entries(tpl.metadata).forEach(([k, v]) => { meta[k] = String(v ?? ''); });
  }

  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W    = doc.internal.pageSize.getWidth();
  const H    = doc.internal.pageSize.getHeight();
  const half = H / 2 - 3;

  // ── Copy 1 — CONSIGNOR COPY ────────────────────────────────────────────
  renderCopy(doc, b, meta, 'CONSIGNOR COPY', 4, W);

  // ── Dashed separator ──────────────────────────────────────────────────
  doc.setDrawColor(160, 160, 160);
  doc.setLineDashPattern([2, 1.5], 0);
  doc.line(8, half, W - 8, half);
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(150, 150, 150);
  doc.text('✂  CUT HERE', W / 2, half - 0.5, { align: 'center' });

  // ── Copy 2 — DRIVER COPY ──────────────────────────────────────────────
  renderCopy(doc, b, meta, 'DRIVER COPY', half + 3, W);

  return doc.output('bloburl') as unknown as string;
}
