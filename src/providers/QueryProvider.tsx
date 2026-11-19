'use client';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';

/** Retry once on network/5xx errors; never on 4xx (bad input, 401 session expiry, 403, 404). */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data stays fresh for 30s, so moving between pages doesn't refetch
        // the same list again immediately.
        staleTime: 30_000,
        retry: shouldRetry,
        // Pages don't refetch on tab focus today; keep that behaviour until
        // a feature opts in.
        refetchOnWindowFocus: false,
      },
      mutations: {
        // A failed save is shown to the user, never silently re-sent.
        retry: false,
      },
    },
  });
}

/**
 * Server-state cache for data fetched from the HR backend. Features expose
 * query hooks (e.g. useProfile()) from features/<name>/api; pages use those
 * instead of fetching in useEffect.
 */
export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // One client per browser session; useState keeps it stable across renders
  // without sharing it between server requests.
  const [client] = useState(makeQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
