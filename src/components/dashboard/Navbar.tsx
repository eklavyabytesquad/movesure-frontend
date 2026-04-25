'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getUser, clearAuth, type AuthUser } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export default function DashboardNavbar() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace('/auth/login');
    } else {
      setUser(u);
    }
  }, [router]);

  function handleLogout() {
    clearAuth();
    router.push('/auth/login');
  }

  return (
    <nav className="w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: logo + nav links */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-extrabold text-blue-600 tracking-tight">
              MoveSure
            </Link>
            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-1">
              {navLinks.map((link) => {
                const active =
                  link.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: user info + logout */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-800">{user.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {user.post_in_office.replace(/_/g, ' ')}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="hidden sm:inline-flex px-3 py-1.5 text-sm font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Logout
              </button>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="sm:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
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

      {/* Mobile menu */}
      {menuOpen && user && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {navLinks.map((link) => {
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
                  active ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-gray-100 mt-2">
            <p className="text-sm font-semibold text-gray-800 px-3">{user.full_name}</p>
            <p className="text-xs text-gray-500 px-3 capitalize mb-2">
              {user.post_in_office.replace(/_/g, ' ')}
            </p>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm font-medium text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
