'use client';
import { useQuery } from '@tanstack/react-query';
import { errorMessage } from '@/lib/api';
import { fetchOrgChart, orgChartKeys } from '../api';
import { buildOrgTree } from '../utils/buildOrgTree';

/**
 * The org chart as a reporting tree. The tree is built in `select`, so it is
 * only rebuilt when the fetched data changes, not on every render.
 */
export function useOrgChart() {
  const query = useQuery({
    queryKey: orgChartKeys.all,
    queryFn: ({ signal }) => fetchOrgChart(signal),
    select: buildOrgTree,
  });

  return {
    tree: query.data,
    isLoading: query.isPending,
    error: query.error ? errorMessage(query.error, 'Failed to load the org chart') : null,
    refetch: query.refetch,
  };
}
