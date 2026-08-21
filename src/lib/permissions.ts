export type Role = 'admin' | 'lead' | 'employee' | 'intern';

export const roleRoutes: Record<Role, string[]> = {
  admin: [
    '/',
    '/employees',
    '/leaves',
    '/overtime',
    '/documents',
    '/resources',
    '/standups',
    '/payroll',
    '/projects',
    '/servers',
    '/calendar',
    '/goals',
    '/performance',
    '/feedback',
    '/culture',
    '/reports',
    '/weekly-reports',
    '/leave-report',
    '/financial-report',
    '/profile',
  ],
  lead: [
    '/',
    '/employees',
    '/leaves',
    '/overtime',
    '/documents',
    '/resources',
    '/standups',
    '/projects',
    '/servers',
    '/calendar',
    '/goals',
    '/performance',
    '/feedback',
    '/culture',
    '/reports',
    '/weekly-reports',
    '/profile',
  ],
  employee: [
    '/',
    '/employees',
    '/leaves',
    '/overtime',
    '/documents',
    '/resources',
    '/standups',
    '/servers',
    '/calendar',
    '/goals',
    '/performance',
    '/feedback',
    '/culture',
    '/reports',
    '/weekly-reports',
    '/profile',
  ],
  intern: [
    '/',
    '/leaves',
    '/documents',
    '/resources',
    '/standups',
    '/calendar',
    '/goals',
    '/feedback',
    '/culture',
    '/profile',
  ],
};

export function isRouteAllowed(role: Role | string | undefined | null, href: string): boolean {
  if (!role) return false;
  const allowed = roleRoutes[role as Role] || roleRoutes['employee'];
  if (!allowed) return false;
  // Exact match or prefix match for sub-routes (e.g. /employees/123 -> /employees)
  return allowed.some(route => href === route || (route !== '/' && href.startsWith(`${route}/`)));
}
