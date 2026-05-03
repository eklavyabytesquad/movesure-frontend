function FirstA4Preview() {
  const renderCopy = (startY: number, label: string) => (
    <g key={startY}>
      <rect x="3" y={startY} width="118" height="11" fill="#142864" />
      <rect x="3" y={startY} width="28" height="11" fill="#fff" />
      <text x="5" y={startY + 4.5} fontSize="3.2" fill="#142864" fontFamily="sans-serif" fontWeight="bold">RGT LOGISTICS</text>
      <text x="5" y={startY + 8} fontSize="1.9" fill="#142864" fontFamily="sans-serif">07ABCPC0876F1Z1</text>
      <text x="119" y={startY + 5} fontSize="2.8" fill="#fff" fontFamily="sans-serif" fontWeight="bold" textAnchor="end">GR NO: 10001</text>
      <text x="119" y={startY + 9} fontSize="1.9" fill="#c8d2ff" fontFamily="sans-serif" textAnchor="end">{label}</text>
      <rect x="3" y={startY + 12} width="118" height="5.5" fill="#e6ebff" stroke="#b4bee6" strokeWidth="0.3" />
      <text x="5" y={startY + 16} fontSize="4" fill="#142864" fontFamily="sans-serif" fontWeight="bold">NEW DELHI</text>
      <text x="62" y={startY + 16} fontSize="4" fill="#142864" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">{'→'}</text>
      <text x="119" y={startY + 16} fontSize="4" fill="#142864" fontFamily="sans-serif" fontWeight="bold" textAnchor="end">KANPUR</text>
      <rect x="3" y={startY + 18.5} width="118" height="5.5" fill="#f8f9ff" />
      {['DATE', 'DELIVERY', 'PAYMENT', 'PVT MARK'].map((lbl, i) => (
        <g key={i}>
          {i > 0 && <line x1={3 + i * 29.5} y1={startY + 18.5} x2={3 + i * 29.5} y2={startY + 24} stroke="#d2d2dc" strokeWidth="0.3" />}
          <text x={3 + i * 29.5 + 14.75} y={startY + 21.5} fontSize="1.9" fill="#888" fontFamily="sans-serif" textAnchor="middle">{lbl}</text>
          <text x={3 + i * 29.5 + 14.75} y={startY + 23.5} fontSize="2.6" fill="#222" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">{['10/05/26', 'TO DOOR', 'PAID', 'MUM-001'][i]}</text>
        </g>
      ))}
      {['CONSIGNOR', 'CONSIGNEE', 'DELIVERY AT'].map((h, i) => (
        <g key={i}>
          <rect x={3 + i * 39.5} y={startY + 25} width="38.5" height="4" fill="#142864" />
          <text x={3 + i * 39.5 + 19.25} y={startY + 27.8} fontSize="2.4" fill="#fff" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">{h}</text>
          <rect x={3 + i * 39.5} y={startY + 29} width="38.5" height="12" fill="#fcfcfe" stroke="#c8c8dc" strokeWidth="0.3" />
          <text x={3 + i * 39.5 + 2} y={startY + 32.5} fontSize="2.6" fill="#000" fontFamily="sans-serif" fontWeight="bold">{['ABC Traders Ltd', 'XYZ Corp Pvt Ltd', 'RGT Logistics'][i]}</text>
          <text x={3 + i * 39.5 + 2} y={startY + 36} fontSize="1.9" fill="#666" fontFamily="sans-serif">{['07AAACA0000A1Z1', '07BBBBB0000B1Z2', '07ABCPC0876F1Z1'][i]}</text>
          <text x={3 + i * 39.5 + 2} y={startY + 39.5} fontSize="1.9" fill="#666" fontFamily="sans-serif">{['Mob: 9876543210', 'Mob: 9876543211', 'Ph: 9211350190'][i]}</text>
        </g>
      ))}
      <rect x="3" y={startY + 42} width="72" height="4" fill="#142864" />
      <text x="5" y={startY + 44.8} fontSize="2.4" fill="#fff" fontFamily="sans-serif" fontWeight="bold">INVOICE DETAILS</text>
      <rect x="76" y={startY + 42} width="45" height="4" fill="#142864" />
      <text x="78" y={startY + 44.8} fontSize="2.4" fill="#fff" fontFamily="sans-serif" fontWeight="bold">FREIGHT DETAILS</text>
      {['INV DATE', 'INV NO', 'VALUE', 'EWB NO', 'EWB VALID', 'CONTENT'].map((lbl, i) => (
        <g key={i}>
          <rect x="3" y={startY + 46 + i * 4.5} width="72" height="4.5" fill={i % 2 === 0 ? '#f8faff' : '#fff'} stroke="#d2d4e1" strokeWidth="0.2" />
          <rect x="76" y={startY + 46 + i * 4.5} width="45" height="4.5" fill={i % 2 === 0 ? '#f8faff' : '#fff'} stroke="#d2d4e1" strokeWidth="0.2" />
          <text x="5" y={startY + 46 + i * 4.5 + 3} fontSize="2.1" fill="#5050a0" fontFamily="sans-serif">{lbl}</text>
          <text x="34" y={startY + 46 + i * 4.5 + 3} fontSize="2.4" fill="#000" fontFamily="sans-serif">{['10/05/2026', 'INV-2026-001', '₹50,000', '1234-5678-9012', '15/05/26', 'GARMENTS'][i]}</text>
          <text x="78" y={startY + 46 + i * 4.5 + 3} fontSize="2.1" fill="#505080" fontFamily="sans-serif">{['NO. PKGS', 'CHG WT', 'FREIGHT', 'LABOUR', 'BILTY', 'TOTAL'][i]}</text>
          <text x="119" y={startY + 46 + i * 4.5 + 3} fontSize={i === 5 ? '3' : '2.4'} fill="#000" fontFamily="sans-serif" fontWeight={i === 5 ? 'bold' : 'normal'} textAnchor="end">{['10', '100 KG', '₹2,500', '₹200', '₹50', '₹2,750'][i]}</text>
        </g>
      ))}
      <rect x="3" y={startY + 73.5} width="118" height="6" fill="#f5f5fc" stroke="#c8c8c8" strokeWidth="0.2" />
      <text x="5" y={startY + 77} fontSize="1.7" fill="#888" fontFamily="sans-serif" fontStyle="italic">Consignment will not be detained without consignee&apos;s written permission.</text>
      <text x="119" y={startY + 78} fontSize="2.2" fill="#000" fontFamily="sans-serif" fontWeight="bold" textAnchor="end">Auth. Signatory</text>
    </g>
  );
  return (
    <svg viewBox="0 0 124 175" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="124" height="175" fill="#fff" rx="1" />
      {renderCopy(2, 'CONSIGNOR COPY')}
      <line x1="3" y1="91" x2="121" y2="91" stroke="#bbb" strokeWidth="0.5" strokeDasharray="2,1.5" />
      <text x="62" y="90" fontSize="1.7" fill="#bbb" fontFamily="sans-serif" textAnchor="middle">— cut here —</text>
      {renderCopy(94, 'DRIVER COPY')}
    </svg>
  );
}

