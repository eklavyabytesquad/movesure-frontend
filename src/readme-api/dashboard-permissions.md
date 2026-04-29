# Dashboard — URL Routing & Permission System

## Overview

The dashboard uses a **grant-based IAM system**, not a role-based one. Whether a user can see or access a route depends entirely on the permission slugs returned by the backend API for that user — NOT on their `post_in_office` label.

---

## URL Structure

```
/dashboard                          → Main dashboard (no sidebar, no permission guard)
/dashboard/settings                 → Settings root (redirect / welcome)
/dashboard/settings/staff           → Staff list
/dashboard/settings/add-staff       → Add staff
/dashboard/settings/update-staff    → Edit staff
/dashboard/settings/deactivate-staff→ Deactivate staff
/dashboard/settings/branches        → Branches (master data)
/dashboard/settings/states          → States (master data)
/dashboard/settings/cities          → Cities (master data)
/dashboard/settings/transports      → Transports (master data)
/dashboard/settings/city-transports → City-Transport links (master data)
/dashboard/settings/permissions     → IAM Permissions manager
```

---

## How Routing Works

### 1. Layout nesting

```
app/dashboard/settings/layout.tsx
  └── DashboardShell (top navbar + page wrapper)
        └── SettingsSideNavbar  (filtered nav links)
        └── SettingsRouteGuard  (blocks direct URL access)
              └── {page children}
```

Every page under `/dashboard/settings/*` inherits this layout automatically via Next.js nested layouts.

### 2. Auth check (dashboard page)

`app/dashboard/page.tsx` calls `getUser()` on mount. If no user is found in `sessionStorage`, the user is redirected to `/auth/login`.

---

## How Permissions Work — End to End

### Step 1 — Login

`POST /v1/auth/login` → returns `{ access_token, user }`.  
`saveAuth(token, user)` stores both in `sessionStorage` as `ms_token` and `ms_user`.

### Step 2 — First permission load

On any settings page mount, `usePermissions()` calls `loadMyPermissions()` which:

1. Checks `sessionStorage` for a cached result (`ms_perms`).
2. If not cached, calls `GET /v1/iam/grants/user/{user.id}?active_only=true`.
3. Extracts `grant.iam_permission.slug` from every grant.
4. **If `slugs.length === 0` → sets `unrestricted = true`** (owner/admin mode, all actions allowed).
5. Otherwise stores the slug array and `unrestricted = false`.
6. Saves result to both `sessionStorage` and a module-level `_memory` variable (in-page cache).

```
Backend returns 0 grants  →  unrestricted = true  →  sees everything
Backend returns N grants  →  unrestricted = false →  sees only what is in the slug set
```

### Step 3 — Sidebar filtering (`side-navbar.tsx`)

Each nav item has a `requiredSlug`. The sidebar calls `can(slug)`:

```ts
can(slug) = unrestricted || slugs.has(slug)
```

If `can(slug)` is `false`, that nav item is **hidden** from the sidebar entirely.

While permissions are still loading, `canSee` returns `true` for all items (avoids flicker).

### Step 4 — Route guard (`route-guard.tsx`)

`SettingsRouteGuard` matches the current `pathname` against `ROUTE_PERMISSIONS`.  
If a matching rule exists and `can(slug)` is `false`, an **Access Denied** screen is shown even if the user navigates directly to the URL.

```
/dashboard/settings/add-staff    → requires  staff:create:company
/dashboard/settings/update-staff → requires  staff:update:company
/dashboard/settings/list-staff   → requires  staff:read:company
/dashboard/settings/staff        → requires  staff:read:company
/dashboard/settings/deactivate-staff → requires  staff:delete:company
/dashboard/settings/branches     → requires  master:read:branch
/dashboard/settings/states       → requires  master:read:branch
/dashboard/settings/cities       → requires  master:read:branch
/dashboard/settings/transports   → requires  master:read:branch
/dashboard/settings/city-transports → requires  master:read:branch
/dashboard/settings/permissions  → requires  iam:manage:company
```

---

## Permission Slugs Reference

| Slug | What it unlocks |
|---|---|
| `staff:read:company`   | View staff list, staff detail |
| `staff:create:company` | Add new staff |
| `staff:update:company` | Edit existing staff |
| `staff:delete:company` | Deactivate staff |
| `master:read:branch`   | View branches, states, cities, transports, city-transports |
| `master:create:branch` | Create master data entries |
| `master:update:branch` | Edit master data entries |
| `master:delete:branch` | Delete master data entries |
| `iam:read:company`     | View IAM grants (read-only) |
| `iam:manage:company`   | Manage IAM permissions & grants |

