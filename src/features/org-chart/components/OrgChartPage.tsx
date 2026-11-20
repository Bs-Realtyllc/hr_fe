'use client';
import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyName } from '../hooks/useCompanyName';
import { useOrgChart } from '../hooks/useOrgChart';
import { profileHrefFor } from '../utils/profileLink';
import type { OrgChartViewMode } from '../types';
import OrgChartView from './OrgChartView';

/** /org-chart — visible to every signed-in employee. */
export default function OrgChartPage() {
  const { user } = useAuth();
  const { tree, isLoading, error, refetch } = useOrgChart();
  const companyName = useCompanyName();
  const [view, setView] = useState<OrgChartViewMode>('people');

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
    />
  );
}
