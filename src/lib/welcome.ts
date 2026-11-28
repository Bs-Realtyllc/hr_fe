// The post-login /welcome page is shown once per user (backend: employees.welcome_seen_at).
import { api } from '@/lib/api';

/** Where to land after a finished login: /welcome until it has been seen, then the dashboard. */
export async function routeAfterLogin(token?: string): Promise<string> {
  try {
    // Explicit token: right after login the user may not be stored as logged in yet.
    const status = await api.get<{ seen?: boolean }>('/auth/welcome', token ? { token } : undefined);
    return status?.seen ? '/' : '/welcome';
  } catch {
    return '/'; // don't trap people on the welcome page if the check fails
  }
}

export async function markWelcomeSeen(): Promise<void> {
  try {
    await api.post('/auth/welcome/seen');
  } catch {
    /* worst case they see the page once more */
  }
}
