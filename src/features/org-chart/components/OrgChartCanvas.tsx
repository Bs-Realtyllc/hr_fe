'use client';
import '@xyflow/react/dist/style.css';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
  type ReactFlowInstance,
} from '@xyflow/react';
import { LocateFixed } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import type { OrgChartMember, OrgChartViewMode, OrgTree, RevealRequest } from '../types';

/** The canvas draws these two; the Outline view is a separate list component. */
type CanvasView = Exclude<OrgChartViewMode, 'outline'>;
import { buildTeamTree } from '../utils/buildTeamTree';
import {
  ancestorIds,
  defaultCollapsed,
  orgToGroupedItems,
  parentMap,
  personId,
  teamToItems,
} from '../utils/chartItems';
import {
  layoutItems,
  NODE_HEIGHT,
  NODE_WIDTH,
  topAnchoredViewport,
  type ChartFlowNode,
} from '../utils/layout';
import GroupNode from './GroupNode';
import { OrgChartContext, type OrgChartContextValue } from './OrgChartContext';
import OrgChartSearch from './OrgChartSearch';
import PersonNode from './PersonNode';

// Defined once at module level: a new object each render makes React Flow
// re-mount every node.
const nodeTypes: NodeTypes = { person: PersonNode, orgGroup: GroupNode };

/** Below this zoom, cards are too small to read. */
const MIN_READABLE_ZOOM = 0.5;
const FIT_PADDING = 0.2;
const FOCUS_ZOOM = 0.9;
const HIGHLIGHT_MS = 2500;
/** Space for the search / Find me toolbar above the top row. */
const TOOLBAR_CLEARANCE = 72;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export interface OrgChartCanvasProps {
  tree: OrgTree;
  /** 'people' = reporting tree; 'teams' = company → departments → people. */
  view?: CanvasView;
  /** Top box of the Teams view. */
  companyName?: string;
  currentUserId?: number | null;
  /** Clicking a person card calls this; omit to make cards plain. */
  onOpenPerson?: (employeeId: number) => void;
  /** Employee whose details are open (their card is outlined). */
  selectedEmployeeId?: number | null;
  /** Reveal a node when this changes (e.g. picked in the details panel). */
  revealRequest?: RevealRequest | null;
}

/** Pan/zoom canvas of the org chart. Read-only: no dragging or connecting. */
export default function OrgChartCanvas({
  tree,
  view = 'people',
  companyName = '',
  currentUserId = null,
  onOpenPerson,
  selectedEmployeeId = null,
  revealRequest = null,
}: OrgChartCanvasProps) {
  // Collapse state per view, kept here so switching views and back keeps it.
  // null = the user hasn't toggled anything yet: use the default.
  const [collapsedByView, setCollapsedByView] = useState<Record<CanvasView, Set<string> | null>>({
    people: null,
    teams: null,
  });

  return (
    // New provider per view: fresh viewport and a fresh initial fit.
    <ReactFlowProvider key={view}>
      <CanvasInner
        tree={tree}
        view={view}
        companyName={companyName}
        currentUserId={currentUserId}
        onOpenPerson={onOpenPerson}
        selectedEmployeeId={selectedEmployeeId}
        revealRequest={revealRequest}
        userCollapsed={collapsedByView[view]}
        setUserCollapsed={(next) => setCollapsedByView((prev) => ({ ...prev, [view]: next }))}
      />
    </ReactFlowProvider>
  );
}

interface CanvasInnerProps extends Required<
  Omit<OrgChartCanvasProps, 'onOpenPerson' | 'revealRequest'>
> {
  onOpenPerson: OrgChartCanvasProps['onOpenPerson'];
  revealRequest: RevealRequest | null;
  userCollapsed: Set<string> | null;
  setUserCollapsed: (next: Set<string>) => void;
}

