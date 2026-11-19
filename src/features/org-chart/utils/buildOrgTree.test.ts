import { describe, expect, it } from 'vitest';
import type { OrgChartMember } from '../types';
import { buildOrgTree, parseOrgChart } from './buildOrgTree';

const m = (
  id: number,
  name: string,
  manager_id: number | null = null,
  department_id: number | null = null,
): OrgChartMember => ({
  id,
  name,
  manager_id,
  department_id,
  department: department_id ? `Dept ${department_id}` : null,
  designation: null,
  profile_picture: null,
  status: 'active',
});

const names = (nodes: { member: { name: string } }[]) => nodes.map((n) => n.member.name);

describe('buildOrgTree', () => {
  it('returns an empty tree for no members', () => {
    const tree = buildOrgTree([]);
    expect(tree.roots).toEqual([]);
    expect(tree.stats).toEqual({ people: 0, levels: 0, departments: 0 });
  });

  it('builds the hierarchy with depth, direct and total counts', () => {
    const tree = buildOrgTree([
      m(1, 'CEO'),
      m(2, 'Aarav', 1),
      m(3, 'Bishal', 1),
      m(4, 'John', 2),
      m(5, 'Jane', 4),
    ]);
    expect(names(tree.roots)).toEqual(['CEO']);
    const ceo = tree.byId.get(1)!;
    expect(ceo).toMatchObject({ depth: 0, directCount: 2, totalCount: 4 });
    expect(tree.byId.get(2)).toMatchObject({ depth: 1, directCount: 1, totalCount: 2 });
    expect(tree.byId.get(5)).toMatchObject({ depth: 3, directCount: 0, totalCount: 0 });
    expect(tree.stats.levels).toBe(4);
    expect(tree.stats.people).toBe(5);
  });

  it('sorts roots and children by name, case-insensitively', () => {
    const tree = buildOrgTree([m(1, 'zed'), m(2, 'Amy'), m(3, 'bob', 2), m(4, 'Al', 2)]);
    expect(names(tree.roots)).toEqual(['Amy', 'zed']);
    expect(names(tree.byId.get(2)!.children)).toEqual(['Al', 'bob']);
  });

  it('makes people whose manager is missing into roots', () => {
    const tree = buildOrgTree([m(1, 'A', 99), m(2, 'B', 1)]);
    expect(names(tree.roots)).toEqual(['A']);
    expect(tree.byId.get(1)!.totalCount).toBe(1);
  });

  it('treats a self-managed person as a root', () => {
    const tree = buildOrgTree([m(1, 'A', 1)]);
    expect(names(tree.roots)).toEqual(['A']);
    expect(tree.byId.get(1)!.children).toEqual([]);
  });

  it('breaks a reporting cycle so every person is reachable from a root', () => {
    // 1 → 2 → 3 → 1, plus 4 reporting into the loop
    const tree = buildOrgTree([m(1, 'A', 3), m(2, 'B', 1), m(3, 'C', 2), m(4, 'D', 2)]);
    expect(tree.roots).toHaveLength(1);
    expect(tree.roots[0].totalCount).toBe(3);
    // every node appears exactly once in the tree
    const seen: number[] = [];
    const walk = (n: (typeof tree.roots)[number]) => {
      seen.push(n.member.id);
      n.children.forEach(walk);
    };
    tree.roots.forEach(walk);
    expect(seen.sort()).toEqual([1, 2, 3, 4]);
  });

  it('keeps the first row when ids are duplicated', () => {
    const tree = buildOrgTree([m(1, 'First'), m(1, 'Second')]);
    expect(tree.stats.people).toBe(1);
    expect(tree.byId.get(1)!.member.name).toBe('First');
  });

  it('counts distinct departments and ignores people without one', () => {
    const tree = buildOrgTree([m(1, 'A', null, 1), m(2, 'B', 1, 1), m(3, 'C', 1, 2), m(4, 'D')]);
    expect(tree.stats.departments).toBe(2);
  });

  it('handles a very deep chain without overflowing the stack', () => {
    const chain = Array.from({ length: 20_000 }, (_, i) =>
      m(i + 1, `P${i + 1}`, i === 0 ? null : i),
    );
    const tree = buildOrgTree(chain);
    expect(tree.stats.levels).toBe(20_000);
    expect(tree.roots[0].totalCount).toBe(19_999);
  });

  it('does not mutate the input rows', () => {
    const rows = [m(1, 'A', 2), m(2, 'B', 1)];
    const before = structuredClone(rows);
    buildOrgTree(rows);
    expect(rows).toEqual(before);
  });
});

describe('parseOrgChart', () => {
  it('returns [] for a non-array response', () => {
    expect(parseOrgChart(null)).toEqual([]);
    expect(parseOrgChart({ error: 'x' })).toEqual([]);
    expect(parseOrgChart('<html>')).toEqual([]);
  });

  it('drops rows without a usable id or name', () => {
    const rows = parseOrgChart([
      { id: 1, name: 'Ok' },
      { id: '2', name: 'String id' },
      { id: 3, name: '   ' },
      { name: 'No id' },
      null,
      42,
    ]);
    expect(rows.map((r) => r.id)).toEqual([1]);
  });

  it('normalises optional fields of the wrong type to null', () => {
    const [row] = parseOrgChart([
      {
        id: 1,
        name: ' Ann ',
        manager_id: '5',
        department_id: 1.5,
        designation: '',
        profile_picture: 7,
      },
    ]);
    expect(row).toEqual({
      id: 1,
      name: 'Ann',
      manager_id: null,
      department_id: null,
      department: null,
      designation: null,
      profile_picture: null,
      status: 'active',
    });
  });
});
