import type { OrgChartViewMode } from '../types';

const VIEWS: readonly OrgChartViewMode[] = ['people', 'teams', 'outline'];
const DEFAULT_VIEW: OrgChartViewMode = 'people';

export interface OrgChartUrlState {
  view: OrgChartViewMode;
  /** Employee whose details panel is open. */
  personId: number | null;
}

/**
 * Reads ?view=teams&person=12. Anything unexpected (unknown view, non-numeric
 * or negative id) falls back to the defaults instead of breaking the page.
 */
export function parseOrgChartParams(params: {
  get(name: string): string | null;
}): OrgChartUrlState {
  const rawView = params.get('view');
  const view = VIEWS.includes(rawView as OrgChartViewMode)
    ? (rawView as OrgChartViewMode)
    : DEFAULT_VIEW;
  const rawPerson = params.get('person');
  const n = rawPerson && /^\d{1,10}$/.test(rawPerson) ? Number(rawPerson) : NaN;
  const personId = Number.isSafeInteger(n) && n > 0 ? n : null;
  return { view, personId };
}

/**
 * The query string for a state, keeping any other params that were already
 * there. Defaults are left out, so a plain visit stays "/org-chart".
 */
export function orgChartSearch(state: OrgChartUrlState, current = ''): string {
  const params = new URLSearchParams(current);
  if (state.view === DEFAULT_VIEW) params.delete('view');
  else params.set('view', state.view);
  if (state.personId == null) params.delete('person');
  else params.set('person', String(state.personId));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
