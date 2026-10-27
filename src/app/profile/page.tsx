'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import Button from '@/components/Button/Button';
import PageHeader from '@/components/PageHeader';
import { BSRealtyAvatar, BSRealtyCheckbox, BSRealtyDropdown, BSRealtyTabs, BSRealtyToggle } from '@bsrealtyllc/design-system';
import InputField from '@/components/InputField/InputField';
import LoginHistoryModal, { type LoginHistory } from '@/components/profile/LoginHistoryModel';
import {
  TwoFactorModal,
  TwoFactorSetup,
  TwoFactorVerify,
  TwoFactorBackupCodes,
  TwoFactorDisable,
  type TwoFactorSetupData,
} from '@/components/profile/TwoFactor';

const BACKEND = process.env.NEXT_PUBLIC_API_URL!.replace('/api', '');

interface Profile {
  id: number;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  dob: string;
  address: string;
  profile_picture: string;
  citizenship_front: string;
  citizenship_back: string;
  role: string;
  start_date: string;
}

// Steps of the 2FA modal:
//  intro   -> "Set up two-factor authentication" screen (TwoFactorSetup)
//  scan    -> QR code + 6-digit code to confirm
//  backup  -> one-time backup codes returned by /auth/2fa/enable
//  disable -> confirm turning 2FA off with a current authenticator code
type TwoFactorStep = 'intro' | 'scan' | 'backup' | 'disable';

type Tab = 'personal' | 'organization' | 'security' | 'notification';

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'admin' },
  { label: 'Backend Developer', value: 'backend_dev' },
  { label: 'Frontend Developer', value: 'frontend_dev' },
  { label: 'Fullstack Developer', value: 'fullstack_dev' },
  { label: 'HR', value: 'hr' },
  { label: 'Product Designer', value: 'product_designer' },
  { label: 'UI/UX Designer', value: 'ui_ux_designer' },
  { label: 'Quality Assurance', value: 'quality_assurance' },
  { label: 'Team Lead', value: 'lead' },
];

// Fields edited in the Personal Info form and compared against the saved profile.
const PERSONAL_FIELDS = ['name', 'email', 'phone', 'role'] as const;

function roleLabel(value: string) {
  return ROLE_OPTIONS.find(o => o.value === value)?.label ?? value;
}

function avatarUrl(filename: string | null) {
  if (!filename) return null;
  return `${BACKEND}/uploads/profile/photo/${filename}`;
}

// Adds a version query so the browser shows the new photo even if the
// backend saves it under the same filename (otherwise the old one stays cached).
function freshAvatarUrl(filename: string | null) {
  const url = avatarUrl(filename);
  return url ? `${url}?v=${Date.now()}` : null;
}

function docUrl(filename: string | null) {
  if (!filename) return null;
  return `${BACKEND}/uploads/docs/${filename}`;
}

// The backend may answer in camelCase or snake_case; accept both.
/* eslint-disable @typescript-eslint/no-explicit-any */
function normalizeSetup(data: any): TwoFactorSetupData {
  return {
    secret: data?.secret ?? data?.base32 ?? '',
    otpauthUrl: data?.otpauthUrl ?? data?.otpauth_url ?? '',
    qrDataUrl: data?.qrDataUrl ?? data?.qr_data_url ?? data?.qrCode ?? data?.qr_code ?? '',
  };
}

function extractEnabled(data: any): boolean {
  return Boolean(data?.enabled ?? data?.twoFactorEnabled ?? data?.two_factor_enabled ?? data?.is_enabled ?? false);
}

