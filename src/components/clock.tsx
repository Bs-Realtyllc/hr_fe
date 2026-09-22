"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Popup from "reactjs-popup";
import { showToast } from "@/lib/toast";

interface ClockRecord {
  id: number;
  employeeId: number;
  clockIn: string;
  clockOut: string | null;
  duration: string | null;
  pause: string | null;
  resume: string | null;
  clockDate: string;
}

interface ClockResponse {
  result: ClockRecord;
}

type ClockStatus = "idle" | "running" | "paused" | "done";

function formatHM(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const STATUS_STYLES: Record<ClockStatus, string> = {
  idle: "bg-slate-200 text-slate-700",
  running: "bg-indigo-100 text-indigo-700",
  paused: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};

export default function TimeElapsed() {
  const [status, setStatus] = useState<ClockStatus>("idle");
  const [baseSeconds, setBaseSeconds] = useState(0); // elapsed accumulated before current running segment
  const [segmentStart, setSegmentStart] = useState<number | null>(null); // when the current running segment began
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [clockOutPopup, setClockOutPopup] = useState(false);
  const [pauseReason, setPauseReason] = useState<string>("");
  const [reasonError, setReasonError] = useState<string>("");

  // ── Load today's record and derive the correct starting state ──
  useEffect(() => {
    async function getClock() {
      try {
        const { result } = await api.get<ClockResponse>("/clock");

        if (result.clockOut) {
          setStatus("done");
          setBaseSeconds(durationToSeconds(result.duration));
          return;
        }

        if (result.pause && !result.resume) {
          // currently on break — frozen at the pause moment
          setStatus("paused");
          setBaseSeconds(diffSeconds(result.clockIn, result.pause));
          return;
        }

        if (result.pause && result.resume) {
          // came back from break, still running — base excludes the break
          setStatus("running");
          setBaseSeconds(diffSeconds(result.clockIn, result.pause));
          setSegmentStart(new Date(result.resume).getTime());
          return;
        }

        // never paused, still running
        setStatus("running");
        setBaseSeconds(0);
        setSegmentStart(new Date(result.clockIn).getTime());
      } catch {
        setStatus("idle");
      } finally {
        setLoading(false);
      }
    }
    getClock();
  }, []);

  // ── Tick while running ──
  useEffect(() => {
    if (status !== "running" || segmentStart === null) return;

    const tick = () => {
      setDisplaySeconds(
        baseSeconds + Math.floor((Date.now() - segmentStart) / 1000),
      );
    };
    tick();

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, segmentStart, baseSeconds]);

  // Freeze display at baseSeconds whenever not running
  useEffect(() => {
    if (status === "paused" || status === "done") {
      setDisplaySeconds(baseSeconds);
    }
  }, [status, baseSeconds]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { clockInTime } = (e as CustomEvent).detail;
      setStatus("running");
      setBaseSeconds(0);
      setSegmentStart(new Date(clockInTime).getTime());
    };
    window.addEventListener("clockIn", handler);
    return () => window.removeEventListener("clockIn", handler);
  }, []);

  const handlePauseResume = async () => {
    setActionLoading(true);
    if (!pauseReason.trim() && status === "running") {
      setReasonError("*please specify the reason for the pause.");
      setActionLoading(false)
      return;
    }
    try {
      if (status === "running") {
        await api.post("/clock/pause", {reason: pauseReason});
        setBaseSeconds((prev) =>
          segmentStart
            ? prev + Math.floor((Date.now() - segmentStart) / 1000)
            : prev,
        );
        setStatus("paused");
        setClockOutPopup(false);
        showToast("success", "Break started");
      } else if (status === "paused") {
        await api.post("/clock/resume", {});
        setSegmentStart(Date.now());
        setStatus("running");
        setClockOutPopup(false);
        showToast("success", "Welcome back");
      }
    } catch (err) {
      showToast(
        "error",
        `Could not ${status === "running" ? "pause" : "resume"}`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      const { result } = await api.post<ClockResponse>("/clock/out", {});
      setStatus("done");
      setBaseSeconds(durationToSeconds(result.duration));
      setClockOutPopup(false);
      showToast("success", "Clocked out!");
    } catch (err) {
      showToast("error", "Could not clock out");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="h-9 w-20 rounded-full bg-slate-100 animate-pulse" />;
  }

  return (
    <>
      <div
        className={`flex items-center w-fit gap-2 rounded-full px-3.5 py-2 text-sm font-medium cursor-pointer transition-colors ${STATUS_STYLES[status]}`}
        onClick={() => {
          if (status === "idle") {
            localStorage.setItem(
              `daily_clock_${new Date().toISOString().split("T")[0]}`,
              "1",
            );
            window.dispatchEvent(new Event("clock-popup-request"));
          } else if (status !== "done") {
            setClockOutPopup(true);
          }
        }}
      >
        <StatusIcon status={status} />
        <span className="tabular-nums">
          {status === "idle" ? "--:--" : formatHM(displaySeconds)}
        </span>
      </div>

      <Popup
        open={clockOutPopup}
        modal
        closeOnDocumentClick
        onClose={() => {
          setClockOutPopup(false);
          setReasonError("");
        }}
      >
        <div className="modal max-w-sm w-full p-2">
          <h2 className="text-md font-semibold mb-2 text-center">
            {status === "paused"
              ? "You're on a break"
              : "Do you want to clock out?"}
          </h2>
          <div className="m-2">
            <label className="form-label">Reason for pausing clock?</label>
            <input
              className="form-input"
              type="email"
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="E.g: Personal emergency"
              required
            />
          </div>
          <div className="px-4 text-red-700 text-sm">{reasonError}</div>

          <div className="flex gap-3 justify-end mt-2">
            <button
              onClick={handlePauseResume}
              disabled={actionLoading}
              className="btn btn-ghost"
            >
              {actionLoading ? "…" : status === "paused" ? "Resume" : "Pause"}
            </button>
            <button
              onClick={handleClockOut}
              disabled={actionLoading}
              className="btn btn-primary"
            >
              {actionLoading ? "Clocking out…" : "Clock Out"}
            </button>
          </div>
        </div>
      </Popup>
    </>
  );
}

function StatusIcon({ status }: { status: ClockStatus }) {
  if (status === "paused") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0">
        <rect x="7" y="6" width="3" height="12" rx="1" fill="currentColor" />
        <rect x="14" y="6" width="3" height="12" rx="1" fill="currentColor" />
      </svg>
    );
  }
  if (status === "done") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0">
        <path
          d="M5 13l4 4L19 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  // idle + running share the clock icon; color differs via STATUS_STYLES
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function diffSeconds(from: string, to: string): number {
  return Math.max(
    0,
    Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 1000),
  );
}

function durationToSeconds(duration: string | null): number {
  if (!duration) return 0;
  const [h, m, s] = duration.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}
