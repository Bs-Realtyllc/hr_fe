'use client';
import type { PdfPreview } from './SignedDocumentsCard';

export default function PdfPreviewModal({ previewFor, setPreviewFor }: { previewFor: PdfPreview | null; setPreviewFor: (p: PdfPreview | null) => void }) {
  if (!previewFor) return null;
  return (
    <div className="modal-overlay" onClick={() => setPreviewFor(null)}>
      <div
        className="modal"
        style={{
          maxWidth: 860,
          width: '100%',
          height: 'min(720px, calc(100vh - 96px))',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" style={{ padding: '18px 24px', marginBottom: 0, borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: 16 }}>{previewFor.title}</h2>
          <button className="modal-close" onClick={() => setPreviewFor(null)}>×</button>
        </div>
        <iframe
          src={`${previewFor.url}#toolbar=0&navpanes=0`}
          title={previewFor.title}
          style={{ flex: 1, width: '100%', border: 'none', background: 'var(--color-bg)' }}
        />
      </div>
    </div>
  );
}
