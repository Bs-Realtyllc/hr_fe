'use client';
import { useAuth } from '@/contexts/AuthContext';
import {
  canAccessRoute,
  canApprove,
  isAdmin,
  isPrivileged,
  tracksAttendance,
} from '@/lib/permissions';

/**
 * The signed-in user's permissions, for components.
 *
 *   const { isAdmin, isPrivileged, canApprove } = usePermissions();
 */
export function usePermissions() {
  const { user } = useAuth();
  return {
    isAdmin: isAdmin(user),
    isPrivileged: isPrivileged(user),
    tracksAttendance: tracksAttendance(user),
    canApprove: (ownerId: number | null | undefined) => canApprove(user, ownerId),
    canAccessRoute: (path: string) => canAccessRoute(user, path),
  };
}
