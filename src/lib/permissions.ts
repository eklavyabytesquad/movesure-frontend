import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

const CACHE_KEY = 'ms_perms';

/** All permission slugs used across the frontend. */
export const SLUGS = {
  // ─── Staff ───────────────────────────────────────────────
  STAFF_READ:   'staff:read:company',
  STAFF_CREATE: 'staff:create:company',
  STAFF_UPDATE: 'staff:update:company',
  STAFF_DELETE: 'staff:delete:company',

  // ─── Master Data — Branches ───────────────────────────────
  MASTER_BRANCHES_READ:          'master:read:branches',
  MASTER_BRANCHES_CREATE:        'master:create:branches',
  MASTER_BRANCHES_UPDATE:        'master:update:branches',
  MASTER_BRANCHES_DELETE:        'master:delete:branches',

  // ─── Master Data — States ─────────────────────────────────
  MASTER_STATES_READ:            'master:read:states',
  MASTER_STATES_CREATE:          'master:create:states',
  MASTER_STATES_UPDATE:          'master:update:states',
  MASTER_STATES_DELETE:          'master:delete:states',

  // ─── Master Data — Cities ─────────────────────────────────
  MASTER_CITIES_READ:            'master:read:cities',
  MASTER_CITIES_CREATE:          'master:create:cities',
  MASTER_CITIES_UPDATE:          'master:update:cities',
  MASTER_CITIES_DELETE:          'master:delete:cities',

  // ─── Master Data — Transports ─────────────────────────────
  MASTER_TRANSPORTS_READ:        'master:read:transports',
  MASTER_TRANSPORTS_CREATE:      'master:create:transports',
  MASTER_TRANSPORTS_UPDATE:      'master:update:transports',
  MASTER_TRANSPORTS_DELETE:      'master:delete:transports',

  // ─── Master Data — City-Transports ────────────────────────
  MASTER_CITY_TRANSPORTS_READ:   'master:read:city-transports',
  MASTER_CITY_TRANSPORTS_CREATE: 'master:create:city-transports',
  MASTER_CITY_TRANSPORTS_UPDATE: 'master:update:city-transports',
  MASTER_CITY_TRANSPORTS_DELETE: 'master:delete:city-transports',

  // ─── Settings ────────────────────────────────────────────
  SETTINGS_ACCESS: 'settings:access:company',

  // ─── IAM / Permissions ───────────────────────────────────
  IAM_READ:   'iam:read:company',
  IAM_MANAGE: 'iam:manage:company',

  // ─── Bilty ───────────────────────────────────────────────
  BILTY_READ:   'bilty:read:company',
  BILTY_CREATE: 'bilty:create:company',
  BILTY_UPDATE: 'bilty:update:company',
  BILTY_DELETE: 'bilty:delete:company',

  // ─── Bilty Settings — Books ──────────────────────────────
  BILTY_BOOKS_READ:   'bilty-setting:read:books',
  BILTY_BOOKS_CREATE: 'bilty-setting:create:books',
  BILTY_BOOKS_UPDATE: 'bilty-setting:update:books',
  BILTY_BOOKS_DELETE: 'bilty-setting:delete:books',

  // ─── Bilty Settings — Consignors ─────────────────────────
  BILTY_CONSIGNORS_READ:   'bilty-setting:read:consignors',
  BILTY_CONSIGNORS_CREATE: 'bilty-setting:create:consignors',
  BILTY_CONSIGNORS_UPDATE: 'bilty-setting:update:consignors',
  BILTY_CONSIGNORS_DELETE: 'bilty-setting:delete:consignors',

  // ─── Bilty Settings — Consignees ─────────────────────────
  BILTY_CONSIGNEES_READ:   'bilty-setting:read:consignees',
  BILTY_CONSIGNEES_CREATE: 'bilty-setting:create:consignees',
  BILTY_CONSIGNEES_UPDATE: 'bilty-setting:update:consignees',
  BILTY_CONSIGNEES_DELETE: 'bilty-setting:delete:consignees',

  // ─── Bilty Settings — Rates ──────────────────────────────
  BILTY_RATES_READ:   'bilty-setting:read:rates',
  BILTY_RATES_CREATE: 'bilty-setting:create:rates',
  BILTY_RATES_UPDATE: 'bilty-setting:update:rates',
  BILTY_RATES_DELETE: 'bilty-setting:delete:rates',

  // ─── Bilty Settings — Templates ──────────────────────────
  BILTY_TEMPLATES_READ:   'bilty-setting:read:templates',
  BILTY_TEMPLATES_CREATE: 'bilty-setting:create:templates',
  BILTY_TEMPLATES_UPDATE: 'bilty-setting:update:templates',
  BILTY_TEMPLATES_DELETE: 'bilty-setting:delete:templates',

  // ─── Bilty Settings — Discounts ──────────────────────────
  BILTY_DISCOUNTS_READ:   'bilty-setting:read:discounts',
  BILTY_DISCOUNTS_CREATE: 'bilty-setting:create:discounts',
  BILTY_DISCOUNTS_UPDATE: 'bilty-setting:update:discounts',
  BILTY_DISCOUNTS_DELETE: 'bilty-setting:delete:discounts',

  // ─── Challan ─────────────────────────────────────────────
  CHALLAN_READ:   'challan:read:company',
  CHALLAN_CREATE: 'challan:create:company',
  CHALLAN_UPDATE: 'challan:update:company',
  CHALLAN_DELETE: 'challan:delete:company',

  // ─── Challan Books ────────────────────────────────────────
  CHALLAN_BOOKS_READ:   'challan:read:books',
  CHALLAN_BOOKS_CREATE: 'challan:create:books',
  CHALLAN_BOOKS_UPDATE: 'challan:update:books',
  CHALLAN_BOOKS_DELETE: 'challan:delete:books',

  // ─── Challan Templates ────────────────────────────────────
  CHALLAN_TEMPLATES_READ:   'challan:read:templates',
  CHALLAN_TEMPLATES_CREATE: 'challan:create:templates',
  CHALLAN_TEMPLATES_UPDATE: 'challan:update:templates',
  CHALLAN_TEMPLATES_DELETE: 'challan:delete:templates',

  // ─── Challan Trip Sheets ──────────────────────────────────
  CHALLAN_TRIP_SHEETS_READ:   'challan:read:trip-sheets',
  CHALLAN_TRIP_SHEETS_CREATE: 'challan:create:trip-sheets',
  CHALLAN_TRIP_SHEETS_UPDATE: 'challan:update:trip-sheets',

  // ─── Fleet — Vehicles ─────────────────────────────────────
  FLEET_READ:   'fleet:read:company',
  FLEET_CREATE: 'fleet:create:company',
  FLEET_UPDATE: 'fleet:update:company',
  FLEET_DELETE: 'fleet:delete:company',

  // ─── Fleet — Staff ────────────────────────────────────────
  FLEET_STAFF_READ:   'fleet:read:staff',
  FLEET_STAFF_CREATE: 'fleet:create:staff',
  FLEET_STAFF_UPDATE: 'fleet:update:staff',
  FLEET_STAFF_DELETE: 'fleet:delete:staff',
} as const;

