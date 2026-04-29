'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { uiConfig } from '@/lib/ui-config';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';

const icons = {
  staff: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  deactivate: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  states: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  cities: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  transports: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h10l2-3h1a1 1 0 001-1v-3l-3-3h-3z" />
    </svg>
  ),
  cityTransports: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  permissions: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  branches: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 22V12h6v10" />
    </svg>
  ),
  biltyBook: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  consignor: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  consignee: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  biltyTemplate: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  biltyDiscount: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 7h.01M17 17h.01M7 17L17 7M6.5 6.5h1M16.5 16.5h1" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" />
    </svg>
  ),
  biltyRate: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  challanBook: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  challanTemplate: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  challanTripSheet: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h10l2-3h1a1 1 0 001-1v-3l-3-3h-3z" />
    </svg>
  ),
  challanCreation: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  fleetVehicle: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 9l2-5h14l2 5M3 9h18v6H3V9z" />
    </svg>
  ),
  fleetStaff: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

const settingsNav = [
  {
    label: 'Staff',
    items: [
      { href: '/dashboard/settings/staff',            label: 'Staff Members',    icon: icons.staff,          requiredSlug: SLUGS.STAFF_READ   },
      { href: '/dashboard/settings/deactivate-staff', label: 'Deactivate Staff', icon: icons.deactivate,     requiredSlug: SLUGS.STAFF_DELETE },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { href: '/dashboard/settings/branches',         label: 'Branches',         icon: icons.branches,       requiredSlug: SLUGS.MASTER_BRANCHES_READ          },
      { href: '/dashboard/settings/states',           label: 'States',           icon: icons.states,         requiredSlug: SLUGS.MASTER_STATES_READ             },
      { href: '/dashboard/settings/cities',           label: 'Cities',           icon: icons.cities,         requiredSlug: SLUGS.MASTER_CITIES_READ             },
      { href: '/dashboard/settings/transports',       label: 'Transports',       icon: icons.transports,     requiredSlug: SLUGS.MASTER_TRANSPORTS_READ         },
      { href: '/dashboard/settings/city-transports',  label: 'City Transports',  icon: icons.cityTransports, requiredSlug: SLUGS.MASTER_CITY_TRANSPORTS_READ    },
    ],
  },
  {
    label: 'Access Control',
    items: [
      { href: '/dashboard/settings/permissions', label: 'IAM Permissions', icon: icons.permissions, requiredSlug: SLUGS.IAM_MANAGE },
    ],
  },
  {
    label: 'Bilty',
    items: [
      { href: '/dashboard/settings/bilty/books',      label: 'Bilty Books', icon: icons.biltyBook,      requiredSlug: SLUGS.BILTY_BOOKS_READ      },
      { href: '/dashboard/settings/bilty/consignors', label: 'Consignors',  icon: icons.consignor,     requiredSlug: SLUGS.BILTY_CONSIGNORS_READ  },
      { href: '/dashboard/settings/bilty/consignees', label: 'Consignees',  icon: icons.consignee,     requiredSlug: SLUGS.BILTY_CONSIGNEES_READ  },
      { href: '/dashboard/settings/bilty/rates',      label: 'Bilty Rates', icon: icons.biltyRate,      requiredSlug: SLUGS.BILTY_RATES_READ       },
      { href: '/dashboard/settings/bilty/templates',  label: 'Templates',   icon: icons.biltyTemplate,  requiredSlug: SLUGS.BILTY_TEMPLATES_READ   },
      { href: '/dashboard/settings/bilty/discounts',  label: 'Discounts',   icon: icons.biltyDiscount,  requiredSlug: SLUGS.BILTY_DISCOUNTS_READ   },
    ],
  },
  {
    label: 'Challan',
    items: [
      { href: '/dashboard/settings/challan/books',        label: 'Challan Books',     icon: icons.challanBook,      requiredSlug: SLUGS.CHALLAN_BOOKS_READ       },
      { href: '/dashboard/settings/challan/templates',    label: 'Challan Templates', icon: icons.challanTemplate,  requiredSlug: SLUGS.CHALLAN_TEMPLATES_READ   },
      { href: '/dashboard/settings/challan/trip-sheets',  label: 'Trip Sheets',       icon: icons.challanTripSheet, requiredSlug: SLUGS.CHALLAN_TRIP_SHEETS_READ },
      { href: '/dashboard/settings/challan/creation',     label: 'Challan Creation',  icon: icons.challanCreation,  requiredSlug: SLUGS.CHALLAN_CREATE           },
    ],
  },
  {
    label: 'Fleet',
    items: [
      { href: '/dashboard/settings/fleet/vehicles', label: 'Vehicles',    icon: icons.fleetVehicle, requiredSlug: SLUGS.FLEET_READ       },
      { href: '/dashboard/settings/fleet/staff',    label: 'Fleet Staff', icon: icons.fleetStaff,   requiredSlug: SLUGS.FLEET_STAFF_READ },
    ],
  },
];

export default function SettingsSideNavbar() {
  const pathname = usePathname();
  const { can, loading: permsLoading } = usePermissions();

  // While loading, show all items (no flicker). Once loaded, filter by permission.
  const canSee = (slug: string) => permsLoading || can(slug);

  const visibleNav = settingsNav
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canSee(item.requiredSlug)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className={`${uiConfig.layout.sidebarWidth} shrink-0 ${uiConfig.colors.sidebarBg} ${uiConfig.colors.sidebarBorder} h-full overflow-y-auto flex flex-col`}>
      <div className="px-5 pt-6 pb-4 sticky top-0 bg-white z-10 border-b border-slate-100">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
          Settings
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6">
        {visibleNav.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 ${uiConfig.radius.button} text-[13.5px] font-medium transition-all ${
                        active
                          ? uiConfig.active.sidebarLink
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className={`shrink-0 ${active ? uiConfig.accent.icon : 'text-slate-400'}`}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
