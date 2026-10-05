'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import Button from '@/components/Button/Button';
import PageHeader from '@/components/PageHeader';
import { BSRealtyAvatar, BSRealtyDropdown, BSRealtyTabs, BSRealtyTextField } from '@bsrealtyllc/design-system';

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:6002/api').replace('/api', '');

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

type Tab = 'personal' | 'organization' | 'security' | 'notification';

function avatarUrl(filename: string | null) {
  if (!filename) return null;
  return `${BACKEND}/uploads/profile/${filename}`;
}

function docUrl(filename: string | null) {
  if (!filename) return null;
  return `${BACKEND}/uploads/docs/${filename}`;
}

// function initials(name: string) {
//   return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
// }

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>('personal');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');

  // personal info form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
  });

  // security
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  // const [pwMsg, setPwMsg] = useState('');
  // const [pwType, setPwType] = useState<'ok' | 'err'>('ok');
  // const [pwSaving, setPwSaving] = useState(false);
  // const [showCurrentPw, setShowCurrentPw] = useState(false);
  // const [showNewPw, setShowNewPw] = useState(false);
  // const [showConfirmPw, setShowConfirmPw] = useState(false);

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
        // dob: p.dob ? p.dob.split('T')[0] : '',
        // address: p.address || '',
      });
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

  // async function changePassword(e: React.FormEvent) {
  //   e.preventDefault();
  //   if (pwForm.new_password !== pwForm.confirm) {
  //     setPwMsg('Passwords do not match.'); setPwType('err'); return;
  //   }
  //   if (pwForm.new_password.length < 6) {
  //     setPwMsg('Password must be at least 6 characters.'); setPwType('err'); return;
  //   }
  //   setPwSaving(true); setPwMsg('');
  //   try {
  //     await api.put('/auth/password', {
  //       current_password: pwForm.current_password,
  //       new_password: pwForm.new_password,
  //     });
  //     setPwMsg('Password changed successfully.'); setPwType('ok');
  //     setPwForm({ current_password: '', new_password: '', confirm: '' });
  //   } catch {
  //     setPwMsg('Failed. Check your current password.'); setPwType('err');
  //   } finally {
  //     setPwSaving(false);
  //   }
  // }

  if (!profile) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading profile…
      </div>
    );
  }

  const handleSaveChanges = () => {
    if (tab === 'personal') {
      document.getElementById('personal-form')?.requestSubmit();
    }

    if (tab === 'organization') {
      // TODO: save organization data
    }

    if (tab === 'security') {
      document.getElementById('security-form')?.requestSubmit();
    }

    if (tab === 'notification') {
      // TODO: save notification settings
    }
  };



  return (
    <div>

      {/* Page Hader */}
      <PageHeader title={'My Profile'} discription={"Manage your personal information, documents, and account security"} />

      {/* ── Profile Header Card ───────────────────────────────────────────── */}
      <div className="mx-6 mb-9 flex items-center justify-between rounded-lg border border-(--soft-white-normal-hover) bg-(--soft-white-light) p-6">
        <div className=" flex-col items-center justify-center gap-1" >
          <div className="flex items-center gap-[10px]" style={{ flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div className=' '>
              <div style={{ position: 'relative', flexShrink: 0 }}>
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
              <div className="text-[14px] text-( --gray-normal-hover) leading-5 font-medium" >
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
              <div className="text-( --gray-normal-hover) text-[14px]" >Member since</div>
              <div style={{ fontWeight: 500, fontSize: 16, color: '#17212B' }}>
                {new Date(profile.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}

      <div className="ml-6 mr-5 bg-[#FEFEFE] border border-[#F1F5F9] rounded-lg " style={{ padding: 24, overflow: 'hidden' }}>

        <div className='flex justify-between py-6' >
          <BSRealtyTabs
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
          <form id="personal-form" onSubmit={savePersonal} className=" w-[967px] flex-col gap-10">
            <div className="w-[909px]  flex-col gap-7">
              <div>
                <h1 className='text-[16px] text-[#17212B] font-semibold'>Profile Information</h1>
                <p className='text-[14px] font-medium text-[#6C6E70]'>Manage your personal details and account information</p>
              </div>

              {/* profile  */}
              <div className='flex-col gap-7'>
                <div className=' flex justify-between items-center max-w-[495px]'>
                  <label className='text-[14px] font-medium text-[#232931]'>Profile Picture</label>
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
                        className='p-2 text-[14px] font-medium text-[#339CD4]'
                      >
                        Update
                      </button>
                      <button
                        type='button' onClick={() => setPhotoPreview(null)}
                        className='p-2 text-[14px] font-medium text-[#4B5768]'
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Personal fields form group */}
                <div className=' flex gap-[179px]'>
                  <div className=' my-[14px] flex-col gap-11 justify-center  '>
                    <label className='text-[14px] font-medium text-[#232931] ' htmlFor="name">Full Name</label>
                    <label className='text-[14px] font-medium text-[#232931] ' htmlFor="email"> Email</label>
                    <label className='text-[14px] font-medium text-[#232931] ' htmlFor="phone">Phone No.</label>
                    <label className='text-[14px] font-medium text-[#232931] ' htmlFor="role">Role</label>
                  </div>
                  <div className='flex-col gap-[16px]'>
                    <div className='flex gap-6'>
                      <BSRealtyTextField
                        id='name'
                        style={{ width: '532px', height: '48px' }}
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
                      <Button type='button' variant='primary' size='medium'  >Edit</Button>
                    </div>
                    <div className='flex justify-between'>
                      <BSRealtyTextField
                        id='email'
                        value={form.email}
                        style={{ width: '532px', height: '48px' }}
                        type='email'
                        placeholder='Enter your email'
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                      />
                      <Button type='button' variant='primary' size='medium'  >Edit</Button>
                    </div>
                    <div className='flex justify-between'>
                      <BSRealtyTextField
                        id='phone'
                        value={form.phone}
                        style={{ width: '532px', height: '48px' }}
                        type='text'
                        placeholder='Enter your Phone number'
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                      />
                      <Button type='button' variant='primary' size='medium'  >Edit</Button>
                    </div>
                    <div className=' '>
                      <BSRealtyDropdown
                        value={form.role}
                        onChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            role: value,
                          }))
                        }
                        options={[
                          {
                            label: 'Admin',
                            value: 'admin'
                          },
                          {
                            label: 'Backend Developer',
                            value: 'backend_dev'
                          },
                          {
                            label: 'Frontend Developer',
                            value: 'frontend_dev'
                          },
                          {
                            label: 'Fullstack Developer',
                            value: 'fullstack_dev'
                          },
                          {
                            label: 'HR',
                            value: 'hr'
                          },
                          {
                            label: 'Product Designer',
                            value: 'product_designer'
                          },
                          {
                            label: 'UI/UX Designer',
                            value: 'ui_ux_designer'
                          },
                          {
                            label: 'Quality Assurance',
                            value: 'quality_assurance'
                          },
                          {
                            label: 'Team Lead',
                            value: 'team_lead'
                          },
                        ]}
                        placeholder="Employee Role"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* divider */}
            <div className="border border-[#DCDEDF]"></div>

            {/*Login & Access */}
            <div className=" w-full max-w-[812px] flex-col gap-7">
              <div>
                <h1 className='text-[16px] text-[#17212B] font-semibold leading-6 '>Login & Access</h1>
                <p className='text-[14px] font-medium text-[#6C6E70] '>Manage your account acess and login preference.</p>
              </div>

              <div className='flex-col gap-3'>

                <div className='flex justify-between  '>
                  <label className='text-[#232931] text-[14px] font-medium' htmlFor="old_password">Old Password</label>
                  <BSRealtyTextField id='old_password' type="password"
                    placeholder="Old Password"
                    className="w-[532px]"
                    value={pwForm.current_password}
                    onChange={(e) =>
                      setPwForm(prev => ({
                        ...prev,
                        current_password: e.target.value,
                      }))
                    } />
                </div>
                <div className='flex justify-between  '>
                  <label className='text-[#232931] text-[14px] font-medium' htmlFor="new_password">New Password</label>
                  <BSRealtyTextField id='new_password' type="password"
                    placeholder="New Password"
                    className="w-[532px]"
                    value={pwForm.new_password}
                    onChange={(e) =>
                      setPwForm(prev => ({
                        ...prev,
                        new_password: e.target.value,
                      }))
                    } />
                </div>
                <div className='flex justify-between '>
                  <label className='text-[#232931] text-[14px] font-medium' htmlFor="conform_password">Conform Password</label>
                  <BSRealtyTextField id='conform_password' type="password"
                    placeholder="Confirm Password"
                    className="w-[532px]"
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
          // <div>
          //   {msg && (
          //     <div style={{
          //       marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13,
          //       background: msgType === 'ok' ? '#f0fdf4' : '#fef2f2',
          //       color: msgType === 'ok' ? '#16a34a' : 'var(--color-error)',
          //       border: `1px solid ${msgType === 'ok' ? '#bbf7d0' : '#fecaca'}`,
          //     }}>
          //       {msg}
          //     </div>
          //   )}

          //   <p className="text-muted" style={{ fontSize: 13, marginBottom: 24 }}>
          //     Upload your identification documents. Accepted formats: JPG, PNG, WEBP — max 5 MB each.
          //   </p>

          //   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          //     <DocUploadCard
          //       label="Citizenship / ID (Front)"
          //       preview={frontPreview}
          //       loading={uploading.front}
          //       onChange={handleFileChange('front')}
          //     />
          //     <DocUploadCard
          //       label="Citizenship / ID (Back)"
          //       preview={backPreview}
          //       loading={uploading.back}
          //       onChange={handleFileChange('back')}
          //     />
          //   </div>
          // </div>
          <div className='flex-col max-w-[929px] gap-11'>
            <div className='flex-col gap-7'>
              <div>
                <h1 className='text-[#17212B] text-[16px] font-semibold'>Company Information</h1>
                <p className='text-[#6C6E70] text-[14px] font-medium'>Manage your company details and hiring identity.</p>
              </div>
              <div>

              </div>
            </div>

            {/* divider */}
            <div className='border'></div>

            <div></div>
          </div>
        )}

        {/* ── SECURITY ──────────────────────────────────────────────────── */}
        {tab === 'security' && (
          <></>
        )}


      </div>
    </div >
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
