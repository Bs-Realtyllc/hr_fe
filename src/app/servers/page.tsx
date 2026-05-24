'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Credential {
  service_name: string;
  username: string;
  notes: string;
  updated_at: string;
}

interface CredForm {
  username: string;
  password: string;
  notes: string;
}

const SERVICES = [
  {
    key: 'drone',
    name: 'Drone CI',
    url: 'https://drone.bsrealtyllc.com',
    icon: '🚁',
    color: '#1565C0',
    desc: 'Continuous Integration & Deployment pipeline',
  },
  {
    key: 'sonarqube',
    name: 'SonarQube',
    url: 'https://sonar.bsrealtyllc.com',
    icon: '🔍',
    color: '#00897B',
    desc: 'Code quality and static analysis',
  },
  {
    key: 'design',
    name: 'Design',
    url: 'https://design.bsrealtyllc.org',
    icon: '🎨',
    color: '#6A1B9A',
    desc: 'Design system and prototypes',
  },
  {
    key: 'ui',
    name: 'UI App',
    url: 'https://ui.bsrealtyllc.com',
    icon: '◻',
    color: '#2E7D32',
    desc: 'Frontend application interface',
  },
];

export default function ServersPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<typeof SERVICES[0]>(SERVICES[0]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState<CredForm>({ username: '', password: '', notes: '' });
  const [saved, setSaved] = useState(false);

  const loadCredentials = async () => {
    if (!user?.id) return;
    const data = await api.get<Credential[]>(`/service-credentials/${user.id}`).catch(() => []);
    setCredentials(data);
  };

  useEffect(() => {
    loadCredentials();
  }, [user?.id]);

  useEffect(() => {
    const cred = credentials.find(c => c.service_name === selected.key);
    setForm({
      username: cred?.username ?? '',
      password: '',
      notes: cred?.notes ?? '',
    });
    setShowPass(false);
    setSaved(false);
  }, [selected.key, credentials]);

  const saveCred = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    await api.post(`/service-credentials/${user.id}`, {
      service_name: selected.key,
      username: form.username,
      password: form.password,
      notes: form.notes,
    }).catch(() => {});
    setSaving(false);
    setSaved(true);
    await loadCredentials();
    setTimeout(() => setSaved(false), 2000);
  };

  const currentCred = credentials.find(c => c.service_name === selected.key);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Services & Access</h1>
          <p>Internal tools, environments, and your login credentials</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
        {/* Left: Service Cards */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {SERVICES.map(svc => {
              const hasCred = credentials.some(c => c.service_name === svc.key && c.username);
              const isActive = selected.key === svc.key;
              return (
                <div
                  key={svc.key}
                  onClick={() => setSelected(svc)}
                  style={{
                    background: 'var(--color-surface)',
                    border: isActive ? `2px solid ${svc.color}` : '2px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 20,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    boxShadow: isActive ? `0 0 0 3px ${svc.color}22` : 'none',
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, fontSize: 24,
                      background: `${svc.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {svc.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{svc.name}</div>
                      {hasCred && (
                        <span style={{
                          fontSize: 11, background: '#dcfce7', color: '#166534',
                          borderRadius: 20, padding: '1px 8px', display: 'inline-block', marginTop: 2,
                        }}>credentials saved</span>
                      )}
                    </div>
                  </div>
                  <p className="text-muted text-sm" style={{ marginBottom: 12 }}>{svc.desc}</p>
                  <a
                    href={svc.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: 13, color: svc.color, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {svc.url.replace('https://', '')} ↗
                  </a>
                </div>
              );
            })}
          </div>

          {/* Info note */}
          <div style={{
            marginTop: 20, background: 'var(--color-bg)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 13, color: 'var(--color-muted)',
          }}>
            Your credentials are stored securely per-service and are only visible to you. Passwords are never displayed after saving.
          </div>
        </div>

        {/* Right: Credential Panel */}
        <div className="card" style={{ position: 'sticky', top: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, fontSize: 22,
              background: `${selected.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {selected.icon}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{selected.name}</div>
              <a href={selected.url} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: selected.color }}>{selected.url.replace('https://', '')} ↗</a>
            </div>
          </div>

          {currentCred?.updated_at && (
            <div style={{
              fontSize: 12, color: 'var(--color-muted)', background: 'var(--color-bg)',
              borderRadius: 6, padding: '6px 10px', marginBottom: 16,
            }}>
              Last updated: {new Date(currentCred.updated_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
            </div>
          )}

          <form onSubmit={saveCred}>
            <div className="form-group">
              <label className="form-label">Username / Email</label>
              <input
                className="form-input"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="your username or email"
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Password</span>
                {currentCred?.username && (
                  <span className="text-muted" style={{ fontSize: 11 }}>leave blank to keep existing</span>
                )}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={currentCred?.username ? '••••••••' : 'set a password'}
                  autoComplete="new-password"
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', fontSize: 14,
                  }}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. uses SSO, 2FA enabled, reset quarterly…"
                rows={3}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Credentials'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
