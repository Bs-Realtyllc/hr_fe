// Shape returned by GET /profile (the signed-in user's own record).
// Source of truth: PROFILE_COLUMNS in hr_be/src/repositories/employee.repository.ts.

import type { Gender, Role, EmployeeStatus } from './employee';

export interface Profile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  secondary_email: string | null;
  designation_id: number | null;
  designation: string | null;
  department_id: number | null;
  department: string | null;
  manager_id: number | null;
  /** The manager's name. */
  manager: string | null;
  start_date: string | null;
  dob: string | null;
  gender: Gender | null;
  github_url: string | null;
  current_address: string | null;
  permanent_address: string | null;
  discord_username: string | null;
  panNo: string | null;
  role: Role;
  status: EmployeeStatus;
  /** Uploaded file names; build URLs with BACKEND_URL + /uploads/... */
  profile_picture: string | null;
  id_front: string | null;
  id_back: string | null;
  nationality: string | null;
  employee_id: string | null;
  work_location: string | null;
  work_hours: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relation: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_email: string | null;
  emergency_contact_address: string | null;
  account_holder_name: string | null;
  account_number: string | null;
  account_type: string | null;
  bank_name: string | null;
  bank_branch_name: string | null;
}

/** Fields accepted by PUT /profile (see SELF_SERVICE_FIELDS in hr_be/src/dtos/profile.dto.ts). */
export type ProfileUpdate = Partial<
  Omit<Profile, 'id' | 'role' | 'status' | 'id_front' | 'id_back' | 'panNo' | 'employee_id' | 'manager'>
>;
