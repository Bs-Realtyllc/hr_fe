import type { Project } from '../types';
import { fmtDate, msBadge, statusBadge } from '../utils';

export default function EmployeeProjectsCard({ projects }: { projects: Project[] }) {
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 14 }}>Projects</div>

      {projects.length === 0 && (
        <p className="text-muted text-sm">Not assigned to any projects yet.</p>
      )}

      {projects.map(p => {
        const repos = Array.isArray(p.repo_url) ? p.repo_url : [];
        const docs = Array.isArray(p.docs_url) ? p.docs_url : [];
        const pending = p.milestones.filter(m => m.status !== 'completed').length;
        const total = p.milestones.length;
        return (
          <div key={p.id} style={{
            background: 'var(--color-bg)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)', padding: 16, marginBottom: 12,
          }}>
            {/* Wraps on phones: badges drop under the name instead of squeezing it. */}
            <div className="flex justify-between items-start mb-2" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div className="font-semibold">{p.name}</div>
                {p.description && <div className="text-muted text-sm">{p.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`badge ${statusBadge[p.status]}`}>{p.status}</span>
                <span className="badge badge-accent">{p.assigned_role.replace(/_/g, ' ')}</span>
              </div>
            </div>

            <div className="flex gap-4 text-sm" style={{ marginBottom: p.milestones.length > 0 ? 12 : 0, flexWrap: 'wrap', rowGap: 4 }}>
              {p.start_date && (
                <span className="text-muted">
                  Start: <strong>{fmtDate(p.start_date)}</strong>
                </span>
              )}
              {p.expected_end_date && (
                <span className="text-muted">
                  Deadline: <strong style={{ color: new Date(p.expected_end_date) < new Date() && p.status !== 'archived' ? 'var(--color-error)' : 'inherit' }}>
                    {fmtDate(p.expected_end_date)}
                  </strong>
                </span>
              )}
              {total > 0 && (
                <span className="text-muted">
                  Milestones: <strong>{total - pending}/{total} done</strong>
                </span>
              )}
            </div>

            {(repos.length > 0 || docs.length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: p.milestones.length > 0 ? 10 : 0 }}>
                {repos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="text-sm"
                    style={{ color: 'var(--color-accent)' }}>Repo {repos.length > 1 ? i + 1 : ''} ↗</a>
                ))}
                {docs.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="text-sm"
                    style={{ color: 'var(--color-accent)' }}>Docs {docs.length > 1 ? i + 1 : ''} ↗</a>
                ))}
              </div>
            )}

            {p.milestones.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {p.milestones.map(m => (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className={`badge ${msBadge[m.status]}`} style={{ fontSize: 11 }}>{m.status.replace('_', ' ')}</span>
                    <span className="text-sm">{m.title}</span>
                    <span className="text-muted text-sm" style={{ marginLeft: 'auto' }}>
                      {fmtDate(m.due_date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
