'use client';
import { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useParams, useRouter } from 'next/navigation';
import { useEmployeeDetail } from '../hooks/useEmployeeDetail';
import { useAcknowledgements } from '../hooks/useAcknowledgements';
import EmployeeSummaryCard from './EmployeeSummaryCard';
import SignedDocumentsCard, { type PdfPreview } from './SignedDocumentsCard';
import EmployeeProjectsCard from './EmployeeProjectsCard';
import PdfPreviewModal from './PdfPreviewModal';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = usePermissions();

  // Both load in parallel on mount (acknowledgements only for admins).
  const { employee, projects, loading } = useEmployeeDetail(id);
  const ackState = useAcknowledgements(id, isAdmin);
  const [previewFor, setPreviewFor] = useState<PdfPreview | null>(null);

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!employee) return <p className="text-muted">Employee not found.</p>;

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => router.push('/employees')}>
        ← Back to Team Directory
      </button>

      <EmployeeSummaryCard employee={employee} />

      {/* ── Documents (admin only) ──────────────────────────────────────── */}
      {isAdmin && <SignedDocumentsCard employee={employee} ackState={ackState} setPreviewFor={setPreviewFor} />}

      {/* ── Projects ─────────────────────────────────────────────────────── */}
      <EmployeeProjectsCard projects={projects} />

      {/* ── PDF preview modal ───────────────────────────────────────────── */}
      <PdfPreviewModal previewFor={previewFor} setPreviewFor={setPreviewFor} />
    </div>
  );
}
