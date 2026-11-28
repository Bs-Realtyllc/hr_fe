"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatTimeNepal } from "@/lib/datetime";

type PausesType = {
  pause: string;
  resume: string;
  reason: string;
}

interface ClockUser {
  employeeId: number;
  name: string;
  clockDate: string;
  clockId: number;
  clockIn: string;
  clockOut: string | null;
  status: Status;
  pauses: Array<PausesType>;
  isLate: boolean;
  // Only set when status is "done" — total time worked across every shift
  // today (split shifts included), already net of pauses.
  totalSeconds: number | null;
}

// /clock/all now covers everyone with any activity today, not just people
// currently clocked in — "done" means every shift today is closed.
type Status = "running" | "paused" | "done";

const STATUS_LABEL: Record<Status, string> = {
  running: "Working",
  paused: "On a break",
  done: "Done",
};

const STATUS_BADGE: Record<Status, string> = {
  running: "badge badge-success",
  paused: "badge badge-warning",
  done: "badge badge-neutral",
};

function formatHoursMinutes(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function avatarColor(seed: string) {
  return `hsl(${(seed.charCodeAt(0) * 37) % 360}, 45%, 35%)`;
}

const REFRESH_MS = 30_000; // presence data is only honest if it doesn't go stale

export default function ActiveTab() {
  const [users, setUsers] = useState<ClockUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { result } = await api.get<any>("/clock/all");
        setUsers(result ?? []);
        setError(null);
      } catch {
        setError("Failed to fetch clock data");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
    pollRef.current = setInterval(fetchUsers, REFRESH_MS);

    // Instant nudge on top of the poll above — admins/leads join a shared
    // 'role:admin-lead' room on connect (see inboxSocket.ts) specifically
    // so a pause/resume/clock-in/out anywhere on the roster reaches this
    // dashboard in milliseconds instead of waiting up to REFRESH_MS.
    let socket: Socket | null = null;
    const token = getToken();
    if (token) {
      const wsUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:6002/api').replace(/\/api$/, '');
      socket = io(wsUrl, { path: '/ws/inbox', auth: { token }, transports: ['websocket'] });
      socket.on('clock:sync', fetchUsers);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      socket?.disconnect();
    };
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="card active-list">
      {users.length === 0 ? (
        <div className="active-empty">No one has clocked in today.</div>
      ) : (
        users.map((user) => (
          <div key={user.employeeId} className="active-row">
            <div className="active-row-avatar-wrap">
              <div className="avatar" style={{ background: avatarColor(user.name) }}>
                {initials(user.name)}
              </div>
              <span className={`active-row-dot active-row-dot-${user.status}`} />
            </div>
            <div className="active-row-info">
              <div className="active-row-name">{user.name}</div>
              <div className="active-row-meta">
                {user.status === "done" ? (
                  <>
                    Finished at {user.clockOut ? formatTimeNepal(user.clockOut) : "—"}
                    {user.totalSeconds != null && <> · worked {formatHoursMinutes(user.totalSeconds)}</>}
                  </>
                ) : (
                  <>
                    Since {formatTimeNepal(user.clockIn)}
                    {user.status === "paused" && user.pauses[user.pauses.length - 1]?.reason && (
                      <> · {user.pauses[user.pauses.length - 1].reason}</>
                    )}
                  </>
                )}
              </div>
            </div>
            {user.isLate && <span className="badge badge-error">Late</span>}
            <span className={STATUS_BADGE[user.status]}>{STATUS_LABEL[user.status]}</span>
          </div>
        ))
      )}
    </div>
  );
}
