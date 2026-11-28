'use client';
import { useEffect, useState } from 'react';
import { employeesApi } from '@/lib/queries/employees';
import { showToast } from '@/lib/toast';
import type { AuthUser, Employee } from '@/types';
import { UNASSIGNED_DEPARTMENT, groupByDepartment } from '../utils';

/** The team directory: all employees, the search box, the My Team filter, and department grouping. */
export function useEmployeeDirectory(user: AuthUser | null) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [myTeamOnly, setMyTeamOnly] = useState(false);

  useEffect(() => {
    employeesApi
      .list()
      .then(setEmployees)
      .catch(() => {
        showToast("error", "Failed to load employee");
      });
  }, []);

  const searched = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.designation?.toLowerCase().includes(search.toLowerCase()) ||
      e.department?.toLowerCase().includes(search.toLowerCase()),
  );

  const filtered =
    myTeamOnly && user
      ? searched.filter((e) => e.id === user.id || e.manager_id === user.id)
      : searched;

  const sections = groupByDepartment(filtered);
  const departmentCount = new Set(
    filtered.map((e) => e.department?.trim() || UNASSIGNED_DEPARTMENT),
  ).size;

  // Refresh after an add or bulk import (also updates every other page's
  // cached roster); failures keep the current list.
  const reloadEmployees = () => {
    employeesApi
      .refreshList()
      .then(setEmployees)
      .catch(() => { });
  };

  return {
    employees,
    search,
    setSearch,
    myTeamOnly,
    setMyTeamOnly,
    filtered,
    sections,
    departmentCount,
    reloadEmployees,
  };
}

export type EmployeeDirectoryState = ReturnType<typeof useEmployeeDirectory>;
