/**
 * Template slug: third-a4-template
 * Layout: RGT Logistics A4 — two copies (Consignor Copy on top, Driver Copy below).
 * Exact match to the physical printed bilty format:
 *   - Large company header with logo box + QR code
 *   - Bordered party table (FROM/TO, CONSIGNOR, CONSIGNEE, DELIVERY AT)
 *   - Invoice details (horizontal 6-col table) + Freight details (vertical 9-row column)
 *   - Daily Parcel Service cities list embedded in invoice section
 *   - 3-point Notice section + footer with signatory
 *
 * Required metadata keys:
 * {
 *   "COMPANY_NAME":       "RGT Logistics Company",
 *   "COMPANY_GSTIN":      "07ABCPC0876F1Z1",
 *   "COMPANY_EMAIL":      "rgtlogisticscompany@gmail.com",
 *   "COMPANY_ADDRESS_HO": "D-78, Oil Market, Mangolpuri, Phase-1, New Delhi-110083 | MOB : 9211350179",
 *   "COMPANY_ADDRESS_BO": "Vallabh Enclave, Near Shiv Shakti Dharam Kanta, Nagli Poona, Delhi-36 | MOB : 8198826777",
 *   "COMPANY_WEBSITE":    "rgtlogistics.com",
 *   "CUSTOMER_CARE":      "9211350190",
 *   "PARCEL_SERVICE":     "KANPUR | LUCKNOW | ALLAHABAD | VARANASI | GORAKHPUR | AZAMGARH | JAUNPUR | BASTI | BALLIA | DEORIA | PRATAPGARH | PHOOLPUR | ALIGARH | BARABANKI | FAIZABAD | SIDHARTH NAGAR | MUBARAKPUR | TAMKUI ROAD | MIRZAPUR | SALEEMBAZAR | HATA | GONDA | BEHRAICH | PANIPAT | PUNJAB | AMRITSAR | JALANDHAR | MALERKOTLA | PHAGWARA | FARIDABAD | AND MORE..."
 * }
 */

import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { PrimaryTemplate } from '../types';
import type { BiltyData } from './first-a4-template';

const R = String.fromCharCode(8377); // ₹

/** Convert a colour data-URL to greyscale using an offscreen canvas */
async function toGrayscale(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const id   = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d    = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
        d[i] = d[i + 1] = d[i + 2] = g;
      }
      ctx.putImageData(id, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl); // fallback: keep original
    img.src = dataUrl;
  });
}

