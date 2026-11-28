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
    <div className="flex items-center gap-2 rounded-t-lg bg-[#2b2d31] px-4 py-2 text-sm text-[#b5bac1]">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="shrink-0">Replying to</span>
        <span className="shrink-0 font-semibold text-[#f2f3f5]">{replyingTo.userName}</span>
        <span className="min-w-0 truncate text-[#949ba4]">{preview}</span>
      </div>
      <button
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#b5bac1] text-[10px] font-bold text-[#2b2d31] transition-colors hover:bg-[#dbdee1]"
        onClick={onCancel}
        title="Cancel reply"
      >
        ✕
      </button>
    </div>
  );
}
