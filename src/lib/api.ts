import { clearAuth, getToken } from "@/lib/auth";

const BASE = process.env.NEXT_PUBLIC_API_URL;

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof FormData !== "undefined" && options?.body instanceof FormData) {
    delete headers["Content-Type"];
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
  });

  if (res.status === 401) {
    clearAuth();
    window.location.href = "/login";
    return Promise.reject(new Error("Session expired"));
  }

  if (!res.ok) {
    // errorHandler.ts sends { error: "<descriptive message>" } on every
    // AppError — surface that instead of a bare status code, so callers
    // that already do `catch (err) { showToast('error', err.message) }`
    // actually show the real validation/authorization reason.
    let message = `API error ${res.status}`;
    try {
      const data = await res.json();
      message = data?.error ?? data?.message ?? message;
    } catch {
      // body wasn't JSON — keep the generic fallback
    }
    throw new Error(message);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => req<T>(path),
  post: <T>(path: string, body: unknown) =>
    req<T>(path, { method: "POST", body: JSON.stringify(body) }),
  postForm: <T>(path: string, body: FormData) =>
    req<T>(path, { method: "POST", body }),
  put: <T>(path: string, body: unknown) =>
    req<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    req<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  patchForm: <T>(path: string, body: FormData) =>
    req<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => req<T>(path, { method: "DELETE" }),
};
