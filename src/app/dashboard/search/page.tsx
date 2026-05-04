import DashboardShell from '@/components/dashboard/DashboardShell';
import SearchPage from '@/components/dashboard/search/SearchPage';

export default function Page() {
  return (
    <DashboardShell fullWidth noPadding>
      <SearchPage />
    </DashboardShell>
  );
}
