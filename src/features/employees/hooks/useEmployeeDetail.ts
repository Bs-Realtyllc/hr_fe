'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { showToast } from '@/lib/toast';
import type { Employee } from '@/types';
import type { Project } from '../types';

/** One employee and the projects they're assigned to. */
export function useEmployeeDetail(id: string) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Employee>(`/employees/${id}`),
      api.get<Project[]>(`/projects/by-employee/${id}`).catch(() => []),
    ])
      .then(([emp, proj]) => { setEmployee(emp); setProjects(proj); })
      .catch(() => {showToast('error', 'Failed to load employee data')})
      .finally(() => setLoading(false));
  }, [id]);

  return {
    employee,
    projects,
    loading,
  };
}