export type PermSlug = typeof SLUGS[keyof typeof SLUGS];

interface CachedPerms {
  slugs: string[];
  unrestricted: boolean;
}

export interface PermissionResult {
  slugs: Set<string>;
  /** true when user has 0 grants → owner / super-admin mode → allow everything */
  unrestricted: boolean;
}

/** Load the current user's active permissions.
 *  Result is cached in sessionStorage for the lifetime of the session.
 *  Returns { unrestricted: true } when the API is unreachable or the user has no grants yet.
 */
export async function loadMyPermissions(): Promise<PermissionResult> {
  if (typeof window === 'undefined') return { slugs: new Set(), unrestricted: true };

  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached) as CachedPerms;
    return { slugs: new Set(parsed.slugs), unrestricted: parsed.unrestricted };
  }

  const user = getUser();
  if (!user) return { slugs: new Set(), unrestricted: true };

  try {
    const res = await apiFetch(`/v1/iam/grants/user/${user.id}?active_only=true`);
    if (!res.ok) return { slugs: new Set(), unrestricted: true };

    const data = await res.json();
    const grants: { iam_permission?: { slug?: string } }[] = data.grants ?? [];
    const slugsArr = grants
      .map((g) => g.iam_permission?.slug)
      .filter((s): s is string => typeof s === 'string' && s.length > 0);

    // Zero grants OR super_admin role → owner / admin mode → no restrictions
    const isSuperAdmin = user.post_in_office === 'super_admin';
    const unrestricted = isSuperAdmin || slugsArr.length === 0;

    localStorage.setItem(CACHE_KEY, JSON.stringify({ slugs: slugsArr, unrestricted }));
    return { slugs: new Set(slugsArr), unrestricted };
  } catch {
    return { slugs: new Set(), unrestricted: true };
  }
}

/** Call on logout or when grants change so the next load fetches fresh data. */
export function clearPermissionsCache(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY);
  }
}
