'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import Button from '@/components/Button/Button';
import PageHeader from '@/components/PageHeader';
import { BSRealtyAvatar, BSRealtyCheckbox, BSRealtyDropdown, BSRealtyTabs, BSRealtyToggle } from '@bsrealtyllc/design-system';
import InputField from '@/components/InputField/InputField';

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

interface TwoFactorSetupData {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}

// Steps of the 2FA modal:
//  intro   -> "Set up two-factor authentication" screen (TwoFactorSetup)
//  scan    -> QR code + 6-digit code to confirm
//  backup  -> one-time backup codes returned by /auth/2fa/enable
//  disable -> confirm turning 2FA off with a current authenticator code
type TwoFactorStep = 'intro' | 'scan' | 'backup' | 'disable';

type Tab = 'personal' | 'organization' | 'security' | 'notification';

function avatarUrl(filename: string | null) {
  if (!filename) return null;
  return `${BACKEND}/uploads/profile/${filename}`;
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
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');

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

  // personal info form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
  });

  // security
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });

  // file upload ref (photo only — citizenship refs live inside DocUploadCard)
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
      const p = await api.get<Profile>('/profile');

      setProfile(p);
      setForm({
        name: p.name || '',
        email: p.email || '',
        phone: p.phone || '',
        role: p.role || '',
      });
      setPhotoPreview(avatarUrl(p.profile_picture));
      setFrontPreview(docUrl(p.citizenship_front));
      setBackPreview(docUrl(p.citizenship_back));
    } catch { /* handled by api.ts 401 logic */ }
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

  function flash(text: string, type: 'ok' | 'err' = 'ok') {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 3500);
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

  async function savePersonal(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {

      // Save personal information
      await api.put('/profile', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
      });

      // Save password only if password fields are filled
      if (
        pwForm.current_password ||
        pwForm.new_password ||
        pwForm.confirm
      ) {
        if (pwForm.new_password !== pwForm.confirm) {
          flash('Passwords do not match.', 'err');
          return;
        }
        if (pwForm.new_password.length < 6) {
          flash('Password must be at least 6 characters.', 'err');
          return;
        }

        await api.put('/auth/password', {
          current_password: pwForm.current_password,
          new_password: pwForm.new_password,
        });

        setPwForm({
          current_password: '',
          new_password: '',
          confirm: '',
        });
      }

      flash('Changes saved successfully.');
      await load();
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
      if (field === 'photo') setPhotoPreview(preview);
      if (field === 'front') setFrontPreview(preview);
      if (field === 'back') setBackPreview(preview);
      uploadFile(field, file);
    };
  }

  if (!profile) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading profile…
      </div>
    );
  }

  const handleSaveChanges = () => {
    if (tab === 'personal') {
      const form = document.getElementById('personal-form') as HTMLFormElement;
      form?.requestSubmit();
    }

    if (tab === 'organization') {
      // TODO: save organization data
    }

    if (tab === 'security') {
      const form = document.getElementById('security-form') as HTMLFormElement;
      form?.requestSubmit();
    }

    if (tab === 'notification') {
      // TODO: save notification settings
    }
  };

  return (
    <div>
      {/* Page Hader */}
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
          <div className="flex flex-col items-center justify-center gap-1" >
            <div className=" flex items-center gap-[10px]" style={{ flexWrap: 'wrap' }}>
              {/* Avatar */}
              <div className=' '>
                <div className='' >
                  <BSRealtyAvatar
                    size="xl"
                    name={profile.name}
                    src={
                      photoPreview || undefined
                    }
                  />
                  <button
                    onClick={() => photoRef.current?.click()}
                    title="Change photo"
                    style={{
                      position: 'absolute', bottom: 0, right: 0,
                      padding: '2px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: '#E8E9EA',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    {uploading.photo ? '…' : (<span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'currentColor',
                      WebkitMaskImage: 'url(/icons/edit-pencil-02.svg)',
                      maskImage: 'url(/icons/edit-pencil-02.svg)',
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                    }}
                      aria-label="Edit"
                      role="img" />)}
                  </button>
                  <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={handleFileChange('photo')} />
                </div>
              </div>
              {/* Identity */}
              <div style={{ flex: 1 }}>
                <div className='text-[16px] text-(--neutral-normal) font-medium leading-6' >
                  {profile.name}
                </div>
                <div className="text-[14px] text-(--gray-normal-hover) leading-5 font-medium" >
                  {profile.email}
                </div>
              </div>
            </div>

            <span className="py-1 px-3 rounded-lg" style={{ background: '#DCF1E4', color: '#16A34A', fontWeight: 500, fontSize: '12px', textTransform: 'capitalize' }}>
              {profile.role}
            </span>

          </div>
          <div className='flex-col  ' >
            {/* Join date */}
            {profile.start_date && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="text-(--gray-normal-hover) text-[14px]" >Member since</div>
                <div style={{ fontWeight: 500, fontSize: 16, color: 'var(--neutral-normal)' }}>
                  {new Date(profile.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>

              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────────── */}

        <div className=" bg-(--soft-white-light) border border-(--soft-white-normal) rounded-lg " style={{ padding: 24, overflow: 'hidden' }}>

          <div className='flex justify-between py-6' >
            <BSRealtyTabs
              className='bsr-tabs'
              defaultValue='personal'
              value={tab}
              onChange={(newTab) => setTab(newTab as Tab)}
              tabs={[
                {
                  label: 'Personal Info',
                  value: 'personal'
                },
                {
                  label: 'Organization',
                  value: 'organization'
                },
                {
                  label: 'Security',
                  value: 'security'
                },
                {
                  label: 'Notification',
                  value: 'notification'
                },

              ]}
            />
            <div className="flex justify-end">
              <Button variant='primary' size='small' type="button" disabled={saving} onClick={handleSaveChanges}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
          {/* Form fields stay a comfortable reading width even though the page
            itself is now full-width like every other page — otherwise a
            2-column input grid would stretch each field edge-to-edge on a
            wide viewport instead of the compact rows the reference shows. */}

          {/* ── PERSONAL INFO ─────────────────────────────────────────────── */}
          {tab === 'personal' && (
            <form id="personal-form" onSubmit={savePersonal} className=" flex flex-col gap-10" style={{ width: '100%' }}>
              <div className=" w-[909px] flex  flex-col gap-7">
                <div>
                  <h1 className='text-[16px] text-(--neutral-normal) font-semibold'>Profile Information</h1>
                  <p className='text-[14px] font-medium text-(--soft-white-dark-active)'>Manage your personal details and account information</p>
                </div>

                {/* profile  */}
                <div className='flex  flex-col gap-7'>
                  <div className=' flex max-w-[495px] justify-between items-center '>
                    <label className='text-[14px] font-medium text-(--gray-darker)'>Profile Picture</label>
                    <div className='flex gap-6 w-[212px] '>
                      <BSRealtyAvatar
                        size="xl"
                        name={profile.name}
                        src={
                          photoPreview || undefined
                        }
                      />
                      <div className='flex gap-1 items-end'>
                        <button
                          type="button"
                          onClick={() => photoRef.current?.click()}
                          className='p-2 text-[14px] font-medium text-(--blue-sky)'
                        >
                          Update
                        </button>
                        <button
                          type='button' onClick={() => setPhotoPreview(null)}
                          className='p-2 text-[14px] font-medium text-(--gray-dark)'
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Personal fields form group */}
                  <div className=' flex justify-between w-[909px]'>
                    <div className=' my-[14px] flex flex-col gap-11 justify-center  '>
                      <label className='text-[14px] font-medium text-(--gray-darker) ' htmlFor="name">Full Name</label>
                      <label className='text-[14px] font-medium text-(--gray-darker) ' htmlFor="email"> Email</label>
                      <label className='text-[14px] font-medium text-(--gray-darker) ' htmlFor="phone">Phone No.</label>
                      <label className='text-[14px] font-medium text-(--gray-darker) ' htmlFor="role">Role</label>
                    </div>
                    <div className='flex flex-col gap-4'>
                      <div className=' flex gap-6'>
                        <InputField
                          id='name'
                          className='profile-text-field'
                          type='text'
                          placeholder='Enter your Full name'
                          value={form.name}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                        />
                        <Button type='button' variant='primary' size='medium'>Edit</Button>
                      </div>

                      <div className=' flex gap-6'>
                        <InputField
                          id='email'
                          value={form.email}
                          className='profile-text-field'
                          type='email'
                          placeholder='Enter your email'
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                        />
                        <Button type='button' variant='primary' size='medium'>Edit</Button>
                      </div>
                      <div className='flex gap-6 '>
                        <InputField
                          id='phone'
                          value={form.phone}
                          className='profile-text-field'
                          type='text'
                          placeholder='Enter your Phone number'
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                        />
                        <Button type='button' variant='primary' size='medium'>Edit</Button>
                      </div>

                      <div className='w-[532px]'>
                        <BSRealtyDropdown
                          className=''
                          value={form.role}
                          onChange={(value) =>
                            setForm((prev) => ({
                              ...prev,
                              role: value,
                            }))
                          }
                          options={[
                            { label: 'Admin', value: 'admin' },
                            { label: 'Backend Developer', value: 'backend_dev' },
                            { label: 'Frontend Developer', value: 'frontend_dev' },
                            { label: 'Fullstack Developer', value: 'fullstack_dev' },
                            { label: 'HR', value: 'hr' },
                            { label: 'Product Designer', value: 'product_designer' },
                            { label: 'UI/UX Designer', value: 'ui_ux_designer' },
                            { label: 'Quality Assurance', value: 'quality_assurance' },
                            { label: 'Team Lead', value: 'lead' },
                          ]}
                          placeholder="Employee Role"
                        />
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              {/* divider */}
              <div className="border border-(--neutral-light-hover)"></div>

              {/*Login & Access */}
              <div className="flex flex-col gap-7 w-[812px] " >
                <div>
                  <h1 className='text-[16px] text-(--neutral-normal) font-semibold leading-6 '>Login &amp; Access</h1>
                  <p className='text-[14px] font-medium text-(--soft-white-dark-active) '>Manage your account acess and login preference.</p>
                </div>

                <div className='flex flex-col gap-3'>

                  <div className='flex justify-between  '>
                    <label className='text-(--gray-darker) text-[14px] font-medium' htmlFor="old_password">Old Password</label>
                    <InputField id='old_password' type="password"
                      placeholder="Old Password"
                      className="profile-text-field"
                      value={pwForm.current_password}
                      onChange={(e) =>
                        setPwForm(prev => ({
                          ...prev,
                          current_password: e.target.value,
                        }))
                      } />
                  </div>
                  <div className='flex justify-between  '>
                    <label className='text-(--gray-darker) text-[14px] font-medium' htmlFor="new_password">New Password</label>
                    <InputField id='new_password' type="password"
                      placeholder="New Password"
                      className="profile-text-field"
                      value={pwForm.new_password}
                      onChange={(e) =>
                        setPwForm(prev => ({
                          ...prev,
                          new_password: e.target.value,
                        }))
                      } />
                  </div>
                  <div className='flex justify-between '>
                    <label className='text-(--gray-darker) text-[14px] font-medium' htmlFor="confirm_password">Confirm Password</label>
                    <InputField id='confirm_password' type="password"
                      placeholder="Confirm Password"
                      className="profile-text-field"
                      value={pwForm.confirm}
                      onChange={(e) =>
                        setPwForm(prev => ({
                          ...prev,
                          confirm: e.target.value,
                        }))
                      } />
                  </div>
                </div>

              </div>

            </form>
          )}

          {/* ── Organization ─────────────────────────────────────────────────── */}
          {tab === 'organization' && (

            <div className='flex flex-col w-[929px] gap-11'>
              <div className='flex flex-col gap-7 w-full '>
                <div>
                  <h1 className='text-(--neutral-normal) text-[16px] font-semibold'>Company Information</h1>
                  <p className='text-(--soft-white-dark-active) text-[14px] font-medium'>
                    Manage your company details and hiring identity.
                  </p>
                </div>
                <div className='flex flex-col justify-between gap-4'>
                  <div className='flex justify-between '>
                    <div className='flex flex-col justify-between '>
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
                        <Button type='button' variant='primary' size='medium'>Edit</Button>
                      </div>
                      <div className='flex gap-6 items-center'>
                        <InputField
                          id='company_email'
                          type='email'
                          placeholder='Enter your company email'
                          className='profile-text-field'
                        />
                        <Button type='button' variant='primary' size='medium'>Edit</Button>
                      </div>
                      <div className='flex gap-6 items-center'>
                        <InputField
                          id='company_website'
                          type='text'
                          placeholder='Enter your company website'
                          className='profile-text-field'
                        />
                        <Button type='button' variant='primary' size='medium'>Edit</Button>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* divider */}
              <div className='border border-(--neutral-light-hover)'></div>

              {/* Team Access */}
              <div className=' flex flex-col gap-7'>
                <div>
                  <h1 className='text-(--neutral-normal) text-[14px] font-medium'>Team  Access</h1>
                  <p className='text-(--soft-white-dark-active) text-[14px] font-medium'>
                    Control who can access the hiring platform.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className='text-(--neutral-normal) text-[14px] font-semibold'>Member-2</h3>
                  <div className="flex justify-between items-center py-4">
                    <div className='flex  items-start gap-3'>
                      <BSRealtyCheckbox size='16px' />
                      <div className='flex-col justify-between'>
                        <span className='text-[14px] font-medium text-(--gray-darker)'>Alex Johnson</span>
                        <span className='text-[14px] font-medium text-(--soft-white-darker-hover)'>alexjhonson@gmail.com</span>
                      </div>
                    </div>
                    <div>
                      <span className='text-[14px] font-medium text-(--gray-darker)'>
                        Software Developer
                      </span>
                    </div>
                    <div>
                      <span className='text-[14px] font-medium text-(--gray-darker)'>
                        September 30,2026
                      </span>
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
                  <p className='text-[14px] text-(--soft-white-dark-active) font-medium'>Protect your account from unauthorized acess</p>
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
                    <Button variant='primary' size='medium' type='button'>Manage</Button>
                  </div>

                </div>
              </div>

              {/* divider */}
              <div className='border border-(--neutral-light-hover)'></div>

              {/* Security notification */}
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
                  <div className='flex justify-between '>
                    <p className='text-[16px] font-semibold text-(--gray-darker)'>Leave Request</p>
                    <BSRealtyToggle checked={true} />
                  </div>
                  <div className='flex justify-between '>
                    <p className='text-[16px] font-semibold text-(--gray-darker)'>Overtime Request</p>
                    <BSRealtyToggle />
                  </div>
                  <div className='flex justify-between '>
                    <p className='text-[16px] font-semibold text-(--gray-darker)'>Attendance Alerts</p>
                    <BSRealtyToggle checked={true} />
                  </div>

                  <div className='flex justify-between '>
                    <p className='text-[16px] font-semibold text-(--gray-darker)'>Documents &amp; Signature Request </p>
                    <BSRealtyToggle checked={true} />
                  </div>

                  <div className='flex justify-between '>
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

              {/* system notification */}
              <div className='flex flex-col gap-7'>
                <div className='flex flex-col gap-7'>
                  <div>
                    <h1 className='text-[16px] font-semibold text-(--neutral-normal)'>System Notifications</h1>
                    <p className='text-[14px] text-(--soft-white-dark-active) font-medium'>Control in-app notifications</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className='flex justify-between '>
                      <p className='text-[16px] font-semibold text-(--gray-darker)'>Enable Notifications</p>
                      <BSRealtyToggle checked={true} />
                    </div>
                    <div className='flex justify-between '>
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

// ── 2FA components ────────────────────────────────────────────────────────────

function TwoFactorModal({ children, onClose, dismissible }: {
  children: React.ReactNode;
  onClose: () => void;
  dismissible: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
      onClick={() => dismissible && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[560px] rounded-lg bg-(--soft-white-light) shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {dismissible && (
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-4 top-4 text-[20px] leading-none text-(--gray-dark)"
          >
            ×
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

function TwoFactorError({ error }: { error: string }) {
  if (!error) return null;
  return <p role="alert" className="text-[14px] font-medium text-[#DC2626]">{error}</p>;
}

// Step 1: intro screen (the component that was commented out).
function TwoFactorSetup({ loading, error, onSetup, onLater }: {
  loading: boolean;
  error: string;
  onSetup: () => void;
  onLater: () => void;
}) {
  return (
    <div className='flex flex-col gap-6 items-center p-6 text-center'>
      <div className='space-y-3'>
        <h1 className='text-[28px] font-semibold text-(--neutral-normal) leading-9'>Set up two-factor authentication (2FA) for your account</h1>
        <p className='text-[18px] font-medium text-(--gray-dark-active) leading-7'>
          Protect sensitive information and secure your account by using an authenticator app to log in to your account.
        </p>
      </div>
      <TwoFactorError error={error} />
      <div className='flex flex-col w-[252px] gap-y-5'>
        <Button
          type="button"
          variant='primary'
          className="w-full"
          onClick={onSetup}
          disabled={loading}
        >
          {loading ? 'Setting up...' : 'Setup 2FA'}
        </Button>
        <button type="button" onClick={onLater} disabled={loading}>
          <span className="w-full text-[18px] font-medium leading-7 text-[#235E94]">Setup later, go to my account</span>
        </button>
      </div>
    </div>
  );
}

// Step 2: scan the QR code and confirm with a 6-digit code.
function TwoFactorVerify({ setupData, otp, onOtpChange, loading, error, onConfirm, onCancel }: {
  setupData: TwoFactorSetupData;
  otp: string;
  onOtpChange: (v: string) => void;
  loading: boolean;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }

  return (
    <form
      className='flex flex-col gap-6 items-center p-6 text-center'
      onSubmit={(e) => { e.preventDefault(); onConfirm(); }}
    >
      <div className='space-y-2'>
        <h1 className='text-[24px] font-semibold text-(--neutral-normal) leading-8'>Scan the QR code</h1>
        <p className='text-[16px] font-medium text-(--gray-dark-active) leading-6'>
          Open Google Authenticator, Microsoft Authenticator or Authy and scan this code,
          then enter the 6-digit code it shows.
        </p>
      </div>

      {setupData.qrDataUrl && (
        <img
          src={setupData.qrDataUrl}
          alt="2FA QR code"
          width={200}
          height={200}
          className="rounded-lg border border-(--soft-white-normal) bg-white p-2"
        />
      )}

      {setupData.secret && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-[14px] font-medium text-(--soft-white-dark-active)">Can&apos;t scan? Enter this key manually</span>
          <div className="flex items-center gap-2">
            <code className="rounded bg-(--soft-white-normal) px-2 py-1 text-[14px] tracking-wider break-all">{setupData.secret}</code>
            <button type="button" onClick={copySecret} className="text-[14px] font-medium text-(--blue-sky)">
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col  gap-2 w-[252px] ">
        <InputField
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          aria-label="6-digit authentication code"
          value={otp}
          onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full tracking-[0.8em]  "
        />
        <TwoFactorError error={error} />
      </div>

      <div className='flex flex-col w-[252px] gap-y-3'>
        <Button type="submit" variant='primary' className="w-full" disabled={loading || otp.length !== 6}>
          {loading ? 'Verifying...' : 'Verify & Enable'}
        </Button>
        <button type="button" onClick={onCancel} disabled={loading}
          className="text-[16px] font-medium leading-6 text-(--gray-dark)">
          Cancel
        </button>
      </div>
    </form>
  );
}

// Step 3: show one-time backup codes (only if the API returns them).
function TwoFactorBackupCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = codes.join('\n');

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className='flex flex-col gap-6 items-center p-6 text-center'>
      <div className='space-y-2'>
        <h1 className='text-[24px] font-semibold text-(--neutral-normal) leading-8'>Save your backup codes</h1>
        <p className='text-[16px] font-medium text-(--gray-dark-active) leading-6'>
          2FA is now on. Each code works once if you lose access to your authenticator app.
          Store them somewhere safe; you won&apos;t see them again.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-lg border border-(--soft-white-normal) bg-(--soft-white-normal) px-6 py-4">
        {codes.map((c) => (
          <code key={c} className="text-[16px] tracking-wider text-(--neutral-normal)">{c}</code>
        ))}
      </div>

      <div className="flex gap-4">
        <button type="button" onClick={copyAll} className="text-[14px] font-medium text-(--blue-sky)">
          {copied ? 'Copied' : 'Copy codes'}
        </button>
        <button type="button" onClick={download} className="text-[14px] font-medium text-(--blue-sky)">
          Download .txt
        </button>
      </div>

      <div className='w-[252px]'>
        <Button type="button" variant='primary' className="w-full" onClick={onDone}>
          I&apos;ve saved them
        </Button>
      </div>
    </div>
  );
}

// Turning 2FA off: confirm with a current authenticator code.
function TwoFactorDisable({ password, onPasswordChange, otp, onOtpChange, loading, error, onConfirm, onCancel }: {
  password: string;
  onPasswordChange: (v: string) => void;
  otp: string;
  onOtpChange: (v: string) => void;
  loading: boolean;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      className='flex flex-col gap-6 items-center p-6 text-center'
      onSubmit={(e) => { e.preventDefault(); onConfirm(); }}
    >
      <div className='space-y-2'>
        <h1 className='text-[24px] font-semibold text-(--neutral-normal) leading-8'>Turn off two-factor authentication?</h1>
        <p className='text-[16px] font-medium text-(--gray-dark-active) leading-6'>
          Your account will be less secure. Enter your password and the 6-digit code from your authenticator app to confirm.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 w-[252px]">
        <InputField
          autoFocus
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          aria-label="Account password"
          value={password}
          showPasswordToggle={true}
          onChange={(e) => onPasswordChange(e.target.value)}
          className="w-full  "
        />
        <InputField
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          aria-label="6-digit authentication code"
          value={otp}
          onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full text-2xl! tracking-[0.7em]!  "
        />
        <TwoFactorError error={error} />
      </div>

      <div className='flex flex-col w-[252px] gap-y-3'>
        <Button type="submit" variant='primary' className="w-full" disabled={loading || !password || otp.length !== 6}>
          {loading ? 'Disabling...' : 'Turn off 2FA'}
        </Button>
        <button type="button" onClick={onCancel} disabled={loading}
          className="text-[16px] font-medium leading-6 text-(--gray-dark)">
          Keep 2FA on
        </button>
      </div>
    </form>
  );
}