function SecondA4Preview() {
  const renderCopy = (idx: number) => {
    const startY = idx * 57 + 2;
    const labels = ['ORIGINAL COPY', 'DUPLICATE COPY', 'TRIPLICATE COPY'];
    return (
      <g key={idx}>
        {idx > 0 && <line x1="3" y1={startY - 1} x2="121" y2={startY - 1} stroke="#bbb" strokeWidth="0.4" strokeDasharray="1.5,1.5" />}
        <rect x="3" y={startY} width="118" height="9" fill="#142864" />
        <text x="5" y={startY + 4} fontSize="3" fill="#fff" fontFamily="sans-serif" fontWeight="bold">RGT LOGISTICS</text>
        <text x="5" y={startY + 7.5} fontSize="1.8" fill="#c8d2ff" fontFamily="sans-serif">GSTIN: 07ABCPC0876F1Z1 | Ph: 9211350190</text>
        <text x="119" y={startY + 4} fontSize="2.8" fill="#fff" fontFamily="sans-serif" fontWeight="bold" textAnchor="end">GR: 10001</text>
        <text x="119" y={startY + 7.5} fontSize="1.7" fill="#c8d2ff" fontFamily="sans-serif" textAnchor="end">{labels[idx]}</text>
        <rect x="3" y={startY + 10} width="118" height="5" fill="#e6ebff" stroke="#b4bee6" strokeWidth="0.3" />
        <text x="5" y={startY + 13.8} fontSize="3.5" fill="#142864" fontFamily="sans-serif" fontWeight="bold">NEW DELHI</text>
        <text x="62" y={startY + 13.8} fontSize="3.5" fill="#142864" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">{'→'}</text>
        <text x="119" y={startY + 13.8} fontSize="3.5" fill="#142864" fontFamily="sans-serif" fontWeight="bold" textAnchor="end">KANPUR</text>
        <rect x="3" y={startY + 16} width="118" height="5" fill="#f8f9ff" />
        {['DATE', 'DELIVERY', 'PAYMENT', 'MARK'].map((lbl, i) => (
          <g key={i}>
            {i > 0 && <line x1={3 + i * 29.5} y1={startY + 16} x2={3 + i * 29.5} y2={startY + 21} stroke="#d2d2dc" strokeWidth="0.3" />}
            <text x={3 + i * 29.5 + 14.75} y={startY + 18.5} fontSize="1.7" fill="#888" fontFamily="sans-serif" textAnchor="middle">{lbl}</text>
            <text x={3 + i * 29.5 + 14.75} y={startY + 20.5} fontSize="2.4" fill="#222" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">{['10/05', 'TO DOOR', 'PAID', 'MUM01'][i]}</text>
          </g>
        ))}
        {['CONSIGNOR', 'CONSIGNEE', 'DELIVERY'].map((h, i) => (
          <g key={i}>
            <rect x={3 + i * 39.5} y={startY + 22} width="38.5" height="3.5" fill="#142864" />
            <text x={3 + i * 39.5 + 19.25} y={startY + 24.7} fontSize="2.2" fill="#fff" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">{h}</text>
            <rect x={3 + i * 39.5} y={startY + 25.5} width="38.5" height="10" fill="#fcfcfe" stroke="#c8c8dc" strokeWidth="0.3" />
            <text x={3 + i * 39.5 + 2} y={startY + 29} fontSize="2.4" fill="#000" fontFamily="sans-serif" fontWeight="bold">{['ABC Traders', 'XYZ Corp', 'RGT Logistics'][i]}</text>
            <text x={3 + i * 39.5 + 2} y={startY + 32.5} fontSize="1.7" fill="#666" fontFamily="sans-serif">{['07AAACA0000A', '07BBBBB0000B', '07ABCPC0876F'][i]}</text>
          </g>
        ))}
        <rect x="3" y={startY + 36.5} width="118" height="3.5" fill="#142864" />
        <text x="5" y={startY + 39.2} fontSize="2.2" fill="#fff" fontFamily="sans-serif" fontWeight="bold">INVOICE &amp; FREIGHT DETAILS</text>
        {[0, 1].map(i => (
          <g key={i}>
            <rect x="3" y={startY + 40 + i * 4} width="118" height="4" fill={i % 2 === 0 ? '#f8faff' : '#fff'} stroke="#d2d4e1" strokeWidth="0.2" />
            <text x="5" y={startY + 43 + i * 4} fontSize="1.7" fill="#5050a0" fontFamily="sans-serif">
              {i === 0 ? 'INV: INV-001  VALUE: ₹50,000  EWB: 1234-5678-9012  PKGS: 10  WT: 100KG' : 'FREIGHT: ₹2,500  LABOUR: ₹200  BILTY: ₹50  TOTAL: ₹2,750'}
            </text>
          </g>
        ))}
        <rect x="3" y={startY + 49} width="118" height="5" fill="#f5f5fc" stroke="#c8c8c8" strokeWidth="0.2" />
        <text x="5" y={startY + 52} fontSize="1.5" fill="#888" fontFamily="sans-serif" fontStyle="italic">Consignment will not be detained without consignee&apos;s permission.</text>
        <text x="119" y={startY + 53} fontSize="2" fill="#000" fontFamily="sans-serif" fontWeight="bold" textAnchor="end">Auth. Signatory</text>
      </g>
    );
  };
  return (
    <svg viewBox="0 0 124 175" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="124" height="175" fill="#fff" rx="1" />
      {[0, 1, 2].map(i => renderCopy(i))}
    </svg>
  );
}

