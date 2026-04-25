export const API_BASE = 'http://localhost:8000';

export interface AuthUser {
  id: string;
  session_id: string;
  email: string;
  full_name: string;
  post_in_office: string;
  company_id: string;
  branch_id: string;
}

export function saveAuth(token: string, user: AuthUser): void {
  sessionStorage.setItem('ms_token', token);
  sessionStorage.setItem('ms_user', JSON.stringify(user));
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('ms_token');
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const u = sessionStorage.getItem('ms_user');
  return u ? (JSON.parse(u) as AuthUser) : null;
}

export function clearAuth(): void {
  sessionStorage.removeItem('ms_token');
  sessionStorage.removeItem('ms_user');
}
