export interface Policy {
  id: number;
  type: string;
  category: string;
  title: string;
  file_path: string;
  folder_path: string | null;
  version: number;
  uploaded_by_name: string | null;
  created_at: string;
  date_modified?: string | null;
  file_size?: string | number | null;
  is_pinned: boolean | number;
}

export const mockPolicies: Policy[] = [
  {
    id: 1,
    type: "employee-handbook",
    category: "leave",
    title: "Employee Handbook",
    file_path: "employee-handbook.pdf",
    folder_path: "Company Policies",
    version: 1,
    uploaded_by_name: "Admin",
    created_at: "2026-11-10T10:00:00",
    date_modified: "2026-11-15T10:00:00",
    file_size: "2.4 MB",
    is_pinned: true,
  },
  {
    id: 2,
    type: "leave-policy",
    category: "leave",
    title: "Leave Policy",
    file_path: "leave-policy.pdf",
    folder_path: "Company Policies",
    version: 1,
    uploaded_by_name: "Admin",
    created_at: "2026-11-11T10:00:00",
    date_modified: "2026-11-14T10:00:00",
    file_size: "1.2 MB",
    is_pinned: false,
  },
  {
    id: 3,
    type: "attendance-policy",
    category: "attendance",
    title: "Attendance Policy",
    file_path: "attendance-policy.pdf",
    folder_path: "HR Documents",
    version: 1,
    uploaded_by_name: "Admin",
    created_at: "2026-11-12T10:00:00",
    date_modified: "2026-11-16T10:00:00",
    file_size: "850 KB",
    is_pinned: false,
  },
  {
    id: 4,
    type: "remote-work-policy",
    category: "general",
    title: "Remote Work Policy",
    file_path: "remote-work-policy.pdf",
    folder_path: "HR Documents",
    version: 1,
    uploaded_by_name: "Admin",
    created_at: "2026-11-13T10:00:00",
    date_modified: "2026-11-16T10:00:00",
    file_size: "1.5 MB",
    is_pinned: true,
  },
];

export const initialMockFolders = [
  // {
  //   id: 1,
  //   name: "Company Policies",
  //   description: "Important company policies and guidelines.",
  //   fileCount: 2,
  // },
  // {
  //   id: 2,
  //   name: "HR Documents",
  //   description: "Employee resources and HR documents.",
  //   fileCount: 2,
  // },
];
