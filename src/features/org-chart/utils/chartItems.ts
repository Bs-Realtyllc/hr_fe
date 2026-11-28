import type { OrgChartMember, OrgTree, TeamChartNode } from '../types';
import { compareNames, departmentKey, departmentName, UNASSIGNED_KEY } from './department';

export type PersonItemData = {
  member: OrgChartMember;
  directCount: number;
  totalCount: number;
};
export type GroupItemData = {
  variant: 'company' | 'team';
  name: string;
  /** Second line, e.g. "7 teams · 21 people". */
  summary: string;
};

/**
 * One box of either view, in a single shape so collapsing, layout and search
 * work the same for People and Teams. `children` are in display order.
 */
export type ChartItem =
  | { id: string; type: 'person'; data: PersonItemData; children: ChartItem[] }
  | { id: string; type: 'orgGroup'; data: GroupItemData; children: ChartItem[] };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Node id of a person; the same in both views. */
export const personId = (employeeId: number) => String(employeeId);

/** People view: the reporting tree. */
export function orgToItems(tree: OrgTree): ChartItem[] {
  type OrgNode = OrgTree['roots'][number];
  const toItem = ({ member, directCount, totalCount }: OrgNode): ChartItem => ({
    id: personId(member.id),
    type: 'person',
    data: { member, directCount, totalCount },
    children: [],
  });

  // Iterative so a very deep chain cannot overflow the stack.
  const roots = tree.roots.map(toItem);
  const stack: [OrgNode, ChartItem][] = tree.roots.map((r, i) => [r, roots[i]]);
  while (stack.length) {
    const [src, dst] = stack.pop()!;
    for (const child of src.children) {
      const item = toItem(child);
      dst.children.push(item);
      stack.push([child, item]);
    }
  }
  return roots;
}

export const NO_MANAGER_LABEL = 'No reporting manager';

/**
 * People view with a single top. When the reporting tree has several top
 * people (e.g. no CEO set yet), they go under one company box:
 *  - top people who manage someone keep their own branch, sorted by name;
 *  - top people with no manager and no reports are grouped into one
 *    "No reporting manager" box per department ("Unassigned" last).
 * A tree with one top person (or none) is returned unchanged.
 */
export function orgToGroupedItems(tree: OrgTree, companyName: string): ChartItem[] {
  const roots = orgToItems(tree);
  if (roots.length <= 1) return roots;

  const branches: ChartItem[] = [];
  const groups = new Map<string, { name: string; people: ChartItem[] }>();
  for (const item of roots) {
    if (item.type !== 'person') continue;
    if (item.children.length) {
      branches.push(item);
      continue;
    }
    const key = departmentKey(item.data.member);
    const group = groups.get(key) ?? { name: departmentName(item.data.member), people: [] };
    group.people.push(item);
    groups.set(key, group);
  }

  const groupItems: ChartItem[] = [...groups.entries()]
    .sort(([ak, a], [bk, b]) => {
      if ((ak === UNASSIGNED_KEY) !== (bk === UNASSIGNED_KEY))
        return ak === UNASSIGNED_KEY ? 1 : -1;
      return compareNames(a.name, b.name);
    })
    .map(([key, g]) => ({
      id: `unmanaged:${key}`,
      type: 'orgGroup',
      data: {
        variant: 'team',
        name: g.name,
        summary: `${NO_MANAGER_LABEL} · ${plural(g.people.length, 'person', 'people')}`,
      },
      children: g.people,
    }));

  return [
    {
      id: 'company',
      type: 'orgGroup',
      data: {
        variant: 'company',
        name: companyName.trim() || 'Company',
        summary: plural(tree.stats.people, 'person', 'people'),
      },
      children: [...branches, ...groupItems],
    },
  ];
}

/** Teams view: company → departments → people. */
export function teamToItems(root: TeamChartNode): ChartItem[] {
  const toItem = (n: TeamChartNode): ChartItem => {
    switch (n.kind) {
      case 'person':
        return {
          id: n.id,
          type: 'person',
          data: { member: n.member, directCount: n.directCount, totalCount: n.totalCount },
          children: [],
        };
      case 'team':
        return {
          id: n.id,
          type: 'orgGroup',
          data: {
            variant: 'team',
            name: n.name,
            summary: plural(n.peopleCount, 'person', 'people'),
          },
          children: [],
        };
      case 'company':
        return {
          id: n.id,
          type: 'orgGroup',
          data: {
            variant: 'company',
            name: n.name,
            summary: `${plural(n.teamCount, 'team', 'teams')} · ${plural(n.peopleCount, 'person', 'people')}`,
          },
          children: [],
        };
    }
  };

  const top = toItem(root);
  const stack: [TeamChartNode, ChartItem][] = [[root, top]];
  while (stack.length) {
    const [src, dst] = stack.pop()!;
    for (const child of src.children) {
      const item = toItem(child);
      dst.children.push(item);
      stack.push([child, item]);
    }
  }
  return [top];
}

/** Every item, parent before child (pre-order). */
export function walk(roots: readonly ChartItem[]): ChartItem[] {
  const out: ChartItem[] = [];
  const stack = [...roots].reverse();
  while (stack.length) {
    const item = stack.pop()!;
    out.push(item);
    for (let i = item.children.length - 1; i >= 0; i--) stack.push(item.children[i]);
  }
  return out;
}

/** Parent id of every item (null for roots). */
export function parentMap(roots: readonly ChartItem[]): Map<string, string | null> {
  const parents = new Map<string, string | null>();
  for (const r of roots) parents.set(r.id, null);
  for (const item of walk(roots)) {
    for (const c of item.children) parents.set(c.id, item.id);
  }
  return parents;
}

/** Ids from the root down to (not including) `id`; [] if unknown. */
export function ancestorIds(parents: ReadonlyMap<string, string | null>, id: string): string[] {
  const path: string[] = [];
  let cur = parents.get(id);
  while (cur != null) {
    path.push(cur);
    cur = parents.get(cur);
  }
  return path.reverse();
}

/** Charts larger than this start partly collapsed. */
export const AUTO_COLLAPSE_OVER = 40;

/**
 * The starting collapsed set: small charts show everything; larger ones
 * show the top `visibleDepth + 1` rows and collapse the boxes on the last
 * of those rows.
 */
export function defaultCollapsed(roots: readonly ChartItem[], visibleDepth = 2): Set<string> {
  const all = walk(roots);
  const collapsed = new Set<string>();
  if (all.length <= AUTO_COLLAPSE_OVER) return collapsed;
  const stack: [ChartItem, number][] = roots.map((r) => [r, 0]);
  while (stack.length) {
    const [item, depth] = stack.pop()!;
    if (!item.children.length) continue;
    if (depth >= visibleDepth) collapsed.add(item.id);
    else for (const c of item.children) stack.push([c, depth + 1]);
  }
  return collapsed;
}

/** Number of items below `item`, at any depth. */
export function descendantCount(item: ChartItem): number {
  return walk(item.children).length;
}
