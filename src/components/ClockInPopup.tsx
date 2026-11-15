"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { getPosition, geolocationErrorMessage } from "@/lib/geolocation";

interface clockInResponse {
  message: string;
  clockInTime: string;
}
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

function todayKey() {
  return `daily_clock_${new Date().toISOString().split("T")[0]}`;
}

function getKey() {
  return Number(localStorage.getItem(todayKey()));
}
function setKey(value: "1" | "0") {
  localStorage.setItem(todayKey(), value);
}

// "HH:MM" → hours as a decimal, e.g. "09:30" -> 9.5.
function parseHourDecimal(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h + m / 60;
}

// Falls back to a generic 8am–noon morning window when the company hasn't
// configured Working Hours yet — once set, the reminder follows the real
// work day instead, so a company that starts later (or whose day runs past
// noon) still gets nudged for the whole time someone could show up late.
function isWithinClockInWindow(workStart: string | null, workEnd: string | null): boolean {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  if (workStart && workEnd) {
    return currentHour >= parseHourDecimal(workStart) && currentHour < parseHourDecimal(workEnd);
  }
  return currentHour >= 8 && currentHour < 12;
}

export default function ClockInPopup() {
  const [showPopup, setShowPopup] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [forcePopup, setForcePopup] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle')
  const [workingHours, setWorkingHours] = useState<{ workStart: string | null; workEnd: string | null }>({ workStart: null, workEnd: null });

  const fetchClock = async () => {
    const { result } = await api.get<ClockResponse>("/clock");
    setStatus(result.status)
    if (result.status !== 'idle') setKey('0');
  }
  useEffect(() => {
    if (localStorage.getItem(todayKey()) === null) {
      localStorage.setItem(todayKey(), "1");

    }
    fetchClock();
    api.get<{ work_start: string | null; work_end: string | null }>("/company").then((data) => {
      setWorkingHours({ workStart: data.work_start?.slice(0, 5) ?? null, workEnd: data.work_end?.slice(0, 5) ?? null });
    });
  }, []);
  useEffect(() => {
    // A deliberate click on the header widget should always open the
    // clock-in prompt — split shifts mean clocking in any time of day is
    // valid. The working-hours window only gates the UNPROMPTED reminder
    // popup below, not something the user explicitly asked for.
    const handler = () => {
      setShowPopup(true);
      setForcePopup(true);
    };
    window.addEventListener("clock-popup-request", handler);
    return () => window.removeEventListener("clock-popup-request", handler);
  }, []);

  const handleClockIn = async () => {
    setLoading(true);

    try {
      const pos = await getPosition();
      const { clockInTime } = await api.post<clockInResponse>("/clock/in", {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      setKey("0");
      setShowPopup(false);
      window.dispatchEvent(
        new CustomEvent("clockIn", { detail: { clockInTime } }),
      );
      showToast("success", "Clocked in!");
    } catch (err) {
      showToast("error", geolocationErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!showPopup) return null;

  if ((isWithinClockInWindow(workingHours.workStart, workingHours.workEnd) && status === 'idle' && getKey()) || forcePopup) {
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