---

## ⚠️ Known Bug — `super_admin` User Cannot See All Options

### Root Cause

The frontend permission system is **purely grant-count based**. The `post_in_office` field (e.g. `"super_admin"`) is stored in the user object and is used only for **display** (navbar, dashboard greeting). It is **never checked** during permission evaluation.

The only way a user gets `unrestricted = true` is if the backend returns **zero grants** for that user ID.

```
// src/lib/permissions.ts
const unrestricted = slugsArr.length === 0;   // ← only trigger for unrestricted mode
```

### When does this break?

If someone uses the IAM Permissions page to assign even a **single explicit grant** to the `super_admin` user, then:
- `slugsArr.length` becomes `1` (or more)
- `unrestricted` becomes `false`
- The sidebar now **only shows items covered by that one slug**
- All other nav items disappear, and direct URL access shows "Access Denied"

The super_admin user loses visibility to everything they were not explicitly granted.

### Fix

In `src/lib/permissions.ts`, inside `loadMyPermissions()`, add a check for `post_in_office === 'super_admin'` **before** using the grant count to decide `unrestricted`:

```ts
// After fetching grants, before setting unrestricted:
const isSuperAdmin = user.post_in_office === 'super_admin';
const unrestricted = isSuperAdmin || slugsArr.length === 0;
```

And update `src/hooks/usePermissions.ts` to default-allow during loading only when appropriate:

```ts
// Current (problematic during loading — silently allows everything):
const unrestricted = state?.unrestricted ?? true;

// Better — stays true only for super_admin or genuinely unrestricted users:
// (no change needed here if loadMyPermissions is fixed correctly — the
//  cached value will already be unrestricted=true for super_admin)
```

#### Full fix in `src/lib/permissions.ts`

```ts
// Zero grants → owner / admin mode → no restrictions
// Also: super_admin users are always unrestricted regardless of grants
const isSuperAdmin = user.post_in_office === 'super_admin';
const unrestricted = isSuperAdmin || slugsArr.length === 0;
```

This single line change ensures `super_admin` is always `unrestricted = true`, no matter how many grants have been assigned to them.

---

## Cache Invalidation

The permission result is cached in two layers:

| Cache | Key | Cleared by |
|---|---|---|
| `sessionStorage` | `ms_perms` | `clearPermissionsCache()` or `clearAuth()` on logout |
| Module memory | `_memory` (in `usePermissions.ts`) | `invalidatePermissionsCache()` |

After granting or revoking permissions for a user, call `invalidatePermissionsCache()` so the next page load fetches fresh data. The IAM Permissions page component should do this after any grant/revoke action.

---

## Data Flow Diagram

```
User logs in
    │
    ▼
saveAuth(token, user) → sessionStorage: ms_token, ms_user
    │
    ▼
Navigate to /dashboard/settings/*
    │
    ▼
SettingsLayout renders:
  ├─ DashboardShell (top navbar, reads user from sessionStorage for display)
  ├─ SettingsSideNavbar
  │     └─ usePermissions() → loadMyPermissions()
  │           └─ GET /v1/iam/grants/user/{id}?active_only=true
  │                 ├─ 0 grants → unrestricted = true  → show ALL nav items
  │                 └─ N grants → unrestricted = false → show only permitted items
  └─ SettingsRouteGuard
        └─ usePermissions() (same cached result, no second API call)
              ├─ can(slug) = true  → render page
              └─ can(slug) = false → show "Access Denied"
```

---

## Files Reference

| File | Purpose |
|---|---|
| [src/lib/auth.ts](../lib/auth.ts) | Token & user storage helpers |
| [src/lib/permissions.ts](../lib/permissions.ts) | API call to fetch grants, caching, slug constants |
| [src/hooks/usePermissions.ts](../hooks/usePermissions.ts) | React hook wrapping loadMyPermissions |
| [src/components/dashboard/settings/common/route-guard.tsx](../components/dashboard/settings/common/route-guard.tsx) | Blocks direct URL access for unauthorized users |
| [src/components/dashboard/settings/common/side-navbar.tsx](../components/dashboard/settings/common/side-navbar.tsx) | Filters sidebar nav items by permission |
| [src/app/dashboard/settings/layout.tsx](../app/dashboard/settings/layout.tsx) | Composes Shell + Sidebar + RouteGuard for all settings pages |
| [src/lib/ui-config.ts](../lib/ui-config.ts) | Design tokens (colours, spacing, sizing) |
