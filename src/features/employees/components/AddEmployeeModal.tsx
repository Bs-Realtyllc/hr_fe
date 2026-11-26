'use client';
import Button from '@/components/ui/Button/Button';
import type { Employee } from '@/types';
import type { AddEmployeeState } from '../hooks/useAddEmployee';

export default function AddEmployeeModal({ add, employees }: { add: AddEmployeeState; employees: Employee[] }) {
  const { showModal, setShowModal, form, setForm, submit } = add;
  if (!showModal) return null;
  return (
    <div className="modal-overlay" onClick={() => setShowModal(false)}>
      <div
        className="modal"
        style={{ maxWidth: 600, maxHeight: "88vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Add Employee</h2>
          <Button
            onClick={() => setShowModal(false)}
            variant="text"
            size="small"
          >
            X
          </Button>
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
            <Button
              type="button"
              onClick={() => setShowModal(false)}
              variant="secondary"
              size="small"
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="small">
              Add Employee
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