function extractBackupCodes(data: any): string[] {
  const codes = data?.backupCodes ?? data?.backup_codes ?? data?.codes;
  return Array.isArray(codes) ? codes.map(String) : [];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// DELETE with a JSON body (the shared api helper may not send a body on DELETE).
async function apiDelete(path: string, body?: unknown) {
  const token = getToken();
  const res = await fetch(`${BACKEND}/api${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    // Surface the backend's own message (e.g. "Invalid code", "password is required").
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>('personal');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');
  // Keep the flash timer so a new message isn't cleared early by an old timer.
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Two-factor authentication state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorStatusLoaded, setTwoFactorStatusLoaded] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<TwoFactorStep>('intro');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [otp, setOtp] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Login history (Login Sessions -> Manage)
  const [showLoginHistory, setShowLoginHistory] = useState(false);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);

  // Personal info form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
  });
  const [isNameEdit, setIsNameEdit] = useState(false)
  const [isEmailEdit, setIsEmailEdit] = useState(false)
  const [isPhoneEdit, setIsPhoneEdit] = useState(false)

  // Security
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  // File upload ref (photo only — citizenship refs live inside DocUploadCard)
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [, setFrontPreview] = useState<string | null>(null);
  const [, setBackPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});


  // ── Show profile ───────────────────────────────────────────────────────────
  const load = async () => {
    setLoadError('');
    try {
      const p = await api.get<Profile>('/profile');

      setProfile(p);
      setForm({
        name: p.name || '',
        email: p.email || '',
        phone: p.phone || '',
        role: p.role || '',
      });
      setPhotoPreview(freshAvatarUrl(p.profile_picture));
      setFrontPreview(docUrl(p.citizenship_front));
      setBackPreview(docUrl(p.citizenship_back));
    } catch (err) {
      // 401s are still handled by api.ts; anything else is shown with a retry button.
      setLoadError(err instanceof Error && err.message ? err.message : 'Unable to load your profile.');
    }
  };

  const loadTwoFactorStatus = async () => {
    try {
      const status = await api.get<unknown>('/auth/2fa/status');
      setTwoFactorEnabled(extractEnabled(status));
    } catch {
      /* keep the toggle off if status can't be read */
    } finally {
      setTwoFactorStatusLoaded(true);
    }
  };

  useEffect(() => {
    load();
    loadTwoFactorStatus();
    return () => { if (flashTimer.current) clearTimeout(flashTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the 2FA modal with Escape (except mid-request or while showing backup codes).
  useEffect(() => {
    if (!showTwoFactorSetup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && twoFactorStep !== 'backup') closeTwoFactorModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  async function openLoginHistory() {
    // Clear rows from the previous open so stale data isn't shown while loading.
    setLoginHistory([]);
    setShowLoginHistory(true);

    // Admins see everyone's login history; other users see only their own.
    const endpoint = profile?.role === 'admin'
      ? '/auth/admin/login-history'
      : '/auth/login-history';

    try {
      const data = await api.get<{ entries: LoginHistory[] }>(endpoint);
      setLoginHistory(data.entries ?? []);
    } catch {
      flash('Unable to load login history.', 'err');
    }
  }

  function flash(text: string, type: 'ok' | 'err' = 'ok') {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setMsg(text); setMsgType(type);
    flashTimer.current = setTimeout(() => setMsg(''), 3500);
  }

  // ── Two-factor authentication ──────────────────────────────────────────────

  // Toggle click: OFF -> ON opens the setup intro, ON -> OFF opens the disable confirm.
  function handleTwoFactorToggle() {
    if (twoFactorLoading) return;
    setOtp('');
    setDisablePassword('');
    setTwoFactorError('');
    setSetupData(null);
    setBackupCodes([]);
    setTwoFactorStep(twoFactorEnabled ? 'disable' : 'intro');
    setShowTwoFactorSetup(true);
  }

  // Intro "Setup 2FA" button: ask the backend for a TOTP secret + QR code.
  async function startTwoFactorSetup() {
    if (twoFactorEnabled || twoFactorLoading) return;

    setTwoFactorLoading(true);
    setTwoFactorError('');
    setOtp('');

    try {
      const data = await api.post<unknown>('/auth/2fa/setup', {});
      const normalized = normalizeSetup(data);
      if (!normalized.qrDataUrl && !normalized.secret) throw new Error('Empty setup response');
      setSetupData(normalized);
      setTwoFactorStep('scan');
    } catch {
      setTwoFactorError('Unable to start 2FA setup. Please try again.');
    } finally {
      setTwoFactorLoading(false);
    }
  }

  // Verify the authenticator code and enable 2FA.
  async function confirmTwoFactorSetup() {
    if (!/^\d{6}$/.test(otp)) {
      setTwoFactorError('Enter a valid 6-digit authentication code.');
      return;
    }

    if (!setupData || twoFactorLoading) return;

    setTwoFactorLoading(true);
    setTwoFactorError('');

    try {
      const res = await api.post<unknown>('/auth/2fa/enable', {
        code: otp,
        secret: setupData.secret,
      });

      // Change the toggle only after the backend confirms success.
      setTwoFactorEnabled(true);
      setSetupData(null);
      setOtp('');

      const codes = extractBackupCodes(res);
      if (codes.length) {
        setBackupCodes(codes);
        setTwoFactorStep('backup');
      } else {
        setShowTwoFactorSetup(false);
        flash('Two-factor authentication enabled successfully.');
      }

      // Re-sync the persisted status.
      await loadTwoFactorStatus();
    } catch {
      setTwoFactorError('Invalid code or unable to enable 2FA.');
    } finally {
      setTwoFactorLoading(false);
    }
  }

  // Turn 2FA off: the backend requires the account password AND a current authenticator code.
  async function confirmDisableTwoFactor() {
    if (!disablePassword) {
      setTwoFactorError('Enter your account password.');
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setTwoFactorError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    if (twoFactorLoading) return;

    setTwoFactorLoading(true);
    setTwoFactorError('');

    try {
      await apiDelete('/auth/2fa/disable', { password: disablePassword, code: otp });
      setTwoFactorEnabled(false);
      setShowTwoFactorSetup(false);
      setOtp('');
      setDisablePassword('');
      flash('Two-factor authentication disabled.');
      await loadTwoFactorStatus();
    } catch (err) {
      console.error('2FA disable failed:', err);
      setTwoFactorError(err instanceof Error && err.message ? err.message : 'Unable to disable 2FA.');
    } finally {
      setTwoFactorLoading(false);
    }
  }

  function closeTwoFactorModal() {
    if (twoFactorLoading) return;

    const finishedWithBackupCodes = twoFactorStep === 'backup';
    setShowTwoFactorSetup(false);
    setSetupData(null);
    setOtp('');
    setDisablePassword('');
    setTwoFactorError('');
    setBackupCodes([]);
    if (finishedWithBackupCodes) flash('Two-factor authentication enabled successfully.');
  }

  // ── Update personal info (name, email, phone, role) ── "Save Changes" ─────
  async function savePersonal(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !profile) return;

    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const role = form.role.trim();
    const isAdmin = profile.role === 'admin';

    // Validate first, before anything is sent to the backend.
    if (!name) {
      flash('Full name is required.', 'err');
      return;
    }
    if (!email) {
      flash('Email is required.', 'err');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      flash('Enter a valid email address.', 'err');
      return;
    }
    // Phone is optional, but if filled it must look like a phone number.
    if (phone && !/^\+?[0-9\s-]{7,15}$/.test(phone)) {
      flash('Enter a valid phone number.', 'err');
      return;
    }

    const hasChanges = PERSONAL_FIELDS.some(
      (key) => form[key].trim() !== (profile[key] ?? '').trim()
    );
    if (!hasChanges) {
      flash('No changes to save.');
      return;
    }

    // Phone is sent even when empty so the user can clear it.
    // Only admins may change a role; everyone else keeps theirs.
    const payload: Record<string, string> = { name, email, phone };
    if (isAdmin && role) payload.role = role;

    setSaving(true);
    setMsg('');
    try {
      await api.put('/profile', payload);
      await load(); // refresh the header card and form from the saved data
      flash('Profile updated successfully.');
    } catch (err) {
      console.error('Profile update failed:', err);
      flash(err instanceof Error && err.message ? err.message : 'Failed to update profile.', 'err');
    } finally {
      setSaving(false);
    }
  }

  // ── Change password ── saved by its own "Change Password" button ──────────

  // The backend's password route doesn't check the old password, so we verify it
  // first by trying to log in with the user's email + old password.
  // Returns true if the password is correct, false if it's wrong.
  async function verifyOldPassword(password: string): Promise<boolean> {
    const res = await fetch(`${BACKEND}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: profile?.email, password }),
    });
    if (res.status === 400 || res.status === 401 || res.status === 403) return false;
    if (!res.ok) throw new Error('Unable to verify your old password. Please try again.');
    // 200 = correct password (including "2FA code required" responses).
    return true;
  }

  async function changePassword() {
    if (pwSaving || !profile) return;

    const { current_password, new_password, confirm } = pwForm;

    let error = '';
    if (!current_password) error = 'Enter your old password.';
    else if (!new_password) error = 'Enter a new password.';
    else if (new_password.length < 8) error = 'New password must be at least 8 characters.';
    else if (!/[A-Za-z]/.test(new_password) || !/\d/.test(new_password))
      error = 'New password must contain at least one letter and one number.';
    else if (new_password === current_password) error = 'New password must be different from the old password.';
    else if (!confirm) error = 'Confirm your new password.';
    else if (new_password !== confirm) error = 'Passwords do not match.';

    if (error) {
      setPwError(error);
      return;
    }

    setPwSaving(true);
    setPwError('');
    try {
      const oldPasswordCorrect = await verifyOldPassword(current_password);
      if (!oldPasswordCorrect) {
        setPwError('Old password is incorrect.');
        return;
      }

      await api.put('/auth/password', { current_password, new_password });
      setPwForm({ current_password: '', new_password: '', confirm: '' });
      flash('Password changed successfully.');
    } catch (err) {
      console.error('Password change failed:', err);
      setPwError(err instanceof Error && err.message ? err.message : 'Unable to change password.');
    } finally {
      setPwSaving(false);
    }
  }

  function updatePw(field: 'current_password' | 'new_password' | 'confirm', value: string) {
    setPwForm(prev => ({ ...prev, [field]: value }));
    setPwError('');
  }

  // ── Profile photo ── uploads as soon as a file is picked ─────────────────
  // Refresh only the photo, so unsaved edits in the name/email fields are kept.
  async function refreshPhoto() {
    try {
      const p = await api.get<Profile>('/profile');
      setProfile(prev => (prev ? { ...prev, profile_picture: p.profile_picture } : p));
      setPhotoPreview(freshAvatarUrl(p.profile_picture));
    } catch { /* keep current preview */ }
  }

  async function uploadFile(field: 'photo' | 'front' | 'back', file: File) {
    const token = getToken();
    const fd = new FormData();
    const isPhoto = field === 'photo';
    const endpoint = isPhoto ? '/profile/photo' : `/profile/citizenship/${field}`;

    fd.append(isPhoto ? 'photo' : 'doc', file);
    setUploading(u => ({ ...u, [field]: true }));
    try {
      const res = await fetch(`${BACKEND}/api${endpoint}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || data?.error || 'Upload failed.');
      }
      flash(isPhoto ? 'Profile photo updated.' : 'Document uploaded.');
      if (isPhoto) await refreshPhoto();
    } catch (err) {
      flash(err instanceof Error && err.message ? err.message : 'Upload failed. Max 5 MB, images only.', 'err');
      // Put the old photo back, since the new one wasn't saved.
      if (isPhoto) setPhotoPreview(freshAvatarUrl(profile?.profile_picture ?? null));
    } finally {
      setUploading(u => ({ ...u, [field]: false }));
    }
  }

  // Removes the saved photo on the backend (adjust the path if yours differs).
  async function deletePhoto() {
    if (!profile?.profile_picture || uploading.photo) return;
    setUploading(u => ({ ...u, photo: true }));
    try {
      await apiDelete('/profile/photo');
      setProfile(prev => (prev ? { ...prev, profile_picture: '' } : prev));
      setPhotoPreview(null);
      flash('Profile photo removed.');
    } catch (err) {
      flash(err instanceof Error && err.message ? err.message : 'Unable to remove photo.', 'err');
    } finally {
      setUploading(u => ({ ...u, photo: false }));
    }
  }

  function handleFileChange(field: 'photo' | 'front' | 'back') {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset the input so choosing the same file again still triggers onChange.
      e.target.value = '';
      if (!file) return;

      // Validate before uploading.
      if (!file.type.startsWith('image/')) {
        flash('Please choose an image file.', 'err');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        flash('Image must be 5 MB or smaller.', 'err');
        return;
      }

      // Show the new image right away, then upload it.
      const preview = URL.createObjectURL(file);
      if (field === 'photo') setPhotoPreview(preview);
      if (field === 'front') setFrontPreview(preview);
      if (field === 'back') setBackPreview(preview);
      uploadFile(field, file);
    };
  }

  if (!profile) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        {loadError ? (
          <div className="flex flex-col items-center gap-3">
            <p>{loadError}</p>
            <Button variant="primary" size="small" type="button" onClick={load}>Retry</Button>
          </div>
        ) : 'Loading profile…'}
      </div>
    );
  }

  const isAdmin = profile.role === 'admin';
  const isDirty = PERSONAL_FIELDS.some(
    (key) => form[key].trim() !== (profile[key] ?? '').trim()
  );

  // The password fields have their own button; Save Changes submits the personal form.
  // Other tabs have no save API yet and say so instead of silently failing.
  const handleSaveChanges = () => {
    if (tab === 'personal') {
      const personalForm = document.getElementById('personal-form') as HTMLFormElement | null;
      if (!personalForm) return;
      // requestSubmit runs browser validation (e.g. invalid email) — show why if it blocks.
      if (!personalForm.checkValidity()) {
        personalForm.reportValidity();
        return;
      }
      personalForm.requestSubmit();
      return;
    }

    // TODO: connect organization / security / notification settings to their APIs.
    flash('Saving this section is not available yet.', 'err');
  };




  return (
    <div>
      {/* Page Header */}
      <div className='fixed left-(--sidebar-width) right-0 top-0 m-0 z-200'>
        <PageHeader title={'My Profile'} discription={"Manage your personal information, documents, and account security"} />
      </div>

      {/* Flash message */}
      {msg && (
        <div
          role="status"
          className="fixed right-6 top-24 z-300 rounded-lg px-4 py-3 text-[14px] font-medium shadow-md"
          style={msgType === 'ok'
            ? { background: '#DCF1E4', color: '#16A34A' }
            : { background: '#FDE8E8', color: '#DC2626' }}
        >
          {msg}
        </div>
      )}

      {/* Profile container */}
      <div className='mt-28 mx-6 mb-6'>
        {/* ── Profile Header Card ───────────────────────────────────────────── */}
        <div className="mb-9 flex items-center justify-between rounded-lg border border-(--soft-white-normal-hover) bg-(--soft-white-light) p-6">
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-[10px]" style={{ flexWrap: 'wrap' }}>
              {/* Avatar */}
              <div>
                <div className='relative inline-block'>
                  <BSRealtyAvatar
                    size="xl"
                    name={profile.name}
                    src={photoPreview || undefined}
                  />
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    title="Change photo"
                    aria-label="Change photo"
                    style={{
                      position: 'absolute', bottom: 0, right: 0,
                      zIndex: 1,
                      padding: '2px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: '#E8E9EA',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    {uploading.photo ? '…' : (
                      <span
                        style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          backgroundColor: 'currentColor',
                          WebkitMaskImage: 'url(/icons/edit-pencil-02.svg)',
                          maskImage: 'url(/icons/edit-pencil-02.svg)',
                          WebkitMaskRepeat: 'no-repeat',
                          maskRepeat: 'no-repeat',
                          WebkitMaskSize: 'contain',
                          maskSize: 'contain',
                        }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                  <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={handleFileChange('photo')} />
                </div>
              </div>
              {/* Identity */}
              <div style={{ flex: 1 }}>
                <div className='text-[16px] text-(--neutral-normal) font-medium leading-6'>
                  {profile.name}
                </div>
                <div className="text-[14px] text-(--gray-normal-hover) leading-5 font-medium">
                  {profile.email}
                </div>
              </div>
            </div>

            <div className='w-full pl-18'>
              <span className="py-1 px-3 rounded-lg" style={{ background: '#DCF1E4', color: '#16A34A', fontWeight: 500, fontSize: '12px' }}>
                {roleLabel(profile.role)}
              </span>
            </div>
          </div>

          <div className='flex-col'>
            {/* Join date */}
            {profile.start_date && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="text-(--gray-normal-hover) text-[14px]">Member since</div>
                <div style={{ fontWeight: 500, fontSize: 16, color: 'var(--neutral-normal)' }}>
                  {new Date(profile.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────────── */}
        <div className="bg-(--soft-white-light) border border-(--soft-white-normal) rounded-lg" style={{ padding: 24, overflow: 'hidden' }}>

          <div className='flex justify-between py-6'>
            <BSRealtyTabs
              className='bsr-tabs'
              defaultValue='personal'
              value={tab}
              onChange={(newTab) => setTab(newTab as Tab)}
              tabs={[
                { label: 'Personal Info', value: 'personal' },
                { label: 'Organization', value: 'organization' },
                { label: 'Security', value: 'security' },
                { label: 'Notification', value: 'notification' },
              ]}
            />
            <div className="flex justify-end">
              <Button
                variant='primary'
                size='small'
                type="button"
                disabled={saving || (tab === 'personal' && !isDirty)}
                onClick={handleSaveChanges}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* ── PERSONAL INFO ─────────────────────────────────────────────── */}
          {tab === 'personal' && (
            <form id="personal-form" onSubmit={savePersonal} className="flex flex-col gap-10" style={{ width: '100%' }}>
              <div className="w-[909px] flex flex-col gap-7">
                <div>
                  <h1 className='text-[16px] text-(--neutral-normal) font-semibold'>Profile Information</h1>
                  <p className='text-[14px] font-medium text-(--soft-white-dark-active)'>Manage your personal details and account information</p>
                </div>

                {/* Profile picture */}
                <div className='flex flex-col gap-7'>
                  <div className='flex max-w-[495px] justify-between items-center'>
                    <label className='text-[14px] font-medium text-(--gray-darker)'>Profile Picture</label>
                    <div className='flex gap-6 w-[212px]'>
                      <BSRealtyAvatar
                        size="xl"
                        name={profile.name}
                        src={photoPreview || undefined}
                      />
                      <div className='flex gap-1 items-end'>
                        <button
                          type="button"
                          onClick={() => photoRef.current?.click()}
                          disabled={uploading.photo}
                          className='p-2 text-[14px] font-medium text-(--blue-sky) disabled:opacity-50'
                        >
                          Update
                        </button>
                        <button
                          type='button'
                          onClick={deletePhoto}
                          disabled={!profile.profile_picture || uploading.photo}
                          className='p-2 text-[14px] font-medium text-(--gray-dark) disabled:opacity-50'
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Personal fields */}
                  <div className='flex justify-between w-[909px]'>
                    <div className='my-[14px] flex flex-col gap-11 justify-center'>
                      <label className='text-[14px] font-medium text-(--gray-darker)' htmlFor="name">Full Name</label>
                      <label className='text-[14px] font-medium text-(--gray-darker)' htmlFor="email">Email</label>
                      <label className='text-[14px] font-medium text-(--gray-darker)' htmlFor="phone">Phone No.</label>
                      <label className='text-[14px] font-medium text-(--gray-darker)' htmlFor="role">Role</label>
                    </div>
                    <div className='flex flex-col gap-4'>
                      <div className='flex gap-6'>
                        <InputField
                          id='name'
                          className='profile-text-field'
                          type='text'
                          placeholder='Enter your Full name'
                          value={form.name}
                          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                          disabled={!isNameEdit}
                        />
                        <Button type='button' variant='primary' size='small' onClick={() => setIsNameEdit(prev => !prev)} >Edit</Button>
                      </div>

                      <div className='flex gap-6'>
                        <InputField
                          id='email'
                          value={form.email}
                          className='profile-text-field'
                          type='email'
                          placeholder='Enter your email'
                          onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                          disabled={!isEmailEdit}
                        />
                        <Button type='button' variant='primary' size='small' onClick={() => setIsEmailEdit(prev => !prev)}>Edit</Button>
                      </div>

                      <div className='flex gap-6'>
                        <InputField
                          id='phone'
                          value={form.phone}
                          className='profile-text-field'
                          type='text'
                          placeholder='Enter your Phone number'
                          onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                          disabled={!isPhoneEdit}
                        />

                        <Button type='button' variant='primary' size='small' onClick={() => setIsPhoneEdit(prev => !prev)}>Edit</Button>

                      </div>

                      {/* Only admins can change a role; others see it read-only. */}
                      <div className='w-[532px]'>
                        {isAdmin ? (
                          <BSRealtyDropdown
                            value={form.role}
                            onChange={(value) => setForm(prev => ({ ...prev, role: value }))}
                            options={ROLE_OPTIONS}
                            placeholder="Employee Role"
                          />
                        ) : (
                          <InputField
                            id='role'
                            className='profile-text-field'
                            type='text'
                            value={roleLabel(form.role)}
                            disabled
                            readOnly
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* divider */}
              <div className="border border-(--neutral-light-hover)"></div>

              {/* Login & Access */}
              <div className="flex flex-col gap-7 w-[812px]">
                <div>
                  <h1 className='text-[16px] text-(--neutral-normal) font-semibold leading-6'>Login &amp; Access</h1>
                  <p className='text-[14px] font-medium text-(--soft-white-dark-active)'>Manage your account access and login preference.</p>
                </div>

                <div className='flex flex-col gap-3'>
                  <div className='flex justify-between'>
                    <label className='text-(--gray-darker) text-[14px] font-medium' htmlFor="old_password">Old Password</label>
                    <InputField id='old_password' type="password"
                      showPasswordToggle={true}
                      autoComplete="new-password"
                      placeholder="Old Password"
                      className="profile-text-field"
                      value={pwForm.current_password}
                      onChange={(e) => updatePw('current_password', e.target.value)} />
                  </div>
                  <div className='flex justify-between'>
                    <label className='text-(--gray-darker) text-[14px] font-medium' htmlFor="new_password">New Password</label>
                    <InputField id='new_password' type="password"
                      showPasswordToggle={true}
                      autoComplete="new-password"
                      placeholder="New Password"
                      className="profile-text-field"
                      value={pwForm.new_password}
                      onChange={(e) => updatePw('new_password', e.target.value)} />
                  </div>
                  <div className='flex justify-between'>
                    <label className='text-(--gray-darker) text-[14px] font-medium' htmlFor="confirm_password">Confirm Password</label>
                    <InputField id='confirm_password' type="password"
                      showPasswordToggle={true}
                      autoComplete="new-password"
                      placeholder="Confirm Password"
                      className="profile-text-field"
                      value={pwForm.confirm}
                      onChange={(e) => updatePw('confirm', e.target.value)} />
                  </div>

                  {pwError && (
                    <p role="alert" className='text-[14px] font-medium text-(--error-normal) text-right'>{pwError}</p>
                  )}

                  <div className='flex justify-end'>
                    <Button
                      type='button'
                      variant='primary'
                      size='medium'
                      onClick={changePassword}
                      disabled={pwSaving || !pwForm.current_password || !pwForm.new_password || !pwForm.confirm}
                    >
                      {pwSaving ? 'Changing…' : 'Change Password'}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* ── Organization ─────────────────────────────────────────────────── */}
          {tab === 'organization' && (
            <div className='flex flex-col w-[929px] gap-11'>
              <div className='flex flex-col gap-7 w-full'>
                <div>
                  <h1 className='text-(--neutral-normal) text-[16px] font-semibold'>Company Information</h1>
                  <p className='text-(--soft-white-dark-active) text-[14px] font-medium'>
                    Manage your company details and hiring identity.
                  </p>
                </div>
                <div className='flex flex-col justify-between gap-4'>
                  <div className='flex justify-between'>
                    <div className='flex flex-col justify-between'>
                      <label htmlFor="company_name" className='text-[14px] font-medium'>Company Name</label>
                      <label htmlFor="company_email" className='text-[14px] font-medium'>Company Email</label>
                      <label htmlFor="company_website" className='text-[14px] font-medium'>Company Website</label>
                    </div>
                    <div className='flex flex-col gap-4'>
                      <div className='flex gap-6 items-center'>
                        <InputField
                          id='company_name'
                          type='text'
                          placeholder='Enter your company name'
                          className='profile-text-field'
                        />
                        <Button type='button' variant='primary' size='medium' onClick={() => document.getElementById('company_name')?.focus()}>Edit</Button>
                      </div>
                      <div className='flex gap-6 items-center'>
                        <InputField
                          id='company_email'
                          type='email'
                          placeholder='Enter your company email'
                          className='profile-text-field'
                        />
                        <Button type='button' variant='primary' size='medium' onClick={() => document.getElementById('company_email')?.focus()}>Edit</Button>
                      </div>
                      <div className='flex gap-6 items-center'>
                        <InputField
                          id='company_website'
                          type='text'
                          placeholder='Enter your company website'
                          className='profile-text-field'
                        />
                        <Button type='button' variant='primary' size='medium' onClick={() => document.getElementById('company_website')?.focus()}>Edit</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* divider */}
              <div className='border border-(--neutral-light-hover)'></div>

              {/* Team Access */}
              <div className='flex flex-col gap-7'>
                <div>
                  <h1 className='text-(--neutral-normal) text-[14px] font-medium'>Team Access</h1>
                  <p className='text-(--soft-white-dark-active) text-[14px] font-medium'>
                    Control who can access the hiring platform.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className='text-(--neutral-normal) text-[14px] font-semibold'>Member-2</h3>
                  <div className="flex justify-between items-center py-4">
                    <div className='flex items-start gap-3'>
                      <BSRealtyCheckbox size='16px' />
                      <div className='flex-col justify-between'>
                        <span className='text-[14px] font-medium text-(--gray-darker)'>Alex Johnson</span>
                        <span className='text-[14px] font-medium text-(--soft-white-darker-hover)'>alexjhonson@gmail.com</span>
                      </div>
                    </div>
                    <div>
                      <span className='text-[14px] font-medium text-(--gray-darker)'>Software Developer</span>
                    </div>
                    <div>
                      <span className='text-[14px] font-medium text-(--gray-darker)'>September 30, 2026</span>
                    </div>
                    <img src='/icons/dots.svg' alt="" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SECURITY ──────────────────────────────────────────────────── */}
          {tab === 'security' && (
            <div className='max-w-[929px] flex flex-col gap-11'>
              <div className='flex flex-col gap-7'>
                <div>
                  <h1 className='text-[16px] font-semibold text-(--neutral-normal)'>Login &amp; Authentication</h1>
                  <p className='text-[14px] text-(--soft-white-dark-active) font-medium'>Protect your account from unauthorized access</p>
                </div>

                <div className="flex flex-col gap-4">
                  <div className='flex justify-between items-center mr-10'>
                    <div>
                      <h1 className='text-[16px] font-semibold text-(--gray-darker)'>Two-Factor Authentication</h1>
                      <p className='text-[14px] font-medium text-(--soft-white-dark-active)'>
                        {twoFactorEnabled
                          ? 'Enabled. You will be asked for a code from your authenticator app when you log in.'
                          : 'Add an extra layer of security with an authenticator app.'}
                      </p>
                    </div>
                    <BSRealtyToggle
                      checked={twoFactorEnabled}
                      onChange={() => handleTwoFactorToggle()}
                      disabled={!twoFactorStatusLoaded || twoFactorLoading}
                    />
                  </div>
                  <div className='flex justify-between'>
                    <p className='text-[16px] font-semibold text-(--gray-darker)'>Login Sessions</p>
                    <Button variant='primary' size='medium' type='button' onClick={openLoginHistory}>Manage</Button>
                  </div>
                </div>
              </div>

              {/* divider */}
              <div className='border border-(--neutral-light-hover)'></div>

              {/* Security notifications */}
              <div className='flex flex-col gap-7'>
                <div className='flex flex-col gap-7'>
                  <div>
                    <h1 className='text-[16px] font-semibold text-(--neutral-normal)'>Security Notifications</h1>
                    <p className='text-[14px] text-(--soft-white-dark-active) font-medium'>Receive alerts about important account activity.</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className='flex justify-between mr-10'>
                      <p className='text-[16px] font-semibold text-(--gray-darker)'>New Login Detected</p>
                      <BSRealtyToggle checked={true} />
                    </div>
                    <div className='flex justify-between mr-10'>
                      <p className='text-[16px] font-semibold text-(--gray-darker)'>Password Changed</p>
                      <BSRealtyToggle checked={true} />
                    </div>
                    <div className='flex justify-between mr-10'>
                      <p className='text-[16px] font-semibold text-(--gray-darker)'>Accounts &amp; Role Changed</p>
                      <BSRealtyToggle checked={true} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Notification ──────────────────────────────────────────────────── */}
          {tab === 'notification' && (
            <div className='max-w-[532px] flex flex-col gap-11'>
              <div className='flex flex-col gap-7'>
                <div>
                  <h1 className='text-[16px] font-semibold text-(--neutral-normal)'>Email Notifications</h1>
                  <p className='text-[14px] text-(--soft-white-dark-active) font-medium'>Manage when you receive updates via email.</p>
                </div>

                <div className="flex flex-col gap-4">
                  <div className='flex justify-between'>
                    <p className='text-[16px] font-semibold text-(--gray-darker)'>Leave Request</p>
                    <BSRealtyToggle checked={true} />
                  </div>
                  <div className='flex justify-between'>
                    <p className='text-[16px] font-semibold text-(--gray-darker)'>Overtime Request</p>
                    <BSRealtyToggle />
                  </div>
                  <div className='flex justify-between'>
                    <p className='text-[16px] font-semibold text-(--gray-darker)'>Attendance Alerts</p>
                    <BSRealtyToggle checked={true} />
                  </div>
                  <div className='flex justify-between'>
                    <p className='text-[16px] font-semibold text-(--gray-darker)'>Documents &amp; Signature Request</p>
                    <BSRealtyToggle checked={true} />
                  </div>
                  <div className='flex justify-between'>
                    <p className='text-[16px] font-semibold text-(--gray-darker)'>Employee Updates</p>
                    <BSRealtyToggle />
                  </div>
                  <div className='flex justify-between'>
                    <p className='text-[16px] font-semibold text-(--gray-darker)'>Onboarding Updated</p>
                    <BSRealtyToggle checked={true} />
                  </div>
                </div>
              </div>

              {/* divider */}
              <div className='border border-(--neutral-light-hover)'></div>

              {/* System notifications */}
              <div className='flex flex-col gap-7'>
                <div className='flex flex-col gap-7'>
                  <div>
                    <h1 className='text-[16px] font-semibold text-(--neutral-normal)'>System Notifications</h1>
                    <p className='text-[14px] text-(--soft-white-dark-active) font-medium'>Control in-app notifications</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className='flex justify-between'>
                      <p className='text-[16px] font-semibold text-(--gray-darker)'>Enable Notifications</p>
                      <BSRealtyToggle checked={true} />
                    </div>
                    <div className='flex justify-between'>
                      <p className='text-[16px] font-semibold text-(--gray-darker)'>Sound Alerts</p>
                      <BSRealtyToggle checked={true} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Login history modal ─────────────────────────────────────────── */}
      {showLoginHistory && (
        <LoginHistoryModal
          history={loginHistory}
          isAdmin={isAdmin}
          onClose={() => setShowLoginHistory(false)}
        />
      )}

      {/* ── 2FA modal ─────────────────────────────────────────────────────── */}
      {showTwoFactorSetup && (
        <TwoFactorModal onClose={closeTwoFactorModal} dismissible={twoFactorStep !== 'backup'}>
          {twoFactorStep === 'intro' && (
            <TwoFactorSetup
              loading={twoFactorLoading}
              error={twoFactorError}
              onSetup={startTwoFactorSetup}
              onLater={closeTwoFactorModal}
            />
          )}

          {twoFactorStep === 'scan' && setupData && (
            <TwoFactorVerify
              setupData={setupData}
              otp={otp}
              onOtpChange={(v) => { setOtp(v); setTwoFactorError(''); }}
              loading={twoFactorLoading}
              error={twoFactorError}
              onConfirm={confirmTwoFactorSetup}
              onCancel={closeTwoFactorModal}
            />
          )}

          {twoFactorStep === 'backup' && (
            <TwoFactorBackupCodes codes={backupCodes} onDone={closeTwoFactorModal} />
          )}

          {twoFactorStep === 'disable' && (
            <TwoFactorDisable
              password={disablePassword}
              onPasswordChange={(v) => { setDisablePassword(v); setTwoFactorError(''); }}
              otp={otp}
              onOtpChange={(v) => { setOtp(v); setTwoFactorError(''); }}
              loading={twoFactorLoading}
              error={twoFactorError}
              onConfirm={confirmDisableTwoFactor}
              onCancel={closeTwoFactorModal}
            />
          )}
        </TwoFactorModal>
      )}
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        <Button className="outline" variant='text' size='xs'
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Uploading…' : preview ? 'Replace' : 'Upload'}
        </Button>
        <input ref={node => { inputRef.current = node; }} type="file" accept="image/*" style={{ display: 'none' }} onChange={onChange} />
      </div>
    </div>
  );
}