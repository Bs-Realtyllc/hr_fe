"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { showToast } from "@/lib/toast";

interface clockInResponse {
  message: string;
  clockInTime: string;
}
interface PauseType {
  id: number;
  pause: string;
  resume: string | null;
  reason: string;
  pauseDuration: number | null;
}

interface ClockRecord {
  employeeId: number;
  clockIn: string | null;
  clockOut: string | null;
  totalPauseDuration: number | null;
  status: "idle" | "paused" | "running" | "done";
  pauses: PauseType[];
}

interface ClockResponse {
  result: ClockRecord;
}

function todayKey() {
  return `daily_clock_${new Date().toISOString().split("T")[0]}`;
}

function getKey() {
  return Number(localStorage.getItem(todayKey()));
}
function setKey(value: "1" | "0") {
  localStorage.setItem(todayKey(), value);
}

function isWithinClockInWindow(): boolean {
  const now = new Date();
  const hours = now.getHours();
  return hours >= 8 && hours < 24;
}

export default function ClockInPopup() {
  const [showPopup, setShowPopup] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [forcePopup, setForcePopup] = useState<boolean>(false);
  const [status, setStatus] =useState<'idle'| 'running' | 'paused' | 'done'>('idle')

  const fetchClock = async()=>{
    const { result } = await api.get<ClockResponse>("/clock");
    setStatus(result.status)
    if(result.status !== 'idle') setKey('0');
  }
  useEffect(() => {
    if (localStorage.getItem(todayKey()) === null) {
      localStorage.setItem(todayKey(), "1");
      
    }
    fetchClock();
  }, []);
  useEffect(() => {
    const handler = () => {
      if (isWithinClockInWindow()) {
        setShowPopup(true);
        setForcePopup(true);
      }
    };
    window.addEventListener("clock-popup-request", handler);
    return () => window.removeEventListener("clock-popup-request", handler);
  }, []);

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const { clockInTime } = await api.post<clockInResponse>("/clock/in", {});
      setKey("0");
      setShowPopup(false);
      window.dispatchEvent(
        new CustomEvent("clockIn", { detail: { clockInTime } }),
      );
      showToast("success", "Clocked in!");
    } catch (err) {
      showToast("error", "Could not clock in");
    } finally {
      setLoading(false);
    }
  };

  if (!showPopup) return null;

  if ((isWithinClockInWindow()&&status==='idle' && getKey()) || forcePopup) {
    return (
      <div className="modal-overlay flex items-center justify-center p-4">
        <div className="modal max-w-sm w-full p-6">
          <h2 className="text-lg font-semibold mb-2">
            Do you want to clock in?
          </h2>

          <label className="flex items-center gap-2 text-sm text-slate-600 my-4">
            <input
              type="checkbox"
              onChange={(e) => setKey(e.target.checked ? "0" : "1")}
            />
            Don&apos;t remind me again
          </label>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowPopup(false)}
              className="btn btn-ghost"
            >
              Ignore
            </button>
            <button
              onClick={handleClockIn}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Clocking in…" : "Clock In"}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
