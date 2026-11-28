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
  profileHref: () => null,
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

  it('shows the Outline list instead of the canvas', () => {
    const onViewChange = vi.fn();
    const { rerender } = render(<OrgChartView {...props({ onViewChange })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Outline' }));
    expect(onViewChange).toHaveBeenCalledWith('outline');
    rerender(<OrgChartView {...props({ onViewChange, view: 'outline' })} />);
    expect(screen.queryByTestId('canvas')).toBeNull();
    expect(screen.getByRole('tree', { name: 'Org chart outline' })).toBeTruthy();
  });

  it('opens the details panel from the Outline and follows panel links', () => {
    render(<OrgChartView {...props({ view: 'outline', profileHref: () => '/x' })} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('treeitem', { name: /^Aarav Sharma/ }));
    expect(screen.getByRole('dialog', { name: 'Aarav Sharma' })).toBeTruthy();
    // Picking the manager switches the panel and reveals them in the list.
    fireEvent.click(screen.getByRole('button', { name: /Sita Karki/ }));
    expect(screen.getByRole('dialog', { name: 'Sita Karki' })).toBeTruthy();
    expect(screen.getByRole('treeitem', { name: /^Sita Karki/ }).className).toContain(
      'is-highlight',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps the open person in sight when switching views', () => {
    const onViewChange = vi.fn();
    const { rerender } = render(<OrgChartView {...props({ view: 'outline', onViewChange })} />);
    fireEvent.click(screen.getByRole('treeitem', { name: /^Ram Gurung/ }));
    fireEvent.click(screen.getByRole('button', { name: 'People' }));
    expect(onViewChange).toHaveBeenCalledWith('people');
    rerender(<OrgChartView {...props({ view: 'outline', onViewChange })} />);
    expect(screen.getByRole('dialog', { name: 'Ram Gurung' })).toBeTruthy();
    expect(screen.getByRole('treeitem', { name: /^Ram Gurung/ }).className).toContain(
      'is-highlight',
    );
  });

  it('has one Find me in the header that reveals and focuses you', () => {
    render(<OrgChartView {...props({ view: 'outline', currentUserId: 6 })} />);
    // Ram Gurung (6) is shown; collapse his branch first so Find me must reopen it.
    fireEvent.click(
      screen
        .getByRole('treeitem', { name: /^Aarav Sharma/ })
        .querySelector('.org-outline__chevron')!,
    );
    expect(screen.queryByRole('treeitem', { name: /^Ram Gurung/ })).toBeNull();
    const buttons = screen.getAllByRole('button', { name: 'Find me' });
    expect(buttons).toHaveLength(1);
    expect(buttons[0].closest('.page-header')).not.toBeNull();
    fireEvent.click(buttons[0]);
    expect(document.activeElement).toBe(screen.getByRole('treeitem', { name: /^Ram Gurung/ }));
  });

  it('does not jump back to you after Find me when switching views', () => {
    const { rerender } = render(<OrgChartView {...props({ view: 'outline', currentUserId: 6 })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Find me' }));
    fireEvent.click(screen.getByRole('button', { name: 'Teams' }));
    rerender(<OrgChartView {...props({ view: 'teams', currentUserId: 6 })} />);
    rerender(<OrgChartView {...props({ view: 'outline', currentUserId: 6 })} />);
    expect(screen.getByRole('treeitem', { name: /^Ram Gurung/ }).className).not.toContain(
      'is-highlight',
    );
  });

  it('hides Find me when you are not on the chart', () => {
    render(<OrgChartView {...props({ currentUserId: 999 })} />);
    expect(screen.queryByRole('button', { name: 'Find me' })).toBeNull();
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
