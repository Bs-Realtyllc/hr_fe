'use client';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyName } from '../hooks/useCompanyName';
import { useOrgChart } from '../hooks/useOrgChart';
import type { OrgChartViewMode } from '../types';
import { profileHrefFor } from '../utils/profileLink';
import { orgChartSearch, parseOrgChartParams } from '../utils/url';
import OrgChartView from './OrgChartView';

/**
 * /org-chart — visible to every signed-in employee.
 * The view and the open person live in the URL (?view=teams&person=12), so a
 * refresh keeps your place and a link opens straight to someone.
 */
export default function OrgChartPage() {
  const { user } = useAuth();
  const { tree, isLoading, error, refetch } = useOrgChart();
  const companyName = useCompanyName();
  const searchParams = useSearchParams();

  // Read the URL once on arrival; after that the page state is the source of
  // truth and is written back to the URL.
  const [initial] = useState(() => parseOrgChartParams(searchParams));
  const [view, setView] = useState<OrgChartViewMode>(initial.view);
  const [personId, setPersonId] = useState<number | null>(initial.personId);

  // Once loaded, forget a person who isn't on the chart (left, or a bad link).
  const missing = personId != null && tree != null && !tree.byId.has(personId);
  useEffect(() => {
    if (missing) setPersonId(null);
  }, [missing]);

  // replaceState: no new history entry per click, and no server round-trip.
  // Next 14.1+ keeps useSearchParams in sync with it.
  useEffect(() => {
    const next = orgChartSearch({ view, personId }, window.location.search);
    if (next !== window.location.search) {
      window.history.replaceState(null, '', `${window.location.pathname}${next}`);
    }
  }, [view, personId]);

  const profileHref = useCallback((employeeId: number) => profileHrefFor(user, employeeId), [user]);

  return (
    <OrgChartView
      tree={tree}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      currentUserId={user?.id ?? null}
      view={view}
      onViewChange={setView}
      companyName={companyName}
      profileHref={profileHref}
      selectedEmployeeId={personId}
      onSelectedEmployeeChange={setPersonId}
    />
  );
}
