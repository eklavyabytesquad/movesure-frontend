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
  /** Skip max-width constraint — content fills the available panel width */
  fullWidth?: boolean;
  /** Remove all padding and let the child manage its own scroll/overflow */
  noPadding?: boolean;
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
export default function DashboardShell({ children, sidebar, fullWidth, noPadding }: DashboardShellProps) {
  const { layout, colors } = uiConfig;

  return (
    <div className={`h-screen overflow-hidden flex flex-col ${colors.pageBg}`}>
      {/* ── Top navigation bar ── */}
      <DashboardNavbar />

      {/* ── Body: optional sidebar + main content ── */}
      <div className="flex flex-1 w-full min-h-0">
        {/* Sidebar slot (rendered as-is — each sidebar owns its own styles) */}
        {sidebar}

        {/* Main content area */}
        <main className={`flex-1 min-h-0 ${noPadding ? 'overflow-hidden flex flex-col' : 'overflow-auto'}`}>
          {noPadding ? (
            children
          ) : sidebar ? (
            /* Sidebar mode: just apply panel padding */
            <div className={layout.panelPadding}>{children}</div>
          ) : fullWidth ? (
            <div className={`w-full ${layout.pagePadding} ${layout.pageVerticalPadding}`}>
              {children}
            </div>
          ) : (
            /* Centred mode: max-width + page padding */
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
