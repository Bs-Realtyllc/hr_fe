// Sample org-chart data shared by stories and tests. Not imported by app code.
import type { OrgChartMember } from './types';
import { buildOrgTree } from './utils/buildOrgTree';

export function member(
  id: number,
  name: string,
  manager_id: number | null = null,
  extra: Partial<OrgChartMember> = {},
): OrgChartMember {
  return {
    id,
    name,
    manager_id,
    designation: null,
    department_id: null,
    department: null,
    profile_picture: null,
    status: 'active',
    ...extra,
  };
}

export const smallTeam: OrgChartMember[] = [
  member(1, 'Sita Karki', null, { designation: 'CEO', department_id: 1, department: 'Leadership' }),
  member(2, 'Aarav Sharma', 1, {
    designation: 'Engineering Manager',
    department_id: 2,
    department: 'IT',
  }),
  member(3, 'Bishal Sharma', 1, {
    designation: 'Finance Lead',
    department_id: 3,
    department: 'Finance',
  }),
  member(4, 'John Doe', 2, { designation: 'Senior Developer', department_id: 2, department: 'IT' }),
  member(5, 'Priya Thapa', 2, { designation: 'Developer', department_id: 2, department: 'IT' }),
  member(6, 'Ram Gurung', 4, { designation: 'Intern', department_id: 2, department: 'IT' }),
  member(7, 'Maya Rai', 3, { designation: 'Accountant', department_id: 3, department: 'Finance' }),
];

/** Two people with no manager, as when the CEO isn't set yet. */
export const multipleRoots: OrgChartMember[] = [
  member(1, 'Aarav Sharma', null, { designation: 'Manager' }),
  member(2, 'Bishal Sharma', null),
  member(3, 'John Doe', 1),
  member(4, 'Jane Roe', 3),
];

const DEPARTMENTS = ['Engineering', 'Finance', 'HR', 'Marketing', 'Operations', 'Sales'];

/** A wide, deep company: 1 CEO, 6 department heads, 5 leads each, 4 reports per lead. */
export function largeCompany(): OrgChartMember[] {
  const rows = [member(1, 'Chief Executive', null, { designation: 'CEO' })];
  let id = 2;
  DEPARTMENTS.forEach((department, d) => {
    const dept = { department_id: d + 1, department };
    const headId = id++;
    rows.push(member(headId, `${department} Head`, 1, { designation: 'Department Head', ...dept }));
    for (let l = 0; l < 5; l++) {
      const leadId = id++;
      rows.push(
        member(leadId, `Lead ${d + 1}.${l + 1}`, headId, { designation: 'Team Lead', ...dept }),
      );
      for (let r = 0; r < 4; r++) {
        rows.push(
          member(id++, `Employee ${d + 1}.${l + 1}.${r + 1}`, leadId, {
            designation: 'Engineer',
            ...dept,
          }),
        );
      }
    }
  });
  return rows;
}

export const smallTeamTree = () => buildOrgTree(smallTeam);

/** Like a fresh install: only an admin and one employee, no managers set. */
export const twoPeopleNoManagers: OrgChartMember[] = [
  member(1, 'Admin'),
  member(2, 'test', null, { designation: 'senior', department_id: 1, department: 'IT' }),
];

/**
 * A company part-way through setting managers: two people manage someone,
 * everyone else has no manager yet.
 */
export const partlyManaged: OrgChartMember[] = [
  member(1, 'Aarav Sharma', null, { designation: 'Manager', department_id: 2, department: 'IT' }),
  member(2, 'John Doe', 1, { designation: 'Developer', department_id: 2, department: 'IT' }),
  member(3, 'Bishal Sharma', null, {
    designation: 'Finance Lead',
    department_id: 3,
    department: 'Finance',
  }),
  member(4, 'Maya Rai', 3, { designation: 'Accountant', department_id: 3, department: 'Finance' }),
  member(5, 'Kiran Bhandari', null, { designation: 'Support', department_id: 2, department: 'IT' }),
  member(6, 'Ram Thapa', null, { designation: 'Developer', department_id: 2, department: 'IT' }),
  member(7, 'Gita Rai', null, {
    designation: 'Executive',
    department_id: 4,
    department: 'Marketing',
  }),
  member(8, 'Rita KC', null, { designation: 'Manager', department_id: 4, department: 'Marketing' }),
  member(9, 'Maya Adhikari', null, {
    designation: 'Assistant',
    department_id: 5,
    department: 'HR',
  }),
  member(10, 'Dev User'),
];
