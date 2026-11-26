import { useArgs } from '@storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import {
  largeCompany,
  member,
  multipleRoots,
  partlyManaged,
  smallTeam,
  twoPeopleNoManagers,
} from '../fixtures';
import type { OrgChartViewMode } from '../types';
import { buildOrgTree } from '../utils/buildOrgTree';
import OrgChartView from './OrgChartView';

const meta = {
  title: 'Org chart/OrgChartView',
  component: OrgChartView,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ padding: 24 }}>
        <Story />
      </div>
    ),
  ],
  // Keep the People/Teams switch working inside Storybook.
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return (
      <OrgChartView
        {...args}
        onViewChange={(view: OrgChartViewMode) => {
          args.onViewChange(view);
          updateArgs({ view });
        }}
      />
    );
  },
  args: {
    tree: buildOrgTree(smallTeam),
    isLoading: false,
    error: null,
    onRetry: fn(),
    currentUserId: 4,
    view: 'people',
    onViewChange: fn(),
    companyName: 'Gitgi',
    // Storybook: everyone gets a profile link (the real page checks the role).
    profileHref: (id: number) => `/employees/${id}`,
  },
} satisfies Meta<typeof OrgChartView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SmallTeam: Story = {};

export const MultipleRoots: Story = {
  args: { tree: buildOrgTree(multipleRoots), currentUserId: null },
};

/** Managers only partly set: people without one are grouped by department. */
export const PartlyManaged: Story = {
  args: { tree: buildOrgTree(partlyManaged), currentUserId: 10 },
};

/** A fresh install: an admin and one employee, nobody has a manager yet. */
export const NoManagersYet: Story = {
  args: { tree: buildOrgTree(twoPeopleNoManagers), currentUserId: 1 },
};

export const LargeCompany: Story = {
  args: { tree: buildOrgTree(largeCompany()), currentUserId: 10 },
};

export const Loading: Story = {
  args: { tree: undefined, isLoading: true },
};

export const ErrorState: Story = {
  args: { tree: undefined, error: "Can't reach the server. Check your connection and try again." },
};

export const Empty: Story = {
  args: { tree: buildOrgTree([]) },
};

export const OutlineView: Story = {
  args: { view: 'outline' },
};

export const OutlinePartlyManaged: Story = {
  args: { view: 'outline', tree: buildOrgTree(partlyManaged), currentUserId: 10 },
};

export const OutlineLargeCompany: Story = {
  args: { view: 'outline', tree: buildOrgTree(largeCompany()), currentUserId: 10 },
};

export const TeamsView: Story = {
  args: { view: 'teams' },
};

/** People without a department are grouped under "Unassigned", shown last. */
export const TeamsWithUnassigned: Story = {
  args: {
    view: 'teams',
    tree: buildOrgTree([
      ...smallTeam,
      member(8, 'Hari Bista', 1),
      member(9, 'Gita Shah', 8, { designation: 'Contractor' }),
    ]),
  },
};

export const TeamsLargeCompany: Story = {
  args: { view: 'teams', tree: buildOrgTree(largeCompany()) },
};
