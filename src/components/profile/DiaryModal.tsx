'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatTimeNepal } from '@/lib/datetime';

interface ActivityBlock {
  windowStart: string;
  windowEnd: string;
  activeSeconds: number;
  idleSeconds: number;
  activeMinutes?: boolean[];
  keyPresses: number;
  mouseClicks: number;
  mouseMoves: number;
  activeAppName: string | null;
  excluded: boolean;
}

interface Screenshot {
  id: string;
  capturedAt: string;
  url: string;
}

interface DiaryEntry {
  block: ActivityBlock;
  screenshots: Screenshot[];
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

// Same "active minutes out of 10" model Upwork's Work Diary uses — a row of
// 10 segments, one per minute of the block, lit up for whichever minutes had
// keyboard/mouse input. Falls back to an approximate left-packed count for
// older blocks recorded before per-minute tracking existed.
function getActiveMinutes(block: ActivityBlock): boolean[] {
  // Empty (not a fake all-false array) means the client never sent
  // per-minute data — only then do we fall back to an approximation.
  if (block.activeMinutes && block.activeMinutes.length > 0) return block.activeMinutes;
  const approxCount = Math.round((block.activeSeconds / 60));
  return new Array(10).fill(false).map((_, i) => i < approxCount);
}

function ActivityBar({ block }: { block: ActivityBlock }) {
  const minutes = getActiveMinutes(block);
  const activeCount = minutes.filter(Boolean).length;
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-[2px]">
        {minutes.map((active, i) => (
          <span
            key={i}
            className="h-[6px] flex-1 rounded-sm"
            style={{ background: active ? '#22c55e' : 'var(--neutral-light-hover)' }}
          />
        ))}
      </div>
      <span className="shrink-0 text-[12px] text-(--soft-white-dark-active)">{activeCount}/10</span>
    </div>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DiaryModal({ employeeId, employeeName, clockId, date, onClose }: DiaryModalProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [verifiedActiveSeconds, setVerifiedActiveSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // A fully deleted block (no evidence left) just disappears from the
  // diary entirely, same as Upwork's own behavior — no ghost card, no
  // inline mention. Who deleted what and when still lives in the database
  // (excludedBy/excludedAt) for a separate audit view if one's ever needed.
  const visibleEntries = entries.filter((e) => !e.block.excluded);

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
        setVerifiedActiveSeconds(res.verifiedActiveSeconds);
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
    if (!window.confirm('Delete this screenshot? If it\'s the last one for its 10-minute block, that block\'s time will no longer count as verified.')) return;
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
            Diary — {employeeName}, {formatDate(date)}
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

        {!loading && entries.length > 0 && (
          <p className="mb-4 text-[13px] text-(--soft-white-dark-active)">
            Verified: {formatDuration(verifiedActiveSeconds)}
          </p>
        )}

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
                  {entry.screenshots.length > 0 ? (
                    <div className="mb-2 flex gap-1">
                      {entry.screenshots.map((shot) => (
                        <div key={shot.id} className="group relative flex-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={shot.url}
                            alt={`Screenshot at ${formatTimeNepal(shot.capturedAt)}`}
                            className="aspect-video w-full rounded-lg object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleDelete(shot.id)}
                            disabled={deletingId === shot.id}
                            title="Delete this screenshot"
                            className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[12px] text-white opacity-0 group-hover:opacity-100 disabled:opacity-100"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-2 flex aspect-video w-full items-center justify-center rounded-lg bg-(--neutral-light) text-[12px] text-(--soft-white-dark-active)">
                      No screenshot
                    </div>
                  )}
                  <div className="mb-1 flex items-center justify-between text-[13px] text-(--neutral-normal)">
                    <span>{formatTimeNepal(entry.block.windowStart)}</span>
                    {entry.block.activeAppName && (
                      <span
                        className="truncate text-[11px] text-(--soft-white-dark-active)"
                        title={entry.block.activeAppName}
                      >
                        {entry.block.activeAppName}
                      </span>
                    )}
                  </div>
                  <ActivityBar block={entry.block} />
                  <div className="mt-1 text-[11px] text-(--soft-white-dark-active)">
                    {entry.block.keyPresses} keystrokes · {entry.block.mouseClicks} clicks · {entry.block.mouseMoves} moves
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
