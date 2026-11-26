'use client';
import type { ToggleInfo } from '../utils/layout';
import { useOrgChartContext } from './OrgChartContext';

/** The −/+N button under a card that hides or shows everyone below it. */
export default function NodeToggle({
  id,
  label,
  childCount,
  collapsed,
  hiddenCount,
}: ToggleInfo & { id: string; label: string }) {
  const { toggle } = useOrgChartContext();
  if (childCount === 0) return null;
  return (
    <button
      type="button"
      // nodrag/nopan: React Flow must not treat the click as a canvas pan.
      className="org-toggle nodrag nopan"
      aria-expanded={!collapsed}
      aria-label={collapsed ? `Show ${hiddenCount} below ${label}` : `Hide everyone below ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        toggle(id);
      }}
    >
      {collapsed ? `+${hiddenCount}` : '−'}
    </button>
  );
}
