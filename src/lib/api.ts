import { clearAuth, getToken } from '@/lib/auth';

const BASE = '/api';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
  });

  if (res.status === 401) {
    clearAuth();
    window.location.href = '/login';
    return Promise.reject(new Error('Session expired'));
  }

  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const api = {
  get:    <T>(path: string)                  => req<T>(path),
  post:   <T>(path: string, body: unknown)   => req<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)   => req<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: <T>(path: string)                  => req<T>(path, { method: 'DELETE' }),
};
