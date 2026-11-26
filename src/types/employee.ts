// Shapes returned by the HR backend's /employees endpoints.
// Source of truth: hr_be/src/dtos/employee.dto.ts (EmployeeResponse) and the
// `employees` table in hr_be/drizzle/schema.ts. Keep these in sync.

export const ROLES = ['admin', 'lead', 'employee', 'intern'] as const;
export type Role = (typeof ROLES)[number];

export const EMPLOYEE_STATUSES = [
  'onboarding',
  'active',
  'on_leave',
  'probation',
  'offboarding',
  'terminated',
] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

/** GET /employees, GET /employees/:id */
export interface Employee {
  id: number;
  name: string;
  email: string;
  secondary_email: string | null;
  discord_username: string | null;
  dob: string | null;
  address?: string | null;
  panNo: string | null;
  github_url: string | null;
  profile_picture: string | null;
  id_front: string | null;
  id_back: string | null;
  designation: string | null;
  designation_id: number | null;
  department: string | null;
  department_id: number | null;
  manager_id: number | null;
  manager_name?: string | null;
  start_date: string | null;
  role: Role;
  status: EmployeeStatus;
  salary?: string | null;
  pay_frequency?: 'monthly' | 'biweekly' | 'weekly' | null;
  // Onboarding profile fields
  gender: Gender | null;
  education_level?: string | null;
  institution_name?: string | null;
  field_of_study?: string | null;
  graduation_date?: string | null;
  previous_experience?: string | null;
  areas_of_interest?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
}

/** The fields most pickers and lists need (selects, assignee lists, cards). */
export type EmployeeSummary = Pick<Employee, 'id' | 'name' | 'designation'>;

/** GET /employees/names — the lightweight roster used for filters. */
export type EmployeeName = Pick<Employee, 'id' | 'name' | 'role'>;
