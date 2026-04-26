import { API_BASE, getToken, getUser } from '@/lib/auth';

const CACHE_KEY = 'ms_perms';

/** All permission slugs used across the frontend. */
export const SLUGS = {
  // ─── Staff ───────────────────────────────────────────────
  STAFF_READ:   'staff:read:company',
  STAFF_CREATE: 'staff:create:company',
  STAFF_UPDATE: 'staff:update:company',
  STAFF_DELETE: 'staff:delete:company',

  // ─── Master Data ─────────────────────────────────────────
  MASTER_READ:   'master:read:branch',
  MASTER_CREATE: 'master:create:branch',
  MASTER_UPDATE: 'master:update:branch',
  MASTER_DELETE: 'master:delete:branch',

  // ─── IAM / Permissions ───────────────────────────────────
  IAM_READ:   'iam:read:company',
  IAM_MANAGE: 'iam:manage:company',
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

  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached) as CachedPerms;
    return { slugs: new Set(parsed.slugs), unrestricted: parsed.unrestricted };
  }

  const token = getToken();
  const user  = getUser();
  if (!token || !user) return { slugs: new Set(), unrestricted: true };

  try {
    const res = await fetch(
      `${API_BASE}/v1/iam/grants/user/${user.id}?active_only=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return { slugs: new Set(), unrestricted: true };

    const data = await res.json();
    const grants: { iam_permission?: { slug?: string } }[] = data.grants ?? [];
    const slugsArr = grants
      .map((g) => g.iam_permission?.slug)
      .filter((s): s is string => typeof s === 'string' && s.length > 0);

    // Zero grants → owner / admin mode → no restrictions
    const unrestricted = slugsArr.length === 0;

    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ slugs: slugsArr, unrestricted }));
    return { slugs: new Set(slugsArr), unrestricted };
  } catch {
    return { slugs: new Set(), unrestricted: true };
  }
}

/** Call on logout or when grants change so the next load fetches fresh data. */
export function clearPermissionsCache(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(CACHE_KEY);
  }
}
