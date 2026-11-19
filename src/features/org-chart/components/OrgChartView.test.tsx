import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { smallTeam } from '../fixtures';
import { buildOrgTree } from '../utils/buildOrgTree';
import OrgChartView, { type OrgChartViewProps } from './OrgChartView';

// The canvas needs real layout measurement (covered in Storybook); here we
// only check which state the page shows and what it passes down.
vi.mock('./OrgChartCanvas', () => ({
  default: ({
    tree,
    currentUserId,
    view,
    companyName,
  }: {
    tree: { stats: { people: number } };
    currentUserId: number | null;
    view: string;
    companyName: string;
  }) => (
    <div data-testid="canvas">
      {tree.stats.people} people, me={String(currentUserId)}, view={view}, company={companyName}
    </div>
  ),
}));

const props = (over: Partial<OrgChartViewProps> = {}): OrgChartViewProps => ({
  tree: buildOrgTree(smallTeam),
  isLoading: false,
  error: null,
  onRetry: vi.fn(),
  currentUserId: 4,
  view: 'people',
  onViewChange: vi.fn(),
  companyName: 'Gitgi',
  ...over,
});

describe('OrgChartView', () => {
  it('shows the stats and the canvas when loaded', () => {
    render(<OrgChartView {...props()} />);
    expect(screen.getByRole('heading', { name: 'Org chart' })).toBeTruthy();
    expect(screen.getByText('7 people · 4 levels · 3 departments')).toBeTruthy();
    expect(screen.getByTestId('canvas').textContent).toBe(
      '7 people, me=4, view=people, company=Gitgi',
    );
  });

  it('switches between People and Teams', () => {
    const onViewChange = vi.fn();
    const { rerender } = render(<OrgChartView {...props({ onViewChange })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Teams' }));
    expect(onViewChange).toHaveBeenCalledWith('teams');

    rerender(<OrgChartView {...props({ onViewChange, view: 'teams' })} />);
    expect(screen.getByTestId('canvas').textContent).toContain('view=teams');
    expect(screen.getByRole('button', { name: 'Teams' }).className).toContain('pill-active');
  });

  it('uses singular words for one of each', () => {
    render(<OrgChartView {...props({ tree: buildOrgTree([smallTeam[0]]) })} />);
    expect(screen.getByText('1 person · 1 level · 1 department')).toBeTruthy();
  });

  it('leaves departments out of the stats when nobody has one', () => {
    const noDept = smallTeam.map((m) => ({ ...m, department_id: null, department: null }));
    render(<OrgChartView {...props({ tree: buildOrgTree(noDept) })} />);
    expect(screen.getByText('7 people · 4 levels')).toBeTruthy();
  });

  it('shows a loading status', () => {
    render(<OrgChartView {...props({ tree: undefined, isLoading: true })} />);
    expect(screen.getByRole('status').textContent).toMatch(/loading/i);
    expect(screen.queryByTestId('canvas')).toBeNull();
  });

  it('shows the error and retries on click', () => {
    const onRetry = vi.fn();
    render(<OrgChartView {...props({ tree: undefined, error: 'Server down', onRetry })} />);
    expect(screen.getByRole('alert').textContent).toContain('Server down');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when nobody is on the chart', () => {
    render(<OrgChartView {...props({ tree: buildOrgTree([]) })} />);
    expect(screen.getByText('No one is on the org chart yet.')).toBeTruthy();
    expect(screen.queryByTestId('canvas')).toBeNull();
  });
});
