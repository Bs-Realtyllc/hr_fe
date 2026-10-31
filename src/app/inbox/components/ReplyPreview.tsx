'use client';

export interface ReplyTarget {
  id: string;
  userName: string;
  content: string;
}

interface ReplyPreviewProps {
  replyingTo: ReplyTarget;
  onCancel: () => void;
}

export function ReplyPreview({ replyingTo, onCancel }: ReplyPreviewProps) {
  const preview = replyingTo.content.slice(0, 100) + (replyingTo.content.length > 100 ? '…' : '');
  return (
    <div className="inbox-reply-preview">
      <div className="inbox-reply-preview-accent" />
      <div className="inbox-reply-preview-body">
        <span className="inbox-reply-preview-label">Replying to</span>
        <span className="inbox-reply-preview-author">{replyingTo.userName}</span>
        <span className="inbox-reply-preview-text">{preview}</span>
      </div>
      <button className="inbox-reply-preview-cancel" onClick={onCancel} title="Cancel reply">
        ✕
      </button>
    </div>
  );
}
