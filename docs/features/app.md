```markdown
---
templateKey: resources-page
category: reference
requiresSignature: false
heading: Resources
adminSubtitle: Publish handbooks, roadmaps, and other reference material for the team.
employeeSubtitle: Download and review the documents below.
emptyMessage: No resources have been published yet.
---
'use client';
import PolicyDocuments from '@/components/PolicyDocuments';

export default function ResourcesPage() {
  return (
    <PolicyDocuments
      category="reference"
      requiresSignature={false}
      heading="Resources"
      adminSubtitle="Publish handbooks, roadmaps, and other reference material for the team."
      employeeSubtitle="Download and review the documents below."
      emptyMessage="No resources have been published yet."
    />
  );
}
```
