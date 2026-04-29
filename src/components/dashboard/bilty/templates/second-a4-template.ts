/**
 * Template slug: second-a4-template
 * Layout: Compact three-copy A4 (Original / Duplicate / Triplicate)
 * Each copy is 1/3 of the A4 page — landscape-style rows stacked vertically.
 *
 * Required metadata keys (store in DB bilty_template.metadata):
 * {
 *   "COMPANY_NAME":    "RGT Logistics Company",
 *   "COMPANY_GSTIN":   "07ABCPC0876F1Z1",
 *   "COMPANY_MOBILE":  "9211350190",
 *   "COMPANY_ADDRESS": "B-174, Dilshad Garden, New Delhi-110095",
 *   "COMPANY_EMAIL":   "rgtlogisticscompany@gmail.com",
 *   "COMPANY_WEBSITE": "www.rgtlogistics.com",
 *   "CUSTOMER_CARE":   "9211350190",
 *   "PARCEL_SERVICE":  "KANPUR | LUCKNOW | ALLAHABAD | ...",
 *   "NOTICE":          "The consignment will not be detained..."
 * }
 */

import jsPDF from 'jspdf';
import { PrimaryTemplate } from '../types';
import { BiltyData } from './first-a4-template';

export type { BiltyData };

const R = String.fromCharCode(8377); // ₹

