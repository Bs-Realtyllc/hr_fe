"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from "xlsx";

import { BSRealtyButton } from "@bsrealtyllc/design-system";
import { showToast } from "@/lib/toast";

interface Employee {
  id: number;
  name: string;
  email: string;
  designation?: string;
  department?: string;
  manager_id?: number;
  manager_name?: string;
  start_date: string;
  role: string;
  status: string;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const roleColors: Record<string, string> = {
  admin: "badge-error",
  lead: "badge-accent",
  employee: "badge-neutral",
};

const UNASSIGNED_DEPARTMENT = "Unassigned";

const DEPARTMENT_PRIORITY = [
  "founders",
  "founder",
  "leadership",
  "executive",
  "management",
  "managers",
];

function departmentRank(department: string) {
  const idx = DEPARTMENT_PRIORITY.indexOf(department.toLowerCase());
  return idx === -1 ? DEPARTMENT_PRIORITY.length : idx;
}

function groupByDepartment(list: Employee[]): [string, Employee[]][] {
  const groups: Record<string, Employee[]> = {};
  list.forEach((emp) => {
    const dept = emp.department?.trim() || UNASSIGNED_DEPARTMENT;
    (groups[dept] ??= []).push(emp);
  });
  return Object.entries(groups).sort(([a], [b]) => {
    if (a === UNASSIGNED_DEPARTMENT) return 1;
    if (b === UNASSIGNED_DEPARTMENT) return -1;
    const rankDiff = departmentRank(a) - departmentRank(b);
    return rankDiff !== 0 ? rankDiff : a.localeCompare(b);
  });
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin" || user?.role === "lead";

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [myTeamOnly, setMyTeamOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [employeesToAdd, setEmployeesToAdd] = useState<Employee[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    designation: "",
    department: "",
    manager_id: "",
    start_date: "",
    role: "employee",
    status: "active",
  });
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    api
      .get<Employee[]>("/employees")
      .then(setEmployees)
      .catch(() => {
        showToast("error", "Failed to load employee");
      });
  }, []);

  const searched = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.designation?.toLowerCase().includes(search.toLowerCase()) ||
      e.department?.toLowerCase().includes(search.toLowerCase()),
  );

  const filtered =
    myTeamOnly && user
      ? searched.filter((e) => e.id === user.id || e.manager_id === user.id)
      : searched;

  const sections = groupByDepartment(filtered);
  const departmentCount = new Set(
    filtered.map((e) => e.department?.trim() || UNASSIGNED_DEPARTMENT),
  ).size;

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    try {
      await api.post("/employees", {
        ...form,
        manager_id: form.manager_id ? parseInt(form.manager_id) : null,
      });
      setShowModal(false);
      showToast("success", "Sucessfully added employee");
    } catch (err) {
      showToast("error", "Failed to add employee");
    } finally {
      api
        .get<Employee[]>("/employees")
        .then(setEmployees)
        .catch(() => {});
    }
  };

  const validateEmployeeData = (rows: Employee[]) => {
    const validationErrors: string[] = [];
    const role = ["intern", "employee"];
    const status = ["active", "on_leave", "onboarding"];
    rows.forEach((employee, index) => {
      const rowNumber = index + 1;
      if (!employee.name) {
        validationErrors.push(`Row ${rowNumber}: Name is required`);
      }

      if (!employee.email) {
        validationErrors.push(`Row ${rowNumber}: Email is required`);
      }

      if (!role.includes(employee.role)) {
        validationErrors.push(
          `Row ${rowNumber}: Role is invalid -- enum('intern','employee')`,
        );
      }

      if (!status.includes(employee.status)) {
        validationErrors.push(
          `Row ${rowNumber}: status is invalid -- enum('active','onboarding','on_leave') `,
        );
      }
    });
    setErrors(validationErrors);
  };

  const processExcelFile = async (file: File) => {
    setFileError("");

    const validExtensions = [".xlsx", ".xls"];
    const extension = file.name.substring(file.name.lastIndexOf("."));

    if (!validExtensions.includes(extension.toLowerCase())) {
      setFileError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    try {
      const data = await file.arrayBuffer();

      const workbook = XLSX.read(data, {
        type: "array",
      });

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json<Employee>(worksheet);

      if (rows.length === 0) {
        setFileError("The Excel file does not contain any employees.");
        return;
      }

      setSelectedFile(file);
      validateEmployeeData(rows);
      setEmployeesToAdd(rows);
    } catch (error) {
      console.error(error);
      setFileError("Failed to read the Excel file.");
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      processExcelFile(file);
    }
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];

    if (file) {
      processExcelFile(file);
    }
  };
  const handleBlukSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // console.log("ca");
    if (fileError.length > 0 || errors.length > 0) return;
    try {
      await api.post("/employees/bulkAdd", {
        employeesToAdd,
      });
      setShowModal(false);
      showToast("success", "Sucessfully added employee");
    } catch (err) {
      showToast("error", "Failed to add employee");
    } finally {
      api
        .get<Employee[]>("/employees")
        .then(setEmployees)
        .catch(() => {});
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between  items-center">
          <div>
            <h1>Team Directory</h1>
            <p>
              {filtered.length} {filtered.length === 1 ? "person" : "people"}{" "}
              across {departmentCount}{" "}
              {departmentCount === 1 ? "department" : "departments"}
              {" — "}managers, founders, and every team from engineering to
              marketing and operations
            </p>
          </div>
          <div className="flex gap-4">
            {isAdmin && (
              <BSRealtyButton
                label="Add Bulk Employee"
                variant="primary"
                size="small"
                showLeftIcon={false}
                showRightIcon={false}
                onClick={() => setShowBulkModal(true)}
              />
            )}

            {isAdmin && (
              <BSRealtyButton
                label="Add Employee"
                variant="primary"
                size="small"
                showLeftIcon={false}
                showRightIcon={false}
                onClick={() => setShowModal(true)}
              />
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
        <button
          className={`btn btn-sm ${myTeamOnly ? "btn-primary" : "btn-secondary"}`}
          style={{ flexShrink: 0 }}
          onClick={() => setMyTeamOnly((v) => !v)}
          title="Show only yourself and your direct reports"
        >
          <span
            className="icon-mask"
            style={{
              WebkitMaskImage: `url(/icons/${myTeamOnly ? "check.svg" : "users.svg"})`,
              maskImage: `url(/icons/${myTeamOnly ? "check.svg" : "users.svg"})`,
            }}
          />
          My Team
        </button>
      </div>

      {sections.map(([department, members]) => (
        <div key={department} style={{ marginBottom: 28 }}>
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
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {members.map((emp) => {
              const isMe = emp.id === user?.id;
              return (
                <div
                  key={emp.id}
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
            })}
          </div>
        </div>
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: 600, maxHeight: "88vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Add Employee</h2>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input
                    className="form-input"
                    value={form.designation}
                    onChange={(e) =>
                      setForm({ ...form, designation: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    className="form-input"
                    value={form.department}
                    onChange={(e) =>
                      setForm({ ...form, department: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm({ ...form, start_date: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="employee">Employee</option>
                    <option value="intern">Intern</option>
                    <option value="lead">Lead</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="onboarding">
                      Onboarding (pending approval)
                    </option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Manager</label>
                  <select
                    className="form-select"
                    value={form.manager_id}
                    onChange={(e) =>
                      setForm({ ...form, manager_id: e.target.value })
                    }
                  >
                    <option value="">No manager</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showBulkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowBulkModal(false)}
        >
          <div
            className="w-full max-w-5xl max-h-[88vh] overflow-y-auto rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Add Bulk Employees
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Import multiple employees using an Excel file
                </p>
              </div>

              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-2xl
                     text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                onClick={() => setShowBulkModal(false)}
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {/* Upload Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center rounded-xl
            border-2 border-dashed px-6 py-10 text-center transition
            ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-gray-50 hover:border-blue-400"
            }`}
              >
                {/* Icon */}
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <span className="text-2xl">📊</span>
                </div>

                <h3 className="text-lg font-medium text-gray-800">
                  Drop your Excel file here
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  or select a file from your computer
                </p>

                <label
                  htmlFor="employee-excel-upload"
                  className="mt-5 cursor-pointer rounded-lg bg-blue-600 px-5 py-2.5
                       text-sm font-medium text-white transition
                       hover:bg-blue-700"
                >
                  Browse File
                </label>

                <input
                  id="employee-excel-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <p className="mt-4 text-xs text-gray-400">
                  Supported formats: .xlsx, .xls
                </p>
              </div>

              {/* Error */}
              {fileError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">{fileError}</p>
                </div>
              )}

              {/* Selected File */}
              {selectedFile && employeesToAdd.length > 0 && (
                <div className="mt-6">
                  {/* File information */}
                  <div
                    className="flex items-center justify-between rounded-lg border
                            border-gray-200 bg-gray-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center
                                rounded-lg bg-green-100"
                      >
                        📄
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {selectedFile.name}
                        </p>

                        <p className="text-xs text-gray-500">
                          {employeesToAdd.length} employees found
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setEmployeesToAdd([]);
                        setFileError("");
                      }}
                      className="text-sm font-medium text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Preview */}
                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-800">
                        Employee Preview
                      </h3>

                      <span
                        className="rounded-full bg-blue-50 px-3 py-1 text-xs
                                 font-medium text-blue-600"
                      >
                        {employeesToAdd.length} Records
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <div className="max-h-80 overflow-auto">
                        <table className="w-full text-left text-sm">
                          <thead
                            className="sticky top-0 bg-gray-50 text-xs
                                      uppercase text-gray-500"
                          >
                            <tr>
                              <th className="whitespace-nowrap border-b px-4 py-3">
                                Name
                              </th>

                              <th className="whitespace-nowrap border-b px-4 py-3">
                                Email
                              </th>

                              <th className="whitespace-nowrap border-b px-4 py-3">
                                Role
                              </th>

                              <th className="whitespace-nowrap border-b px-4 py-3">
                                Status
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {employeesToAdd.map((employee, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="whitespace-nowrap border-b px-4 py-3 font-medium text-gray-800">
                                  {employee.name}
                                </td>

                                <td className="whitespace-nowrap border-b px-4 py-3 text-gray-600">
                                  {employee.email}
                                </td>

                                <td className="whitespace-nowrap border-b px-4 py-3">
                                  {employee.role}
                                </td>

                                <td className="whitespace-nowrap border-b px-4 py-3">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                      employee.status === "Active"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {employee.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div>
                    {errors.map((e, index) => (
                      <div className="text-red-700" key={index}>
                        {e}
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="mt-6 flex justify-end gap-3 border-t pt-5">
                    <button
                      onClick={() => setShowBulkModal(false)}
                      className="rounded-lg border border-gray-300 bg-white px-5 py-2.5
                           text-sm font-medium text-gray-700
                           hover:bg-gray-50"
                    >
                      Cancel
                    </button>

                    <button
                      disabled={errors.length > 0 || fileError.length > 0}
                      onClick={(e) => handleBlukSubmit(e)}
                      className="btn btn-primary"
                    >
                      Import {employeesToAdd.length} Employees
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
