'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import ProjectsTab from './ProjectsTab';

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

interface Service {
  key: string;
  name: string;
  url: string;
  logoSrc: string;
  color: string;
}

const INTERNAL_SERVICES: Service[] = [
  { key: 'drone',     name: 'Drone CI',   url: 'https://drone.bsrealtyllc.com', logoSrc: '/logos/drone.svg',      color: '#1565C0' },
  { key: 'sonarqube', name: 'SonarQube',  url: 'https://sonar.bsrealtyllc.com', logoSrc: '/logos/sonar.svg',      color: '#00897B' },
  { key: 'design',    name: 'Design',     url: 'https://design.bsrealtyllc.org', logoSrc: '/logos/storybook.svg', color: '#FF4785' },
];

const EXTERNAL_SERVICES: Service[] = [
  { key: 'bsrealty',   name: 'BS Realty',   url: 'https://bsrealtyllc.com',          logoSrc: '/logos/bsrealty.png',   color: '#1e3a5f' },
  { key: 'insurance',  name: 'Insurance',   url: 'https://insurance.bsrealtyllc.com', logoSrc: '/logos/insurance.png',  color: '#2563eb' },
  { key: 'gitgi',      name: 'GITGI',       url: 'https://gitgi.com',                logoSrc: '/logos/gitgi.svg',      color: '#235e94' },
  { key: 'job-portal', name: 'Job Portal',  url: 'https://jobportal.gitgi.com',      logoSrc: '/logos/job-portal.svg', color: '#863bff' },
  { key: 'education-portal', name: 'GITGI Portal', url: 'https://dev-education.bsrealtyllc.com', logoSrc: '/logos/gitgi-portal.svg', color: '#1e3a5f' },
  { key: 'gitgi-hr',   name: 'GITGI HR',    url: 'https://hr.gitgi.com',             logoSrc: '/logos/gitgi-hr.svg',   color: '#1e3a5f' },
];

const ALL_SERVICES = [...INTERNAL_SERVICES, ...EXTERNAL_SERVICES];

type Tab = 'services' | 'projects';

function ServiceTile({ svc, isActive, onClick }: { svc: Service; isActive: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ width: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}
    >
      <div style={{
        width: 68, height: 68, borderRadius: 16,
        background: `${svc.color}15`,
        border: isActive ? `2px solid ${svc.color}` : '2px solid var(--color-border)',
        boxShadow: isActive ? `0 0 0 3px ${svc.color}22` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 12,
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>
        <img src={svc.logoSrc} alt={svc.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text)', textAlign: 'center', lineHeight: 1.3 }}>
        {svc.name}
      </span>
    </div>
  );
}

function ServicesTab() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Service>(ALL_SERVICES[0]);
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

  useEffect(() => { loadCredentials(); }, [user?.id]);

  useEffect(() => {
    const cred = credentials.find(c => c.service_name === selected.key);
    setForm({ username: cred?.username ?? '', password: '', notes: cred?.notes ?? '' });
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
    <div className="servers-layout">
      {/* Left: Service Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: 14 }}>
            Internal Tools
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {INTERNAL_SERVICES.map(svc => (
              <ServiceTile key={svc.key} svc={svc} isActive={selected.key === svc.key} onClick={() => setSelected(svc)} />
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)' }} />

        <div>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: 14 }}>
            External Sites
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {EXTERNAL_SERVICES.map(svc => (
              <ServiceTile key={svc.key} svc={svc} isActive={selected.key === svc.key} onClick={() => setSelected(svc)} />
            ))}
          </div>
        </div>

        <div style={{
          background: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 13, color: 'var(--color-muted)',
        }}>
          Your credentials are stored securely per-service and are only visible to you. Passwords are never displayed after saving.
        </div>
      </div>

      {/* Credential Panel */}
      <div className="card servers-cred-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `${selected.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 8,
          }}>
            <img src={selected.logoSrc} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                className="btn btn-text btn-xs"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  padding: 6, color: 'var(--color-text-muted)',
                }}
                title={showPass ? 'Hide password' : 'Show password'}
              >
                <span
                  className="icon-mask"
                  style={{
                    WebkitMaskImage: `url(/icons/${showPass ? 'eye-off.svg' : 'eye.svg'})`,
                    maskImage: `url(/icons/${showPass ? 'eye-off.svg' : 'eye.svg'})`,
                  }}
                />
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

          <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} disabled={saving}>
            {!saving && (
              <span
                className="icon-mask"
                style={{
                  WebkitMaskImage: `url(/icons/${saved ? 'check.svg' : 'save.svg'})`,
                  maskImage: `url(/icons/${saved ? 'check.svg' : 'save.svg'})`,
                }}
              />
            )}
            {saved ? 'Saved' : saving ? 'Saving…' : 'Save Credentials'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ServersPage() {
  const [tab, setTab] = useState<Tab>('services');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Services & Projects</h1>
          <p>Manage service credentials and track project tasks linked to the public roadmap</p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        borderBottom: '1px solid var(--color-border)', paddingBottom: 0,
      }}>
        {([
          { id: 'services', label: 'Services & Credentials' },
          { id: 'projects', label: 'Projects & Tasks' },
        ] as { id: Tab; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="btn btn-text"
            style={{
              borderRadius: 0,
              borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              paddingBottom: 10,
              fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? 'var(--color-primary)' : 'var(--color-muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'services' && <ServicesTab />}
      {tab === 'projects' && <ProjectsTab />}
    </div>
  );
}
