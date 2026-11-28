// Types used only by the employees feature.

export interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  start_date?: string;
  expected_end_date?: string;
  // Project-scoped permission tier, not this person's HR-wide role.
  assigned_role: 'admin' | 'member' | 'viewer';
  modules: { id: number; name: string; target_date: string; status: string }[];
  repo_url: string[];
  docs_url: string[];
}

export interface Acknowledgement {
  id: number;
  policy_id: number;
  policy_title: string;
  signed_file_path: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string;
}
