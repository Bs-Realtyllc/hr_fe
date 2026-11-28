import type { Meta, StoryObj } from '@storybook/react';
import GroupCard from './GroupCard';

const meta = {
  title: 'Org chart/GroupCard',
  component: GroupCard,
  tags: ['autodocs'],
  args: { variant: 'team', name: 'Engineering', summary: '12 people' },
} satisfies Meta<typeof GroupCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Team: Story = {};

export const Company: Story = {
  args: { variant: 'company', name: 'Gitgi', summary: '7 teams · 21 people' },
};

export const LongName: Story = {
  args: { name: 'Infrastructure, Reliability and Developer Productivity', summary: '1 person' },
};
