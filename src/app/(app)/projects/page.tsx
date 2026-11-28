'use client';
import { useEffect, useRef, useState } from 'react';
import { employeesApi } from '@/lib/queries/employees';
import { usePermissions } from '@/hooks/usePermissions';
import type { EmployeeSummary as Employee } from '@/types';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button/Button';
import PillTabs from '@/components/ui/PillTabs';
import { showToast } from '@/lib/toast';
import IssueBoard from './_components/IssueBoard';
import AnalyticsTab from './_components/AnalyticsTab';
import ChipDropdown from './_components/ChipDropdown';
import MultiSelect from '@/components/ui/MultiSelect';

interface Project {
  id: number;
  name: string;
  description: string;
  code: string | null;
  repo_url: string[];
  docs_url: string[];
  status: 'active' | 'archived' | 'on_hold';
  start_date?: string;
  expected_end_date?: string;
}

type ModuleStatus = 'backlog' | 'planned' | 'in_progress' | 'completed' | 'cancelled';

// Replaces the old Milestone — a module has real ownership (lead_id) and its
// own subset of the team, not just a label with a deadline.
interface ProjectModule {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  start_date: string | null;
  target_date: string;
  status: ModuleStatus;
  lead_id: number | null;
  lead_name: string | null;
}

// Named admin/member, not lead/contributor — this app's global employee
// role already has a 'lead' value with real company-wide power (leave
// approval, payroll, performance reviews), so a project-scoped tier can't
// reuse that word. Matches Jira/Plane's own project-level tier naming.
type ProjectRole = 'admin' | 'member' | 'viewer';

interface Assignment {
  id: number;
  employee_id: number;
  name: string;
  designation: string;
  role: ProjectRole;
}


interface ServiceDef {
  key: string;
  name: string;
  logoSrc: string;
  color: string;
}

const ALL_SERVICES: ServiceDef[] = [
  { key: 'drone', name: 'Drone CI', logoSrc: '/logos/drone.svg', color: '#1565C0' },
  { key: 'sonarqube', name: 'SonarQube', logoSrc: '/logos/sonar.svg', color: '#00897B' },
  { key: 'design', name: 'Design', logoSrc: '/logos/storybook.svg', color: '#FF4785' },
  { key: 'bsrealty', name: 'BS Realty', logoSrc: '/logos/bsrealty.png', color: '#1e3a5f' },
  { key: 'insurance', name: 'Insurance', logoSrc: '/logos/insurance.png', color: '#2563eb' },
  { key: 'gitgi', name: 'GITGI', logoSrc: '/logos/gitgi.svg', color: '#235e94' },
  { key: 'job-portal', name: 'Job Portal', logoSrc: '/logos/job-portal.svg', color: '#863bff' },
];

const statusBadge: Record<string, string> = {
  active: 'badge-success',
  archived: 'badge-neutral',
  on_hold: 'badge-warning',
};

const moduleStatusBadge: Record<ModuleStatus, string> = {
  completed: 'badge-success',
  in_progress: 'badge-info',
  planned: 'badge-info',
  backlog: 'badge-neutral',
  cancelled: 'badge-neutral',
};

