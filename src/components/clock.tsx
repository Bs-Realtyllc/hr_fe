"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Popup from "reactjs-popup";
import { showToast } from "@/lib/toast";
import { getPosition, geolocationErrorMessage } from "@/lib/geolocation";

interface PauseType {
  pause: string;
  resume: string | null;
  reason: string;
  pauseDuration: number | null;
}

interface ClockRecord {
  employeeId: number;
  clockIn: string | null;
  totalPauseDuration: number | null;
  totalSecondsEarlierToday: number;
  status: "idle" | "paused" | "running";
  pauses: PauseType[];
}

interface ClockResponse {
  result: ClockRecord;
}

type ClockStatus = "idle" | "running" | "paused";

function formatHMS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function diffSeconds(from: string, to: string | number): number {
  const toMs = typeof to === "number" ? to : new Date(to).getTime();
  return Math.max(0, Math.floor((toMs - new Date(from).getTime()) / 1000));
}

const STATUS_STYLES: Record<ClockStatus, string> = {
  idle: "bg-slate-200 text-slate-700",
  running: "bg-indigo-100 text-indigo-700",
  paused: "bg-amber-100 text-amber-700",
};

export default function TimeElapsed() {
  const [status, setStatus] = useState<ClockStatus>("idle");
  const [baseSeconds, setBaseSeconds] = useState(0);
  const [segmentStart, setSegmentStart] = useState<number | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [clockOutPopup, setClockOutPopup] = useState(false);
  const [pauseReason, setPauseReason] = useState<string>("");
  const [reasonError, setReasonError] = useState<string>("");

  async function refresh() {
    const { result } = await api.get<ClockResponse>("/clock");
    applyRecord(result);
  }

  // ── Load today's record and derive the correct starting state ──
  useEffect(() => {
    refresh().catch(() => setStatus("idle")).finally(() => setLoading(false));
  }, []);

  function applyRecord(result: ClockRecord) {
    setStatus(result.status);
    const totalPause = result.totalPauseDuration ?? 0;
    const banked = result.totalSecondsEarlierToday ?? 0;

    if (result.status === "paused" && result.clockIn) {
      const openPause = result.pauses.find((p) => !p.resume);
      const freezePoint = openPause
        ? openPause.pause
        : new Date().toISOString();
      setBaseSeconds(banked + diffSeconds(result.clockIn, freezePoint) - totalPause);
      setSegmentStart(null);
      return;
    }

    if (result.status === "running" && result.clockIn) {
      const now = Date.now();
      setBaseSeconds(banked + diffSeconds(result.clockIn, now) - totalPause);
      setSegmentStart(now);
      return;
    }

    // idle — may still carry banked time from an earlier shift today
    setBaseSeconds(banked);
    setSegmentStart(null);
  }

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
    if (status === "paused" || status === "idle") {
      setDisplaySeconds(baseSeconds);
    }
  }, [status, baseSeconds]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { clockInTime } = (e as CustomEvent).detail;
      setStatus("running");
      setSegmentStart(new Date(clockInTime).getTime());
    };
    window.addEventListener("clockIn", handler);
    return () => window.removeEventListener("clockIn", handler);
  }, []);

  const handlePauseResume = async () => {
    if (status === "running" && !pauseReason.trim()) {
      setReasonError("*please specify the reason for the pause.");
      return;
    }
    setReasonError("");
    setActionLoading(true);
    try {
      if (status === "running") {
        await api.post<ClockResponse>("/clock/pause", {
          reason: pauseReason,
        });
        setClockOutPopup(false);
        setPauseReason("");
        setStatus("paused");
        showToast("success", "Break started");
      } else if (status === "paused") {
        await api.post<ClockResponse>("/clock/resume", {});
        setSegmentStart(Date.now());
        setClockOutPopup(false);
        setStatus("running");
        showToast("success", "Welcome back");
      }
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : `Could not ${status === "running" ? "pause" : "resume"}`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      const pos = await getPosition();
      await api.post<ClockResponse>("/clock/out", {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      setClockOutPopup(false);
      showToast("success", "Clocked out!");
      // Re-fetch so banked time picks up the shift that just ended and
      // status drops back to idle (another shift can start later today).
      await refresh();
    } catch (err) {
      showToast("error", geolocationErrorMessage(err));
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
          } else {
            setClockOutPopup(true);
          }
        }}
      >
        <StatusIcon status={status} />
        <span className="tabular-nums">
          {status === "idle" && displaySeconds === 0 ? "Clock In" : formatHMS(displaySeconds)}
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

          {status === "running" && (
            <div className="m-2">
              <label className="form-label">Reason for pausing clock?</label>
              <input
                className="form-input"
                type="text"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="E.g: Personal emergency"
              />
            </div>
          )}
          {reasonError && (
            <div className="px-4 text-red-700 text-sm">{reasonError}</div>
          )}

          <div className="flex gap-3 justify-end mt-2">
            <button
              onClick={handlePauseResume}
              disabled={actionLoading}
              className="btn btn-ghost"
            >
              <Icon name={status === "paused" ? "play-circle" : "pause-circle"} />
              {actionLoading ? "…" : status === "paused" ? "Resume" : "Pause"}
            </button>
            <button
              onClick={handleClockOut}
              disabled={actionLoading}
              className="btn btn-primary"
            >
              <Icon name="stop-circle" />
              {actionLoading ? "Clocking out…" : "Clock Out"}
            </button>
          </div>
        </div>
      </Popup>
    </>
  );
}

function Icon({ name }: { name: string }) {
  return (
    <span
      className="icon-mask"
      style={{ WebkitMaskImage: `url(/icons/${name}.svg)`, maskImage: `url(/icons/${name}.svg)` }}
    />
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
