// Role-based permissions — the single place that decides who can see or do
// what in the UI. Components ask a question ("can this user approve?"),
// never compare role strings themselves.
//
// These checks only shape the UI. The backend enforces the real rules on
// every request; keep the two in step when either changes.

import { ROLES, type AuthUser, type Role } from '@/types';

type MaybeUser = Pick<AuthUser, 'id' | 'role'> | null | undefined;

export const ALL_ROLES: readonly Role[] = ROLES;

/** Admin only: company settings, payroll actions, publishing, deleting others' records. */
export function isAdmin(user: MaybeUser): boolean {
  return user?.role === 'admin';
}

/** Admin or lead: sees and manages the whole team's data, not just their own. */
export function isPrivileged(user: MaybeUser): boolean {
  return user?.role === 'admin' || user?.role === 'lead';
}

/**
 * Can approve or reject a request (leave, overtime…) owned by `ownerId`.
 * Admins can approve anything; leads can approve anyone's except their own.
 */
export function canApprove(user: MaybeUser, ownerId: number | null | undefined): boolean {
  if (isAdmin(user)) return true;
  return user?.role === 'lead' && ownerId !== user.id;
}

/** Clocks in and out (and gets the clock widget). Admins don't track their own time. */
export function tracksAttendance(user: MaybeUser): boolean {
  return !!user && user.role !== 'admin';
}

/**
 * Which roles may open each signed-in route. Drives the sidebar; a route
 * missing from this map is open to every signed-in role.
 */
export const ROUTE_ROLES: Record<string, readonly Role[]> = {
  '/': ALL_ROLES,
  // People
  '/employees': ['admin', 'lead', 'intern'],
  '/org-chart': ALL_ROLES,
  '/active': ALL_ROLES,
  '/tracker': ['lead', 'employee', 'intern'], // same rule as tracksAttendance()
  '/onboarding': ['admin', 'lead'],
  '/onboard-form-layout': ['admin', 'lead'],
  '/leaves': ALL_ROLES,
  '/overtime': ALL_ROLES,
  '/documents': ALL_ROLES,
  '/resources': ALL_ROLES,
  '/standups': ALL_ROLES,
  // Finance
  '/payroll': ['admin'],
  // Work
  '/projects': ['admin', 'lead', 'intern'],
  '/servers': ALL_ROLES,
  '/calendar': ALL_ROLES,
  // Growth & culture
  '/goals': ALL_ROLES,
  '/performance': ALL_ROLES,
  '/feedback': ALL_ROLES,
  '/culture': ALL_ROLES,
  '/inbox': ALL_ROLES,
  // Reports
  '/reports': ['admin', 'lead', 'employee'],
  '/weekly-reports': ['admin', 'lead', 'employee'],
  '/leave-report': ['admin'],
  '/financial-report': ['admin'],
  '/performance-report': ALL_ROLES,
  // Account
  '/profile': ALL_ROLES,
};

/** Can this user open `path`? Matches the route's top-level segment (/employees/5 → /employees). */
export function canAccessRoute(user: MaybeUser, path: string): boolean {
  if (!user) return false;
  const base = path === '/' ? '/' : `/${path.split('/')[1]}`;
  const allowed = ROUTE_ROLES[base];
  return !allowed || allowed.includes(user.role);
}
