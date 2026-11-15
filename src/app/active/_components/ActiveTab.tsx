"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
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
  status: Status;
  pauses: Array<PausesType>;
  isLate: boolean;
}

// /clock/all only ever returns people with a currently open shift, so
// "done" (a finished shift) can never show up here.
type Status = "running" | "paused";

const STATUS_LABEL: Record<Status, string> = {
  running: "Working",
  paused: "On a break",
};

const STATUS_BADGE: Record<Status, string> = {
  running: "badge badge-success",
  paused: "badge badge-warning",
};

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
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="card active-list">
      {users.length === 0 ? (
        <div className="active-empty">No one is currently active.</div>
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
                Since {formatTimeNepal(user.clockIn)}
                {user.status === "paused" && user.pauses[user.pauses.length - 1]?.reason && (
                  <> · {user.pauses[user.pauses.length - 1].reason}</>
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
