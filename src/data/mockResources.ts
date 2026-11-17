export interface MockPolicyDocument {
  id: number;
  type: string;
  category: string;
  title: string;
  file_path: string;
  folder_path: string | null;
  version: number;
  uploaded_by_name: string | null;
  created_at: string;
  date_modified: string | null;
  file_size: string;
  is_pinned: boolean;
}

export const initialMockFolders = [
  {
    id: 1,
    name: 'Policies',
    description: 'Company-wide policies and guidelines.',
    fileCount: 3,
  },
  {
    id: 2,
    name: 'Employee Handbook',
    description: 'Handbook and employee resources.',
    fileCount: 2,
  },
  {
    id: 3,
    name: 'Health & Safety',
    description: 'Workplace health and safety documents.',
    fileCount: 1,
  },
];

export const mockPolicyDocuments: MockPolicyDocument[] = [
  {
    id: 1,
    type: 'code-of-conduct',
    category: 'policy',
    title: 'Code of Conduct',
    file_path: 'code-of-conduct.pdf',
    folder_path: 'Policies',
    version: 1,
    uploaded_by_name: 'HR Admin',
    created_at: '2026-10-01T09:00:00.000Z',
    date_modified: '2026-10-01T09:00:00.000Z',
    file_size: '1.8 MB',
    is_pinned: true,
  },
  {
    id: 2,
    type: 'leave-and-holidays',
    category: 'policy',
    title: 'Leave and Holidays Policy',
    file_path: 'leave-and-holidays-policy.pdf',
    folder_path: 'Policies',
    version: 2,
    uploaded_by_name: 'HR Admin',
    created_at: '2026-09-15T10:30:00.000Z',
    date_modified: '2026-10-05T08:15:00.000Z',
    file_size: '2.4 MB',
    is_pinned: false,
  },
  {
    id: 3,
    type: 'workplace-health-and-safety',
    category: 'policy',
    title: 'Workplace Health and Safety',
    file_path: 'workplace-health-and-safety.pdf',
    folder_path: 'Health & Safety',
    version: 1,
    uploaded_by_name: 'HR Admin',
    created_at: '2026-08-20T12:00:00.000Z',
    date_modified: null,
    file_size: '3.1 MB',
    is_pinned: false,
  },
];