function ThirdA4Preview() {
  const renderCopy = (startY: number, label: string) => {
    const ML = 3;
    const W  = 118;
    const LW = W * 0.62; // ~73 — left (invoice) section width
    return (
      <g key={startY}>
        {/* Header */}
        <rect x={ML} y={startY} width={W} height="13" fill="#142864" />
        <rect x={ML} y={startY} width="20" height="13" fill="#fff" />
        {/* Truck icon */}
        <rect x={ML + 1.5} y={startY + 1} width="10" height="7.5" fill="#142864" />
        <line x1={ML + 2.5} y1={startY + 6} x2={ML + 10.5} y2={startY + 6} stroke="#fff" strokeWidth="0.5" />
        <line x1={ML + 2.5} y1={startY + 4.5} x2={ML + 2.5} y2={startY + 6} stroke="#fff" strokeWidth="0.5" />
        <line x1={ML + 2.5} y1={startY + 4.5} x2={ML + 5.5} y2={startY + 4.5} stroke="#fff" strokeWidth="0.5" />
        <line x1={ML + 5.5} y1={startY + 4.5} x2={ML + 7}   y2={startY + 2.8} stroke="#fff" strokeWidth="0.5" />
        <line x1={ML + 7}   y1={startY + 2.8} x2={ML + 10.5} y2={startY + 2.8} stroke="#fff" strokeWidth="0.5" />
        <line x1={ML + 10.5} y1={startY + 2.8} x2={ML + 10.5} y2={startY + 6} stroke="#fff" strokeWidth="0.5" />
        <circle cx={ML + 4} cy={startY + 6.6} r="0.7" stroke="#fff" strokeWidth="0.4" fill="none" />
        <circle cx={ML + 9} cy={startY + 6.6} r="0.7" stroke="#fff" strokeWidth="0.4" fill="none" />
        <text x={ML + 1.5} y={startY + 10.5} fontSize="1.8" fill="#142864" fontFamily="sans-serif" fontWeight="bold">Logistics Co.</text>
        {/* Company name */}
        <text x={ML + 22} y={startY + 4.5} fontSize="4.5" fill="#fff" fontFamily="sans-serif" fontWeight="bold">RGT Logistics Company</text>
        <text x={ML + 22} y={startY + 7}   fontSize="1.7" fill="#b0c0ff" fontFamily="sans-serif">Fleet Owner | Transport | Contractor | Commission Basis</text>
        <text x={ML + 22} y={startY + 9.2} fontSize="1.5" fill="#c8d2ff" fontFamily="sans-serif">GSTIN : 07ABCPC0876F1Z1  |  Email : rgtlogisticscompany@gmail.com</text>
        <text x={ML + 22} y={startY + 11}  fontSize="1.4" fill="#c0ccff" fontFamily="sans-serif">H.O.- D-78, Oil Market, Mangolpuri, Phase-1, New Delhi-110083 | MOB : 9211350179</text>
        <text x={ML + 22} y={startY + 12.5} fontSize="1.4" fill="#c0ccff" fontFamily="sans-serif">B.O.- Vallabh Enclave, Near Shiv Shakti Dharam Kanta, Nagli Poona, Delhi-36</text>
        {/* QR code placeholder */}
        <rect x={ML + W - 11} y={startY + 1} width="9" height="9" fill="#fff" />
        {[0,1,2].map(qi => [0,1,2].map(qj => (
          <rect key={`${qi}-${qj}`} x={ML + W - 10.5 + qi * 2.8} y={startY + 1.5 + qj * 2.8} width="2.2" height="2.2" fill={(qi + qj) % 2 === 0 ? '#000' : '#ddd'} />
        )))}
        <text x={ML + W - 6.5} y={startY + 12.5} fontSize="1.5" fill="#c8d2ff" fontFamily="sans-serif" textAnchor="middle">TRACKER</text>

        {/* Copy label + GR */}
        <text x={ML + W * 0.35} y={startY + 17} fontSize="3.5" fill="#000" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" textDecoration="underline">{label}</text>
        <text x={ML + W - 1}    y={startY + 17} fontSize="2.8" fill="#000" fontFamily="sans-serif" fontWeight="bold" textAnchor="end">GR NO : RGTLC-26-27-A01225</text>

        {/* Party table */}
        <rect x={ML} y={startY + 19} width={W} height="24" fill="none" stroke="#000" strokeWidth="0.3" />
        {/* Vertical divider: left | delivery-at */}
        <line x1={ML + LW} y1={startY + 19} x2={ML + LW} y2={startY + 43} stroke="#000" strokeWidth="0.3" />
        {/* Row 1: FROM / TO / DATE */}
        <rect x={ML} y={startY + 19} width={LW} height="4.5" fill="#edf2ff" />
        <line x1={ML} y1={startY + 23.5} x2={ML + LW} y2={startY + 23.5} stroke="#b0b8d8" strokeWidth="0.2" />
        <text x={ML + 2}         y={startY + 22.8} fontSize="3.5" fill="#142864" fontFamily="sans-serif" fontWeight="bold">DELHI</text>
        <text x={ML + LW * 0.36} y={startY + 22.8} fontSize="2.2" fill="#888" fontFamily="sans-serif" textAnchor="middle">TO</text>
        <text x={ML + LW * 0.44} y={startY + 22.8} fontSize="3.5" fill="#142864" fontFamily="sans-serif" fontWeight="bold">ALIGARH (ALG)</text>
        <line x1={ML + LW * 0.67} y1={startY + 19} x2={ML + LW * 0.67} y2={startY + 23.5} stroke="#b0b8d8" strokeWidth="0.2" />
        <text x={ML + LW * 0.68} y={startY + 20.8} fontSize="1.6" fill="#888" fontFamily="sans-serif">DATE</text>
        <text x={ML + LW * 0.68} y={startY + 23}   fontSize="2.5" fill="#000" fontFamily="sans-serif" fontWeight="bold">01-04-2026</text>
        {/* DELIVERY AT — right column */}
        <text x={ML + LW + 1.5} y={startY + 20.5} fontSize="1.8" fill="#444" fontFamily="sans-serif" fontWeight="bold">DELIVERY AT :</text>
        <text x={ML + LW + 1.5} y={startY + 22.8} fontSize="2.2" fill="#000" fontFamily="sans-serif" fontWeight="bold">SS TRANSPORT CORP</text>
        <text x={ML + LW + 1.5} y={startY + 25}   fontSize="1.5" fill="#666" fontFamily="sans-serif">GSTIN : 09COVPS5556J1ZT</text>
        <text x={ML + LW + 1.5} y={startY + 27}   fontSize="1.5" fill="#666" fontFamily="sans-serif">MOB : 9690293140,8077834769</text>
        <text x={ML + LW + 1.5} y={startY + 29}   fontSize="1.5" fill="#666" fontFamily="sans-serif">ADDR : DUBE PARAO, ALIGARH</text>
        {/* CONSIGNOR row */}
        <line x1={ML} y1={startY + 27.5} x2={ML + LW} y2={startY + 27.5} stroke="#b0b8d8" strokeWidth="0.2" />
        <text x={ML + 1.5} y={startY + 26.8} fontSize="2" fill="#000" fontFamily="sans-serif" fontWeight="bold">CONSIGNOR</text>
        <text x={ML + 18}  y={startY + 26.8} fontSize="2.5" fill="#000" fontFamily="sans-serif" fontWeight="bold">SHIVANI TRADING CO.</text>
        {/* CONSIGNOR GSTIN row */}
        <line x1={ML} y1={startY + 30.5} x2={ML + LW} y2={startY + 30.5} stroke="#b0b8d8" strokeWidth="0.2" />
        <text x={ML + 1.5} y={startY + 29.8} fontSize="1.8" fill="#888" fontFamily="sans-serif">GSTIN</text>
        <text x={ML + 8}   y={startY + 29.8} fontSize="1.9" fill="#000" fontFamily="sans-serif">09AMAP8867C1Z2</text>
        <line x1={ML + LW * 0.44} y1={startY + 27.5} x2={ML + LW * 0.44} y2={startY + 30.5} stroke="#b0b8d8" strokeWidth="0.2" />
        <text x={ML + LW * 0.45}  y={startY + 29.8} fontSize="1.8" fill="#888" fontFamily="sans-serif">MOB</text>
        <text x={ML + LW * 0.5}   y={startY + 29.8} fontSize="1.9" fill="#000" fontFamily="sans-serif">9415225654</text>
        <line x1={ML + LW * 0.63} y1={startY + 27.5} x2={ML + LW * 0.63} y2={startY + 30.5} stroke="#b0b8d8" strokeWidth="0.2" />
        <text x={ML + LW * 0.64}  y={startY + 28.5} fontSize="1.5" fill="#888" fontFamily="sans-serif">DELIVERY TYPE</text>
        <text x={ML + LW * 0.64}  y={startY + 30.3} fontSize="2.2" fill="#000" fontFamily="sans-serif" fontWeight="bold">GODOWN</text>
        {/* CONSIGNEE row */}
        <line x1={ML} y1={startY + 33.5} x2={ML + LW} y2={startY + 33.5} stroke="#b0b8d8" strokeWidth="0.2" />
        <text x={ML + 1.5} y={startY + 32.8} fontSize="2" fill="#000" fontFamily="sans-serif" fontWeight="bold">CONSIGNEE</text>
        <text x={ML + 18}  y={startY + 32.8} fontSize="2.5" fill="#000" fontFamily="sans-serif" fontWeight="bold">NEW J.K CYCLE STORE</text>
        {/* CONSIGNEE GSTIN row */}
        <line x1={ML} y1={startY + 36.5} x2={ML + LW} y2={startY + 36.5} stroke="#b0b8d8" strokeWidth="0.2" />
        <text x={ML + 1.5} y={startY + 35.8} fontSize="1.8" fill="#888" fontFamily="sans-serif">GSTIN</text>
        <text x={ML + 8}   y={startY + 35.8} fontSize="1.9" fill="#000" fontFamily="sans-serif">09AMAP8867C1Z4</text>
        <line x1={ML + LW * 0.44} y1={startY + 33.5} x2={ML + LW * 0.44} y2={startY + 36.5} stroke="#b0b8d8" strokeWidth="0.2" />
        <text x={ML + LW * 0.45}  y={startY + 35.8} fontSize="1.8" fill="#888" fontFamily="sans-serif">MOB</text>
        <text x={ML + LW * 0.5}   y={startY + 35.8} fontSize="1.9" fill="#000" fontFamily="sans-serif">9415225654</text>
        <line x1={ML + LW * 0.63} y1={startY + 33.5} x2={ML + LW * 0.63} y2={startY + 43} stroke="#b0b8d8" strokeWidth="0.2" />
        <text x={ML + LW * 0.64}  y={startY + 35}   fontSize="1.5" fill="#888" fontFamily="sans-serif">PAYMENT</text>
        <text x={ML + LW * 0.64}  y={startY + 37}   fontSize="2.5" fill="#000" fontFamily="sans-serif" fontWeight="bold">PAID</text>
        {/* PVT MARK */}
        <line x1={ML} y1={startY + 39.5} x2={ML + LW * 0.63} y2={startY + 39.5} stroke="#b0b8d8" strokeWidth="0.2" />
        <text x={ML + 1.5} y={startY + 42} fontSize="1.8" fill="#888" fontFamily="sans-serif">PVT MARK</text>
        <text x={ML + 18}  y={startY + 42} fontSize="2.5" fill="#000" fontFamily="sans-serif" fontWeight="bold">NJK/12</text>
        <text x={ML + LW * 0.64} y={startY + 42} fontSize="2" fill="#000" fontFamily="sans-serif" fontWeight="bold">NJK/12</text>

        {/* Invoice + Freight headers */}
        <rect x={ML}        y={startY + 44} width={LW}        height="3" fill="#142864" />
        <rect x={ML + LW + 0.5} y={startY + 44} width={W - LW - 0.5} height="3" fill="#142864" />
        <text x={ML + LW / 2}         y={startY + 46.2} fontSize="2.2" fill="#fff" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">INVOICE DETAILS</text>
        <text x={ML + LW + (W - LW) / 2} y={startY + 46.2} fontSize="2.2" fill="#fff" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">FREIGHT DETAILS</text>

        {/* Invoice row 1 */}
        <rect x={ML} y={startY + 47} width={LW} height="4" fill="#f8faff" stroke="#d2d4e1" strokeWidth="0.15" />
        <text x={ML + 1}  y={startY + 49.8} fontSize="1.7" fill="#505080" fontFamily="sans-serif" fontWeight="bold">INV DATE</text>
        <line x1={ML + 13} y1={startY + 47} x2={ML + 13} y2={startY + 51} stroke="#d2d4e1" strokeWidth="0.15" />
        <text x={ML + 13.5} y={startY + 49.8} fontSize="1.8" fill="#000" fontFamily="sans-serif">31-03-2026</text>
        <line x1={ML + 25} y1={startY + 47} x2={ML + 25} y2={startY + 51} stroke="#d2d4e1" strokeWidth="0.15" />
        <text x={ML + 25.5} y={startY + 49.8} fontSize="1.7" fill="#505080" fontFamily="sans-serif" fontWeight="bold">INV NO</text>
        <line x1={ML + 33} y1={startY + 47} x2={ML + 33} y2={startY + 51} stroke="#d2d4e1" strokeWidth="0.15" />
        <text x={ML + 33.5} y={startY + 49.8} fontSize="1.8" fill="#000" fontFamily="sans-serif">STC-26-012</text>
        <line x1={ML + 46} y1={startY + 47} x2={ML + 46} y2={startY + 51} stroke="#d2d4e1" strokeWidth="0.15" />
        <text x={ML + 46.5} y={startY + 49.8} fontSize="1.7" fill="#505080" fontFamily="sans-serif" fontWeight="bold">CONTENT</text>
        <line x1={ML + 55} y1={startY + 47} x2={ML + 55} y2={startY + 51} stroke="#d2d4e1" strokeWidth="0.15" />
        <text x={ML + 55.5} y={startY + 49.8} fontSize="1.8" fill="#000" fontFamily="sans-serif">CYCLE LOCK</text>
        {/* Invoice row 2 */}
        <rect x={ML} y={startY + 51} width={LW} height="4" fill="#fff" stroke="#d2d4e1" strokeWidth="0.15" />
        <text x={ML + 1}  y={startY + 53.8} fontSize="1.7" fill="#505080" fontFamily="sans-serif" fontWeight="bold">VALUE</text>
        <line x1={ML + 13} y1={startY + 51} x2={ML + 13} y2={startY + 55} stroke="#d2d4e1" strokeWidth="0.15" />
        <text x={ML + 13.5} y={startY + 53.8} fontSize="1.8" fill="#000" fontFamily="sans-serif">360000/-</text>
        <line x1={ML + 25} y1={startY + 51} x2={ML + 25} y2={startY + 55} stroke="#d2d4e1" strokeWidth="0.15" />
        <text x={ML + 25.5} y={startY + 53.8} fontSize="1.7" fill="#505080" fontFamily="sans-serif" fontWeight="bold">EWB</text>
        <line x1={ML + 33} y1={startY + 51} x2={ML + 33} y2={startY + 55} stroke="#d2d4e1" strokeWidth="0.15" />
        <text x={ML + 33.5} y={startY + 53.8} fontSize="1.6" fill="#000" fontFamily="sans-serif">4416-5071-2514</text>
        <line x1={ML + 46} y1={startY + 51} x2={ML + 46} y2={startY + 55} stroke="#d2d4e1" strokeWidth="0.15" />
        <text x={ML + 46.5} y={startY + 53.8} fontSize="1.7" fill="#505080" fontFamily="sans-serif" fontWeight="bold">ACT WT</text>
        <line x1={ML + 55} y1={startY + 51} x2={ML + 55} y2={startY + 55} stroke="#d2d4e1" strokeWidth="0.15" />
        <text x={ML + 55.5} y={startY + 53.8} fontSize="1.8" fill="#000" fontFamily="sans-serif">585 KG</text>
        {/* Daily parcel service (fills invoice section below the 2 rows) */}
        <rect x={ML} y={startY + 55} width={LW} height="12" fill="#fafafa" stroke="#d2d4e1" strokeWidth="0.15" />
        <text x={ML + LW / 2} y={startY + 57.5} fontSize="1.8" fill="#142864" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">DAILY PARCEL SERVICE :</text>
        <text x={ML + LW / 2} y={startY + 59.5} fontSize="1.3" fill="#444" fontFamily="sans-serif" textAnchor="middle">KANPUR | LUCKNOW | ALLAHABAD | VARANASI | GORAKHPUR | AZAMGARH | JAUNPUR</text>
        <text x={ML + LW / 2} y={startY + 61.5} fontSize="1.3" fill="#444" fontFamily="sans-serif" textAnchor="middle">BASTI | BALLIA | DEORIA | PRATAPGARH | PHOOLPUR | ALIGARH | BARABANKI | FAIZABAD</text>
        <text x={ML + LW / 2} y={startY + 63.5} fontSize="1.3" fill="#444" fontFamily="sans-serif" textAnchor="middle">SIDHARTH NAGAR | MUBARAKPUR | MIRZAPUR | GONDA | PANIPAT | PUNJAB | AND MORE...</text>
        {/* Freight rows */}
        {[['NO. OF PCKG','12'],['CHRG WT','600 KG'],['FREIGHT','1800'],['LABOUR','240'],['BILTY CHRG','100'],['LOCAL CHRG','120'],['OTHER CHRG','0'],['TOTAL','2260'],['PAID','₹ 2260']].map(([lbl, val], i) => {
          const ry  = startY + 47 + i * 3;
          const big = lbl === 'TOTAL' || lbl === 'PAID';
          return (
            <g key={i}>
              <rect x={ML + LW + 0.5} y={ry} width={W - LW - 0.5} height="3" fill={i % 2 === 0 ? '#f8faff' : '#fff'} stroke="#d2d4e1" strokeWidth="0.15" />
              <text x={ML + LW + 1.5} y={ry + 2.2} fontSize={big ? '1.9' : '1.6'} fill={big ? '#142864' : '#505080'} fontFamily="sans-serif" fontWeight={big ? 'bold' : 'normal'}>{lbl}</text>
              <text x={ML + W - 1}    y={ry + 2.2} fontSize={big ? '2.2' : '1.8'} fill="#000" fontFamily="sans-serif" fontWeight={big ? 'bold' : 'normal'} textAnchor="end">{val}</text>
            </g>
          );
        })}

        {/* Notice */}
        <rect x={ML} y={startY + 68} width={W} height="9" fill="#fcfcfc" stroke="#ccc" strokeWidth="0.2" />
        <text x={ML + W / 2} y={startY + 70.5} fontSize="2" fill="#000" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">NOTICE</text>
        <text x={ML + 1.5} y={startY + 72.5} fontSize="1.35" fill="#555" fontFamily="sans-serif">1. The consignment will not be detained, diverted, re-routed, or re-booked without the consignee bank&apos;s written permission and will be delivered at the destination.</text>
        <text x={ML + 1.5} y={startY + 74.5} fontSize="1.35" fill="#555" fontFamily="sans-serif">2. By booking this consignment, the customer agrees to the terms &amp; condition printed on this GR &amp; to pay freight &amp; all the applicable charges as mentioned herein.</text>
        <text x={ML + 1.5} y={startY + 76.5} fontSize="1.35" fill="#555" fontFamily="sans-serif">3. All goods are carried strictly on &quot;Said To Contain&quot; basis</text>

        {/* Footer */}
        <rect x={ML} y={startY + 77} width={W} height="6" fill="#f8f8f8" stroke="#ccc" strokeWidth="0.2" />
        <text x={ML + 1.5} y={startY + 79.5} fontSize="1.6" fill="#142864" fontFamily="sans-serif" fontWeight="bold">Website : rgtlogistics.com</text>
        <text x={ML + 1.5} y={startY + 82}   fontSize="1.6" fill="#555" fontFamily="sans-serif">Customer Care : 9211350190</text>
        <text x={ML + W / 2} y={startY + 81}  fontSize="1.7" fill="#000" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">AT OWNER&apos;S RISK INSURANCE</text>
        <text x={ML + W - 1.5} y={startY + 79.5} fontSize="1.9" fill="#000" fontFamily="sans-serif" fontWeight="bold" textAnchor="end">RGT Logistics Company</text>
        <text x={ML + W - 1.5} y={startY + 82}   fontSize="1.6" fill="#555" fontFamily="sans-serif" textAnchor="end">Auth. Signatory</text>
      </g>
    );
  };
  return (
    <svg viewBox="0 0 124 175" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="124" height="175" fill="#fff" rx="1" />
      {renderCopy(2, 'CONSIGNOR COPY')}
      <line x1="3" y1="89" x2="121" y2="89" stroke="#bbb" strokeWidth="0.5" strokeDasharray="2,1.5" />
      <text x="62" y="88.3" fontSize="1.7" fill="#bbb" fontFamily="sans-serif" textAnchor="middle">— cut here —</text>
      {renderCopy(91, 'DRIVER COPY')}
    </svg>
  );
}