async function renderCopy(
  doc: jsPDF,
  b: BiltyData,
  meta: Record<string, string>,
  copyLabel: string,
  startY: number,
  pageW: number,
  qrDataUrl: string,
  logoDataUrl: string,
): Promise<number> {
  // Use tight margins to fill the full A4 width
  const ML = 5;
  const MR = 5;
  const W  = pageW - ML - MR;
  let y    = startY;

  // Shorthand setters
  const BLD = (sz: number) => doc.setFont('helvetica', 'bold').setFontSize(sz).setTextColor(0,0,0);
  const NRM = (sz: number) => doc.setFont('helvetica', 'normal').setFontSize(sz).setTextColor(0,0,0);
  const LBL = (sz: number) => doc.setFont('courier', 'bold').setFontSize(sz).setTextColor(0,0,0);
  const VAL = (sz: number) => doc.setFont('courier', 'bold').setFontSize(sz).setTextColor(0,0,0);

  // ── HEADER (no outer rect — only bottom line) ──────────────────────────
  const HDR_H = 24;

  // Logo image (no border)
  const LOGO_W = 26;
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', ML, y + 1, LOGO_W, HDR_H - 2);
  }

  // Company info (centre block)
  const CX = ML + LOGO_W + 3;
  const CW = W - LOGO_W - 20;
  BLD(15); doc.text(meta.COMPANY_NAME ?? 'RGT Logistics Company', CX, y + 7);
  NRM(6.5); doc.text('Fleet Owner | Transport | Contractor | Commission Basis', CX, y + 11.5, { maxWidth: CW });
  NRM(6);   doc.text(`GSTIN : ${meta.COMPANY_GSTIN ?? ''}  |  Email : ${meta.COMPANY_EMAIL ?? ''}`, CX, y + 15.5, { maxWidth: CW });
  NRM(5.5); if (meta.COMPANY_ADDRESS_HO) doc.text(`H.O.- ${meta.COMPANY_ADDRESS_HO}`, CX, y + 19.5, { maxWidth: CW });
  NRM(5.5); if (meta.COMPANY_ADDRESS_BO) doc.text(`B.O.- ${meta.COMPANY_ADDRESS_BO}`, CX, y + 23,   { maxWidth: CW });

  // QR code (no border)
  const QR_SIZE = 18;
  const QR_X   = pageW - MR - QR_SIZE;
  if (qrDataUrl) doc.addImage(qrDataUrl, 'PNG', QR_X, y + 2, QR_SIZE, QR_SIZE);
  NRM(4.5); doc.text('SCAN GR', QR_X + QR_SIZE / 2, y + 22.5, { align: 'center' });

  // Bottom line of header
  doc.setDrawColor(0,0,0); doc.setLineWidth(0.5);
  doc.line(ML, y + HDR_H, ML + W, y + HDR_H);

  y += HDR_H + 1.5;

  // ── COPY LABEL (centred) + GR NO ────────────────────────────────────────
  const centerX = ML + W / 2;
  const grLY    = y + 5;
  BLD(11); doc.text(copyLabel, centerX, grLY, { align: 'center' });
  const clW2 = doc.getTextWidth(copyLabel);
  doc.setDrawColor(0,0,0); doc.setLineWidth(0.4);
  doc.line(centerX - clW2 / 2, grLY + 1, centerX + clW2 / 2, grLY + 1);
  BLD(9);  doc.text(`GR NO : ${b.gr_no ?? ''}`, ML + W, grLY, { align: 'right' });
  y += 8;

  // ── PARTY TABLE ──────────────────────────────────────────────────────────
  // Layout: left 62% for party data, right 38% for transport + delivery/payment/pvt
  doc.setDrawColor(0,0,0); doc.setLineWidth(0.4);
  const LEFT_W  = W * 0.62;
  const RIGHT_W = W - LEFT_W;

  // Row heights
  const RH1 = 6.5;  // FROM→TO
  const RH2 = 5.5;  // CONSIGNOR name
  const RH3 = 5;    // CONSIGNOR GSTIN|MOB
  const RH4 = 5.5;  // CONSIGNEE name
  const RH5 = 5;    // CONSIGNEE GSTIN|MOB
  const TABLE_H = RH1 + RH2 + RH3 + RH4 + RH5;

  // Outer rect
  doc.rect(ML, y, W, TABLE_H, 'S');
  // Vertical divider
  doc.line(ML + LEFT_W, y, ML + LEFT_W, y + TABLE_H);

  // ── Left column rows ──
  let ry = y;

  // ROW 1: FROM → TO + DATE
  doc.setLineWidth(0.2);
  doc.line(ML, ry + RH1, ML + LEFT_W, ry + RH1);
  const fromCity = (b.from_city_name ?? b.from_city_id ?? '').toUpperCase();
  const toCity   = (b.to_city_name   ?? b.to_city_id   ?? '').toUpperCase();
  BLD(11); doc.text(fromCity, ML + 2, ry + RH1 * 0.72);
  NRM(7);  doc.text('TO', ML + LEFT_W * 0.36, ry + RH1 * 0.72, { align: 'center' });
  BLD(11); doc.text(toCity, ML + LEFT_W * 0.40, ry + RH1 * 0.72);
  const DATE_X = ML + LEFT_W * 0.69;
  doc.line(DATE_X, ry, DATE_X, ry + RH1);
  LBL(6);  doc.text('DATE', DATE_X + 1, ry + 2.5);
  VAL(8);  doc.text(b.bilty_date ?? '', DATE_X + 1, ry + RH1 * 0.82);

  ry += RH1;

  // ROW 2: CONSIGNOR
  doc.line(ML, ry + RH2, ML + LEFT_W, ry + RH2);
  LBL(7);  doc.text('CONSIGNOR', ML + 2, ry + RH2 * 0.72);
  VAL(8.5);doc.text(b.consignor_name ?? '', ML + 28, ry + RH2 * 0.72, { maxWidth: LEFT_W - 30 });
  ry += RH2;

  // ROW 3: CONSIGNOR GSTIN | MOB — 4 cells: [LBL|VAL|LBL|VAL]
  doc.line(ML, ry + RH3, ML + LEFT_W, ry + RH3);
  const H3_G1 = ML + LEFT_W * 0.14;  // end of GSTIN label cell
  const H3_G2 = ML + LEFT_W * 0.50;  // end of GSTIN value cell (= mid)
  const H3_M1 = ML + LEFT_W * 0.64;  // end of MOB label cell
  doc.line(H3_G1, ry, H3_G1, ry + RH3);
  doc.line(H3_G2, ry, H3_G2, ry + RH3);
  doc.line(H3_M1, ry, H3_M1, ry + RH3);
  const ry3mid = ry + RH3 * 0.72;
  LBL(5.5); doc.text('GSTIN', ML + 1.5, ry3mid);
  VAL(6);   doc.text(b.consignor_gstin ?? '', H3_G1 + 1.5, ry3mid, { maxWidth: H3_G2 - H3_G1 - 3 });
  LBL(5.5); doc.text('MOB', H3_G2 + 1.5, ry3mid);
  VAL(6);   doc.text(b.consignor_mobile ?? '', H3_M1 + 1.5, ry3mid, { maxWidth: ML + LEFT_W - H3_M1 - 3 });
  ry += RH3;

  // ROW 4: CONSIGNEE
  doc.line(ML, ry + RH4, ML + LEFT_W, ry + RH4);
  LBL(7);  doc.text('CONSIGNEE', ML + 2, ry + RH4 * 0.72);
  VAL(8.5);doc.text(b.consignee_name ?? '', ML + 28, ry + RH4 * 0.72, { maxWidth: LEFT_W - 30 });
  ry += RH4;

  // ROW 5: CONSIGNEE GSTIN | MOB — 4 cells: [LBL|VAL|LBL|VAL]
  const H5_G1 = ML + LEFT_W * 0.14;
  const H5_G2 = ML + LEFT_W * 0.50;
  const H5_M1 = ML + LEFT_W * 0.64;
  doc.line(H5_G1, ry, H5_G1, ry + RH5);
  doc.line(H5_G2, ry, H5_G2, ry + RH5);
  doc.line(H5_M1, ry, H5_M1, ry + RH5);
  const ry5mid = ry + RH5 * 0.72;
  LBL(5.5); doc.text('GSTIN', ML + 1.5, ry5mid);
  VAL(6);   doc.text(b.consignee_gstin ?? '', H5_G1 + 1.5, ry5mid, { maxWidth: H5_G2 - H5_G1 - 3 });
  LBL(5.5); doc.text('MOB', H5_G2 + 1.5, ry5mid);
  VAL(6);   doc.text(b.consignee_mobile ?? '', H5_M1 + 1.5, ry5mid, { maxWidth: ML + LEFT_W - H5_M1 - 3 });

  // ── Right column: DELIVERY AT + DELIVERY TYPE + PAYMENT + PVT MARK ──
  const RX    = ML + LEFT_W + 2;
  const RXW   = RIGHT_W - 3;
  const rtTH  = TABLE_H;
  // Stacked sub-rows inside right column
  const RT1H  = rtTH * 0.45;  // DELIVERY AT (transport) — taller to fit name+GSTIN+MOB
  const RT2H  = rtTH * 0.19;  // DELIVERY TYPE
  const RT3H  = rtTH * 0.18;  // PAYMENT
  const RT4H  = rtTH - RT1H - RT2H - RT3H; // PVT MARK

  let rty = y;
  // DELIVERY AT block
  LBL(6);   doc.text('DELIVERY AT :', RX, rty + 3);
  BLD(6);   doc.text(b.transport_name ?? '', RX, rty + 6.5, { maxWidth: RXW });
  NRM(5);   if (b.transport_gstin)  doc.text(`GSTIN: ${b.transport_gstin}`,  RX, rty + 9.5,  { maxWidth: RXW });
  NRM(5);   if (b.transport_mobile) doc.text(`MOB: ${b.transport_mobile}`,   RX, rty + 11.5, { maxWidth: RXW });
  rty += RT1H;

  doc.setLineWidth(0.2);
  doc.line(ML + LEFT_W, rty, ML + W, rty);
  // DELIVERY TYPE row
  LBL(7); doc.text('DELIVERY TYPE', RX, rty + 2.5);
  BLD(7);   doc.text(b.delivery_type ?? '', RX + RXW, rty + RT2H * 0.72, { align: 'right' });
  rty += RT2H;

  doc.line(ML + LEFT_W, rty, ML + W, rty);
  // PAYMENT row
  LBL(7); doc.text('PAYMENT', RX, rty + 2.5);
  BLD(7);   doc.text(b.payment_mode ?? '', RX + RXW, rty + RT3H * 0.72, { align: 'right' });
  rty += RT3H;

  doc.line(ML + LEFT_W, rty, ML + W, rty);
  // PVT MARK row
  LBL(7); doc.text('PVT MARK', RX, rty + 2.5);
  BLD(7);   doc.text(b.pvt_marks ?? '', RX + RXW, rty + RT4H * 0.72, { align: 'right' });

  y += TABLE_H + 1.5;

  // ── INVOICE + FREIGHT SECTION ──────────────────────────────────────────
  // Invoice wider (74%) for more EWB space; freight narrower (26%)
  const INV_W     = W * 0.74;
  const FRT_W     = W - INV_W;
  const SEC_HDR_H = 6;

  // Save section start Y — freight container rect drawn after notice to span full height
  const invFrtY = y;

  doc.setDrawColor(0,0,0); doc.setLineWidth(0.3);
  doc.rect(ML, y, INV_W, SEC_HDR_H, 'S');
  BLD(7.5); doc.text('INVOICE DETAILS', ML + INV_W / 2, y + 4.2, { align: 'center' });
  BLD(7.5); doc.text('FREIGHT DETAILS', ML + INV_W + FRT_W / 2, y + 4.2, { align: 'center' });

  y += SEC_HDR_H;

  // Freight rows — taller rows, larger font
  const freightRows: [string, string | number][] = [
    ['NO. OF PCKG', b.no_of_pkg       ?? ''],
    ['CHRG WT',     b.weight != null  ? `${b.weight} KG`  : ''],
    ['FREIGHT',     b.freight_amount  ?? ''],
    ['LABOUR',      b.labour_charge   ?? ''],
    ['BILTY CHRG',  b.bill_charge     ?? ''],
    ['LOCAL CHRG',  b.local_charge    ?? ''],
    ['OTHER CHRG',  b.other_charge    ?? ''],
    ['TOTAL',       b.total_amount    ?? ''],
    ['PAID',        b.payment_mode === 'PAID' ? `${R} ${b.total_amount ?? ''}` : ''],
  ];

  const FRT_ROW_H   = 4.5;
  const frtSectionH = freightRows.length * FRT_ROW_H;
  const NOTICE_H    = 17;

  const FRT_DIV_X = ML + INV_W + FRT_W * 0.58; // vertical divider between label and value
  freightRows.forEach(([lbl, val], fi) => {
    const rowY  = y + fi * FRT_ROW_H;
    const isBig = lbl === 'TOTAL' || lbl === 'PAID';
    doc.setDrawColor(0,0,0); doc.setLineWidth(0.2);
    doc.rect(ML + INV_W, rowY, FRT_W, FRT_ROW_H, 'S');
    doc.line(FRT_DIV_X, rowY, FRT_DIV_X, rowY + FRT_ROW_H);
    LBL(isBig ? 6.5 : 5.5); doc.text(lbl, ML + INV_W + 1.5, rowY + FRT_ROW_H * 0.72);
    VAL(isBig ? 8 : 7); doc.text(String(val ?? ''), ML + INV_W + FRT_W - 1.5, rowY + FRT_ROW_H * 0.72, { align: 'right' });
  });

  // Invoice rows
  const ewb0      = b.e_way_bills?.[0] ?? b.e_way_bill;
  const INV_ROW_H = 6.5;

  const ic1 = ML + INV_W * 0.24;
  const ic2 = ML + INV_W * 0.45;
  const ic3 = ML + INV_W * 0.57;
  const ic4 = ML + INV_W * 0.78;
  const ic5 = ML + INV_W * 0.89;

  // Row 1: INVOICE DATE | INV NO | CONTENT
  const row1Y = y;
  doc.setDrawColor(0,0,0); doc.setLineWidth(0.2);
  doc.rect(ML, row1Y, INV_W, INV_ROW_H, 'S');
  [ic1, ic2, ic3, ic4, ic5].forEach(cx => doc.line(cx, row1Y, cx, row1Y + INV_ROW_H));
  const mid1 = row1Y + INV_ROW_H * 0.70;
  LBL(6);   doc.text('INVOICE DATE', ML + 1.5, mid1);
  VAL(6.5); doc.text(b.invoice_date ?? '', ic1 + 1, mid1, { maxWidth: ic2 - ic1 - 2 });
  LBL(6);   doc.text('INV NO',  ic2 + 1, mid1);
  VAL(6.5); doc.text(b.invoice_no ?? '', ic3 + 1, mid1, { maxWidth: ic4 - ic3 - 2 });
  LBL(6);   doc.text('CONTENT', ic4 + 1, mid1);
  VAL(6.5); doc.text(b.contain ?? '', ML + INV_W - 1.5, mid1, { align: 'right', maxWidth: ML + INV_W - ic5 - 2 });

  // Row 2: VALUE | EWB (wide — all EWB numbers) | ACT WT
  const ewbNos    = (b.e_way_bills ?? []).map(e => e.ewb_no ?? '').filter(s => s.length > 0);
  if (!ewbNos.length && ewb0?.ewb_no) ewbNos.push(ewb0.ewb_no);
  const ewbStr    = ewbNos.join(', ');
  const INV_ROW2_H = 9;
  const row2Y     = row1Y + INV_ROW_H;
  const ic4b      = ML + INV_W * 0.80;
  const ewbLblX   = ic2 + 8.5;
  doc.setDrawColor(0,0,0); doc.setLineWidth(0.2);
  doc.rect(ML, row2Y, INV_W, INV_ROW2_H, 'S');
  [ic1, ic2, ewbLblX, ic4b].forEach(cx => doc.line(cx, row2Y, cx, row2Y + INV_ROW2_H));
  const row2Top   = row2Y + 3.5;
  LBL(6);   doc.text('VALUE',  ML + 1.5, row2Top);
  VAL(6.5); doc.text(b.invoice_value != null ? `${b.invoice_value}/-` : '', ic1 + 1, row2Top, { maxWidth: ic2 - ic1 - 2 });
  LBL(6);   doc.text('EWB', ic2 + 1.5, row2Top);
  VAL(5.5); doc.text(ewbStr, ewbLblX + 1, row2Top, { maxWidth: ic4b - ewbLblX - 2 });
  LBL(6);   doc.text('ACT WT', ic4b + 1, row2Top);
  VAL(6.5); doc.text(
    b.actual_weight != null ? `${b.actual_weight} KG` : (b.weight != null ? `${b.weight} KG` : ''),
    ML + INV_W - 1.5, row2Top, { align: 'right', maxWidth: ML + INV_W - ic4b - 2 }
  );

  // Daily Parcel Service
  const invRowsH = INV_ROW_H + INV_ROW2_H;
  const parcelY  = y + invRowsH;
  const parcelH  = frtSectionH - invRowsH;
  if (parcelH > 3) {
    const svc = meta.PARCEL_SERVICE ??
      'KANPUR | LUCKNOW | ALLAHABAD | VARANASI | GORAKHPUR | AZAMGARH | JAUNPUR | BASTI | BALLIA | DEORIA | PRATAPGARH | PHOOLPUR | ALIGARH | BARABANKI | FAIZABAD | SIDHARTH NAGAR | MUBARAKPUR | TAMKUI ROAD | MIRZAPUR | SALEEMBAZAR | HATA | GONDA | BEHRAICH | PANIPAT | PUNJAB | AMRITSAR | JALANDHAR | MALERKOTLA | PHAGWARA | FARIDABAD | AND MORE...';
    doc.setDrawColor(0,0,0); doc.setLineWidth(0.2);
    doc.rect(ML, parcelY, INV_W, parcelH, 'S');
    BLD(8); doc.text('DAILY PARCEL SERVICE :', ML + INV_W / 2, parcelY + 4, { align: 'center' });
    NRM(7); doc.text(svc, ML + 2, parcelY + 8.5, { maxWidth: INV_W - 4 });
  }

  y += frtSectionH + 1.5;

  // ── NOTICE ────────────────────────────────────────────────────────────
  const notices = [
    "1. The consignment will not be detained, diverted, re-routed, or re-booked without the consignee bank's written permission and will be delivered at the destination.",
    "2. By booking this consignment, the customer agrees to the terms & condition printed on this GR & to pay freight & all the applicable charges as mentioned herein.",
    '3. All goods are carried strictly on "Said To Contain" basis',
  ];
  doc.setDrawColor(0,0,0); doc.setLineWidth(0.3);
  doc.rect(ML, y, INV_W, NOTICE_H, 'S');
  BLD(7); doc.text('NOTICE', ML + INV_W / 2, y + 5, { align: 'center' });
  NRM(6); notices.forEach((n, ni) => doc.text(n, ML + 2, y + 9 + ni * 3.5, { maxWidth: INV_W - 4 }));

  // ONE big freight container rect: header(6) + rows(frtSectionH) + gap(1.5) + notice(NOTICE_H)
  // Drawn last so its outer border overlays row borders cleanly
  const totalFrtH = SEC_HDR_H + frtSectionH + 1.5 + NOTICE_H;
  doc.setDrawColor(0,0,0); doc.setLineWidth(0.3);
  doc.rect(ML + INV_W, invFrtY, FRT_W, totalFrtH, 'S');

  y += NOTICE_H + 1;

  // ── FOOTER ─────────────────────────────────────────────────────────────
  doc.setDrawColor(0,0,0); doc.setLineWidth(0.3);
  doc.rect(ML, y, W, 11, 'S');
  BLD(6.5); if (meta.COMPANY_WEBSITE) doc.text(`Website : ${meta.COMPANY_WEBSITE}`, ML + 2, y + 4);
  NRM(6.5); if (meta.CUSTOMER_CARE)   doc.text(`Customer Care : ${meta.CUSTOMER_CARE}`, ML + 2, y + 8.5);
  BLD(6.5); doc.text("AT OWNER'S RISK INSURANCE", ML + W / 2, y + 6.5, { align: 'center' });
  BLD(7);   doc.text(meta.COMPANY_NAME ?? 'RGT Logistics Company', ML + W, y + 4, { align: 'right' });
  NRM(6.5); doc.text('Auth. Signatory', ML + W, y + 9, { align: 'right' });
  y += 12;

  return y;
}

