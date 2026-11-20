import { describe, expect, it } from 'vitest';
import { largeCompany, partlyManaged, smallTeam, twoPeopleNoManagers } from '../fixtures';
import { buildOrgTree } from './buildOrgTree';
import { buildTeamTree } from './buildTeamTree';
import {
  ancestorIds,
  AUTO_COLLAPSE_OVER,
  defaultCollapsed,
  descendantCount,
  orgToGroupedItems,
  orgToItems,
  parentMap,
  type ChartItem,
  teamToItems,
  walk,
} from './chartItems';

describe('orgToItems', () => {
  it('mirrors the reporting tree with string ids and sibling order', () => {
    const items = orgToItems(buildOrgTree(smallTeam));
    expect(items.map((i) => i.id)).toEqual(['1']);
    expect(items[0].children.map((i) => i.id)).toEqual(['2', '3']); // Aarav, Bishal
    expect(walk(items)).toHaveLength(smallTeam.length);
    expect(items[0]).toMatchObject({ type: 'person', data: { directCount: 2, totalCount: 6 } });
  });

  it('handles a very deep chain without overflowing the stack', () => {
    const chain = Array.from({ length: 20_000 }, (_, i) => ({
      ...smallTeam[0],
      id: i + 1,
      name: `P${i + 1}`,
      manager_id: i === 0 ? null : i,
    }));
    expect(walk(orgToItems(buildOrgTree(chain)))).toHaveLength(20_000);
  });
});

describe('teamToItems', () => {
  it('mirrors company → teams → people', () => {
    const [company] = teamToItems(buildTeamTree(buildOrgTree(smallTeam), 'Gitgi'));
    expect(company).toMatchObject({
      id: 'company',
      type: 'orgGroup',
      data: { variant: 'company' },
    });
    expect(company.children.map((c) => c.data)).toEqual([
      expect.objectContaining({ name: 'Finance', summary: '2 people' }),
      expect.objectContaining({ name: 'IT', summary: '4 people' }),
      expect.objectContaining({ name: 'Leadership', summary: '1 person' }),
    ]);
  });
});

describe('parentMap / ancestorIds', () => {
  const items = orgToItems(buildOrgTree(smallTeam));
  const parents = parentMap(items);

  it('maps every item to its parent', () => {
    expect(parents.get('1')).toBeNull();
    expect(parents.get('6')).toBe('4');
    expect(parents.size).toBe(smallTeam.length);
  });

  it('lists ancestors from the top down', () => {
    expect(ancestorIds(parents, '6')).toEqual(['1', '2', '4']); // Sita → Aarav → John → Ram
    expect(ancestorIds(parents, '1')).toEqual([]);
    expect(ancestorIds(parents, 'unknown')).toEqual([]);
  });
});

describe('defaultCollapsed', () => {
  it('collapses nothing on a small chart', () => {
    const items = orgToItems(buildOrgTree(smallTeam));
    expect(walk(items).length).toBeLessThanOrEqual(AUTO_COLLAPSE_OVER);
    expect(defaultCollapsed(items).size).toBe(0);
  });

  it('collapses the third row of a large chart', () => {
    const items = orgToItems(buildOrgTree(largeCompany()));
    const collapsed = defaultCollapsed(items);
    // CEO (row 1) → 6 heads (row 2) → 30 leads (row 3, collapsed)
    expect(collapsed.size).toBe(30);
    const leads = items[0].children.flatMap((h) => h.children.map((l) => l.id));
    expect([...collapsed].sort()).toEqual(leads.sort());
  });

  it('never collapses a box with no children', () => {
    const items = orgToItems(buildOrgTree(largeCompany()));
    const byId = new Map(walk(items).map((i) => [i.id, i]));
    for (const id of defaultCollapsed(items, 1))
      expect(byId.get(id)!.children.length).toBeGreaterThan(0);
  });
});

describe('descendantCount', () => {
  it('counts everyone below', () => {
    const items = orgToItems(buildOrgTree(smallTeam));
    expect(descendantCount(items[0])).toBe(6);
    expect(descendantCount(items[0].children[1])).toBe(1); // Bishal → Maya
  });
});

describe('orgToGroupedItems', () => {
  const labels = (items: ChartItem[]) =>
    items.map((i) => (i.type === 'person' ? i.data.member.name : i.data.name));

  it('leaves a tree with one top person unchanged', () => {
    const tree = buildOrgTree(smallTeam);
    expect(orgToGroupedItems(tree, 'Gitgi')).toEqual(orgToItems(tree));
  });

  it('returns [] for an empty chart', () => {
    expect(orgToGroupedItems(buildOrgTree([]), 'Gitgi')).toEqual([]);
  });

  it('puts several top people under one company box', () => {
    const [company] = orgToGroupedItems(buildOrgTree(partlyManaged), 'Gitgi');
    expect(company).toMatchObject({
      id: 'company',
      type: 'orgGroup',
      data: { variant: 'company', name: 'Gitgi', summary: '10 people' },
    });
    // Managers keep their branch first; then one box per department, Unassigned last.
    expect(labels(company.children)).toEqual([
      'Aarav Sharma',
      'Bishal Sharma',
      'HR',
      'IT',
      'Marketing',
      'Unassigned',
    ]);
  });

  it('groups people with no manager and no reports by department', () => {
    const [company] = orgToGroupedItems(buildOrgTree(partlyManaged), 'Gitgi');
    const it = company.children.find((c) => c.id === 'unmanaged:id:2')!;
    expect(it.data).toMatchObject({
      variant: 'team',
      name: 'IT',
      summary: 'No reporting manager · 2 people',
    });
    expect(labels(it.children)).toEqual(['Kiran Bhandari', 'Ram Thapa']);
    // Aarav's branch is untouched.
    expect(labels(company.children[0].children)).toEqual(['John Doe']);
  });

  it('handles a fresh install with two people and no managers', () => {
    const [company] = orgToGroupedItems(buildOrgTree(twoPeopleNoManagers), '');
    expect(company.data).toMatchObject({ name: 'Company', summary: '2 people' });
    expect(labels(company.children)).toEqual(['IT', 'Unassigned']);
    expect(company.children.map((c) => c.data)).toEqual([
      expect.objectContaining({ summary: 'No reporting manager · 1 person' }),
      expect.objectContaining({ summary: 'No reporting manager · 1 person' }),
    ]);
  });

  it('keeps every person exactly once, so search and Find me still work', () => {
    const items = orgToGroupedItems(buildOrgTree(partlyManaged), 'Gitgi');
    const people = walk(items).filter((i) => i.type === 'person');
    expect(people.map((p) => p.id).sort((a, b) => +a - +b)).toEqual(
      partlyManaged.map((m) => String(m.id)),
    );
    expect(ancestorIds(parentMap(items), '6')).toEqual(['company', 'unmanaged:id:2']);
  });
});