function GenericBiltyPreview({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 124 175" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="124" height="175" fill="#f8f9ff" rx="1" />
      <rect x="3" y="3" width="118" height="13" fill="#142864" rx="1" />
      <text x="62" y="9" fontSize="4" fill="#fff" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">{name.slice(0, 16).toUpperCase()}</text>
      <text x="62" y="13.5" fontSize="2.5" fill="#c8d2ff" fontFamily="sans-serif" textAnchor="middle">BILTY TEMPLATE</text>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <g key={i}>
          <rect x="8" y={22 + i * 16} width={45 + (i % 3) * 15} height="6" fill="#e8eaf6" rx="0.5" />
          <rect x={56 + (i % 2) * 5} y={22 + i * 16} width={50 - (i % 3) * 8} height="6" fill="#c5cae9" rx="0.5" />
          <rect x="8" y={30 + i * 16} width={80 + (i % 4) * 8} height="3" fill="#ede7f6" rx="0.5" />
        </g>
      ))}
    </svg>
  );
}

export default function TemplatePreviewSvg({ slug, name }: { slug: string; name: string }) {
  if (slug === 'first-a4-template')  return <FirstA4Preview />;
  if (slug === 'second-a4-template') return <SecondA4Preview />;
  if (slug === 'third-a4-template')  return <ThirdA4Preview />;
  return <GenericBiltyPreview name={name} />;
}
