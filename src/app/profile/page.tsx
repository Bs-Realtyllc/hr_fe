'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:6002/api').replace('/api', '');

interface Profile {
  id: number;
  name: string;
  email: string;
  phone: string;
  alt_phone: string;
  emergency_contact: string;
  designation: string;
  department: string;
  dob: string;
  bio: string;
  address: string;
  qualifications: string[];
  profile_picture: string;
  citizenship_front: string;
  citizenship_back: string;
  timezone: string;
  work_hours: string;
  tech_stack: string[];
  role: string;
  start_date: string;
}

type Tab = 'personal' | 'documents' | 'security';

function avatarUrl(filename: string | null) {
  if (!filename) return null;
  return `${BACKEND}/uploads/profile/${filename}`;
}

function docUrl(filename: string | null) {
  if (!filename) return null;
  return `${BACKEND}/uploads/docs/${filename}`;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const [tab, setTab]         = useState<Tab>('personal');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');

  // personal info form state
  const [form, setForm] = useState({
    phone: '', alt_phone: '', emergency_contact: '', dob: '',
    bio: '', address: '', timezone: '', work_hours: '',
  });
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [newQual, setNewQual] = useState('');

  // security
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwMsg, setPwMsg]   = useState('');
  const [pwType, setPwType] = useState<'ok' | 'err'>('ok');
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // file upload ref (photo only — citizenship refs live inside DocUploadCard)
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview]   = useState<string | null>(null);
  const [frontPreview, setFrontPreview]   = useState<string | null>(null);
  const [backPreview, setBackPreview]     = useState<string | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
      const p = await api.get<Profile>('/profile');
      setProfile(p);
      setForm({
        phone:             p.phone || '',
        alt_phone:         p.alt_phone || '',
        emergency_contact: p.emergency_contact || '',
        dob:               p.dob ? p.dob.split('T')[0] : '',
        bio:               p.bio || '',
        address:           p.address || '',
        timezone:          p.timezone || '',
        work_hours:        p.work_hours || '',
      });
      setQualifications(p.qualifications || []);
      setPhotoPreview(avatarUrl(p.profile_picture));
      setFrontPreview(docUrl(p.citizenship_front));
      setBackPreview(docUrl(p.citizenship_back));
    } catch { /* handled by api.ts 401 logic */ }
  };

  useEffect(() => { load(); }, []);

  function flash(text: string, type: 'ok' | 'err' = 'ok') {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 3500);
  }

  async function savePersonal(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/profile', { ...form, qualifications });
      flash('Profile updated successfully.');
      load();
    } catch {
      flash('Failed to save changes.', 'err');
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(field: 'photo' | 'front' | 'back', file: File) {
    const token = getToken();
    const fd = new FormData();
    const isPhoto = field === 'photo';
    const endpoint = isPhoto
      ? '/api/profile/photo'
      : `/api/profile/citizenship/${field === 'front' ? 'front' : 'back'}`;
    const fieldName = isPhoto ? 'photo' : 'doc';

    fd.append(fieldName, file);
    setUploading(u => ({ ...u, [field]: true }));
    try {
      const res = await fetch(`${BACKEND}/api${endpoint.replace('/api', '')}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error();
      flash(isPhoto ? 'Profile photo updated.' : 'Document uploaded.');
      load();
    } catch {
      flash('Upload failed. Max 5 MB, images only.', 'err');
    } finally {
      setUploading(u => ({ ...u, [field]: false }));
    }
  }

  function handleFileChange(field: 'photo' | 'front' | 'back') {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const preview = URL.createObjectURL(file);
      if (field === 'photo')  setPhotoPreview(preview);
      if (field === 'front')  setFrontPreview(preview);
      if (field === 'back')   setBackPreview(preview);
      uploadFile(field, file);
    };
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) {
      setPwMsg('Passwords do not match.'); setPwType('err'); return;
    }
    if (pwForm.new_password.length < 6) {
      setPwMsg('Password must be at least 6 characters.'); setPwType('err'); return;
    }
    setPwSaving(true); setPwMsg('');
    try {
      await api.put('/auth/password', {
        current_password: pwForm.current_password,
        new_password:     pwForm.new_password,
      });
      setPwMsg('Password changed successfully.'); setPwType('ok');
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch {
      setPwMsg('Failed. Check your current password.'); setPwType('err');
    } finally {
      setPwSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading profile…
      </div>
    );
  }

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '10px 20px',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
    color: tab === t ? 'var(--color-primary)' : 'var(--color-text-muted)',
    transition: 'all 0.15s',
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>Manage your personal information, documents, and account security</p>
        </div>
      </div>

      {/* ── Profile Header Card ───────────────────────────────────────────── */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="flex items-center gap-5" style={{ flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {photoPreview ? (
              <img
                src={photoPreview}
                alt={profile.name}
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                         border: '3px solid var(--color-border)' }}
              />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'var(--color-primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 700,
              }}>
                {initials(profile.name)}
              </div>
            )}
            <button
              onClick={() => photoRef.current?.click()}
              title="Change photo"
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--color-primary)', color: '#fff',
                border: '2px solid #fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
              }}
            >
              {uploading.photo ? '…' : '✎'}
            </button>
            <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={handleFileChange('photo')} />
          </div>

          {/* Identity */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{profile.name}</div>
            <div className="text-muted" style={{ fontSize: 14 }}>{profile.email}</div>
            <div className="flex gap-3 mt-2" style={{ flexWrap: 'wrap' }}>
              {profile.designation && (
                <span className="badge" style={{ background: 'var(--color-primary-light,#e0e7ff)', color: 'var(--color-primary)', fontWeight: 600, fontSize: 12 }}>
                  {profile.designation}
                </span>
              )}
              {profile.department && (
                <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: 12 }}>
                  {profile.department}
                </span>
              )}
              <span className="badge" style={{ background: '#f0fdf4', color: '#16a34a', fontWeight: 600, fontSize: 12, textTransform: 'capitalize' }}>
                {profile.role}
              </span>
            </div>
          </div>

          {/* Join date */}
          {profile.start_date && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className="text-muted" style={{ fontSize: 12 }}>Member since</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {new Date(profile.start_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
          <button style={tabStyle('personal')}  onClick={() => setTab('personal')}>Personal Info</button>
          <button style={tabStyle('documents')} onClick={() => setTab('documents')}>Documents</button>
          <button style={tabStyle('security')}  onClick={() => setTab('security')}>Security</button>
        </div>

        {/* Form fields stay a comfortable reading width even though the page
            itself is now full-width like every other page — otherwise a
            2-column input grid would stretch each field edge-to-edge on a
            wide viewport instead of the compact rows the reference shows. */}
        <div style={{ padding: 28, maxWidth: 780 }}>

          {/* ── PERSONAL INFO ─────────────────────────────────────────────── */}
          {tab === 'personal' && (
            <form onSubmit={savePersonal}>
              {msg && (
                <div style={{
                  marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                  background: msgType === 'ok' ? '#f0fdf4' : '#fef2f2',
                  color: msgType === 'ok' ? '#16a34a' : 'var(--color-error)',
                  border: `1px solid ${msgType === 'ok' ? '#bbf7d0' : '#fecaca'}`,
                }}>
                  {msg}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" type="tel" placeholder="+977 98XXXXXXXX"
                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Alt. Phone</label>
                  <input className="form-input" type="tel" placeholder="Secondary number"
                    value={form.alt_phone} onChange={e => setForm(f => ({ ...f, alt_phone: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input className="form-input" type="date"
                    value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
                  {form.dob && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      Your birthday will appear on the company calendar automatically.
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Emergency Contact</label>
                  <input className="form-input" placeholder="Name & phone"
                    value={form.emergency_contact}
                    onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Bio / About Me <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                <textarea className="form-textarea" rows={3}
                  placeholder="A short intro about yourself…"
                  value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Address <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                <input className="form-input" placeholder="City, Country"
                  value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Timezone</label>
                  <input className="form-input" placeholder="e.g. Asia/Kathmandu"
                    value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Work Hours</label>
                  <input className="form-input" placeholder="e.g. 9 AM – 6 PM"
                    value={form.work_hours} onChange={e => setForm(f => ({ ...f, work_hours: e.target.value }))} />
                </div>
              </div>

              {/* Qualifications */}
              <div className="form-group">
                <label className="form-label">Qualifications & Certifications</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {qualifications.map((q, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: '#f1f5f9', borderRadius: 20, padding: '4px 12px',
                      fontSize: 13, fontWeight: 500,
                    }}>
                      {q}
                      <button type="button"
                        onClick={() => setQualifications(qs => qs.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer',
                                 color: 'var(--color-text-muted)', fontSize: 15, lineHeight: 1, padding: 0 }}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className="form-input" placeholder="e.g. Bachelor's in CS, AWS Certified…"
                    value={newQual}
                    onChange={e => setNewQual(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const v = newQual.trim();
                        if (v) { setQualifications(qs => [...qs, v]); setNewQual(''); }
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-ghost"
                    onClick={() => {
                      const v = newQual.trim();
                      if (v) { setQualifications(qs => [...qs, v]); setNewQual(''); }
                    }}>
                    + Add
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Press Enter or click Add to add each item.
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* ── DOCUMENTS ─────────────────────────────────────────────────── */}
          {tab === 'documents' && (
            <div>
              {msg && (
                <div style={{
                  marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                  background: msgType === 'ok' ? '#f0fdf4' : '#fef2f2',
                  color: msgType === 'ok' ? '#16a34a' : 'var(--color-error)',
                  border: `1px solid ${msgType === 'ok' ? '#bbf7d0' : '#fecaca'}`,
                }}>
                  {msg}
                </div>
              )}

              <p className="text-muted" style={{ fontSize: 13, marginBottom: 24 }}>
                Upload your identification documents. Accepted formats: JPG, PNG, WEBP — max 5 MB each.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <DocUploadCard
                  label="Citizenship / ID (Front)"
                  preview={frontPreview}
                  loading={uploading.front}
                  onChange={handleFileChange('front')}
                />
                <DocUploadCard
                  label="Citizenship / ID (Back)"
                  preview={backPreview}
                  loading={uploading.back}
                  onChange={handleFileChange('back')}
                />
              </div>
            </div>
          )}

          {/* ── SECURITY ──────────────────────────────────────────────────── */}
          {tab === 'security' && (
            <form onSubmit={changePassword} style={{ maxWidth: 400 }}>
              <p className="text-muted" style={{ fontSize: 13, marginBottom: 20 }}>
                Choose a strong password of at least 6 characters.
              </p>

              {pwMsg && (
                <div style={{
                  marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                  background: pwType === 'ok' ? '#f0fdf4' : '#fef2f2',
                  color: pwType === 'ok' ? '#16a34a' : 'var(--color-error)',
                  border: `1px solid ${pwType === 'ok' ? '#bbf7d0' : '#fecaca'}`,
                }}>
                  {pwMsg}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" type={showCurrentPw ? 'text' : 'password'} autoComplete="current-password"
                    placeholder="••••••••"
                    value={pwForm.current_password}
                    onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
                    required style={{ paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowCurrentPw(v => !v)}
                    aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--color-text-muted, #888)' }}>
                    {showCurrentPw ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" type={showNewPw ? 'text' : 'password'} autoComplete="new-password"
                    placeholder="••••••••"
                    value={pwForm.new_password}
                    onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                    required style={{ paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowNewPw(v => !v)}
                    aria-label={showNewPw ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--color-text-muted, #888)' }}>
                    {showNewPw ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" type={showConfirmPw ? 'text' : 'password'} autoComplete="new-password"
                    placeholder="••••••••"
                    value={pwForm.confirm}
                    onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                    required style={{ paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                    aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--color-text-muted, #888)' }}>
                    {showConfirmPw ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                {pwSaving ? 'Updating…' : 'Change Password'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────

interface DocUploadCardProps {
  label: string;
  preview: string | null;
  loading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function DocUploadCard({ label, preview, loading, onChange }: DocUploadCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div style={{
      border: '2px dashed var(--color-border)', borderRadius: 12,
      overflow: 'hidden', background: '#fafafa',
    }}>
      {preview ? (
        <img src={preview} alt={label}
          style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{
          height: 200, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-text-muted)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🪪</div>
          <div style={{ fontSize: 13 }}>No document uploaded</div>
        </div>
      )}
      <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{label}</div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Uploading…' : preview ? 'Replace' : 'Upload'}
        </button>
        <input ref={node => { inputRef.current = node; }} type="file" accept="image/*" style={{ display: 'none' }} onChange={onChange} />
      </div>
    </div>
  );
}
