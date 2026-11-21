'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatTimeNepal } from '@/lib/datetime';

interface TrackerSegment {
  windowStart: string;
  windowEnd: string;
  activeSeconds: number;
  idleSeconds: number;
  keyPresses: number;
  mouseClicks: number;
  mouseMoves: number;
  activeAppName: string | null;
  excluded: boolean;
  // True when this segment was cut short by the idle prompt timing out
  // with no response, rather than running its normal length.
  idleTriggered: boolean;
}

interface Screenshot {
  id: string;
  capturedAt: string;
  url: string;
}

interface DiaryEntry {
  segment: TrackerSegment;
  // Null when the capture failed or was never attempted for this segment.
  screenshot: Screenshot | null;
}

interface DiaryModalProps {
  // Omit employeeId for "view my own diary" (uses /tracker/diary/me) —
  // only admin/lead can pass one to view someone else's.
  employeeId?: number;
  employeeName: string;
  clockId: number;
  date: string; // display only — the query itself is scoped by clockId
  onClose: () => void;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

// A single bar filled proportional to how much of the segment was active —
// same "activity level" convention Upwork/Hubstaff use, not a per-minute
// checklist. Dots filled is proportional to activeSeconds/segment-length,
// not "did any input happen in this specific minute."
const ACTIVITY_DOTS = 10;
function ActivityLevel({ segment }: { segment: TrackerSegment }) {
  const durationSeconds = Math.max(
    1,
    (new Date(segment.windowEnd).getTime() - new Date(segment.windowStart).getTime()) / 1000,
  );
  const pct = Math.min(1, segment.activeSeconds / durationSeconds);
  const filledDots = Math.round(pct * ACTIVITY_DOTS);
  return (
    <div className="flex gap-[2px]">
      {Array.from({ length: ACTIVITY_DOTS }, (_, i) => (
        <span
          key={i}
          className="h-[6px] flex-1 rounded-sm"
          style={{ background: i < filledDots ? '#22c55e' : 'var(--neutral-light-hover)' }}
        />
      ))}
    </div>
  );
}

export default function DiaryModal({ employeeId, employeeName, clockId, date, onClose }: DiaryModalProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // A fully deleted segment (no evidence left) just disappears from the
  // diary entirely, same as Upwork's own behavior — no ghost card, no
  // inline mention. Who deleted what and when still lives in the database
  // (excludedBy/excludedAt) for a separate audit view if one's ever needed.
  const visibleEntries = entries.filter((e) => !e.segment.excluded);

  const endpoint = employeeId
    ? `/tracker/diary?employeeId=${employeeId}&clockId=${clockId}`
    : `/tracker/diary/me?clockId=${clockId}`;

  const fetchDiary = (cancelledRef?: { cancelled: boolean }) => {
    setLoading(true);
    return api
      .get(endpoint)
      .then((res: any) => {
        if (cancelledRef?.cancelled) return;
        setEntries(res.entries);
      })
      .finally(() => !cancelledRef?.cancelled && setLoading(false));
  };

  useEffect(() => {
    const ref = { cancelled: false };
    fetchDiary(ref);
    return () => {
      ref.cancelled = true;
    };
  }, [employeeId, clockId]);

  const handleDelete = async (screenshotId: string) => {
    if (!window.confirm('Delete this screenshot? Its segment will no longer count as verified.')) return;
    setDeletingId(screenshotId);
    try {
      await api.delete(`/tracker/screenshots/${screenshotId}`);
      await fetchDiary();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-[720px] flex-col rounded-2xl bg-(--soft-white-light) p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[20px] font-semibold text-(--neutral-normal)">
            Diary for {employeeName}, {formatDate(date)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[24px] leading-none text-(--gray-darker)"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="rounded-2xl border border-(--neutral-light-hover) p-6 text-center text-[14px] text-(--soft-white-dark-active)">
              Loading…
            </div>
          )}

          {!loading && visibleEntries.length === 0 && (
            <div className="rounded-2xl border border-(--neutral-light-hover) p-6 text-center text-[14px] text-(--soft-white-dark-active)">
              No activity recorded for this shift.
            </div>
          )}

          {!loading && visibleEntries.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {visibleEntries.map((entry, i) => (
                <div key={i} className="rounded-xl border border-(--neutral-light-hover) p-2">
                  {entry.screenshot ? (
                    <div className="group relative mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.screenshot.url}
                        alt={`Screenshot at ${formatTimeNepal(entry.screenshot.capturedAt)}`}
                        className="aspect-video w-full rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.screenshot!.id)}
                        disabled={deletingId === entry.screenshot.id}
                        title="Delete this screenshot"
                        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[12px] text-white opacity-0 group-hover:opacity-100 disabled:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="mb-2 flex aspect-video w-full items-center justify-center rounded-lg bg-(--neutral-light) text-[12px] text-(--soft-white-dark-active)">
                      No screenshot
                    </div>
                  )}
                  <div className="mb-1 flex items-center justify-between text-[13px] text-(--neutral-normal)">
                    <span className="flex items-center gap-1.5">
                      {formatTimeNepal(entry.segment.windowStart)}
                      {entry.segment.idleTriggered && (
                        <span
                          className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                          title="This segment ended because inactivity was detected and confirmed."
                        >
                          Idle detected
                        </span>
                      )}
                    </span>
                    {entry.segment.activeAppName && (
                      <span
                        className="truncate text-[11px] text-(--soft-white-dark-active)"
                        title={entry.segment.activeAppName}
                      >
                        {entry.segment.activeAppName}
                      </span>
                    )}
                  </div>
                  <ActivityLevel segment={entry.segment} />
                  <div className="mt-1 text-[11px] text-(--soft-white-dark-active)">
                    {entry.segment.keyPresses} keystrokes · {entry.segment.mouseClicks} clicks · {entry.segment.mouseMoves} moves
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
