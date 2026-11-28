import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_URL } from '@/config/env';
import { useOrgChart } from './useOrgChart';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('useOrgChart', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem('hr_token', 'test-token');
    localStorage.setItem('hr_user', JSON.stringify({ id: 1 }));
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('calls GET /org-chart with the stored bearer token and builds the tree', async () => {
    fetchMock.mockResolvedValue(
      json([
        { id: 1, name: 'CEO', manager_id: null },
        { id: 2, name: 'Aarav', manager_id: 1 },
      ]),
    );

    const { result } = renderHook(() => useOrgChart(), { wrapper: wrapper() });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.tree).toBeDefined());

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/org-chart`);
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-token');
    expect(init?.signal).toBeInstanceOf(AbortSignal);

    expect(result.current.tree!.roots[0].member.name).toBe('CEO');
    expect(result.current.tree!.roots[0].totalCount).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('shows the backend error message on failure', async () => {
    fetchMock.mockResolvedValue(json({ error: 'Database unavailable' }, 500));
    const { result } = renderHook(() => useOrgChart(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.error).toBe('Database unavailable'));
    expect(result.current.tree).toBeUndefined();
  });

  it('clears the session and redirects to /login on 401 (expired token)', async () => {
    const location = { href: '/org-chart' };
    vi.stubGlobal('location', location);
    fetchMock.mockResolvedValue(json({ error: 'Unauthorized' }, 401));
    const { result } = renderHook(() => useOrgChart(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(localStorage.getItem('hr_token')).toBeNull();
    expect(localStorage.getItem('hr_user')).toBeNull();
    expect(location.href).toBe('/login');
  });

  it('shows a connection message when the server is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useOrgChart(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.error).toMatch(/can't reach the server/i));
  });

  it('survives a malformed response with an empty tree', async () => {
    fetchMock.mockResolvedValue(json({ unexpected: true }));
    const { result } = renderHook(() => useOrgChart(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.tree).toBeDefined());
    expect(result.current.tree!.roots).toEqual([]);
  });
});
