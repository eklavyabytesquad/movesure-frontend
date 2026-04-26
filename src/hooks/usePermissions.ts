'use client';

import { useState, useEffect } from 'react';
import { loadMyPermissions, clearPermissionsCache } from '@/lib/permissions';

// Module-level in-memory cache — shared across all components in the same page lifecycle.
// Cleared via invalidatePermissionsCache() on logout or grant changes.
let _memory: { slugs: Set<string>; unrestricted: boolean } | null = null;

export interface UsePermissionsResult {
  /** true while the grants API call is still in flight */
  loading: boolean;
  /** true when user has 0 grants → owner / super-admin (all actions allowed) */
  unrestricted: boolean;
  /** Returns true if the user is allowed to perform this action */
  can: (slug: string) => boolean;
  /** Returns true if the user has ANY of the supplied slugs */
  canAny: (...slugs: string[]) => boolean;
}

export function usePermissions(): UsePermissionsResult {
  const [state, setState] = useState<{ slugs: Set<string>; unrestricted: boolean } | null>(
    _memory ?? null,
  );

  useEffect(() => {
    if (_memory) {
      setState(_memory);
      return;
    }
    loadMyPermissions().then((result) => {
      _memory = result;
      setState(result);
    });
  }, []);

  const loading       = state === null;
  const unrestricted  = state?.unrestricted ?? true;   // default: allow while loading
  const slugs         = state?.slugs ?? new Set<string>();

  return {
    loading,
    unrestricted,
    can:    (slug: string)    => unrestricted || slugs.has(slug),
    canAny: (...ss: string[]) => unrestricted || ss.some((s) => slugs.has(s)),
  };
}

/** Call after granting / revoking permissions so the next hook mount re-fetches. */
export function invalidatePermissionsCache(): void {
  _memory = null;
  clearPermissionsCache();
}
