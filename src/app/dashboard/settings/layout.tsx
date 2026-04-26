import DashboardShell from '@/components/dashboard/DashboardShell';
import SettingsSideNavbar from '@/components/dashboard/settings/common/side-navbar';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell sidebar={<SettingsSideNavbar />}>
      {children}
    </DashboardShell>
  );
}
