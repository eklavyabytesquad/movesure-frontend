import DashboardNavbar from '@/components/dashboard/Navbar';
import { uiConfig } from '@/lib/ui-config';

interface DashboardShellProps {
  /** Main page content */
  children: React.ReactNode;
  /**
   * Optional sidebar rendered to the left of content.
   * When omitted the content is centred with a max-width container.
   */
  sidebar?: React.ReactNode;
}

/**
 * DashboardShell
 *
 * The single layout wrapper for every dashboard page.
 * It consumes `uiConfig` so all spacing, colours and sizing tokens
 * come from one place and can be changed globally at any time.
 *
 * Usage (no sidebar — e.g. main dashboard):
 *   <DashboardShell>{children}</DashboardShell>
 *
 * Usage (with sidebar — e.g. settings):
 *   <DashboardShell sidebar={<MySidebar />}>{children}</DashboardShell>
 */
export default function DashboardShell({ children, sidebar }: DashboardShellProps) {
  const { layout, colors } = uiConfig;

  return (
    <div className={`min-h-screen flex flex-col ${colors.pageBg}`}>
      {/* ── Top navigation bar ── */}
      <DashboardNavbar />

      {/* ── Body: optional sidebar + main content ── */}
      <div className="flex flex-1 w-full">
        {/* Sidebar slot (rendered as-is — each sidebar owns its own styles) */}
        {sidebar}

        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          {sidebar ? (
            /* Sidebar mode: just apply panel padding */
            <div className={layout.panelPadding}>{children}</div>
          ) : (
            /* Full-width mode: centred with max-width + page padding */
            <div
              className={`${layout.contentMaxWidth} mx-auto w-full ${layout.pagePadding} ${layout.pageVerticalPadding}`}
            >
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
