'use client';
import '@xyflow/react/dist/style.css';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type NodeTypes,
  type ReactFlowInstance,
} from '@xyflow/react';
import { useCallback, useMemo, useRef } from 'react';
import type { OrgChartViewMode, OrgTree } from '../types';
import { buildTeamTree } from '../utils/buildTeamTree';
import {
  layoutOrgChart,
  layoutTeamChart,
  topAnchoredViewport,
  type ChartFlowNode,
} from '../utils/layout';
import { CurrentUserIdContext } from './currentUser';
import GroupNode from './GroupNode';
import PersonNode from './PersonNode';

// Defined once at module level: a new object each render makes React Flow
// re-mount every node.
const nodeTypes: NodeTypes = { person: PersonNode, orgGroup: GroupNode };

/** Below this zoom, cards are too small to read. */
const MIN_READABLE_ZOOM = 0.5;
const FIT_PADDING = 0.2;

export interface OrgChartCanvasProps {
  tree: OrgTree;
  /** 'people' = reporting tree; 'teams' = company → departments → people. */
  view?: OrgChartViewMode;
  /** Top box of the Teams view. */
  companyName?: string;
  currentUserId?: number | null;
}

/** Pan/zoom canvas of the org chart. Read-only: no dragging or connecting. */
export default function OrgChartCanvas({
  tree,
  view = 'people',
  companyName = '',
  currentUserId = null,
}: OrgChartCanvasProps) {
  const { nodes, edges } = useMemo(
    () =>
      view === 'teams' ? layoutTeamChart(buildTeamTree(tree, companyName)) : layoutOrgChart(tree),
    [tree, view, companyName],
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Show the whole chart if it fits at a readable size; otherwise start at
  // the top of the tree at a readable zoom and let the user pan from there.
  const handleInit = useCallback(
    async (rf: ReactFlowInstance<ChartFlowNode>) => {
      await rf.fitView({ padding: FIT_PADDING, maxZoom: 1 });
      if (rf.getZoom() >= MIN_READABLE_ZOOM) return;
      const width = containerRef.current?.clientWidth ?? 0;
      await rf.setViewport(topAnchoredViewport(nodes, width, MIN_READABLE_ZOOM));
    },
    [nodes],
  );

  return (
    <CurrentUserIdContext.Provider value={currentUserId}>
      <ReactFlowProvider>
        <div className="org-canvas" ref={containerRef}>
          <ReactFlow
            // Remount on view change so the new tree is fitted into view.
            key={view}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={handleInit}
            minZoom={0.1}
            maxZoom={2}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            edgesFocusable={false}
            onlyRenderVisibleElements
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls
              showInteractive={false}
              position="bottom-right"
              fitViewOptions={{ padding: FIT_PADDING }}
            />
            <MiniMap pannable zoomable position="bottom-left" ariaLabel="Org chart overview" />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    </CurrentUserIdContext.Provider>
  );
}
