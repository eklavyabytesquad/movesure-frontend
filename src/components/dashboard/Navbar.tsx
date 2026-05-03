'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getUser, clearAuth, getRefreshToken, type AuthUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { usePermissions, invalidatePermissionsCache } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';
import { uiConfig } from '@/lib/ui-config';
import { useRouter, usePathname } from 'next/navigation';

const navLinks = [
  { href: '/dashboard',           label: 'Overview'   },
  { href: '/dashboard/bilty',     label: 'Bilty'      },
  { href: '/dashboard/manual',    label: 'Manual'     },
  { href: '/dashboard/challan',   label: 'Challan'    },
  { href: '/dashboard/ewaybill',  label: 'E-Way Bill' },
  { href: '/dashboard/settings',  label: 'Settings'   },
];

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold shrink-0 select-none">
      {initials}
    </div>
  );
}

export default function DashboardNavbar() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { can } = usePermissions();

  // Filter nav links based on permissions (Settings requires settings:access)
  const visibleNavLinks = navLinks.filter((link) => {
    if (link.href === '/dashboard/settings')  return can(SLUGS.SETTINGS_ACCESS);
    if (link.href === '/dashboard/bilty')     return can(SLUGS.BILTY_READ) || can(SLUGS.BILTY_CREATE);
    if (link.href === '/dashboard/manual')    return can(SLUGS.BILTY_READ) || can(SLUGS.BILTY_CREATE);
    if (link.href === '/dashboard/challan')   return can(SLUGS.CHALLAN_READ) || can(SLUGS.CHALLAN_CREATE);
    if (link.href === '/dashboard/ewaybill')  return can(SLUGS.BILTY_READ) || can(SLUGS.CHALLAN_READ);
    return true;
  });

  useEffect(() => {
    const u = getUser();
    if (!u) router.replace('/auth/login');
    else setUser(u);
  }, [router]);

  async function handleLogout() {
    try {
      await apiFetch('/v1/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: getRefreshToken() }),
      });
    } catch {
      // Continue with local logout even if server call fails
    }
    invalidatePermissionsCache();
    clearAuth();
    router.replace('/auth/login');
  }

  return (
    <nav className={`w-full ${uiConfig.colors.navBg} ${uiConfig.colors.navBorder} sticky top-0 z-40`}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between ${uiConfig.layout.headerHeight}`}>

          {/* ── Left: brand + nav ── */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
              <div className={`w-7 h-7 rounded-lg ${uiConfig.brand.iconBg} flex items-center justify-center`}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className={uiConfig.brand.logoClass}>{uiConfig.brand.name}</span>
            </Link>

            <div className="hidden sm:block w-px h-4 bg-slate-200" />

            <div className="hidden sm:flex items-center gap-0.5">
              {visibleNavLinks.map((link) => {
                const active =
                  link.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 ${uiConfig.radius.button} text-sm font-medium transition-colors ${
                      active
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ── Right: user + actions ── */}
          {user && (
            <div className="flex items-center gap-3">
              {/* Desktop */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-800 leading-tight">{user.full_name}</p>
                  <p className="text-xs text-slate-400 capitalize leading-tight mt-0.5">
                    {user.post_in_office.replace(/_/g, ' ')}
                  </p>
                </div>
                <UserAvatar name={user.full_name} />
                <div className="w-px h-5 bg-slate-200" />
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-slate-400 hover:text-red-500 transition-colors"
                >
                  Sign out
                </button>
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="sm:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {menuOpen && user && (
        <div className="sm:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
          {visibleNavLinks.map((link) => {
            const active =
              link.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-3 mt-2 border-t border-slate-100 flex items-center gap-3 px-1">
            <UserAvatar name={user.full_name} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user.full_name}</p>
              <p className="text-xs text-slate-400 capitalize">{user.post_in_office.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm font-medium text-red-500 rounded-lg hover:bg-red-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
