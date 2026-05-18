'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Server {
  id: number;
  project_name?: string;
  name: string;
  environment: 'development' | 'staging' | 'production';
  ip_address: string;
  domain?: string;
  ssh_user: string;
  notes?: string;
  is_sensitive: boolean;
}

const envBadge: Record<string, string> = {
  development: 'badge-info',
  staging: 'badge-warning',
  production: 'badge-error',
};

const envOrder = ['production', 'staging', 'development'];

export default function ServersPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [showSensitive, setShowSensitive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    project_id: '', name: '', environment: 'development',
    ip_address: '', domain: '', ssh_user: '', notes: '', is_sensitive: false,
  });

  const load = () =>
    api.get<Server[]>(`/servers${showSensitive ? '?show_sensitive=true' : ''}`).then(setServers).catch(() => {});

  useEffect(() => { load(); }, [showSensitive]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/servers', { ...form, project_id: form.project_id ? parseInt(form.project_id) : null });
    setShowModal(false);
    load();
  };

  const grouped = envOrder.reduce((acc, env) => {
    acc[env] = servers.filter(s => s.environment === env);
    return acc;
  }, {} as Record<string, Server[]>);

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>Servers & Environments</h1>
            <p>Internal project infrastructure and environment configs</p>
          </div>
          <div className="flex gap-3">
            <button
              className={`btn ${showSensitive ? 'btn-danger' : 'btn-ghost'}`}
              onClick={() => setShowSensitive(!showSensitive)}
            >
              {showSensitive ? '🔓 Sensitive Visible' : '🔒 Show Sensitive'}
            </button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Server</button>
          </div>
        </div>
      </div>

      {showSensitive && (
        <div style={{
          background: '#FEF3C7', border: '1px solid var(--color-warning)',
          borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 16,
          fontSize: 13, color: '#92400E',
        }}>
          ⚠ Sensitive data is visible. Restrict access to lead developers and admins only.
        </div>
      )}

      {envOrder.map(env => grouped[env].length > 0 && (
        <div key={env} style={{ marginBottom: 24 }}>
          <div className="flex items-center gap-3 mb-3">
            <span className={`badge ${envBadge[env]}`} style={{ fontSize: 12 }}>{env.toUpperCase()}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Project</th>
                    <th>IP Address</th>
                    <th>Domain</th>
                    <th>SSH User</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[env].map(s => (
                    <tr key={s.id}>
                      <td>
                        <div className="font-semibold">{s.name}</div>
                        {s.is_sensitive && <span className="badge badge-warning" style={{ fontSize: 10, marginTop: 4 }}>sensitive</span>}
                      </td>
                      <td className="text-muted">{s.project_name || '—'}</td>
                      <td>
                        <code style={{ fontSize: 12, background: 'var(--color-bg)', padding: '2px 6px', borderRadius: 4 }}>
                          {s.ip_address || '—'}
                        </code>
                      </td>
                      <td className="text-sm">{s.domain || '—'}</td>
                      <td>
                        <code style={{ fontSize: 12, background: 'var(--color-bg)', padding: '2px 6px', borderRadius: 4 }}>
                          {s.ssh_user || '—'}
                        </code>
                      </td>
                      <td className="text-muted text-sm">{s.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {servers.length === 0 && (
        <div className="empty-state card">
          <div style={{ fontSize: 40 }}>🖥</div>
          <p>No servers registered yet</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Server</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Server Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Environment</label>
                  <select className="form-select" value={form.environment} onChange={e => setForm({ ...form, environment: e.target.value })}>
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">IP Address</label>
                  <input className="form-input" value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Domain</label>
                  <input className="form-input" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">SSH User</label>
                  <input className="form-input" value={form.ssh_user} onChange={e => setForm({ ...form, ssh_user: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Project ID</label>
                  <input className="form-input" type="number" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="sensitive" checked={form.is_sensitive} onChange={e => setForm({ ...form, is_sensitive: e.target.checked })} />
                <label htmlFor="sensitive" className="form-label" style={{ margin: 0 }}>Mark as sensitive (hide from non-admins)</label>
              </div>
              <div className="flex gap-3 justify-between mt-4">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Server</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
