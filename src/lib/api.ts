import { clearAuth, getToken } from '@/lib/auth';
import { API_URL } from '@/config/env';

/**
 * Thrown for every failed request. `message` is the backend's own
 * `{ error }` / `{ message }` text when it sent one, so callers can show it
 * directly; `status` lets them branch on specific codes (e.g. 403).
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly data: unknown = null,
    /** The backend's own error text, when the response carried one. */
    readonly serverMessage?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The request never reached the server (offline, DNS, CORS). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

/**
 * A user-facing message for any error thrown by `api`: the backend's own
 * text when it sent one, the connection message when offline, otherwise
 * the caller's fallback.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.serverMessage) return err.serverMessage;
    if (err.isNetworkError) return err.message;
  }
  return fallback;
}

export const NETWORK_ERROR_MESSAGE = "Can't reach the server. Check your connection and try again.";

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Plain values are sent as JSON; FormData is sent as multipart. */
  body?: unknown;
  /**
   * Attach the stored token and treat a 401 as an expired session
   * (clear auth + redirect to /login). Default true; `api.public.*` sets false.
   */
  auth?: boolean;
  /** Use this token instead of the stored one; a 401 is then returned, not redirected. */
  token?: string;
  /** Parse the response as JSON (default) or return the raw Blob. */
  responseType?: 'json' | 'blob';
}

/** Paths are relative to API_URL; absolute URLs (e.g. BACKEND_URL/uploads/...) pass through. */
function resolveUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;
}

/** Empty body → null, JSON → parsed, anything else → text. */
async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, token, responseType = 'json', headers, ...init } = options;

  const finalHeaders = new Headers(headers);
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json');
  }
  const bearer = token ?? (auth ? getToken() : null);
  if (bearer) finalHeaders.set('Authorization', `Bearer ${bearer}`);

  let res: Response;
  try {
    res = await fetch(resolveUrl(path), {
      ...init,
      headers: finalHeaders,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
  }

  if (res.status === 401 && auth && token === undefined) {
    clearAuth();
    window.location.href = '/login';
    throw new ApiError('Session expired', 401);
  }

  if (!res.ok) {
    // The backend's errorHandler sends { error: "<descriptive message>" } —
    // surface that instead of a bare status code.
    const data = await readBody(res).catch(() => null);
    const fromBody =
      data && typeof data === 'object'
        ? ((data as { error?: unknown; message?: unknown }).error ??
          (data as { message?: unknown }).message)
        : undefined;
    const serverMessage = typeof fromBody === 'string' && fromBody ? fromBody : undefined;
    throw new ApiError(serverMessage ?? `Request failed (${res.status})`, res.status, data, serverMessage);
  }

  if (responseType === 'blob') return (await res.blob()) as T;
  return (await readBody(res)) as T;
}

type Init = Omit<RequestOptions, 'body' | 'method'>;

function methods(defaults: Pick<RequestOptions, 'auth'>) {
  const call = <T>(method: string, path: string, body?: unknown, init?: Init) =>
    request<T>(path, { ...defaults, ...init, method, body });

  return {
    get: <T>(path: string, init?: Init) => call<T>('GET', path, undefined, init),
    post: <T>(path: string, body?: unknown, init?: Init) => call<T>('POST', path, body, init),
    put: <T>(path: string, body?: unknown, init?: Init) => call<T>('PUT', path, body, init),
    patch: <T>(path: string, body?: unknown, init?: Init) => call<T>('PATCH', path, body, init),
    delete: <T>(path: string, body?: unknown, init?: Init) => call<T>('DELETE', path, body, init),
    /** Explicit multipart helpers, kept for readability at call sites. */
    postForm: <T>(path: string, body: FormData, init?: Init) => call<T>('POST', path, body, init),
    patchForm: <T>(path: string, body: FormData, init?: Init) => call<T>('PATCH', path, body, init),
    /** GET a file as a Blob (report downloads, PDF previews, uploaded images). */
    download: (path: string, init?: Init) =>
      request<Blob>(path, { ...defaults, ...init, method: 'GET', responseType: 'blob' }),
  };
}

/**
 * Authenticated backend client. Every request to the HR backend goes
 * through here — don't call fetch() directly from components.
 *
 *   api.get<Employee[]>('/employees')
 *   api.postForm('/reports', formData)
 *   api.download(`/reports/${id}/download`)
 *   api.public.post('/auth/login', { email, password })   // no token, no 401 redirect
 */
export const api = {
  ...methods({ auth: true }),
  /** No token attached and a 401 is returned to the caller (login, password reset, onboarding). */
  public: methods({ auth: false }),
};

/** Save a Blob to the user's disk with the given file name. */
export function saveBlob(blob: Blob, fileName?: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  if (fileName) a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the browser has started the download first.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
