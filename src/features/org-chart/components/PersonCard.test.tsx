import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './PersonCard.stories';

// Render the Storybook stories themselves, so stories and tests can't drift apart.
const { Default, CurrentUser, NoReports, NoDesignation, BrokenPhoto } = composeStories(stories);

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
        name: 'Aarav Sharma, Engineering Manager, 2 direct · 3 total',
      }),
    ).toBeTruthy();
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

  it('falls back to initials when the photo fails to load', () => {
    const { container } = render(<BrokenPhoto />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toMatch(/\/uploads\/profile\/photo\/does-not-exist\.jpg$/);
    fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('PT')).toBeTruthy();
  });
});
