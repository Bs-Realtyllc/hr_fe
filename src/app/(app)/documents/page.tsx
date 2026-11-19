'use client';
import PolicyDocuments from '@/components/PolicyDocuments';

export default function DocumentsPage() {
  return (
    <PolicyDocuments
      category="policy"
      heading="Documents & Signature"
      adminSubtitle="Publish policies, handbooks, and other documents for the team to review and sign."
      employeeSubtitle="Download, review, and sign the documents below."
      emptyMessage="No documents have been published yet."
    />
  );
}
