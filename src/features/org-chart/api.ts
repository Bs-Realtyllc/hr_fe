import { api } from '@/lib/api';
import { employeeKeys } from '@/lib/queries/employees';
import type { OrgChartMember } from './types';
import { parseOrgChart } from './utils/buildOrgTree';

export const orgChartKeys = {
  // Nested under the employees key on purpose: every employee write already
  // calls employeesApi.invalidate(), so a manager or department change
  // refreshes the chart too, with no extra wiring.
  all: [...employeeKeys.all, 'org-chart'] as const,
};

/**
 * GET /org-chart. Auth is handled by the shared api client (Bearer token,
 * 401 → logout); the response is validated before it reaches the UI.
 */
export async function fetchOrgChart(signal?: AbortSignal): Promise<OrgChartMember[]> {
  const raw = await api.get<unknown>('/org-chart', { signal });
  return parseOrgChart(raw);
}
