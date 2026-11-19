'use client';
import Button from '@/components/ui/Button/Button';
import PillTabs from '@/components/ui/PillTabs';
import type { OrgChartViewMode, OrgTree } from '../types';
import OrgChartCanvas from './OrgChartCanvas';

const VIEW_OPTIONS: { value: OrgChartViewMode; label: string }[] = [
  { value: 'people', label: 'People' },
  { value: 'teams', label: 'Teams' },
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
  /** Shown at the top of the Teams view. */
  companyName: string;
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
}: OrgChartViewProps) {
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
          onChange={(v) => onViewChange(v as OrgChartViewMode)}
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
      ) : (
        <OrgChartCanvas
          tree={tree}
          view={view}
          companyName={companyName}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
