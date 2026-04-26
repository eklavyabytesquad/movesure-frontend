# Permission System — Frontend Guide

## How It Works

The IAM (Identity & Access Management) system uses three layers:

```
Permission (definition)  →  Grant (assignment to a user)  →  Frontend guard
    module + action + scope      user_id + permission_id         canDo('slug')
```

### Slug Convention
Every permission gets a **slug** in the format `module:action:scope`:

| Slug | What it allows |
|---|---|
| `staff:read:company`     | View any staff across the company |
| `staff:create:company`   | Add new staff |
| `staff:update:company`   | Edit existing staff |
| `staff:delete:company`   | Deactivate / delete staff |
| `master:read:branch`     | View master data (states, cities, branches, transports) |
| `master:create:branch`   | Create master data entries |
| `master:update:branch`   | Edit master data entries |
| `master:delete:branch`   | Delete master data entries |
| `reports:export:company` | Export reports |
| `billing:read:company`   | View billing / invoices |

---

## API Endpoints

### Permissions Library
| Method | URL | Purpose |
|---|---|---|
| `GET`    | `/v1/iam/permissions`         | List all permission definitions |
| `POST`   | `/v1/iam/permissions`         | Create a new permission |
| `DELETE` | `/v1/iam/permissions/{id}`    | Delete a permission (also removes all grants) |

**POST body:**
```json
{
  "module": "staff",
  "action": "read",
  "scope": "company",
  "slug": "staff:read:company"
}
```

### Grants (assignments to users)
| Method | URL | Purpose |
|---|---|---|
| `GET`    | `/v1/iam/grants/user/{user_id}?active_only=true` | Get all permissions for a user |
| `POST`   | `/v1/iam/grants`              | Grant a permission to a user |
| `DELETE` | `/v1/iam/grants/{grant_id}`   | Revoke a grant |

**POST body:**
```json
{
  "user_id": "abc-123",
  "permission_id": "def-456",
  "reason": "Assigned as branch manager"
}
```

---

## Checking Permissions on a Page

### Step 1 — Load grants at login / session start

Fetch the user's grants once and store the active slugs in state or a context:

```ts
// src/lib/permissions.ts
import { API_BASE, getToken, getUser } from '@/lib/auth';

/** Returns a Set of active permission slugs for the current user. */
export async function loadMyPermissions(): Promise<Set<string>> {
  const token = getToken();
  const user  = getUser();
  if (!token || !user) return new Set();

  const res = await fetch(
    `${API_BASE}/v1/iam/grants/user/${user.id}?active_only=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return new Set();

  const data = await res.json();
  const slugs: string[] = (data.grants ?? [])
    .map((g: { iam_permission?: { slug?: string } }) => g.iam_permission?.slug)
    .filter(Boolean);

  return new Set(slugs);
}
```

### Step 2 — Guard a page

```tsx
'use client';
import { useEffect, useState } from 'react';
import { loadMyPermissions } from '@/lib/permissions';

export default function StaffPage() {
  const [perms, setPerms] = useState<Set<string> | null>(null);

  useEffect(() => {
    loadMyPermissions().then(setPerms);
  }, []);

  if (perms === null) return <div>Loading…</div>;

  const canRead   = perms.has('staff:read:company');
  const canCreate = perms.has('staff:create:company');
  const canUpdate = perms.has('staff:update:company');

  if (!canRead) {
    return (
      <div className="p-8 text-center text-slate-500">
        You do not have permission to view staff members.
      </div>
    );
  }

  return (
    <div>
      {/* Always visible to canRead users */}
      <StaffTable />

      {/* Only shown if the user can create */}
      {canCreate && <AddStaffButton />}

      {/* Edit button conditionally rendered per row */}
      {canUpdate && <EditButton />}
    </div>
  );
}
```

### Step 3 — Disable vs hide

| Approach | When to use |
|---|---|
| **Hide** the button/form | User has no access at all — cleaner UX |
| **Disable** the button | User can see it but needs a higher role to act |
| **Replace** with read-only text | Inline edit forms when user only has `read` |

---

## How the Settings UI Works

### Permission Library tab
- Lists all permission definitions stored in the backend.
- Provides one-click **presets** for common MoveSure slugs — click to bulk-add without filling a form.
- Supports **custom** module/action combinations via a create form.
- Slug is auto-generated as `module:action:scope` but can be overridden.

### Assign to Staff tab
- Left panel: searchable list of all staff members.
- Click a staff member → right panel shows their **current grants** and an **Assign Permission** form.
- **Current grants**: each grant shows module, action, scope badges + a **Revoke** button.
- **Assign form**: dropdown shows only permissions the user does **not** already have (prevents duplicates).
- Optional **Reason** field logged to the grant record for audit purposes.

---

## Recommended Implementation Pattern for Every Page

```ts
// At the top of any protected component:
const canRead   = perms.has(`${MODULE}:read:company`);
const canCreate = perms.has(`${MODULE}:create:company`);
const canUpdate = perms.has(`${MODULE}:update:company`);
const canDelete = perms.has(`${MODULE}:delete:company`);
```

Replace `MODULE` with `staff`, `master`, `reports`, `billing`, etc.

For **branch-scoped** permissions (scope = `branch`), the user can only see/edit records belonging to their own branch:

```ts
const canReadBranch = perms.has('master:read:branch');
// filter API response: records.filter(r => r.branch_id === currentUser.branch_id)
```

---

## Adding a New Module

1. Go to **Settings → Access Control → IAM Permissions**.
2. In **Permission Library**, click **+ New Permission**.
3. Set Module = your new module name, pick actions, set scope.
4. Go to **Assign to Staff** and grant the new permissions to relevant staff.
5. In the frontend page for that module, guard with `perms.has('yourmodule:action:scope')`.

---

## Security Notes

- Always verify permissions **on the server** — the frontend guard is for UX only.
- Never trust client-side checks alone; the backend must also enforce IAM on every endpoint.
- Use `active_only=true` when fetching grants for runtime checks; use `active_only=false` only in the admin permissions panel.
- Grants with `expires_at` in the past are treated as inactive by the backend.
