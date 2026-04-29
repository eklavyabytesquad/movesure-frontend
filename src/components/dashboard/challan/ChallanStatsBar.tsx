// Stats bar — single compact row with all key metrics
import { BiltySummary } from './types';

interface Props {
  availBilties: BiltySummary[];
  challanBilties: BiltySummary[];
  selectedCount: number;
}

function Stat({
  label, value, valueClass = 'text-gray-800',
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-2.5 min-w-0">
      <span className={`text-sm font-extrabold leading-tight ${valueClass}`}>{value}</span>
      <span className="text-[10px] font-medium text-gray-400 mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  );
}

function Divider() {
  return <div className="w-px self-stretch bg-gray-100 my-1.5" />;
}

export default function ChallanStatsBar({ availBilties, challanBilties, selectedCount }: Props) {
  const totalWeight = challanBilties.reduce((s, b) => s + (b.weight ?? b.actual_weight ?? 0), 0);
  const totalAmt    = challanBilties.reduce((s, b) => s + (b.total_amount ?? 0), 0);
  const toPayAmt    = challanBilties.filter(b => b.payment_mode === 'TO_PAY').reduce((s, b) => s + (b.total_amount ?? 0), 0);
  const paidAmt     = challanBilties.filter(b => b.payment_mode === 'PAID').reduce((s, b) => s + (b.total_amount ?? 0), 0);
  const totalPkgs   = challanBilties.reduce((s, b) => s + (b.no_of_pkg ?? 0), 0);

  const fmtRs = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const fmtKg = (n: number) =>
    n >= 1000
      ? `${Math.floor(n / 1000)}t ${Math.round(n % 1000)}kg`
      : `${n} kg`;

  return (
    <div className="shrink-0 bg-white border-b border-gray-200 flex items-stretch overflow-x-auto">
      <Stat label="Available"    value={availBilties.length}    valueClass="text-gray-700" />
      <Divider />
      <Stat label="In Transit"   value={challanBilties.length}  valueClass="text-blue-600" />
      <Divider />
      <Stat label="Packages"     value={totalPkgs}              valueClass="text-violet-600" />
      <Divider />
      <Stat label="Weight"       value={fmtKg(totalWeight)}     valueClass="text-orange-500" />
      <Divider />
      <Stat label="Selected"     value={selectedCount}          valueClass={selectedCount > 0 ? 'text-violet-600' : 'text-gray-400'} />
      {/* push amounts to right */}
      <div className="flex-1" />
      <Divider />
      <Stat label="Total Freight" value={fmtRs(totalAmt)}      valueClass="text-green-600" />
      <Divider />
      <Stat label="To-Pay"        value={fmtRs(toPayAmt)}      valueClass="text-amber-600" />
      <Divider />
      <Stat label="Paid"          value={fmtRs(paidAmt)}       valueClass="text-green-600" />
    </div>
  );
}
