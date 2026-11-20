import { describe, expect, it } from 'vitest';
import { largeCompany, multipleRoots, smallTeam } from '../fixtures';
import { buildOrgTree } from './buildOrgTree';
import { buildTeamTree } from './buildTeamTree';
import { defaultCollapsed, orgToItems } from './chartItems';
import {
  layoutOrgChart,
  layoutTeamChart,
  NODE_HEIGHT,
  NODE_WIDTH,
  topAnchoredViewport,
} from './layout';

const overlaps = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) < NODE_WIDTH && Math.abs(a.y - b.y) < NODE_HEIGHT;

describe('layoutOrgChart', () => {
  it('returns nothing for an empty tree', () => {
    expect(layoutOrgChart(buildOrgTree([]))).toEqual({ nodes: [], edges: [] });
  });

  it('creates one node per person and one edge per reporting line', () => {
    const { nodes, edges } = layoutOrgChart(buildOrgTree(smallTeam));
    expect(nodes.map((n) => n.id).sort()).toEqual(smallTeam.map((m) => String(m.id)).sort());
    const managed = smallTeam.filter((m) => m.manager_id != null);
    expect(edges).toHaveLength(managed.length);
    for (const m of managed) {
      expect(edges).toContainEqual(
        expect.objectContaining({ source: String(m.manager_id), target: String(m.id) }),
      );
    }
  });

  it('places every manager above their reports', () => {
    const { nodes, edges } = layoutOrgChart(buildOrgTree(smallTeam));
    const pos = new Map(nodes.map((n) => [n.id, n.position]));
    for (const e of edges) expect(pos.get(e.source)!.y).toBeLessThan(pos.get(e.target)!.y);
  });

  it('never overlaps two cards, even for a large company', () => {
    for (const rows of [smallTeam, multipleRoots, largeCompany()]) {
      const { nodes } = layoutOrgChart(buildOrgTree(rows));
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          expect(overlaps(nodes[i].position, nodes[j].position)).toBe(false);
        }
      }
    }
  });

  it('keeps siblings in name order from left to right', () => {
    const tree = buildOrgTree(smallTeam);
    const { nodes } = layoutOrgChart(tree);
    const x = new Map(nodes.map((n) => [n.id, n.position.x]));
    const reports = tree.byId.get(2)!.children.map((c) => String(c.member.id)); // John, Priya
    expect(x.get(reports[0])!).toBeLessThan(x.get(reports[1])!);
  });

  it('marks nodes read-only', () => {
    const { nodes } = layoutOrgChart(buildOrgTree(smallTeam));
    expect(nodes.every((n) => n.draggable === false && n.connectable === false)).toBe(true);
  });
});

describe('layoutOrgChart with collapsed boxes', () => {
  const tree = buildOrgTree(smallTeam);

  it('hides everyone below a collapsed box and its edges', () => {
    const { nodes, edges } = layoutOrgChart(tree, new Set(['2'])); // Aarav
    expect(nodes.map((n) => n.id).sort()).toEqual(['1', '2', '3', '7']);
    expect(edges.some((e) => e.source === '2')).toBe(false);
  });

  it('reports toggle info on each card', () => {
    const { nodes } = layoutOrgChart(tree, new Set(['2']));
    const byId = new Map(nodes.map((n) => [n.id, n.data]));
    expect(byId.get('2')).toMatchObject({ childCount: 2, collapsed: true, hiddenCount: 3 });
    expect(byId.get('1')).toMatchObject({ childCount: 2, collapsed: false, hiddenCount: 0 });
    expect(byId.get('7')).toMatchObject({ childCount: 0, collapsed: false });
  });

  it('ignores a collapsed id with no children', () => {
    const { nodes } = layoutOrgChart(tree, new Set(['7']));
    expect(nodes).toHaveLength(smallTeam.length);
    expect(nodes.find((n) => n.id === '7')!.data.collapsed).toBe(false);
  });

  it('shows only the top three rows of a large company by default', () => {
    const big = buildOrgTree(largeCompany());
    const { nodes } = layoutOrgChart(big, defaultCollapsed(orgToItems(big)));
    expect(nodes).toHaveLength(1 + 6 + 30);
  });
});

describe('layoutTeamChart', () => {
  const { nodes, edges } = layoutTeamChart(buildTeamTree(buildOrgTree(smallTeam), 'Gitgi'));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  it('creates company, team and person nodes', () => {
    expect(nodes).toHaveLength(1 + 3 + smallTeam.length);
    expect(byId.get('company')).toMatchObject({
      type: 'orgGroup',
      data: { variant: 'company', name: 'Gitgi', summary: '3 teams · 7 people' },
    });
    expect(byId.get('team:id:2')).toMatchObject({
      type: 'orgGroup',
      data: { variant: 'team', name: 'IT', summary: '4 people' },
    });
    expect(byId.get('4')).toMatchObject({ type: 'person', data: { directCount: 1 } });
  });

  it('links company → teams → people, parents above children', () => {
    expect(edges).toContainEqual(
      expect.objectContaining({ source: 'company', target: 'team:id:2' }),
    );
    expect(edges).toContainEqual(expect.objectContaining({ source: 'team:id:2', target: '2' }));
    expect(edges).toContainEqual(expect.objectContaining({ source: '2', target: '4' }));
    for (const e of edges) {
      expect(byId.get(e.source)!.position.y).toBeLessThan(byId.get(e.target)!.position.y);
    }
  });

  it('never overlaps two cards for a large company', () => {
    const big = layoutTeamChart(buildTeamTree(buildOrgTree(largeCompany()), 'Co')).nodes;
    for (let i = 0; i < big.length; i++) {
      for (let j = i + 1; j < big.length; j++) {
        expect(overlaps(big[i].position, big[j].position)).toBe(false);
      }
    }
  });
});

describe('topAnchoredViewport', () => {
  it('returns a neutral viewport for no nodes', () => {
    expect(topAnchoredViewport([], 1000, 0.5)).toEqual({ x: 0, y: 0, zoom: 0.5 });
  });

  it('centres the top row horizontally and pins it near the top', () => {
    const { nodes } = layoutOrgChart(buildOrgTree(largeCompany()));
    const root = nodes.find((n) => n.id === '1')!;
    const vp = topAnchoredViewport(nodes, 1000, 0.5, 32);
    expect(vp.zoom).toBe(0.5);
    // Screen position = graph position * zoom + offset.
    const screenLeft = root.position.x * vp.zoom + vp.x;
    const screenTop = root.position.y * vp.zoom + vp.y;
    expect(screenLeft + (NODE_WIDTH * vp.zoom) / 2).toBeCloseTo(500);
    expect(screenTop).toBeCloseTo(32);
  });

  it('centres on the whole top row when there are several roots', () => {
    const { nodes } = layoutOrgChart(buildOrgTree(multipleRoots));
    const top = nodes.filter((n) => n.id === '1' || n.id === '2');
    const vp = topAnchoredViewport(nodes, 800, 1, 0);
    const left = Math.min(...top.map((n) => n.position.x)) + vp.x;
    const right = Math.max(...top.map((n) => n.position.x + NODE_WIDTH)) + vp.x;
    expect((left + right) / 2).toBeCloseTo(400);
  });
});
