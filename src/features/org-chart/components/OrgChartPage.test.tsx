import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { smallTeam } from '../fixtures';
import { buildOrgTree } from '../utils/buildOrgTree';
import OrgChartPage from './OrgChartPage';

// The page is tested with the real view and outline; only data sources and
// the React Flow canvas (needs real layout) are replaced.
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 4, role: 'employee' } }),
}));
vi.mock('../hooks/useCompanyName', () => ({ useCompanyName: () => 'Gitgi' }));
vi.mock('../hooks/useOrgChart', () => ({
  useOrgChart: () => ({
    tree: buildOrgTree(smallTeam),
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('./OrgChartCanvas', () => ({
  default: ({ view }: { view: string }) => <div data-testid="canvas">{view}</div>,
}));

const go = (url: string) => window.history.replaceState(null, '', url);
const search = () => window.location.search;

describe('OrgChartPage URL state', () => {
  beforeEach(() => go('/org-chart'));
  afterEach(() => go('/'));

  it('opens on People with nothing selected by default, and keeps the URL clean', () => {
    render(<OrgChartPage />);
    expect(screen.getByTestId('canvas').textContent).toBe('people');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(search()).toBe('');
  });

  it('opens the view and person from a shared link', () => {
    go('/org-chart?view=outline&person=6');
    render(<OrgChartPage />);
    expect(screen.getByRole('tree')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Ram Gurung' })).toBeTruthy();
    expect(screen.getByRole('treeitem', { name: /^Ram Gurung/ }).className).toContain(
      'is-highlight',
    );
  });

  it('writes view and person to the URL as you use the page', () => {
    render(<OrgChartPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Outline' }));
    expect(search()).toBe('?view=outline');
    fireEvent.click(screen.getByRole('treeitem', { name: /^Maya Rai/ }));
    expect(search()).toBe('?view=outline&person=7');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(search()).toBe('?view=outline');
  });

  it('does not add a browser history entry per click', () => {
    const before = window.history.length;
    render(<OrgChartPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Teams' }));
    fireEvent.click(screen.getByRole('button', { name: 'Outline' }));
    expect(window.history.length).toBe(before);
  });

  it('ignores a bad link and drops a person who is not on the chart', () => {
    go('/org-chart?view=hacked&person=999&ref=mail');
    render(<OrgChartPage />);
    expect(screen.getByTestId('canvas').textContent).toBe('people');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(search()).toBe('?ref=mail');
  });

  it('builds the Copy link URL from the current view and person', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    go('/org-chart?view=outline&person=2');
    render(<OrgChartPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    });
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/org-chart?view=outline&person=2`,
    );
  });
});
