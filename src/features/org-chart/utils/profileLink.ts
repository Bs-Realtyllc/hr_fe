import { canAccessRoute } from '@/lib/permissions';
import type { AuthUser } from '@/types';

/**
 * Where "View full profile" goes for this viewer, or null to hide it.
 * Your own card → /profile. Anyone else → their employee page, but only for
 * roles allowed on /employees; other roles just see the org-chart panel.
 */
export function profileHrefFor(
  viewer: Pick<AuthUser, 'id' | 'role'> | null,
  employeeId: number,
): string | null {
  if (!viewer) return null;
  if (employeeId === viewer.id) return '/profile';
  return canAccessRoute(viewer, '/employees') ? `/employees/${employeeId}` : null;
}
