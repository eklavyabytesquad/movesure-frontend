import DashboardShell from '@/components/dashboard/DashboardShell';
import EwbDashboard from '@/components/dashboard/ewaybill/EwbDashboard';

export default function EwaybillPage() {
  return (
    <DashboardShell noPadding>
      <EwbDashboard />
    </DashboardShell>
  );
}
