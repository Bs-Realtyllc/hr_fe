import type { Employee } from '@/types';
import { fmtDate, initials, roleColors } from '../utils';

export default function EmployeeSummaryCard({ employee }: { employee: Employee }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="avatar avatar-lg">{initials(employee.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2">
            <div className="font-semibold" style={{ fontSize: 18 }}>{employee.name}</div>
            <span className={`badge ${roleColors[employee.role]}`}>{employee.role}</span>
          </div>
          <div className="text-muted">{employee.designation}{employee.department ? ` · ${employee.department}` : ''}</div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 12 }}>
        <div className="flex gap-2 items-center">
          <span className="text-muted" style={{ width: 90, flexShrink: 0 }}>Email</span>
          <span className="text-sm">{employee.email}</span>
        </div>
        {employee.manager_name && (
          <div className="flex gap-2 items-center">
            <span className="text-muted" style={{ width: 90, flexShrink: 0 }}>Reports to</span>
            <span className="text-sm">{employee.manager_name}</span>
          </div>
        )}
        {employee.start_date && (
          <div className="flex gap-2 items-center">
            <span className="text-muted" style={{ width: 90, flexShrink: 0 }}>Since</span>
            <span className="text-sm">{fmtDate(employee.start_date)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
