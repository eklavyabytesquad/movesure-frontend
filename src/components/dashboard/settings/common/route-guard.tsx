'use client';

import { usePathname } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { SLUGS } from '@/lib/permissions';

/** Maps every settings route (prefix) to the slug that unlocks it. */
const ROUTE_PERMISSIONS: Array<{ path: string; slug: string; label: string }> = [
  { path: '/dashboard/settings',                  slug: SLUGS.SETTINGS_ACCESS, label: 'Settings'            },
  { path: '/dashboard/settings/add-staff',        slug: SLUGS.STAFF_CREATE,    label: 'Add Staff'           },
  { path: '/dashboard/settings/update-staff',     slug: SLUGS.STAFF_UPDATE,  label: 'Edit Staff'         },
  { path: '/dashboard/settings/list-staff',       slug: SLUGS.STAFF_READ,    label: 'Staff Members'      },
  { path: '/dashboard/settings/staff',            slug: SLUGS.STAFF_READ,    label: 'Staff Members'      },
  { path: '/dashboard/settings/deactivate-staff', slug: SLUGS.STAFF_DELETE,  label: 'Deactivate Staff'   },
  { path: '/dashboard/settings/branches',         slug: SLUGS.MASTER_BRANCHES_READ,          label: 'Branches'           },
  { path: '/dashboard/settings/states',           slug: SLUGS.MASTER_STATES_READ,            label: 'States'             },
  { path: '/dashboard/settings/cities',           slug: SLUGS.MASTER_CITIES_READ,            label: 'Cities'             },
  { path: '/dashboard/settings/transports',       slug: SLUGS.MASTER_TRANSPORTS_READ,        label: 'Transports'         },
  { path: '/dashboard/settings/city-transports',  slug: SLUGS.MASTER_CITY_TRANSPORTS_READ,   label: 'City Transports'    },
  { path: '/dashboard/settings/permissions',      slug: SLUGS.IAM_MANAGE,    label: 'IAM Permissions'    },
  // Integrations
  { path: '/dashboard/settings/ewaybill', slug: SLUGS.SETTINGS_ACCESS, label: 'E-Way Bill Settings' },
  // Bilty Settings
  { path: '/dashboard/settings/bilty/books',        slug: SLUGS.BILTY_BOOKS_READ,      label: 'Bilty Books'      },
  { path: '/dashboard/settings/bilty/consignors',   slug: SLUGS.BILTY_CONSIGNORS_READ, label: 'Consignors'       },
  { path: '/dashboard/settings/bilty/consignees',   slug: SLUGS.BILTY_CONSIGNEES_READ, label: 'Consignees'       },
  { path: '/dashboard/settings/bilty/rates',        slug: SLUGS.BILTY_RATES_READ,      label: 'Bilty Rates'      },
  { path: '/dashboard/settings/bilty/templates',    slug: SLUGS.BILTY_TEMPLATES_READ,  label: 'Templates'        },
  { path: '/dashboard/settings/bilty/discounts',    slug: SLUGS.BILTY_DISCOUNTS_READ,  label: 'Discounts'        },
];

export default function SettingsRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const { loading, can } = usePermissions();

  // Find ALL matching rules (hierarchical: parent path AND specific page must all pass)
  const matches = ROUTE_PERMISSIONS
    .filter((r) => pathname.startsWith(r.path))
    .sort((a, b) => b.path.length - a.path.length);

  // No rules for this path → always allow
  if (matches.length === 0) return <>{children}</>;

  // Still resolving permissions → show neutral skeleton to avoid flicker
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  // ALL matching rules must pass (e.g. settings:access + staff:read)
  const failedMatch = matches.find((m) => !can(m.slug));
  if (failedMatch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        {/* Shield icon */}
        <div className="mb-6 flex items-center justify-center w-20 h-20 rounded-full bg-red-50 border border-red-100">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
        <p className="text-slate-500 max-w-sm mb-1">
          You don&apos;t have permission to view&nbsp;
          <span className="font-semibold text-slate-700">{failedMatch.label}</span>.
        </p>
        <p className="text-sm text-slate-400">
          Contact your administrator to request access.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
