export const API_BASE = 'http://localhost:8000'; // change to https:// in production

const KEYS = {
  TOKEN:   'ms_token',
  REFRESH: 'ms_refresh',
  EXPIRY:  'ms_token_exp', // Unix ms timestamp when access token expires
  USER:    'ms_user',
  PERMS:   'ms_perms',
} as const;

export interface AuthUser {
  id:             string;
  session_id:     string;
  email:          string;
  full_name:      string;
  post_in_office: string;
  company_id:     string;
  branch_id:      string;
}

// ── Write ──────────────────────────────────────────────────────────────────

export function saveAuth(
  token: string,
  refreshToken: string,
  user: AuthUser,
  expiresIn: number, // seconds (backend sends expires_in)
): void {
  localStorage.setItem(KEYS.TOKEN,   token);
  localStorage.setItem(KEYS.REFRESH, refreshToken);
  localStorage.setItem(KEYS.USER,    JSON.stringify(user));
  localStorage.setItem(KEYS.EXPIRY,  String(Date.now() + expiresIn * 1000));
}

export function clearAuth(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

// ── Read ───────────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEYS.TOKEN);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEYS.REFRESH);
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEYS.USER);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

export function tokenExpiresAt(): number {
  const v = localStorage.getItem(KEYS.EXPIRY);
  return v ? parseInt(v, 10) : 0;
}

export function isLoggedIn(): boolean {
  return !!getToken() && !!getUser();
}
