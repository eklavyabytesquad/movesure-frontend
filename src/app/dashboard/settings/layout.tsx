import DashboardNavbar from '@/components/dashboard/Navbar';
import SettingsSideNavbar from '@/components/dashboard/settings/common/side-navbar';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <DashboardNavbar />
      <div className="flex flex-1 w-full">
        <SettingsSideNavbar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
