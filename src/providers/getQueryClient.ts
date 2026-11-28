import { isServer, QueryClient } from '@tanstack/react-query';
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

let browserQueryClient: QueryClient | undefined;

/**
 * The app's QueryClient. In the browser there is exactly one, shared by
 * <QueryProvider> and by plain modules (e.g. a feature's api service) that
 * need to read or invalidate the cache outside React. On the server a new
 * client is made per call so no data is shared between requests.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
