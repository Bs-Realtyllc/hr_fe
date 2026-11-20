'use client';
import { useCallback, useState } from 'react';
import Button from '@/components/ui/Button/Button';
import PillTabs from '@/components/ui/PillTabs';
import type { OrgChartViewMode, OrgTree, RevealRequest } from '../types';
import { personId } from '../utils/chartItems';
import OrgChartCanvas from './OrgChartCanvas';
import OrgChartOutline from './OrgChartOutline';
import OrgPersonPanel from './OrgPersonPanel';

const VIEW_OPTIONS: { value: OrgChartViewMode; label: string }[] = [
  { value: 'people', label: 'People' },
  { value: 'teams', label: 'Teams' },
  { value: 'outline', label: 'Outline' },
];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface OrgChartViewProps {
  tree: OrgTree | undefined;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  currentUserId: number | null;
  view: OrgChartViewMode;
  onViewChange: (view: OrgChartViewMode) => void;
  /** Shown at the top of the tree when there is no single top person. */
  companyName: string;
  /** Link for "View full profile", or null when the viewer may not open it. */
  profileHref: (employeeId: number) => string | null;
}

/** The org chart page without data fetching, so every state can be shown in Storybook and tests. */
export default function OrgChartView({
  tree,
  isLoading,
  error,
  onRetry,
  currentUserId,
  view,
  onViewChange,
  companyName,
  profileHref,
}: OrgChartViewProps) {
  // Outline open/closed state lives here so it survives switching views.
  const [outlineCollapsed, setOutlineCollapsed] = useState<Set<string> | null>(null);

  // ── Person details panel ──
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [revealRequest, setRevealRequest] = useState<RevealRequest | null>(null);
  const selected = selectedId != null ? tree?.byId.get(selectedId) : undefined;

  const openPerson = useCallback((id: number) => setSelectedId(id), []);
  // From the panel: show that person and bring them into view.
  const goToPerson = useCallback((id: number) => {
    setSelectedId(id);
    setRevealRequest((prev) => ({ id: personId(id), seq: (prev?.seq ?? 0) + 1 }));
  }, []);
  const closePanel = useCallback(() => setSelectedId(null), []);

  // Switching views keeps the open person in sight in the new view.
  const changeView = (next: OrgChartViewMode) => {
    onViewChange(next);
    if (selected) goToPerson(selected.member.id);
  };

  return (
    <div className="org-page">
      <div className="page-header org-page__header">
        <div>
          <h1>Org chart</h1>
          {tree && tree.stats.people > 0 && (
            <p>
              {[
                plural(tree.stats.people, 'person', 'people'),
                plural(tree.stats.levels, 'level', 'levels'),
                tree.stats.departments > 0 &&
                  plural(tree.stats.departments, 'department', 'departments'),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
        <PillTabs
          options={VIEW_OPTIONS}
          value={view}
          onChange={(v) => changeView(v as OrgChartViewMode)}
        />
      </div>

      {isLoading ? (
        <div className="org-canvas org-canvas--state" role="status" aria-live="polite">
          Loading org chart…
        </div>
      ) : error ? (
        <div className="org-canvas org-canvas--state" role="alert">
          <p>{error}</p>
          <Button variant="primary" size="small" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : !tree || tree.stats.people === 0 ? (
        <div className="org-canvas org-canvas--state">
          <p>No one is on the org chart yet.</p>
        </div>
      ) : view === 'outline' ? (
        <OrgChartOutline
          tree={tree}
          companyName={companyName}
          currentUserId={currentUserId}
          collapsed={outlineCollapsed}
          onCollapsedChange={setOutlineCollapsed}
          onOpenPerson={openPerson}
          selectedEmployeeId={selected ? selectedId : null}
          revealRequest={revealRequest}
        />
      ) : (
        <OrgChartCanvas
          tree={tree}
          view={view}
          companyName={companyName}
          currentUserId={currentUserId}
          onOpenPerson={openPerson}
          selectedEmployeeId={selected ? selectedId : null}
          revealRequest={revealRequest}
        />
      )}

      {tree && selected && (
        <OrgPersonPanel
          tree={tree}
          person={selected}
          currentUserId={currentUserId}
          profileHref={profileHref(selected.member.id)}
          onSelect={goToPerson}
          onClose={closePanel}
        />
      )}
    </div>
  );
}
