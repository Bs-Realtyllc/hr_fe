import { describe, expect, it } from 'vitest';
import { smallTeam } from '../fixtures';
import { buildOrgTree } from './buildOrgTree';
import { orgToItems } from './chartItems';
import { allParentIds, visibleRows } from './outline';

const items = orgToItems(buildOrgTree(smallTeam));
const ids = (rows: ReturnType<typeof visibleRows>) => rows.map((r) => r.item.id);

describe('visibleRows', () => {
  it('lists everyone top to bottom when nothing is collapsed', () => {
    // Sita → Aarav → John → Ram, Priya; Bishal → Maya
    expect(ids(visibleRows(items, new Set()))).toEqual(['1', '2', '4', '6', '5', '3', '7']);
  });

  it('hides everyone below a collapsed item', () => {
    expect(ids(visibleRows(items, new Set(['2'])))).toEqual(['1', '2', '3', '7']);
  });

  it('gives ARIA level, position and set size', () => {
    const rows = visibleRows(items, new Set());
    const byId = new Map(rows.map((r) => [r.item.id, r]));
    expect(byId.get('1')).toMatchObject({ level: 1, posInSet: 1, setSize: 1, parentId: null });
    expect(byId.get('3')).toMatchObject({ level: 2, posInSet: 2, setSize: 2, parentId: '1' });
    expect(byId.get('6')).toMatchObject({ level: 4, posInSet: 1, setSize: 1, parentId: '4' });
  });

  it('marks expandable and expanded rows', () => {
    const byId = new Map(visibleRows(items, new Set(['2'])).map((r) => [r.item.id, r]));
    expect(byId.get('2')).toMatchObject({ hasChildren: true, expanded: false });
    expect(byId.get('1')).toMatchObject({ hasChildren: true, expanded: true });
    expect(byId.get('7')).toMatchObject({ hasChildren: false, expanded: false });
  });

  it('returns [] for no items', () => {
    expect(visibleRows([], new Set())).toEqual([]);
  });
});

describe('allParentIds', () => {
  it('lists everyone who has someone below them', () => {
    expect([...allParentIds(items)].sort()).toEqual(['1', '2', '3', '4']);
  });
});
