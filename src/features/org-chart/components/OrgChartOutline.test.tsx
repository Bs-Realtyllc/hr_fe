import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { largeCompany, partlyManaged, smallTeam } from '../fixtures';
import type { OrgChartMember } from '../types';
import { buildOrgTree } from '../utils/buildOrgTree';
import OrgChartOutline from './OrgChartOutline';

function Harness({
  rows,
  me = 4,
  onOpenPerson,
  revealRequest,
}: {
  rows: OrgChartMember[];
  me?: number | null;
  onOpenPerson?: (id: number) => void;
  revealRequest?: { id: string; seq: number } | null;
}) {
  const [collapsed, setCollapsed] = useState<Set<string> | null>(null);
  return (
    <OrgChartOutline
      tree={buildOrgTree(rows)}
      companyName="Gitgi"
      currentUserId={me}
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
      onOpenPerson={onOpenPerson}
      selectedEmployeeId={2}
      revealRequest={revealRequest}
    />
  );
}

const tree = () => screen.getByRole('tree', { name: 'Org chart outline' });
const items = () => within(tree()).getAllByRole('treeitem');
const names = () => items().map((i) => i.getAttribute('aria-label')!.split(',')[0]);
const item = (name: string) =>
  within(tree()).getByRole('treeitem', { name: new RegExp(`^${name}(,|$)`) });
const focused = () => document.activeElement?.getAttribute('aria-label')?.split(',')[0];
const key = (k: string) => fireEvent.keyDown(document.activeElement!, { key: k });

afterEach(() => vi.useRealTimers());

describe('OrgChartOutline', () => {
  it('lists the reporting tree with ARIA levels', () => {
    render(<Harness rows={smallTeam} />);
    expect(names()).toEqual([
      'Sita Karki',
      'Aarav Sharma',
      'John Doe',
      'Ram Gurung',
      'Priya Thapa',
      'Bishal Sharma',
      'Maya Rai',
    ]);
    expect(item('Sita Karki').getAttribute('aria-level')).toBe('1');
    expect(item('Ram Gurung').getAttribute('aria-level')).toBe('4');
    expect(item('Aarav Sharma').getAttribute('aria-expanded')).toBe('true');
    expect(item('Maya Rai').hasAttribute('aria-expanded')).toBe(false);
  });

  it('has exactly one tab stop', () => {
    render(<Harness rows={smallTeam} />);
    expect(items().filter((i) => i.tabIndex === 0)).toHaveLength(1);
    expect(item('Sita Karki').tabIndex).toBe(0);
  });

  it('marks the signed-in user', () => {
    render(<Harness rows={smallTeam} />);
    expect(item('John Doe').className).toContain('is-me');
    expect(within(item('John Doe')).getByText('You')).toBeTruthy();
  });

  it('supports the tree keyboard pattern', () => {
    render(<Harness rows={smallTeam} />);
    act(() => item('Sita Karki').focus());
    key('ArrowDown');
    expect(focused()).toBe('Aarav Sharma');
    key('ArrowLeft'); // expanded → collapse
    expect(item('Aarav Sharma').getAttribute('aria-expanded')).toBe('false');
    expect(names()).not.toContain('John Doe');
    key('ArrowLeft'); // collapsed → go to parent
    expect(focused()).toBe('Sita Karki');
    key('ArrowDown');
    key('ArrowRight'); // collapsed → expand
    expect(names()).toContain('John Doe');
    key('ArrowRight'); // expanded → first child
    expect(focused()).toBe('John Doe');
    key('End');
    expect(focused()).toBe('Maya Rai');
    key('Home');
    expect(focused()).toBe('Sita Karki');
    key('Enter'); // toggle
    expect(names()).toEqual(['Sita Karki']);
    key(' ');
    expect(names()).toHaveLength(7);
    key('ArrowUp'); // at the top: stays
    expect(focused()).toBe('Sita Karki');
  });

  it('toggles with the chevron', () => {
    const { container } = render(<Harness rows={smallTeam} />);
    const chevron = item('Bishal Sharma').querySelector('.org-outline__chevron')!;
    fireEvent.click(chevron);
    expect(names()).not.toContain('Maya Rai');
    fireEvent.click(item('Bishal Sharma').querySelector('.org-outline__chevron')!);
    expect(names()).toContain('Maya Rai');
    expect(container.querySelectorAll('.org-outline__chevron svg')).toHaveLength(4);
  });

  it('groups people without a manager like the People view', () => {
    render(<Harness rows={partlyManaged} me={10} />);
    expect(names().slice(0, 3)).toEqual(['Gitgi', 'Aarav Sharma', 'John Doe']);
    expect(item('IT').getAttribute('aria-label')).toBe('IT, No reporting manager · 2 people');
  });

  it('starts a large company collapsed, and Expand all / Collapse all work', () => {
    render(<Harness rows={largeCompany()} me={null} />);
    const start = items().length;
    expect(start).toBe(37);
    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
    expect(items()).toHaveLength(largeCompany().length);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    // The top stays open so you see the next row, each closed.
    expect(names()).toEqual([
      'Chief Executive',
      'Engineering Head',
      'Finance Head',
      'HR Head',
      'Marketing Head',
      'Operations Head',
      'Sales Head',
    ]);
    expect(item('Chief Executive').getAttribute('aria-expanded')).toBe('true');
    expect(item('HR Head').getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Find me' })).toBeNull();
  });

  it('search reveals, focuses and briefly highlights a hidden person', () => {
    vi.useFakeTimers();
    render(<Harness rows={largeCompany()} me={null} />);
    const input = screen.getByRole('combobox', { name: 'Find a person or title' });
    fireEvent.change(input, { target: { value: 'Employee 5.4.3' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const row = item('Employee 5.4.3');
    expect(row.className).toContain('is-highlight');
    expect(document.activeElement).toBe(row);
    expect(row.tabIndex).toBe(0);
    act(() => vi.advanceTimersByTime(2600));
    expect(row.className).not.toContain('is-highlight');
  });

  it('Find me opens the way to the signed-in user', () => {
    render(<Harness rows={largeCompany()} me={10} />);
    expect(names()).not.toContain('Employee 1.2.2');
    fireEvent.click(screen.getByRole('button', { name: 'Find me' }));
    expect(document.activeElement).toBe(item('Employee 1.2.2'));
  });

  it('opens a person with click or Enter; Space still toggles', () => {
    const onOpenPerson = vi.fn();
    render(<Harness rows={smallTeam} onOpenPerson={onOpenPerson} />);
    fireEvent.click(item('Bishal Sharma'));
    expect(onOpenPerson).toHaveBeenLastCalledWith(3);
    act(() => item('Aarav Sharma').focus());
    key('Enter');
    expect(onOpenPerson).toHaveBeenLastCalledWith(2);
    expect(names()).toContain('John Doe'); // Enter did not collapse
    key(' ');
    expect(names()).not.toContain('John Doe');
    expect(item('Aarav Sharma').getAttribute('aria-haspopup')).toBe('dialog');
    expect(item('Aarav Sharma').className).toContain('is-selected');
  });

  it('reveals on request without taking focus', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    const rows = largeCompany();
    const target = String(rows.find((m) => m.name === 'Employee 2.2.3')!.id);
    const { rerender } = render(<Harness rows={rows} me={null} />);
    outside.focus();
    rerender(<Harness rows={rows} me={null} revealRequest={{ id: target, seq: 1 }} />);
    expect(item('Employee 2.2.3').className).toContain('is-highlight');
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});
