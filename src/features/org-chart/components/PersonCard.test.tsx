import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as stories from './PersonCard.stories';

// Render the Storybook stories themselves, so stories and tests can't drift apart.
const {
  Default,
  CurrentUser,
  NoReports,
  NoReportsWithDepartment,
  InTeamsView,
  NoDesignation,
  BrokenPhoto,
} = composeStories(stories);

describe('PersonCard', () => {
  it('shows name, title, initials and report counts', () => {
    render(<Default />);
    expect(screen.getByText('Aarav Sharma')).toBeTruthy();
    expect(screen.getByText('Engineering Manager')).toBeTruthy();
    expect(screen.getByText('AS')).toBeTruthy();
    expect(screen.getByText('2 direct · 3 total')).toBeTruthy();
    expect(screen.queryByText('You')).toBeNull();
  });

  it('has an accessible label summarising the card', () => {
    render(<Default />);
    expect(
      screen.getByRole('article', {
        name: 'Aarav Sharma, Engineering Manager, IT, 2 direct · 3 total',
      }),
    ).toBeTruthy();
  });

  it('shows the department with a colour dot next to the counts', () => {
    const { container } = render(<Default />);
    expect(screen.getByText('IT')).toBeTruthy();
    expect(container.querySelector('.org-dept-dot')).not.toBeNull();
    expect(container.querySelector('.org-card__footer')!.textContent).toBe('IT·2 direct · 3 total');
  });

  it('shows only the department for someone with no reports', () => {
    const { container } = render(<NoReportsWithDepartment />);
    expect(container.querySelector('.org-card__footer')!.textContent).toBe('IT');
  });

  it('hides the department in the Teams view', () => {
    const { container } = render(<InTeamsView />);
    expect(screen.queryByText('IT')).toBeNull();
    expect(container.querySelector('.org-card__footer')!.textContent).toBe('2 direct · 3 total');
  });

  it('shows no department line for someone without a department', () => {
    const { container } = render(<NoDesignation />);
    expect(container.querySelector('.org-card__footer')).toBeNull();
  });

  it('marks the signed-in user', () => {
    const { container } = render(<CurrentUser />);
    expect(screen.getByText('You')).toBeTruthy();
    expect(container.querySelector('.org-card--me')).not.toBeNull();
  });

  it('hides the counts for someone with no reports', () => {
    render(<NoReports />);
    expect(screen.queryByText(/direct/)).toBeNull();
  });

  it('renders without a designation', () => {
    render(<NoDesignation />);
    expect(screen.getByRole('article', { name: 'John Doe' })).toBeTruthy();
  });

  it('becomes a button that opens the details panel', () => {
    const onOpen = vi.fn();
    render(<Default onOpen={onOpen} selected />);
    const btn = screen.getByRole('button', { name: /^Aarav Sharma/ });
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(btn.className).toContain('org-card--selected');
    fireEvent.click(btn);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('can be highlighted', () => {
    const { container } = render(<Default highlighted />);
    expect(container.querySelector('.org-card--highlight')).not.toBeNull();
  });

  it('falls back to initials when the photo fails to load', () => {
    const { container } = render(<BrokenPhoto />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toMatch(/\/uploads\/profile\/photo\/does-not-exist\.jpg$/);
    fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('PT')).toBeTruthy();
  });
});
