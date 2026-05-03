import DashboardShell from '@/components/dashboard/DashboardShell';
import ManualBiltyPage from '@/components/dashboard/manual/ManualBiltyPage';

export default function ManualPage() {
  return (
    <DashboardShell noPadding>
      <ManualBiltyPage />
    </DashboardShell>
  );
}
