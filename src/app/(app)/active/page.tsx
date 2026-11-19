'use client';
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ActiveTab from "./_components/ActiveTab";
import AttendanceTab from "./_components/AttendanceTab";

type Tab = "active" | "attendence";

export default function DefaultPage() {
  const { user } = useAuth();
  const canViewAll = user?.role === "admin" || user?.role === "lead";

  const tabs: { id: Tab; label: string }[] = [
    { id: "active", label: "Today" },
    ...(canViewAll ? [{ id: "attendence" as Tab, label: "Attendence" }] : []),
  ];

  const [tab, setTab] = useState<Tab>("active");

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Today & Attendence</h1>
          <p>
            {canViewAll
              ? "View today's roster and manage attendence"
              : "See who's working, on a break, or done for the day"}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 24,
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: 0,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="btn btn-text"
            style={{
              borderRadius: 0,
              borderBottom:
                tab === t.id
                  ? "2px solid var(--color-primary)"
                  : "2px solid transparent",
              paddingBottom: 10,
              fontWeight: tab === t.id ? 600 : 400,
              color:
                tab === t.id ? "var(--color-primary)" : "var(--color-muted)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "active" && <ActiveTab />}
      {tab === "attendence" && canViewAll && <AttendanceTab />}
    </div>
  );
}
