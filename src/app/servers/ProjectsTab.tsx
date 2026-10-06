'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/Button/Button';

interface Project {
  id: number;
  name: string;
  description: string | null;
  status: string;
  expected_end_date: string | null;
  roadmap_key: string | null;
  roadmap_label: string | null;
  public_link: string | null;
}

interface Todo {
  id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  is_complete: number;
  sort_order: number;
}

interface TodoSummary {
  total: number;
  completed: number;
  percentage: number;
}

function ProgressBar({ pct }: { pct: number }) {
  const color = pct === 100 ? 'var(--color-success, #22c55e)' : pct >= 50 ? 'var(--color-primary)' : 'var(--color-warning, #f59e0b)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

function TodoRow({
  todo,
  isAdmin,
  projectId,
  onChanged,
}: {
  todo: Todo;
  isAdmin: boolean;
  projectId: number;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description ?? '');
  const [deadline, setDeadline] = useState(todo.deadline ?? '');
  const [saving, setSaving] = useState(false);

  async function handleToggle() {
    await api.patch(`/projects/${projectId}/todos/${todo.id}/toggle`, { is_complete: todo.is_complete ? 0 : 1 });
    onChanged();
  }

  async function handleSave() {
    setSaving(true);
    await api.put(`/projects/${projectId}/todos/${todo.id}`, {
      title,
      description: description || null,
      deadline: deadline || null,
    });
    setSaving(false);
    setEditing(false);
    onChanged();
  }

  async function handleDelete() {
    if (!confirm(`Delete "${todo.title}"?`)) return;
    await api.delete(`/projects/${projectId}/todos/${todo.id}`);
    onChanged();
  }

  const done = Boolean(todo.is_complete);

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-sm, 8px)',
      padding: '12px 14px',
      background: done ? 'var(--color-bg)' : 'var(--color-surface, var(--color-card))',
      opacity: done ? 0.7 : 1,
    }}>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            className="form-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task title"
          />
          <textarea
            className="form-textarea"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
          />
          <input
            className="form-input"
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-xs" onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn btn-secondary btn-xs" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {isAdmin && (
            <input
              type="checkbox"
              checked={done}
              onChange={handleToggle}
              style={{ marginTop: 3, cursor: 'pointer', flexShrink: 0 }}
            />
          )}
          {!isAdmin && (
            <span style={{
              width: 16, height: 16, border: '2px solid var(--color-border)', borderRadius: 4,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
              background: done ? 'var(--color-primary)' : 'transparent',
            }}>
              {done && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 500, fontSize: 14,
              textDecoration: done ? 'line-through' : 'none',
              color: done ? 'var(--color-muted)' : 'var(--color-text)',
            }}>
              {todo.title}
            </div>
            {todo.description && (
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{todo.description}</div>
            )}
            {todo.deadline && (
              <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>
                Due: {new Date(todo.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn btn-text btn-xs" onClick={() => setEditing(true)} title="Edit">✏️</button>
              <button className="btn btn-text btn-xs" onClick={handleDelete} title="Delete" style={{ color: 'var(--color-danger, #ef4444)' }}>✕</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, isAdmin }: { project: Project; isAdmin: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [summary, setSummary] = useState<TodoSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingTodo, setAddingTodo] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [t, s] = await Promise.all([
      api.get<Todo[]>(`/projects/${project.id}/todos`).catch(() => []),
      api.get<TodoSummary>(`/projects/${project.id}/todos/summary`).catch(() => null),
    ]);
    setTodos(t);
    setSummary(s);
    setLoading(false);
  };

  useEffect(() => {
    if (expanded) load();
  }, [expanded]);

  async function addTodo() {
    if (!newTitle.trim()) return;
    setSaving(true);
    await api.post(`/projects/${project.id}/todos`, {
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      deadline: newDeadline || null,
    });
    setNewTitle('');
    setNewDesc('');
    setNewDeadline('');
    setSaving(false);
    setAddingTodo(false);
    load();
  }

  const statusColor: Record<string, string> = {
    active: 'var(--color-success, #22c55e)',
    archived: 'var(--color-muted)',
    on_hold: 'var(--color-warning, #f59e0b)',
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: expanded ? '1px solid var(--color-border)' : 'none',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{project.name}</span>
            <span style={{
              fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
              padding: '2px 8px', borderRadius: 20,
              background: `${statusColor[project.status] ?? 'var(--color-muted)'}22`,
              color: statusColor[project.status] ?? 'var(--color-muted)',
            }}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
          {project.description && (
            <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>{project.description}</div>
          )}
          {summary && summary.total > 0 && (
            <div style={{ marginTop: 8 }}>
              <ProgressBar pct={summary.percentage} />
              <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 3 }}>
                {summary.completed} / {summary.total} tasks complete
              </div>
            </div>
          )}
        </div>
        <span style={{ fontSize: 12, color: 'var(--color-muted)', flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Project meta */}
          {project.expected_end_date && (
            <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
              Deadline: <strong>{new Date(project.expected_end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
              {project.roadmap_label && <> · <span>{project.roadmap_label}</span></>}
            </div>
          )}
          {project.public_link && (
            <div style={{ fontSize: 12 }}>
              <a href={project.public_link} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>
                {project.public_link.replace('https://', '')} ↗
              </a>
            </div>
          )}

          {/* Todo list */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-muted)' }}>
                Tasks
              </span>
              {isAdmin && !addingTodo && (

                <Button
                  variant='text'
                  size='small'
                  onClick={() => setAddingTodo(true)}
                  leftIcon={
                    <span
                      className="icon-mask"
                      style={{
                        width: 16,
                        height: 16,
                        WebkitMaskImage: `url(/icons/plus.svg)`,
                        maskImage: `url(/icons/plus.svg)`,
                      }}
                    />
                  }
                >Add Task</Button>
              )}
            </div>

            {loading && <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>Loading…</div>}

            {!loading && todos.length === 0 && !addingTodo && (
              <div style={{ fontSize: 13, color: 'var(--color-muted)', fontStyle: 'italic' }}>
                {isAdmin ? 'No tasks yet. Add one to get started.' : 'No tasks defined for this project.'}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todos.map(todo => (
                <TodoRow key={todo.id} todo={todo} isAdmin={isAdmin} projectId={project.id} onChanged={load} />
              ))}
            </div>

            {addingTodo && (
              <div style={{
                marginTop: 8, border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm, 8px)',
                padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <input
                  className="form-input"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Task title *"
                  autoFocus
                />
                <textarea
                  className="form-textarea"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                />
                <input
                  className="form-input"
                  type="date"
                  value={newDeadline}
                  onChange={e => setNewDeadline(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8 }}>

                  <Button
                    variant='primary'
                    size='xs'
                    onClick={addTodo}
                    disabled={saving || !newTitle.trim()}
                  >
                    {saving ? 'Adding…' : 'Add task'}
                  </Button>
                  <Button
                    variant='text'
                    size='xs'
                    onClick={() => { setAddingTodo(false); setNewTitle(''); setNewDesc(''); setNewDeadline(''); }}
                  >
                    Cancel
                  </Button>

                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectsTab() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    api.get<Project[]>('/projects')
      .then(setProjects)
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: 20, color: 'var(--color-muted)' }}>Loading projects…</div>;
  }

  const active = projects.filter(p => p.status === 'active');
  const rest = projects.filter(p => p.status !== 'active');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {isAdmin && (
        <div style={{
          background: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', padding: '10px 16px', fontSize: 13, color: 'var(--color-muted)',
        }}>
          As admin you can add tasks, set deadlines, and mark tasks complete. Progress is reflected live on the public roadmap.
        </div>
      )}

      {active.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: 12 }}>
            Active Projects
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {active.map(p => <ProjectCard key={p.id} project={p} isAdmin={isAdmin} />)}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: 12 }}>
            Archived / On Hold
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rest.map(p => <ProjectCard key={p.id} project={p} isAdmin={isAdmin} />)}
          </div>
        </div>
      )}

      {projects.length === 0 && (
        <div style={{ fontSize: 14, color: 'var(--color-muted)', fontStyle: 'italic' }}>No projects found.</div>
      )}
    </div>
  );
}
