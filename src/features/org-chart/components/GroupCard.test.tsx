import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './GroupCard.stories';

const { Team, Company } = composeStories(stories);

describe('GroupCard', () => {
  it('shows a team with its head count', () => {
    const { container } = render(<Team />);
    expect(screen.getByRole('article', { name: 'Engineering, 12 people' })).toBeTruthy();
    expect(container.querySelector('.org-card--team')).not.toBeNull();
  });

  it('styles the company box differently', () => {
    const { container } = render(<Company />);
    expect(screen.getByText('7 teams · 21 people')).toBeTruthy();
    expect(container.querySelector('.org-card--company')).not.toBeNull();
  });
});