/** Generate two-copy A4 (Consignor Copy + Driver Copy) — async due to QR code generation */
export async function generateThirdA4(b: BiltyData, tpl: PrimaryTemplate): Promise<string> {
  const meta: Record<string, string> = {};
  if (tpl.metadata) {
    Object.entries(tpl.metadata).forEach(([k, v]) => { meta[k] = String(v ?? ''); });
  }

  // Generate scannable QR code for the GR number
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(b.gr_no ?? 'N/A', { margin: 1, width: 80 });
  } catch (_) {
    // QR box will stay blank if generation fails
  }

  // Load RGT logo from public folder
  let logoDataUrl = '';
  try {
    const resp = await fetch('/logo-assets/RGT.png');
    const blob = await resp.blob();
    logoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    logoDataUrl = await toGrayscale(logoDataUrl);
  } catch (_) {
    // logo stays blank if fetch fails
  }

  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W    = doc.internal.pageSize.getWidth();
  const H    = doc.internal.pageSize.getHeight();
  const half = H / 2 - 1;

  await renderCopy(doc, b, meta, 'CONSIGNOR COPY', 4, W, qrDataUrl, logoDataUrl);

  // Dashed cut line between copies
  doc.setDrawColor(0, 0, 0);
  doc.setLineDashPattern([2, 1.5], 0);
  doc.line(8, half, W - 8, half);
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(0, 0, 0);
  doc.text('✂  CUT HERE', W / 2, half - 0.5, { align: 'center' });

  await renderCopy(doc, b, meta, 'DRIVER COPY', half + 3, W, qrDataUrl, logoDataUrl);

  return doc.output('bloburl') as unknown as string;
}
