import { Suspense } from 'react';
import OrgChartPage from '@/features/org-chart/components/OrgChartPage';

export default function Page() {
  // OrgChartPage reads the URL query (useSearchParams), which Next needs
  // inside a Suspense boundary on a statically rendered route.
  return (
    <Suspense>
      <OrgChartPage />
    </Suspense>
  );
}
