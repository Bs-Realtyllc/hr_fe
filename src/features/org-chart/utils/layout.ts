import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { OrgTree, TeamChartNode } from '../types';
import {
  descendantCount,
  orgToItems,
  teamToItems,
  type ChartItem,
  type GroupItemData,
  type PersonItemData,
} from './chartItems';

export const NODE_WIDTH = 240;
export const NODE_HEIGHT = 72;
const H_GAP = 32;
const V_GAP = 56;

/** Collapse/expand state shown on a card's toggle button. */
export type ToggleInfo = {
  /** Number of direct children in the full tree (0 = no toggle). */
  childCount: number;
  collapsed: boolean;
  /** People/boxes hidden below this card while collapsed. */
  hiddenCount: number;
};
export type PersonNodeData = PersonItemData & ToggleInfo;
export type GroupNodeData = GroupItemData & ToggleInfo;
export type PersonFlowNode = Node<PersonNodeData, 'person'>;
// Not 'group': React Flow has built-in styles for that type name.
export type GroupFlowNode = Node<GroupNodeData, 'orgGroup'>;
export type ChartFlowNode = PersonFlowNode | GroupFlowNode;

const NONE: ReadonlySet<string> = new Set();

/**
 * Positions the visible part of a tree top-down (parent above children) with
 * dagre and returns React Flow nodes and parent → child edges. Children of
 * collapsed items are left out. Siblings keep their order.
 */
export function layoutItems(
  roots: readonly ChartItem[],
  collapsed: ReadonlySet<string> = NONE,
): { nodes: ChartFlowNode[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: H_GAP, ranksep: V_GAP, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));

  const visible: ChartItem[] = [];
  const stack = [...roots].reverse();
  while (stack.length) {
    const item = stack.pop()!;
    visible.push(item);
    g.setNode(item.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    if (collapsed.has(item.id)) continue;
    for (let i = item.children.length - 1; i >= 0; i--) stack.push(item.children[i]);
  }

  const edges: Edge[] = [];
  for (const item of visible) {
    if (collapsed.has(item.id)) continue;
    for (const child of item.children) {
      g.setEdge(item.id, child.id);
      edges.push({
        id: `${item.id}->${child.id}`,
        source: item.id,
        target: child.id,
        type: 'smoothstep',
      });
    }
  }

  dagre.layout(g);

  const nodes = visible.map((item) => {
    const { x, y } = g.node(item.id);
    const isCollapsed = collapsed.has(item.id) && item.children.length > 0;
    return {
      id: item.id,
      type: item.type,
      data: {
        ...item.data,
        childCount: item.children.length,
        collapsed: isCollapsed,
        hiddenCount: isCollapsed ? descendantCount(item) : 0,
      },
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
export function layoutOrgChart(tree: OrgTree, collapsed?: ReadonlySet<string>) {
  return layoutItems(orgToItems(tree), collapsed);
}

/** Teams view: company → departments → people. */
export function layoutTeamChart(root: TeamChartNode, collapsed?: ReadonlySet<string>) {
  return layoutItems(teamToItems(root), collapsed);
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
