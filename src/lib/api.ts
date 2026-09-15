import { clearAuth, getToken } from '@/lib/auth';

const BASE = process.env.NEXT_PUBLIC_API_URL;
// export class ApiError extends Error {
//   response: {
//     status: number;
//     data: any;
//   };

//   constructor(status: number, data: any) {
//     super(data?.message ?? data?.error ?? `API error ${status}`);
//     this.response = { status, data };
//   }
// }

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

  if (!res.ok){
    throw new Error(`API error ${res.status}`);
  //   let data: any = null;
  //   try {
  //     data = await res.json();
  //   } catch {
  //     data = { message: res.statusText || `API error ${res.status}` };
  //   }
  //   throw new ApiError(res.status, data);
  }
  return res.json();
}

export const api = {
  get:    <T>(path: string)                  => req<T>(path),
  post:   <T>(path: string, body: unknown)   => req<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)   => req<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)   => req<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)                  => req<T>(path, { method: 'DELETE' }),
};
