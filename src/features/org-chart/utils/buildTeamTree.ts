import type { OrgNode, OrgTree, TeamChartNode } from '../types';
import {
  compareNames,
  departmentKey as teamKey,
  departmentName,
  UNASSIGNED_KEY,
} from './department';

export { UNASSIGNED_TEAM } from './department';

type PersonTeamNode = Extract<TeamChartNode, { kind: 'person' }>;
type TeamNode = Extract<TeamChartNode, { kind: 'team' }>;
export type CompanyTeamNode = Extract<TeamChartNode, { kind: 'company' }>;

const nodeName = (n: TeamChartNode) => (n.kind === 'person' ? n.member.name : n.name);

/**
 * Builds the Teams view from the (already cycle-free) reporting tree.
 * Teams are sorted by name with "Unassigned" last; people inside a team are
 * sorted by name at every level.
 */
export function buildTeamTree(tree: OrgTree, companyName: string): CompanyTeamNode {
  // Parent-first walk of the reporting tree, remembering each person's manager.
  const managerOf = new Map<number, OrgNode | null>();
  const order: OrgNode[] = [];
  const stack: OrgNode[] = [...tree.roots].reverse();
  for (const r of tree.roots) managerOf.set(r.member.id, null);
  while (stack.length) {
    const node = stack.pop()!;
    order.push(node);
    for (let i = node.children.length - 1; i >= 0; i--) {
      managerOf.set(node.children[i].member.id, node);
      stack.push(node.children[i]);
    }
  }

  const teams = new Map<string, TeamNode>();
  const people = new Map<number, PersonTeamNode>();

  for (const org of order) {
    const { member } = org;
    const key = teamKey(member);
    let team = teams.get(key);
    if (!team) {
      team = {
        kind: 'team',
        id: `team:${key}`,
        name: departmentName(member),
        peopleCount: 0,
        children: [],
      };
      teams.set(key, team);
    }
    team.peopleCount++;

    const person: PersonTeamNode = {
      kind: 'person',
      id: String(member.id),
      member,
      directCount: 0,
      totalCount: 0,
      children: [],
    };
    people.set(member.id, person);

    const manager = managerOf.get(member.id);
    // The manager was visited first, so their node already exists.
    const parent =
      manager && teamKey(manager.member) === key ? people.get(manager.member.id)! : team;
    parent.children.push(person);
  }

  // Sort and count bottom-up within each team.
  const byName = (a: TeamChartNode, b: TeamChartNode) => compareNames(nodeName(a), nodeName(b));
  for (let i = order.length - 1; i >= 0; i--) {
    const p = people.get(order[i].member.id)!;
    p.children.sort(byName);
    p.directCount = p.children.length;
    p.totalCount = p.children.reduce((s, c) => s + 1 + (c as PersonTeamNode).totalCount, 0);
  }
  for (const team of teams.values()) team.children.sort(byName);

  const teamList = [...teams.values()].sort((a, b) => {
    const aNone = a.id === `team:${UNASSIGNED_KEY}`;
    const bNone = b.id === `team:${UNASSIGNED_KEY}`;
    if (aNone !== bNone) return aNone ? 1 : -1;
    return compareNames(a.name, b.name);
  });

  return {
    kind: 'company',
    id: 'company',
    name: companyName.trim() || 'Company',
    teamCount: teamList.length,
    peopleCount: people.size,
    children: teamList,
  };
}
