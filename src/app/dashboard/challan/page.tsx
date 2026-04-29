import DashboardShell from '@/components/dashboard/DashboardShell';
import ChallanDashboard from '@/components/dashboard/challan/ChallanDashboard';

export default function ChallanPage() {
  return (
    <DashboardShell noPadding>
      <ChallanDashboard />
    </DashboardShell>
  );
}
