import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { OrgChartMember, OrgNode, OrgTree, TeamChartNode } from '../types';

export const NODE_WIDTH = 240;
export const NODE_HEIGHT = 72;
const H_GAP = 32;
const V_GAP = 56;

export type PersonNodeData = {
  member: OrgChartMember;
  directCount: number;
  totalCount: number;
};
export type GroupNodeData = {
  variant: 'company' | 'team';
  name: string;
  /** Second line, e.g. "7 teams · 21 people". */
  summary: string;
};
export type PersonFlowNode = Node<PersonNodeData, 'person'>;
export type GroupFlowNode = Node<GroupNodeData, 'orgGroup'>;
// Not 'group': React Flow has built-in styles for that type name.
export type ChartFlowNode = PersonFlowNode | GroupFlowNode;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Positions any tree top-down (parent above children) with dagre and returns
 * React Flow nodes and parent → child edges. Children must already be in
 * display order; dagre keeps siblings in insertion order.
 */
function layoutTree<T extends { children: readonly T[] }>(
  roots: readonly T[],
  idOf: (item: T) => string,
  toNode: (item: T) => Pick<ChartFlowNode, 'type' | 'data'>,
): { nodes: ChartFlowNode[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: H_GAP, ranksep: V_GAP, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));

  const ordered: T[] = [];
  const stack: T[] = [...roots].reverse();
  while (stack.length) {
    const item = stack.pop()!;
    ordered.push(item);
    g.setNode(idOf(item), { width: NODE_WIDTH, height: NODE_HEIGHT });
    for (let i = item.children.length - 1; i >= 0; i--) stack.push(item.children[i]);
  }

  const edges: Edge[] = [];
  for (const item of ordered) {
    const source = idOf(item);
    for (const child of item.children) {
      const target = idOf(child);
      g.setEdge(source, target);
      edges.push({ id: `${source}->${target}`, source, target, type: 'smoothstep' });
    }
  }

  dagre.layout(g);

  const nodes = ordered.map((item) => {
    const id = idOf(item);
    const { x, y } = g.node(id);
    return {
      ...toNode(item),
      id,
      // dagre gives the centre; React Flow wants the top-left corner.
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      draggable: false,
      connectable: false,
    } as ChartFlowNode;
  });

  return { nodes, edges };
}

/** People view: the reporting tree. */
export function layoutOrgChart(tree: OrgTree) {
  return layoutTree<OrgNode>(
    tree.roots,
    (n) => String(n.member.id),
    ({ member, directCount, totalCount }) => ({
      type: 'person',
      data: { member, directCount, totalCount },
    }),
  );
}

/** Teams view: company → departments → people. */
export function layoutTeamChart(root: TeamChartNode) {
  return layoutTree<TeamChartNode>(
    [root],
    (n) => n.id,
    (n) => {
      switch (n.kind) {
        case 'person':
          return {
            type: 'person',
            data: { member: n.member, directCount: n.directCount, totalCount: n.totalCount },
          };
        case 'team':
          return {
            type: 'orgGroup',
            data: {
              variant: 'team',
              name: n.name,
              summary: plural(n.peopleCount, 'person', 'people'),
            },
          };
        case 'company':
          return {
            type: 'orgGroup',
            data: {
              variant: 'company',
              name: n.name,
              summary: `${plural(n.teamCount, 'team', 'teams')} · ${plural(n.peopleCount, 'person', 'people')}`,
            },
          };
      }
    },
  );
}

/**
 * Viewport for a chart too big to read when fitted whole: the given zoom,
 * with the top row centred horizontally and pinned `topMargin` px below the
 * top edge, so the user starts at the top of the tree and pans down.
 */
export function topAnchoredViewport(
  nodes: readonly ChartFlowNode[],
  viewportWidth: number,
  zoom: number,
  topMargin = 32,
): { x: number; y: number; zoom: number } {
  if (!nodes.length) return { x: 0, y: 0, zoom };
  const minY = Math.min(...nodes.map((n) => n.position.y));
  const topRow = nodes.filter((n) => n.position.y <= minY + 1);
  const left = Math.min(...topRow.map((n) => n.position.x));
  const right = Math.max(...topRow.map((n) => n.position.x + NODE_WIDTH));
  const centreX = (left + right) / 2;
  return { x: viewportWidth / 2 - centreX * zoom, y: topMargin - minY * zoom, zoom };
}
