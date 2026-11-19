// Cached reads of the employee roster, shared by every feature that lists
// people (directory, dashboard, goals, feedback, projects, inbox…).
//
// Reads within 30s reuse the cache and simultaneous callers share one
// request. Any write that changes who is on the roster, their role, name or
// designation must call employeesApi.invalidate() so no page keeps showing
// the old list.

import { api } from '@/lib/api';
import { getQueryClient } from '@/providers/getQueryClient';
import type { Employee, EmployeeName } from '@/types';

export const employeeKeys = {
  all: ['employees'] as const,
  /** GET /employees — the full active roster. */
  list: ['employees', 'list'] as const,
  /** GET /employees/names — id, name and role only. */
  names: ['employees', 'names'] as const,
};

// Each caller gets its own array, so sorting or splicing it can't change the
// cached copy other pages read.
const copy = <T>(rows: T[]): T[] => [...rows];

export const employeesApi = {
  /** The full roster. `T` lets a page type only the fields it uses. */
  list: async <T = Employee>(): Promise<T[]> => {
    const rows = await getQueryClient().fetchQuery({
      queryKey: employeeKeys.list,
      queryFn: () => api.get<Employee[]>('/employees'),
    });
    return copy(rows) as unknown as T[];
  },

  /** The lightweight roster used for filters and pickers. */
  names: async <T = EmployeeName>(): Promise<T[]> => {
    const rows = await getQueryClient().fetchQuery({
      queryKey: employeeKeys.names,
      queryFn: () => api.get<EmployeeName[]>('/employees/names'),
    });
    return copy(rows) as unknown as T[];
  },

  /** Mark every cached roster stale after a write; the next read refetches. */
  invalidate: async () => {
    await getQueryClient().invalidateQueries({ queryKey: employeeKeys.all });
  },

  /** Invalidate, then fetch the full roster again (after adding employees). */
  refreshList: async <T = Employee>(): Promise<T[]> => {
    await employeesApi.invalidate();
    return employeesApi.list<T>();
  },
};
