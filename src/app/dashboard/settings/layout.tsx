import DashboardShell from '@/components/dashboard/DashboardShell';
import SettingsSideNavbar from '@/components/dashboard/settings/common/side-navbar';
import SettingsRouteGuard from '@/components/dashboard/settings/common/route-guard';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell sidebar={<SettingsSideNavbar />}>
      <SettingsRouteGuard>
        {children}
      </SettingsRouteGuard>
    </DashboardShell>
  );
}
