// src/lib/api.ts
// Central API fetch wrapper — use this instead of raw fetch() in all components.
// Handles token injection, proactive refresh (60s before expiry), 401 retry, and
// redirect to /auth/login on unrecoverable auth failure.

import {
  API_BASE,
  getToken,
  getRefreshToken,
  saveAuth,
  clearAuth,
  getUser,
  tokenExpiresAt,
} from './auth';

// One in-flight refresh at a time — all concurrent callers share the same promise
let _refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('no_refresh_token');

  const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) throw new Error('refresh_failed');

  const data = await res.json();
  const user = getUser()!;
  // Store the new token pair (expiresIn is in seconds)
  saveAuth(data.access_token, data.refresh_token, user, data.expires_in);
  return data.access_token;
}

async function getValidToken(): Promise<string | null> {
  const token = getToken();
  if (!token) return null;

  // Proactively refresh if token expires within the next 60 seconds
  const msLeft = tokenExpiresAt() - Date.now();
  if (msLeft < 60_000) {
    try {
      if (!_refreshPromise) {
        _refreshPromise = doRefresh().finally(() => { _refreshPromise = null; });
      }
      return await _refreshPromise;
    } catch {
      clearAuth();
      return null;
    }
  }

  return token;
}

/**
 * Use this instead of fetch() for every authenticated API call.
 *
 * Usage:
 *   const res = await apiFetch('/v1/challan')
 *   const res = await apiFetch('/v1/challan', { method: 'POST', body: JSON.stringify(data) })
 *
 * - Automatically injects Authorization header
 * - Automatically sets Content-Type: application/json
 * - Proactively refreshes token 60 seconds before expiry
 * - On 401: tries one refresh then retries the original request
 * - On refresh failure: clears auth and redirects to /auth/login
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getValidToken();

  if (!token) {
    window.location.replace('/auth/login');
    throw new Error('unauthenticated');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Token may have just expired server-side (clock drift, forced revoke)
    try {
      if (!_refreshPromise) {
        _refreshPromise = doRefresh().finally(() => { _refreshPromise = null; });
      }
      const newToken = await _refreshPromise;

      // Retry the original request once with the new token
      return fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    } catch {
      clearAuth();
      window.location.replace('/auth/login');
      throw new Error('unauthenticated');
    }
  }

  return res;
}
