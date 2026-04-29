import DashboardShell from '@/components/dashboard/DashboardShell';
import BiltyPage from '@/components/dashboard/bilty/BiltyPage';

export default function BiltyRoute() {
  return (
    <DashboardShell fullWidth>
      <BiltyPage />
    </DashboardShell>
  );
}