const ROLE_OPTIONS: ProjectRole[] = ['admin', 'member', 'viewer'];
const ROLE_LABEL: Record<ProjectRole, string> = { admin: 'Admin', member: 'Member', viewer: 'Viewer' };

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function MultiUrlField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const add = () => onChange([...values, '']);
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const update = (i: number, v: string) => {
    const next = [...values];
    next[i] = v;
    onChange(next);
  };
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {values.map((v, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              className="form-input"
              type="url"
              value={v}
              placeholder="https://..."
              onChange={e => update(i, e.target.value)}
              style={{ flex: 1, marginBottom: 0 }}
            />
            <button
              type="button"
              className="btn btn-text btn-xs btn-danger"
              style={{ flexShrink: 0, padding: 8 }}
              onClick={() => remove(i)}
              title="Remove"
            >
              <span
                className="icon-mask"
                style={{ WebkitMaskImage: 'url(/icons/x.svg)', maskImage: 'url(/icons/x.svg)' }}
              />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
            background: 'transparent', color: 'var(--color-text-muted)',
            padding: '8px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <span
            className="icon-mask"
            style={{ WebkitMaskImage: 'url(/icons/plus.svg)', maskImage: 'url(/icons/plus.svg)', width: 14, height: 14 }}
          />
          Add URL
        </button>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const { isPrivileged, isAdmin } = usePermissions();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'analytics'>('overview');
  const [modules, setModules] = useState<ProjectModule[]>([]);
  // Lightweight own fetch of issue status/module pairs, just to compute
  // "X of Y done" per module — same self-fetch pattern IssueBoard's
  // Analytics tab already uses, rather than lifting the Board's full issue
  // state up here.
  const [moduleCounts, setModuleCounts] = useState<Record<number, { done: number; total: number }>>({});
  // Whole-project completion ("X/Y issues done"), from the same issue fetch
  // used for moduleCounts — matches how Plane shows real work-item-closed
  // counts rather than a calendar-time-elapsed bar.
  const [projectIssueCounts, setProjectIssueCounts] = useState<{ done: number; total: number } | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  // null = creating a new project; set = editing that existing one. Code
  // (issue key prefix) is immutable once set — the backend's update schema
  // doesn't even accept it — so the field only appears while creating.
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', status: 'active', code: '',
    repo_url: [] as string[], docs_url: [] as string[],
    start_date: '', expected_end_date: '',
  });
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const [projectServices, setProjectServices] = useState<string[]>([]);

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState<{ employee_id: string; role: ProjectRole }>({ employee_id: '', role: 'member' });

  // Module add state
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleForm, setModuleForm] = useState<{
    name: string; description: string; start_date: string; target_date: string;
    status: ModuleStatus; lead_id: string; member_ids: number[];
  }>({ name: '', description: '', start_date: '', target_date: '', status: 'backlog', lead_id: '', member_ids: [] });

  // isPrivileged is the HR-wide role (admin/lead) — the backend also lets a
  // project-scoped "admin" (project.service.ts's assertProjectAdmin) manage
  // their own project's team/modules without being an HR admin. Without this,
  // the UI would hide Assign/Add Module from exactly the people the backend
  // was changed to let self-serve.
  const myAssignment = assignments.find(a => a.employee_id === user?.id);
  const canManageProject = isPrivileged || myAssignment?.role === 'admin';
  // A viewer (or someone with no assignment at all) can't write issues either
  // — issue.service.ts's assertCanWrite rejects both. Threaded down so the
  // board can disable its own controls instead of only reverting-with-a-toast
  // after a write already failed.
  const canWriteIssues = isPrivileged || (myAssignment != null && myAssignment.role !== 'viewer');

  useEffect(() => {
    // Land on the project picker, not whichever project happens to be
    // newest — auto-opening one here means clicking "Projects" in the
    // sidebar always drops you into the same project instead of letting
    // you choose.
    api.get<Project[]>('/projects').then(setProjects).catch(() => { });
    employeesApi.list<Employee>().then(setEmployees).catch(() => {showToast('error', "Failed to load employee data")});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ≤1120px the list and detail stack (see .projects-layout in grid.css): opening
  // a project replaces the list, so start the detail at the top, and on "Back"
  // return to the card the user came from.
  const isStacked = () =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1120px)').matches;
  const returnToId = useRef<number | null>(null);

  useEffect(() => {
    if (selected || returnToId.current == null) return;
    const id = returnToId.current;
    returnToId.current = null;
    document.querySelector(`[data-project-id="${id}"]`)?.scrollIntoView({ block: 'center' });
  }, [selected]);

  const backToList = () => {
    returnToId.current = selected?.id ?? null;
    setSelected(null);
  };

  const selectProject = async (p: Project) => {
    setSelected(p);
    if (isStacked()) window.scrollTo({ top: 0 });
    const [mods, as, svcs, issuesForCounts] = await Promise.all([
      api.get<ProjectModule[]>(`/projects/${p.id}/modules`).catch(() => []),
      api.get<Assignment[]>(`/projects/${p.id}/assignments`).catch(() => []),
      api.get<string[]>(`/projects/${p.id}/services`).catch(() => []),
      api.get<{ module_id: number | null; status: string }[]>(`/projects/${p.id}/issues`).catch(() => []),
    ]);
    setModules(mods);
    setAssignments(as);
    setProjectServices(svcs);
    const counts: Record<number, { done: number; total: number }> = {};
    for (const issue of issuesForCounts) {
      if (issue.module_id == null) continue;
      const bucket = counts[issue.module_id] ?? { done: 0, total: 0 };
      bucket.total += 1;
      if (issue.status === 'done') bucket.done += 1;
      counts[issue.module_id] = bucket;
    }
    setModuleCounts(counts);
    setProjectIssueCounts({
      total: issuesForCounts.length,
      done: issuesForCounts.filter(i => i.status === 'done').length,
    });
  };

  const toggleService = async (serviceKey: string) => {
    if (!selected) return;
    const active = projectServices.includes(serviceKey);
    if (active) {
      await api.delete(`/projects/${selected.id}/services/${serviceKey}`).catch(() => { });
      setProjectServices(prev => prev.filter(k => k !== serviceKey));
    } else {
      await api.post(`/projects/${selected.id}/services`, { service_key: serviceKey }).catch(() => { });
      setProjectServices(prev => [...prev, serviceKey]);
    }
  };

  const emptyForm = { name: '', description: '', status: 'active', code: '', repo_url: [] as string[], docs_url: [] as string[], start_date: '', expected_end_date: '' };

  const openCreateModal = () => {
    setEditingProject(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (p: Project) => {
    setEditingProject(p);
    setForm({
      name: p.name,
      description: p.description ?? '',
      status: p.status,
      code: p.code ?? '',
      repo_url: Array.isArray(p.repo_url) ? p.repo_url : [],
      docs_url: Array.isArray(p.docs_url) ? p.docs_url : [],
      start_date: p.start_date ?? '',
      expected_end_date: p.expected_end_date ?? '',
    });
    setShowModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      code: form.code.trim() || undefined,
      repo_url: form.repo_url.filter(Boolean),
      docs_url: form.docs_url.filter(Boolean),
    };
    try {
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, payload);
        // The update endpoint only returns { success: true }, not the row —
        // merge the submitted fields locally instead of refetching. `code`
        // is deliberately left out: it's immutable and wasn't sent.
        const updated: Project = {
          ...editingProject,
          name: form.name,
          description: form.description,
          status: form.status as Project['status'],
          repo_url: form.repo_url.filter(Boolean),
          docs_url: form.docs_url.filter(Boolean),
          start_date: form.start_date || undefined,
          expected_end_date: form.expected_end_date || undefined,
        };
        setProjects(prev => prev.map(p => (p.id === editingProject.id ? updated : p)));
        if (selected?.id === editingProject.id) setSelected(updated);
        showToast('success', 'Project updated successfully');
      } else {
        await api.post('/projects', payload);
        api.get<Project[]>('/projects').then(setProjects).catch(() => { });
        showToast('success', 'Project created successfully');
      }
      setShowModal(false);
      setEditingProject(null);
      setForm(emptyForm);
    } catch (err) {
      showToast('error', editingProject ? 'Failed to update project' : 'Failed to create project');
    }
  };

  // Archive/restore reuse the same update endpoint the Edit modal does —
  // just a one-field PATCH-via-PUT, no separate route. Archiving is
  // reversible (restore just flips status back), so it only needs a light
  // confirm, unlike Delete below which is permanent and cascading.
  const toggleArchive = async (p: Project) => {
    const archiving = p.status !== 'archived';
    const verb = archiving ? 'Archive' : 'Restore';
    if (!window.confirm(
      archiving
        ? `Archive "${p.name}"? It'll be hidden from the active project list, but nothing is deleted — you can restore it anytime.`
        : `Restore "${p.name}"? It'll become active again.`,
    )) return;
    try {
      const nextStatus: Project['status'] = archiving ? 'archived' : 'active';
      await api.put(`/projects/${p.id}`, { status: nextStatus });
      const updated: Project = { ...p, status: nextStatus };
      setProjects(prev => prev.map(proj => (proj.id === p.id ? updated : proj)));
      if (selected?.id === p.id) setSelected(updated);
      showToast('success', `${verb}d project successfully`);
    } catch (err) {
      showToast('error', `Failed to ${verb.toLowerCase()} project`);
    }
  };

  const submitAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try{
    await api.post(`/projects/${selected.id}/assignments`, {
      employee_id: parseInt(assignForm.employee_id),
      role: assignForm.role,
    });
    setShowAssignModal(false);
      setAssignForm({ employee_id: '', role: 'member' });
    const as = await api.get<Assignment[]>(`/projects/${selected.id}/assignments`).catch(() => []);
    setAssignments(as);
      showToast('success', 'Successfully added to the team')
    }catch(err){
      showToast('error', 'Failed to assign to the team')
    }
  };

  const removeAssignment = async (empId: number) => {
    if (!selected) return;
    await api.delete(`/projects/${selected.id}/assignments/${empId}`).catch(() => {showToast('error', 'Failed to remove user from the team')});
    const as = await api.get<Assignment[]>(`/projects/${selected.id}/assignments`).catch(() => []);
    setAssignments(as);
  };

  const submitModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      const { id } = await api.post<{ id: number }>(`/projects/${selected.id}/modules`, {
        name: moduleForm.name,
        description: moduleForm.description || null,
        start_date: moduleForm.start_date || null,
        target_date: moduleForm.target_date,
        status: moduleForm.status,
        lead_id: moduleForm.lead_id ? Number(moduleForm.lead_id) : null,
      });
      await Promise.all(moduleForm.member_ids.map(empId =>
        api.post(`/projects/${selected.id}/modules/${id}/members`, { employee_id: empId })
      ));
      setShowModuleModal(false);
      setModuleForm({ name: '', description: '', start_date: '', target_date: '', status: 'backlog', lead_id: '', member_ids: [] });
      const mods = await api.get<ProjectModule[]>(`/projects/${selected.id}/modules`).catch(() => []);
      setModules(mods);
      showToast('success', 'Successfully added module')
    } catch (err) {
      showToast('error', 'Failed to add module')
    }
  };

  const updateModuleStatus = async (mod: ProjectModule, status: string) => {
    if (!selected) return;
    await api.put(`/projects/${selected.id}/modules/${mod.id}`, { status }).catch(() => {showToast('error', 'Failed to update status of module')});
    const updated = await api.get<ProjectModule[]>(`/projects/${selected.id}/modules`).catch(() => []);
    setModules(updated);
  };

  // Deleting cascades through a project's assignments/modules/services and
  // can't be undone, unlike Archive above — typing the project's own name
  // is a much higher bar than a browser confirm() dialog, intentionally.
  const openDeleteModal = (p: Project) => {
    setDeletingProject(p);
    setDeleteConfirmName('');
  };

  const confirmDelete = async () => {
    const p = deletingProject;
    if (!p || deleteConfirmName !== p.name) return;
    try {
      await api.delete(`/projects/${p.id}`);
      const remaining = projects.filter(proj => proj.id !== p.id);
      setProjects(remaining);
      if (selected?.id === p.id) {
        if (remaining.length > 0) {
          selectProject(remaining[0]);
        } else {
          setSelected(null);
          setModules([]);
          setAssignments([]);
          setProjectServices([]);
          setProjectIssueCounts(null);
        }
      }
      setDeletingProject(null);
      showToast('success', 'Successfully deleted project');
    } catch (err) {
      showToast('error', 'Failed to delete project');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Projects</h1>
            <p>Assignments, modules, and project timelines</p>
          </div>
          {isAdmin && (

            <Button variant='primary' size='small' onClick={openCreateModal}
              leftIcon={<span
                className="icon-mask"
                style={{ height: 16, width: 16, WebkitMaskImage: 'url(/icons/plus.svg)', maskImage: 'url(/icons/plus.svg)' }}
              />} >New Project</Button>

          )}
        </div>
      </div>

      <div className={`projects-layout ${selected ? 'has-detail' : ''}`}>
        {/* Project list — grid of tiles when browsing, a stacked sidebar once a project
            is selected, hidden entirely on mobile or while the board is open — see
            .projects-list rules in grid.css */}
        <div className="projects-list">
          {projects.length === 0 && (
            <div className="empty-state card">
              <span
                className="icon-mask empty-state-icon"
                style={{ WebkitMaskImage: 'url(/icons/folder.svg)', maskImage: 'url(/icons/folder.svg)' }}
              />
              <p>No projects yet</p>
            </div>
          )}
          {projects.map(p => {
            const isSelected = selected?.id === p.id;
            return (
              <div
                key={p.id}
                data-project-id={p.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  padding: 16,
                  background: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  boxShadow: isSelected ? '0 0 0 1.5px var(--color-primary)' : 'var(--shadow-card)',
                  transition: 'background 0.15s, box-shadow 0.15s',
                }}
                onClick={() => selectProject(p)}
              >
                <div className="flex justify-between items-center mb-2" style={{ gap: 8 }}>
                  <div className="flex items-center gap-2" style={{ overflow: 'hidden' }}>
                    <span
                      className="icon-mask"
                      style={{
                        flexShrink: 0, height: 16, width: 16, background: 'var(--color-accent)',
                        WebkitMaskImage: 'url(/icons/folder.svg)', maskImage: 'url(/icons/folder.svg)',
                      }}
                    />
                    <h3 style={{ fontSize: 14.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </h3>
                  </div>
                  <span className={`badge ${statusBadge[p.status]}`} style={{ flexShrink: 0 }}>{p.status.replace('_', ' ')}</span>
                </div>
                {p.description && (
                  <p className="text-sm text-muted" style={{
                    marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {p.description}
                  </p>
                )}
                {(p.start_date && p.expected_end_date) && (
                  <div className="flex justify-between text-muted" style={{ fontSize: 11 }}>
                    <span>{new Date(p.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    <span>{new Date(p.expected_end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="projects-detail" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* The project list is hidden once a project is open (see .projects-layout.has-detail in grid.css) — this is the way back */}
            <button
              type="button"
              className="btn btn-text btn-xs projects-back-btn"
              onClick={backToList}
            >
              <span
                className="icon-mask"
                style={{ WebkitMaskImage: 'url(/icons/chevron-left.svg)', maskImage: 'url(/icons/chevron-left.svg)' }}
              />
              Back to projects
            </button>
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>{selected.name}</h2>
                  <span className={`badge ${statusBadge[selected.status]}`}>{selected.status.replace('_', ' ')}</span>
                  {projectIssueCounts && projectIssueCounts.total > 0 && (
                    <span className="badge badge-neutral">
                      {projectIssueCounts.done}/{projectIssueCounts.total} issues done
                    </span>
                  )}
                </div>
                {selected.description && <p className="text-muted text-sm">{selected.description}</p>}
                {(() => {
                  const repos = Array.isArray(selected.repo_url) ? selected.repo_url : [];
                  const docs = Array.isArray(selected.docs_url) ? selected.docs_url : [];
                  return (repos.length > 0 || docs.length > 0) && (
                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {repos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="text-sm"
                          style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
                          Repo {repos.length > 1 ? i + 1 : ''} ↗
                        </a>
                      ))}
                      {docs.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="text-sm"
                          style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
                          Docs {docs.length > 1 ? i + 1 : ''} ↗
                        </a>
                      ))}
                    </div>
                  );
                })()}
              </div>
              {isAdmin && (
                <div className="flex gap-2" style={{ flexShrink: 0 }}>
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => openEditModal(selected)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => toggleArchive(selected)}
                  >
                    {selected.status === 'archived' ? 'Restore' : 'Archive'}
                  </button>
                  <button
                    className="btn btn-secondary btn-xs btn-danger"
                    onClick={() => openDeleteModal(selected)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            <PillTabs
              options={[
                { value: 'overview', label: 'Overview' },
                { value: 'issues', label: 'Board' },
                { value: 'analytics', label: 'Analytics' },
              ]}
              value={activeTab}
              onChange={(v) => setActiveTab(v as 'overview' | 'issues' | 'analytics')}
            />

            {activeTab === 'issues' ? (
              <IssueBoard projectId={selected.id} members={assignments} modules={modules} isAdmin={isAdmin} employees={employees} canWrite={canWriteIssues} />
            ) : activeTab === 'analytics' ? (
              <AnalyticsTab projectId={selected.id} />
            ) : (
            <>
            <div className="grid-2 projects-detail-split" style={{ gap: 16, alignItems: 'start' }}>
              {/* Team */}
              <div className="card">
                <div className="flex justify-between items-center mb-3">
                  <div className="card-title" style={{ marginBottom: 0 }}>Team</div>
                  {canManageProject && (

                    <Button
                      variant='primary'
                      onClick={() => setShowAssignModal(true)}
                      size='xs'
                      leftIcon={
                        <span className="icon-mask"
                          style={{ height: 16, width: 16, WebkitMaskImage: 'url(/icons/plus.svg)', maskImage: 'url(/icons/plus.svg)' }} />
                      }>
                      Assign
                    </Button>
                  )}
                </div>
                {assignments.length === 0
                  ? <p className="text-muted text-sm">No assignments yet</p>
                  : assignments.map(a => (
                    <div key={a.id} className="flex items-center gap-3 mb-3">
                      <div className="avatar avatar-sm">{initials(a.name)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="font-semibold text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                        <div className="text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.designation}</div>
                      </div>
                      <span className="badge badge-accent" style={{ flexShrink: 0 }}>{a.role}</span>
                      {canManageProject && (
                        <button onClick={() => removeAssignment(a.employee_id)} style={{
                          background: 'none', border: 'none', color: 'var(--color-error)',
                          cursor: 'pointer', fontSize: 16, padding: '0 4px', flexShrink: 0,
                        }}>×</button>
                      )}
                    </div>
                  ))
                }
              </div>

              {/* Modules */}
              <div className="card">
                <div className="flex justify-between items-center mb-3">
                  <div className="card-title" style={{ marginBottom: 0 }}>Modules</div>
                  {canManageProject && (

                    <Button
                      variant='primary'
                      onClick={() => setShowModuleModal(true)}
                      size='xs'
                      leftIcon={
                        <span className="icon-mask"
                          style={{ height: 16, width: 16, WebkitMaskImage: 'url(/icons/plus.svg)', maskImage: 'url(/icons/plus.svg)' }} />
                      }>
                      Add
                    </Button>
                  )}
                </div>
                {modules.length === 0
                  ? <p className="text-muted text-sm">No modules defined</p>
                  : modules.map(m => (
                    <div key={m.id} className="flex items-center gap-3 mb-3">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="font-semibold text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                        <div className="text-muted">
                          {m.lead_name && <span>Lead: {m.lead_name} · </span>}
                          {new Date(m.target_date).toLocaleDateString()}
                          {moduleCounts[m.id] && (
                            <span style={{ marginLeft: 8 }}>
                              {moduleCounts[m.id].done}/{moduleCounts[m.id].total} issue{moduleCounts[m.id].total > 1 ? 's' : ''} done
                            </span>
                          )}
                        </div>
                      </div>
                      {canManageProject ? (
                        <select
                          value={m.status}
                          onChange={e => updateModuleStatus(m, e.target.value)}
                          className="form-select"
                          style={{ width: 'auto', padding: '2px 8px', fontSize: 12, flexShrink: 0 }}
                        >
                          <option value="backlog">backlog</option>
                          <option value="planned">planned</option>
                          <option value="in_progress">in progress</option>
                          <option value="completed">completed</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      ) : (
                        <span className={`badge ${moduleStatusBadge[m.status]}`} style={{ flexShrink: 0 }}>{m.status.replace('_', ' ')}</span>
                      )}
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Services */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Services</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {ALL_SERVICES.map(svc => {
                  const active = projectServices.includes(svc.key);
                  return (
                    <div
                      key={svc.key}
                      onClick={() => isPrivileged && toggleService(svc.key)}
                      title={svc.name}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        cursor: isPrivileged ? 'pointer' : 'default', width: 64,
                        opacity: active ? 1 : 0.35,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: active ? `${svc.color}18` : 'var(--color-bg)',
                        border: active ? `2px solid ${svc.color}` : '2px solid var(--color-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 10,
                        transition: 'border-color 0.15s, background 0.15s',
                      }}>
                        <img src={svc.logoSrc} alt={svc.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.2 }}>
                        {svc.name}
                      </span>
                    </div>
                  );
                })}
              </div>
              {isPrivileged && (
                <p className="text-muted" style={{ fontSize: 11, marginTop: 12 }}>Click a service to toggle assignment</p>
              )}
            </div>
            </>
            )}
          </div>
        ) : null}
      </div>

      {/* New/Edit Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProject ? `Edit ${editingProject.name}` : 'New Project'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              {!editingProject && (
                <div className="form-group">
                  <label className="form-label">Issue key prefix</label>
                  <input
                    className="form-input"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="Auto-generated from the name if left blank"
                    maxLength={10}
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <MultiUrlField label="Repo URLs" values={form.repo_url} onChange={v => setForm({ ...form, repo_url: v })} />
              <MultiUrlField label="Docs URLs" values={form.docs_url} onChange={v => setForm({ ...form, docs_url: v })} />
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Expected End Date</label>
                  <input className="form-input" type="date" value={form.expected_end_date} onChange={e => setForm({ ...form, expected_end_date: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 justify-between mt-4">

                <Button
                  variant='text'
                  onClick={() => setShowModal(false)}
                  size='small'
                >
                  Cancel
                </Button>

                <Button
                  variant='primary'
                  type='submit'
                  size='small'
                  leftIcon={!editingProject ? <span
                    className="icon-mask"
                    style={{
                      height: 16,
                      width: 16,
                      WebkitMaskImage: 'url(/icons/plus.svg)', maskImage: 'url(/icons/plus.svg)'
                    }}
                  /> : undefined}
                >
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Modal — typing the project's name is a deliberately
          higher bar than a browser confirm(), since this cascades through
          assignments/modules/services and can't be undone (unlike Archive). */}
      {deletingProject && (
        <div className="modal-overlay" onClick={() => setDeletingProject(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete {deletingProject.name}</h2>
              <button className="modal-close" onClick={() => setDeletingProject(null)}>×</button>
            </div>
            <p className="text-sm" style={{ marginBottom: 14 }}>
              This permanently removes <strong>{deletingProject.name}</strong>, along with its assignments, modules, and services. This cannot be undone.
            </p>
            <div className="form-group">
              <label className="form-label">
                Type <strong>{deletingProject.name}</strong> to confirm
              </label>
              <input
                className="form-input"
                value={deleteConfirmName}
                onChange={e => setDeleteConfirmName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-between mt-4">
              <Button variant="text" size="small" onClick={() => setDeletingProject(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={confirmDelete}
                disabled={deleteConfirmName !== deletingProject.name}
                style={{ background: 'var(--color-error)', borderColor: 'var(--color-error)' }}
              >
                Delete Project
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Employee Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign to {selected?.name}</h2>

              <Button
                onClick={() => setShowAssignModal(false)}
                variant='text'
                size='small'
                leftIcon={<span
                  className="icon-mask"
                  style={{
                    height: 16,
                    width: 16,
                    WebkitMaskImage: 'url(/icons/x.svg)', maskImage: 'url(/icons/x.svg)'
                  }}
                />}>{false}</Button>
            </div>
            <form onSubmit={submitAssign}>
              <div className="form-group">
                <label className="form-label">Employee *</label>
                <select className="form-select" value={assignForm.employee_id}
                  onChange={e => setAssignForm({ ...assignForm, employee_id: e.target.value })} required>
                  <option value="">Select employee…</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={assignForm.role}
                  onChange={e => setAssignForm({ ...assignForm, role: e.target.value as ProjectRole })}
                >
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
                <p className="text-muted text-sm" style={{ marginTop: 4 }}>
                  This is a project-only permission, separate from their HR role. Admin can manage this project&apos;s team/modules without a global HR admin. Viewer cannot create or edit issues.
                </p>
              </div>
              <div className="flex gap-3 justify-between mt-4">

                <Button
                  onClick={() => setShowAssignModal(false)} variant='text'
                  size='small'

                >
                  Cancel
                </Button>

                <Button
                  type='submit'
                  variant='primary'
                  size='small'
                >
                  Assign
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Module Modal */}
      {showModuleModal && (
        <div className="modal-overlay" onClick={() => setShowModuleModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Module</h2>

              <Button
                onClick={() => setShowModuleModal(false)}
                variant='text'
                size='small'
                leftIcon={<span
                  className="icon-mask"
                  style={{
                    height: 16,
                    width: 16,
                    WebkitMaskImage: 'url(/icons/x.svg)', maskImage: 'url(/icons/x.svg)'
                  }}
                />}>{false}</Button>
            </div>
            <form onSubmit={submitModule}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={moduleForm.name}
                  onChange={e => setModuleForm({ ...moduleForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={2} value={moduleForm.description}
                  onChange={e => setModuleForm({ ...moduleForm, description: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={moduleForm.start_date}
                    onChange={e => setModuleForm({ ...moduleForm, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Date *</label>
                  <input className="form-input" type="date" value={moduleForm.target_date}
                    onChange={e => setModuleForm({ ...moduleForm, target_date: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={moduleForm.status}
                  onChange={e => setModuleForm({ ...moduleForm, status: e.target.value as ModuleStatus })}>
                  <option value="backlog">Backlog</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Lead</label>
                <select className="form-select" value={moduleForm.lead_id}
                  onChange={e => setModuleForm({ ...moduleForm, lead_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Members</label>
                <MultiSelect
                  options={employees.map(emp => ({ id: emp.id, name: emp.name }))}
                  value={moduleForm.member_ids}
                  onChange={ids => setModuleForm({ ...moduleForm, member_ids: ids })}
                  placeholder="No members yet"
                />
              </div>
              <div className="flex gap-3 justify-between mt-4">

                <Button
                  variant='text'
                  size='small'
                  onClick={() => setShowModuleModal(false)}
                >
                  Cancel
                </Button>

                <Button
                  variant='primary'
                  type='submit'
                  size='small'
                >
                  Add Module
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
