import { describe, expect, it } from 'vitest';
import { largeCompany, member, smallTeam } from '../fixtures';
import type { TeamChartNode } from '../types';
import { buildOrgTree } from './buildOrgTree';
import { buildTeamTree, UNASSIGNED_TEAM } from './buildTeamTree';

const label = (n: TeamChartNode) => (n.kind === 'person' ? n.member.name : n.name);
const childLabels = (n: TeamChartNode) => n.children.map(label);
const find = (root: TeamChartNode, name: string): TeamChartNode => {
  const stack = [root];
  while (stack.length) {
    const n = stack.pop()!;
    if (label(n) === name) return n;
    stack.push(...n.children);
  }
  throw new Error(`not found: ${name}`);
};
const countPeople = (n: TeamChartNode): number =>
  (n.kind === 'person' ? 1 : 0) + n.children.reduce((s, c) => s + countPeople(c), 0);

describe('buildTeamTree', () => {
  const root = buildTeamTree(buildOrgTree(smallTeam), 'Gitgi');

  it('puts the company on top with one box per department, sorted by name', () => {
    expect(root).toMatchObject({ kind: 'company', name: 'Gitgi', teamCount: 3, peopleCount: 7 });
    expect(childLabels(root)).toEqual(['Finance', 'IT', 'Leadership']);
    expect(root.children.every((c) => c.kind === 'team')).toBe(true);
  });

  it('keeps reporting lines inside a department', () => {
    // IT: Aarav manages John and Priya; John manages Ram.
    expect(childLabels(find(root, 'IT'))).toEqual(['Aarav Sharma']);
    expect(childLabels(find(root, 'Aarav Sharma'))).toEqual(['John Doe', 'Priya Thapa']);
    expect(childLabels(find(root, 'John Doe'))).toEqual(['Ram Gurung']);
  });

  it('puts people whose manager is in another department directly under their team', () => {
    // Aarav (IT) and Bishal (Finance) report to Sita (Leadership).
    expect(childLabels(find(root, 'Sita Karki'))).toEqual([]);
    expect(childLabels(find(root, 'Finance'))).toEqual(['Bishal Sharma']);
  });

  it('counts people per team and reports inside the team', () => {
    expect(find(root, 'IT')).toMatchObject({ peopleCount: 4 });
    expect(find(root, 'Aarav Sharma')).toMatchObject({ directCount: 2, totalCount: 3 });
    expect(find(root, 'Sita Karki')).toMatchObject({ directCount: 0, totalCount: 0 });
  });

  it('includes every person exactly once', () => {
    const big = buildTeamTree(buildOrgTree(largeCompany()), 'Co');
    expect(countPeople(big)).toBe(largeCompany().length);
    expect(big.peopleCount).toBe(largeCompany().length);
  });

  it('groups people without a department under "Unassigned", listed last', () => {
    const tree = buildTeamTree(
      buildOrgTree([
        member(1, 'Zed', null, { department_id: 1, department: 'Zeta' }),
        member(2, 'Amy'),
        member(3, 'Bob', 2),
      ]),
      'Co',
    );
    expect(childLabels(tree)).toEqual(['Zeta', UNASSIGNED_TEAM]);
    expect(childLabels(find(tree, 'Amy'))).toEqual(['Bob']);
  });

  it('matches departments by name when there is no department id', () => {
    const tree = buildTeamTree(
      buildOrgTree([
        member(1, 'A', null, { department: 'Sales' }),
        member(2, 'B', null, { department: ' sales ' }),
      ]),
      'Co',
    );
    expect(tree.teamCount).toBe(1);
    expect(find(tree, 'Sales')).toMatchObject({ peopleCount: 2 });
  });

  it('falls back to "Company" when the name is blank', () => {
    expect(buildTeamTree(buildOrgTree([]), '   ')).toMatchObject({
      name: 'Company',
      teamCount: 0,
      peopleCount: 0,
      children: [],
    });
  });
});
