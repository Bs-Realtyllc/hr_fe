export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'lead' | 'employee' | 'intern';
  designation?: string;
  department?: string;
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('hr_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('hr_token');
}

export function setAuth(token: string, user: AuthUser): void {
  localStorage.setItem('hr_token', token);
  localStorage.setItem('hr_user', JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem('hr_token');
  localStorage.removeItem('hr_user');
}