function CanvasInner({
  tree,
  view,
  companyName,
  currentUserId,
  onOpenPerson,
  selectedEmployeeId,
  revealRequest,
  userCollapsed,
  setUserCollapsed,
}: CanvasInnerProps) {
  const rf = useReactFlow<ChartFlowNode>();
  const containerRef = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () =>
      view === 'teams'
        ? teamToItems(buildTeamTree(tree, companyName))
        : orgToGroupedItems(tree, companyName),
    [tree, view, companyName],
  );
  const parents = useMemo(() => parentMap(items), [items]);
  const fallbackCollapsed = useMemo(() => defaultCollapsed(items), [items]);
  const collapsed = userCollapsed ?? fallbackCollapsed;

  const setCollapsed = useCallback(
    (update: SetStateAction<Set<string>>) =>
      setUserCollapsed(typeof update === 'function' ? update(collapsed) : update),
    [collapsed, setUserCollapsed],
  );

  const { nodes, edges } = useMemo(() => layoutItems(items, collapsed), [items, collapsed]);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // ── Highlight (search / Find me) ──
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  const focusNode = useCallback(
    (id: string) => {
      const node = nodesRef.current.find((n) => n.id === id);
      if (!node) return;
      void rf.setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + NODE_HEIGHT / 2, {
        zoom: Math.max(rf.getZoom(), FOCUS_ZOOM),
        duration: prefersReducedMotion() ? 0 : 400,
      });
      setHighlightedId(id);
      clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);
    },
    [rf],
  );

  // After a layout change, finish whatever asked for it.
  const pendingFocus = useRef<string | null>(null);
  const anchor = useRef<{ id: string; x: number; y: number } | null>(null);
  useEffect(() => {
    if (anchor.current) {
      // Keep the toggled card under the cursor: shift the viewport by however
      // far the re-layout moved it.
      const { id, x, y } = anchor.current;
      anchor.current = null;
      const moved = nodes.find((n) => n.id === id);
      if (moved) {
        const vp = rf.getViewport();
        void rf.setViewport({
          x: vp.x - (moved.position.x - x) * vp.zoom,
          y: vp.y - (moved.position.y - y) * vp.zoom,
          zoom: vp.zoom,
        });
      }
    }
    if (pendingFocus.current) {
      const id = pendingFocus.current;
      pendingFocus.current = null;
      focusNode(id);
    }
  }, [nodes, rf, focusNode]);

  const toggle = useCallback(
    (id: string) => {
      const node = nodesRef.current.find((n) => n.id === id);
      if (node) anchor.current = { id, ...node.position };
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [setCollapsed],
  );

  /** Expand every collapsed box above `id`, then centre on it and highlight it. */
  const reveal = useCallback(
    (id: string) => {
      if (!parents.has(id)) return;
      const hiddenBy = ancestorIds(parents, id).filter((a) => collapsed.has(a));
      if (!hiddenBy.length) {
        focusNode(id);
        return;
      }
      pendingFocus.current = id;
      setCollapsed((prev) => {
        const next = new Set(prev);
        for (const a of hiddenBy) next.delete(a);
        return next;
      });
    },
    [parents, collapsed, focusNode, setCollapsed],
  );

  const members = useMemo<OrgChartMember[]>(
    () => [...tree.byId.values()].map((n) => n.member),
    [tree],
  );
  const meId = currentUserId != null ? personId(currentUserId) : null;
  const canFindMe = meId != null && parents.has(meId);

  // Show the whole chart if it fits at a readable size; otherwise start at
  // the top of the tree at a readable zoom and let the user pan from there.
  // Reveal on request (e.g. a manager picked in the details panel).
  const revealRef = useRef(reveal);
  revealRef.current = reveal;
  const initialised = useRef(false);
  const requestRef = useRef(revealRequest);
  requestRef.current = revealRequest;
  useEffect(() => {
    // Before init the initial fit would override it; handleInit reveals instead.
    if (revealRequest && initialised.current) revealRef.current(revealRequest.id);
  }, [revealRequest]);

  const handleInit = useCallback(async (instance: ReactFlowInstance<ChartFlowNode>) => {
    await instance.fitView({ padding: FIT_PADDING, maxZoom: 1 });
    if (instance.getZoom() < MIN_READABLE_ZOOM) {
      const width = containerRef.current?.clientWidth ?? 0;
      await instance.setViewport(
        topAnchoredViewport(nodesRef.current, width, MIN_READABLE_ZOOM, TOOLBAR_CLEARANCE),
      );
    }
    initialised.current = true;
    // Switching views keeps the open person in sight.
    if (requestRef.current) revealRef.current(requestRef.current.id);
  }, []);

  const context = useMemo<OrgChartContextValue>(
    () => ({
      currentUserId,
      highlightedId,
      toggle,
      showDepartment: view === 'people',
      openPerson: onOpenPerson,
      selectedEmployeeId,
    }),
    [currentUserId, highlightedId, toggle, view, onOpenPerson, selectedEmployeeId],
  );

  return (
    <OrgChartContext.Provider value={context}>
      <div className="org-canvas" ref={containerRef}>
        <ReactFlow
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
          <Panel position="top-left">
            <OrgChartSearch members={members} onSelect={(m) => reveal(personId(m.id))} />
          </Panel>
          {canFindMe && (
            <Panel position="top-right">
              <button
                type="button"
                className="org-findme nodrag nopan"
                onClick={() => reveal(meId)}
              >
                <LocateFixed size={16} aria-hidden="true" />
                Find me
              </button>
            </Panel>
          )}
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls
            showInteractive={false}
            position="bottom-right"
            fitViewOptions={{ padding: FIT_PADDING }}
          />
          <MiniMap pannable zoomable position="bottom-left" ariaLabel="Org chart overview" />
        </ReactFlow>
      </div>
    </OrgChartContext.Provider>
  );
}
