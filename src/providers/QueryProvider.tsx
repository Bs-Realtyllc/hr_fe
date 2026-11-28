'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from './getQueryClient';

/**
 * Server-state cache for data fetched from the HR backend. Features expose
 * cached reads from features/<name>/api; pages use those instead of fetching
 * the same data independently.
 */
export default function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
