import type { Meta, StoryObj } from '@storybook/react';
import { member } from '../fixtures';
import PersonCard from './PersonCard';

const meta = {
  title: 'Org chart/PersonCard',
  component: PersonCard,
  tags: ['autodocs'],
  args: {
    member: member(2, 'Aarav Sharma', 1, { designation: 'Engineering Manager' }),
    directCount: 2,
    totalCount: 3,
    isMe: false,
  },
} satisfies Meta<typeof PersonCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CurrentUser: Story = {
  args: { isMe: true },
};

export const NoReports: Story = {
  args: { directCount: 0, totalCount: 0 },
};

export const NoDesignation: Story = {
  args: { member: member(3, 'John Doe', 2), directCount: 0, totalCount: 0 },
};

export const LongNameAndTitle: Story = {
  args: {
    member: member(4, 'Aleksandra Konstantinopoulou-Shrestha', 1, {
      designation: 'Senior Principal Infrastructure Reliability Engineer',
    }),
  },
};

/** The photo fails to load, so the card falls back to initials. */
export const BrokenPhoto: Story = {
  args: {
    member: member(5, 'Priya Thapa', 2, {
      designation: 'Developer',
      profile_picture: 'does-not-exist.jpg',
    }),
    directCount: 0,
    totalCount: 0,
  },
};
