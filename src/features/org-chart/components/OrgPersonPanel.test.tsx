import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { member, smallTeam } from '../fixtures';
import { buildOrgTree } from '../utils/buildOrgTree';
import OrgPersonPanel, { type OrgPersonPanelProps } from './OrgPersonPanel';

const tree = buildOrgTree([
  ...smallTeam,
  member(8, 'Leave Taker', 3, { designation: 'Analyst', status: 'on_leave' }),
]);

function setup(over: Partial<OrgPersonPanelProps> = {}) {
  const props: OrgPersonPanelProps = {
    tree,
    person: tree.byId.get(2)!, // Aarav: reports to Sita, manages John & Priya
    currentUserId: 4,
    profileHref: '/employees/2',
    onSelect: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  return { props, ...render(<OrgPersonPanel {...props} />) };
}

describe('OrgPersonPanel', () => {
  it('is a labelled, non-modal dialog with the person’s details', () => {
    setup();
    const dialog = screen.getByRole('dialog', { name: 'Aarav Sharma' });
    expect(dialog.getAttribute('aria-modal')).toBe('false');
    expect(screen.getByText('Engineering Manager')).toBeTruthy();
    expect(screen.getByText('IT')).toBeTruthy();
  });

  it('shows the manager and direct reports, and opens them on click', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Sita Karki/ }));
    expect(props.onSelect).toHaveBeenCalledWith(1);
    expect(screen.getByRole('heading', { name: 'Direct reports (2)' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Priya Thapa/ }));
    expect(props.onSelect).toHaveBeenCalledWith(5);
    expect(screen.getByText('3 people in their team in total')).toBeTruthy();
  });

  it('says when there is no manager or no reports', () => {
    setup({ person: tree.byId.get(1)! });
    expect(screen.getByText('No reporting manager')).toBeTruthy();
    setup({ person: tree.byId.get(7)! });
    expect(screen.getByText('No direct reports')).toBeTruthy();
  });

  it('shows a non-active status', () => {
    setup({ person: tree.byId.get(8)! });
    expect(screen.getByText('On leave')).toBeTruthy();
  });

  it('shows the profile link only when allowed, worded for yourself', () => {
    const { unmount } = setup();
    expect(screen.getByRole('link', { name: 'View full profile' }).getAttribute('href')).toBe(
      '/employees/2',
    );
    unmount();
    setup({ profileHref: null });
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('says "Open my profile" on your own panel', () => {
    setup({ person: tree.byId.get(4)!, profileHref: '/profile' });
    expect(screen.getByRole('link', { name: 'Open my profile' })).toBeTruthy();
    expect(screen.getByText('You')).toBeTruthy();
  });

  it('closes with Escape or the close button', () => {
    const { props } = setup();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it('moves focus in on open and gives it back on close', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = setup();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
    act(() => unmount());
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('focuses the new name when switching person', () => {
    const { rerender, props } = setup();
    rerender(<OrgPersonPanel {...props} person={tree.byId.get(1)!} />);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Sita Karki' }));
  });
});
