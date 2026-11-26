import type { Employee } from '@/types';
import EmployeeCard from './EmployeeCard';

export default function DepartmentSection({ department, members, currentUserId }: { department: string; members: Employee[]; currentUserId?: number }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--color-text-h2)",
            letterSpacing: "-0.2px",
          }}
        >
          {department}
        </h2>
        <span className="badge badge-accent">{members.length}</span>
        <div
          style={{ flex: 1, height: 1, background: "var(--color-border)" }}
        />
      </div>

      <div
        style={{
          display: "grid",
          // min(300px, 100%): on phones under ~345px a full 300px column would overflow.
          gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))",
          gap: 16,
        }}
      >
        {members.map((emp) => (
          <EmployeeCard key={emp.id} emp={emp} isMe={emp.id === currentUserId} />
        ))}
      </div>
    </div>
  );
}
