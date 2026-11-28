'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const companyKeys = { info: ['company'] as const };

/**
 * The company's display name for the top of the Teams view. Readable by
 * every role; failures are non-fatal and fall back to "".
 */
export function useCompanyName(): string {
  const { data } = useQuery({
    queryKey: companyKeys.info,
    queryFn: ({ signal }) => api.get<{ name?: unknown } | null>('/company', { signal }),
    select: (info) => (typeof info?.name === 'string' ? info.name.trim() : ''),
    staleTime: 5 * 60_000,
  });
  return data ?? '';
}
