'use client';
import { useState } from "react";
import ActiveTab from "./_components/ActiveTab";
import AttendenceTab from "./_components/AttendenceTab";

type Tab = "active" | "attendence";





export default function DefaultPage() {
  const [tab, setTab] = useState<Tab>("active");

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Active employees & Attendence</h1>
          <p>
            View active users and manage attendence
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
        {(
          [
            { id: "active", label: "Active users" },
            { id: "attendence", label: "Attendence" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
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
      {tab === "attendence" && <AttendenceTab />}
    </div>
  );
}
