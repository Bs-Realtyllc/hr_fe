'use client';
import { useRouter } from 'next/navigation';
import type { Employee } from '@/types';
import { initials, roleColors } from '../utils';

/** One person in the team directory; opens their profile on click. */
export default function EmployeeCard({ emp, isMe }: { emp: Employee; isMe: boolean }) {
  const router = useRouter();
  return (
    <div
      className="card"
      style={{ cursor: "pointer", border: "2px solid transparent" }}
      onClick={() => router.push(`/employees/${emp.id}`)}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="avatar avatar-lg">{initials(emp.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2">
            <div className="font-semibold" style={{ fontSize: 15 }}>
              {emp.name}
            </div>
            {isMe && <span className="badge badge-info">You</span>}
          </div>
          <div className="text-muted">{emp.designation}</div>
          <span
            className={`badge ${roleColors[emp.role]}`}
            style={{ marginTop: 4 }}
          >
            {emp.role}
          </span>
        </div>
      </div>

      <div
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <div className="flex gap-2 items-center">
          <span
            className="text-muted"
            style={{ width: 80, flexShrink: 0 }}
          >
            Email
          </span>
          <span className="text-sm truncate">{emp.email}</span>
        </div>
        {emp.manager_name && (
          <div className="flex gap-2 items-center">
            <span
              className="text-muted"
              style={{ width: 80, flexShrink: 0 }}
            >
              Reports to
            </span>
            <span className="text-sm">{emp.manager_name}</span>
          </div>
        )}
        {emp.start_date && (
          <div className="flex gap-2 items-center">
            <span
              className="text-muted"
              style={{ width: 80, flexShrink: 0 }}
            >
              Since
            </span>
            <span className="text-sm">
              {new Date(emp.start_date).toLocaleDateString(
                "en-US",
                { year: "numeric", month: "short" },
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
