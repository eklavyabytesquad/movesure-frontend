'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const settingsNav = [
  {
    label: 'Staff Management',
    items: [
      { href: '/dashboard/settings/add-staff',        label: 'Add Staff',        icon: '➕' },
      { href: '/dashboard/settings/list-staff',       label: 'View All Staff',   icon: '👥' },
      { href: '/dashboard/settings/update-staff',     label: 'Update Staff',     icon: '✏️' },
      { href: '/dashboard/settings/deactivate-staff', label: 'Deactivate Staff', icon: '🚫' },
    ],
  },
];

export default function SettingsSideNavbar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 min-h-full py-6 px-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-3 mb-3">
        Settings
      </p>
      {settingsNav.map((group) => (
        <div key={group.label} className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}
