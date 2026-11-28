'use client';

import { useEffect, useRef, useState } from 'react';
import { Paperclip, Download, X } from 'lucide-react';
import { api } from '@/lib/api';
import { showToast } from '@/lib/toast';
import Button from '@/components/ui/Button/Button';
import { IssueAttachment } from './types';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentsSection({
  projectId, issueId,
}: {
  projectId: number;
  issueId: number;
}) {
  const [attachments, setAttachments] = useState<IssueAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const rows = await api.get<IssueAttachment[]>(`/projects/${projectId}/issues/${issueId}/attachments`);
      setAttachments(rows);
    } catch {
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [issueId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.postForm(`/projects/${projectId}/issues/${issueId}/attachments`, formData);
      await load();
    } catch (err) {
      showToast('error', (err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDownload(attachment: IssueAttachment) {
    try {
      const blob = await api.download(`/projects/${projectId}/issues/${issueId}/attachments/${attachment.id}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast('error', (err as Error).message);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/projects/${projectId}/issues/${issueId}/attachments/${id}`);
      await load();
    } catch (err) {
      showToast('error', (err as Error).message);
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14, marginTop: 14 }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 10 }}>
        <div className="card-title" style={{ marginBottom: 0, fontSize: 13 }}>Attachments</div>
        <Button variant="text" size="small" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Paperclip size={14} /> {uploading ? 'Uploading…' : 'Attach file'}
        </Button>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
      </div>

      {loading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : attachments.length === 0 ? (
        <p className="text-muted text-sm">No attachments yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center justify-between" style={{ fontSize: 13 }}>
              <button
                onClick={() => handleDownload(a)}
                className="card-link flex items-center gap-2"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Download size={13} />
                {a.file_name}
                <span className="text-muted" style={{ fontSize: 11 }}>({formatSize(a.file_size)})</span>
              </button>
              <button
                onClick={() => handleDelete(a.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