/** Render ONE compact copy inside a fixed-height band */
function renderCompactCopy(
  doc: jsPDF,
  b: BiltyData,
  meta: Record<string, string>,
  copyLabel: string,
  startY: number,
  pageW: number,
  bandH: number,
): void {
  const ML = 6;
  const MR = 6;
  const W  = pageW - ML - MR;
  let   y  = startY + 1;

  // ── Thin top-border for this copy ──────────────────────────────────────
  doc.setDrawColor(20, 40, 100);
  doc.setLineWidth(0.4);
  doc.line(ML, startY, pageW - MR, startY);
  doc.setLineWidth(0.2);

  // ── Header ─────────────────────────────────────────────────────────────
  doc.setFillColor(20, 40, 100);
  doc.rect(ML, y, W, 10, 'F');

  // Left: company block
  doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(255, 255, 255);
  doc.text(meta.COMPANY_NAME ?? 'RGT Logistics Company', ML + 1, y + 4);
  doc.setFont('helvetica', 'normal').setFontSize(5).setTextColor(200, 210, 255);
  doc.text(`GSTIN: ${meta.COMPANY_GSTIN ?? ''} | Ph: ${meta.COMPANY_MOBILE ?? ''}`, ML + 1, y + 7);
  doc.text(meta.COMPANY_ADDRESS ?? '', ML + 1, y + 9.5, { maxWidth: pageW * 0.45 });

  // Right: GR + copy
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(255, 255, 255);
  doc.text(`GR NO : ${b.gr_no ?? ''}`, pageW - MR - 2, y + 4.5, { align: 'right' });
  doc.setFontSize(5.5).setTextColor(200, 220, 255);
  doc.text(copyLabel, pageW - MR - 2, y + 8, { align: 'right' });
  y += 11;
  doc.setTextColor(0, 0, 0); doc.setDrawColor(0, 0, 0);

  // ── Route strip ────────────────────────────────────────────────────────
  doc.setFillColor(230, 235, 255);
  doc.rect(ML, y, W, 6, 'F');
  doc.setDrawColor(180, 190, 230); doc.rect(ML, y, W, 6, 'S');
  const fromCity = (b.from_city_name ?? b.from_city_id ?? '').toUpperCase();
  const toCity   = (b.to_city_name   ?? b.to_city_id   ?? '').toUpperCase();
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(20, 40, 100);
  doc.text(fromCity, ML + 2, y + 4.3);
  doc.text('→', pageW / 2, y + 4.3, { align: 'center' });
  doc.text(toCity, pageW - MR - 2, y + 4.3, { align: 'right' });
  y += 7;
  doc.setTextColor(0, 0, 0); doc.setDrawColor(0, 0, 0);

  // ── 4-column info row: Date | Delivery | Payment | PVT Marks ───────────
  const cols4 = [
    { lbl: 'DATE',         val: b.bilty_date ?? '' },
    { lbl: 'DELIVERY',     val: b.delivery_type ?? '' },
    { lbl: 'PAYMENT',      val: b.payment_mode ?? '' },
    { lbl: 'PVT MARK',     val: b.pvt_marks ?? '' },
  ];
  const c4W = W / cols4.length;
  doc.setFillColor(248, 249, 255);
  doc.rect(ML, y, W, 6, 'F');
  doc.setDrawColor(210, 210, 220); doc.rect(ML, y, W, 6, 'S');
  cols4.forEach(({ lbl, val }, i) => {
    const cx = ML + i * c4W + c4W / 2;
    if (i > 0) doc.line(ML + i * c4W, y, ML + i * c4W, y + 6);
    doc.setFont('helvetica', 'normal').setFontSize(4.5).setTextColor(120, 120, 120);
    doc.text(lbl, cx, y + 2, { align: 'center' });
    doc.setFont('helvetica', 'bold').setFontSize(6).setTextColor(0, 0, 0);
    doc.text(val, cx, y + 5, { align: 'center' });
  });
  y += 7;

  // ── Consignor | Consignee | Delivery At ────────────────────────────────
  const pW    = (W - 1) / 3;
  const pH    = 14;
  const headers3 = ['CONSIGNOR', 'CONSIGNEE', 'DELIVERY AT'];
  const bodies3  = [
    [b.consignor_name ?? '', `GSTIN: ${b.consignor_gstin ?? ''}`, `MOB: ${b.consignor_mobile ?? ''}`],
    [b.consignee_name ?? '', `GSTIN: ${b.consignee_gstin ?? ''}`, `MOB: ${b.consignee_mobile ?? ''}`],
    [b.transport_name ?? meta.TRANSPORT ?? '', b.transport_gstin ? `GSTIN: ${b.transport_gstin}` : '', ''],
  ];

  headers3.forEach((hdr, i) => {
    const bx = ML + i * (pW + 0.5);
    doc.setFillColor(20, 40, 100);
    doc.rect(bx, y, pW, 4.5, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(5.5).setTextColor(255, 255, 255);
    doc.text(hdr, bx + 1.5, y + 3.2);

    doc.setFillColor(252, 252, 254);
    doc.rect(bx, y + 4.5, pW, pH, 'F');
    doc.setDrawColor(200, 200, 220); doc.rect(bx, y + 4.5, pW, pH, 'S');

    bodies3[i].forEach((line, li) => {
      if (!line) return;
      const isFirst = li === 0;
      doc.setFont('helvetica', isFirst ? 'bold' : 'normal')
         .setFontSize(isFirst ? 6.5 : 5.5)
         .setTextColor(0, 0, 0);
      doc.text(line, bx + 1.5, y + 4.5 + 4 + li * 4, { maxWidth: pW - 3 });
    });
  });
  y += 4.5 + pH + 1;
  doc.setTextColor(0, 0, 0); doc.setDrawColor(0, 0, 0);

  // ── Invoice + Freight side by side ─────────────────────────────────────
  const invCols = W * 0.60;
  const frtCols = W - invCols - 1;
  const ewb0 = b.e_way_bills?.[0] ?? b.e_way_bill;

  const invData: [string, string][] = [
    ['INVOICE DATE', b.invoice_date ?? ''],
    ['INV NO',       b.invoice_no ?? ''],
    ['VALUE',        b.invoice_value != null ? `${R}${b.invoice_value}` : ''],
    ['EWB',          ewb0?.ewb_no ?? ''],
    ['EWB VALID',    ewb0?.valid_upto ?? ''],
    ['CONTENT',      b.contain ?? ''],
  ];
  const frtData: [string, string | number][] = [
    ['NO. OF PCKG', b.no_of_pkg  ?? ''],
    ['CHG WT',      b.weight     != null ? `${b.weight} KG` : ''],
    ['FREIGHT',     b.freight_amount  ?? ''],
    ['LABOUR',      b.labour_charge   ?? ''],
    ['BILTY CHRG',  b.bill_charge     ?? ''],
    ['LOCAL',       b.local_charge    ?? ''],
    ['OTHER',       b.other_charge    ?? ''],
    ['TOTAL',       b.total_amount != null ? `${R}${b.total_amount}` : ''],
  ];

  // section headers
  doc.setFillColor(20, 40, 100);
  doc.rect(ML, y, invCols, 4.5, 'F');
  doc.rect(ML + invCols + 1, y, frtCols, 4.5, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(5.5).setTextColor(255, 255, 255);
  doc.text('INVOICE DETAILS', ML + 2, y + 3.2);
  doc.text('FREIGHT DETAILS', ML + invCols + 3, y + 3.2);
  y += 4.5;

  const rH2 = 4.8;
  const maxR = Math.max(invData.length, frtData.length);
  for (let i = 0; i < maxR; i++) {
    const ry = y + i * rH2;
    const bg = i % 2 === 0 ? [248, 250, 255] : [255, 255, 255];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(ML, ry, invCols, rH2, 'F');
    doc.rect(ML + invCols + 1, ry, frtCols, rH2, 'F');
    doc.setDrawColor(210, 212, 225);
    doc.rect(ML, ry, invCols, rH2, 'S');
    doc.rect(ML + invCols + 1, ry, frtCols, rH2, 'S');

    if (invData[i]) {
      doc.setFont('helvetica', 'bold').setFontSize(4.5).setTextColor(80, 80, 130);
      doc.text(invData[i][0], ML + 1.5, ry + 3.3);
      doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(0, 0, 0);
      doc.text(String(invData[i][1] ?? ''), ML + 18, ry + 3.3, { maxWidth: invCols - 20 });
    }
    if (frtData[i]) {
      const [lbl, val] = frtData[i];
      const bold = lbl === 'TOTAL';
      doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(5.5).setTextColor(80, 80, 80);
      doc.text(String(lbl), ML + invCols + 2.5, ry + 3.3);
      doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(bold ? 6.5 : 5.5).setTextColor(0, 0, 0);
      doc.text(String(val ?? ''), pageW - MR - 2, ry + 3.3, { align: 'right' });
    }
  }
  y += maxR * rH2 + 1;
  doc.setTextColor(0, 0, 0); doc.setDrawColor(0, 0, 0);

  // ── Notice + footer ────────────────────────────────────────────────────
  const remaining = startY + bandH - y - 2;
  if (remaining > 6) {
    const noticeText = meta.NOTICE ??
      'The consignment will not be detained, diverted, re-routed, or re-booked without the consignee\'s written permission.';
    doc.setFillColor(250, 250, 252);
    doc.rect(ML, y, W, remaining, 'F');
    doc.setDrawColor(200, 200, 200); doc.rect(ML, y, W, remaining, 'S');
    doc.setFont('helvetica', 'italic').setFontSize(4.5).setTextColor(100, 100, 100);
    doc.text(noticeText, ML + 2, y + 3, { maxWidth: (W / 2) - 4 });
    if (meta.COMPANY_WEBSITE) {
      doc.setFont('helvetica', 'bold').setFontSize(5).setTextColor(20, 40, 100);
      doc.text(`Website: ${meta.COMPANY_WEBSITE}`, ML + 2, y + remaining - 2);
    }
    doc.setFont('helvetica', 'bold').setFontSize(5.5).setTextColor(0, 0, 0);
    doc.text('Auth. Signatory', pageW - MR - 2, y + remaining - 2, { align: 'right' });
  }
}

/** Generate three-copy A4 PDF (Original / Duplicate / Triplicate stacked) */
export function generateSecondA4(
  b: BiltyData,
  tpl: PrimaryTemplate,
): string {
  const meta: Record<string, string> = {};
  if (tpl.metadata) {
    Object.entries(tpl.metadata).forEach(([k, v]) => { meta[k] = String(v ?? ''); });
  }

  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W     = doc.internal.pageSize.getWidth();
  const H     = doc.internal.pageSize.getHeight();
  const bandH = Math.floor(H / 3) - 1;

  const copies = ['ORIGINAL COPY', 'DUPLICATE COPY', 'TRIPLICATE COPY'];
  copies.forEach((label, i) => {
    renderCompactCopy(doc, b, meta, label, i * (bandH + 1), W, bandH);
  });

  return doc.output('bloburl') as unknown as string;
}
