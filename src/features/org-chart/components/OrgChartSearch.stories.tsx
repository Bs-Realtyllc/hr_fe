import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { largeCompany, smallTeam } from '../fixtures';
import OrgChartSearch from './OrgChartSearch';

const meta = {
  title: 'Org chart/OrgChartSearch',
  component: OrgChartSearch,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div style={{ height: 360 }}>
        <Story />
      </div>
    ),
  ],
  args: { members: smallTeam, onSelect: fn() },
} satisfies Meta<typeof OrgChartSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

/** Typing shows ranked suggestions; ↓ + Enter picks one. */
export const TypingAName: Story = {
  play: async ({ canvasElement, args }) => {
    const input = within(canvasElement).getByRole('combobox');
    await userEvent.type(input, 'sharma');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(args.onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Bishal Sharma' }),
    );
  },
};

export const MatchingATitle: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole('combobox'), 'developer');
  },
};

export const NoMatches: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole('combobox'), 'zzz');
  },
};

export const ManyPeople: Story = {
  args: { members: largeCompany() },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole('combobox'), 'lead');
  },
};
