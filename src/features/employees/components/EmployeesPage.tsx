"use client";
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button/Button";
import { useEmployeeDirectory } from '../hooks/useEmployeeDirectory';
import { useAddEmployee } from '../hooks/useAddEmployee';
import { useBulkImport } from '../hooks/useBulkImport';
import DepartmentSection from './DepartmentSection';
import AddEmployeeModal from './AddEmployeeModal';
import BulkImportModal from './BulkImportModal';

export default function EmployeesPage() {
  const { user } = useAuth();
  const { isPrivileged } = usePermissions();

  // Modal state lives in hooks called here, so form values survive closing and reopening a modal.
  const directory = useEmployeeDirectory(user);
  const { employees, search, setSearch, myTeamOnly, setMyTeamOnly, filtered, sections, departmentCount, reloadEmployees } = directory;
  const add = useAddEmployee(reloadEmployees);
  const { setShowModal } = add;
  const bulk = useBulkImport(reloadEmployees);
  const { setShowBulkModal } = bulk;

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center gap-6">
          <div className="min-w-0">
            <h1>Team Directory</h1>
            <p>
              {filtered.length} {filtered.length === 1 ? "person" : "people"}{" "}
              across {departmentCount}{" "}
              {departmentCount === 1 ? "department" : "departments"}
              {" — "}managers, founders, and every team from engineering to
              marketing and operations
            </p>
          </div>
          <div className="flex gap-4 shrink-0 whitespace-nowrap">
            {isPrivileged && (
              <Button
                variant="primary"
                size="small"
                onClick={() => setShowBulkModal(true)}
              >
                Add Bulk Employee
              </Button>
            )}

            {isPrivileged && (
              <Button
                variant="primary"
                size="small"
                onClick={() => setShowModal(true)}
              >
                Add Employee
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="search-bar" style={{ flex: 1 }}>
          <span
            className="icon-mask search-bar-icon"
            style={{
              WebkitMaskImage: "url(/icons/search.svg)",
              maskImage: "url(/icons/search.svg)",
            }}
          />
          <input
            className="form-input"
            placeholder="Search by name, role, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          onClick={() => setMyTeamOnly((v) => !v)}
          title="Show only yourself and your direct reports"
          variant={myTeamOnly ? "primary" : "secondary"}
          size="small"
          style={{ flexShrink: 0 }}
          leftIcon={
            <span
              className="icon-mask"
              style={{
                height: 16,
                width: 16,
                WebkitMaskImage: `url(/icons/${myTeamOnly ? "check.svg" : "users.svg"})`,
                maskImage: `url(/icons/${myTeamOnly ? "check.svg" : "users.svg"})`,
              }}
            />
          }
        >
          My Team
        </Button>
      </div>

      {sections.map(([department, members]) => (
        <DepartmentSection key={department} department={department} members={members} currentUserId={user?.id} />
      ))}

      {filtered.length === 0 && (
        <div className="empty-state card" style={{ marginTop: 16 }}>
          <span
            className="icon-mask empty-state-icon"
            style={{
              WebkitMaskImage: "url(/icons/users.svg)",
              maskImage: "url(/icons/users.svg)",
            }}
          />

          <p>
            {myTeamOnly
              ? "No one reports to you yet"
              : search
                ? "No employees match your search"
                : "No employees yet"}
          </p>
        </div>
      )}

      <AddEmployeeModal add={add} employees={employees} />
      <BulkImportModal bulk={bulk} />
    </div>
  );
}
