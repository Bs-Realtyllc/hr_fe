'use client';
import { BSRealtyAvatar } from '@bsrealtyllc/design-system';
import Button from '@/components/ui/Button/Button';
import InputField from '@/components/ui/InputField/InputField';
import ProfileFieldRow from './ProfileFieldRow';
import type { Profile } from '@/types';
import { ACCESS_ROLE_LABELS } from '../utils';
import type { MyProfileState } from '../hooks/useMyProfile';
import type { PasswordChangeState } from '../hooks/usePasswordChange';

/** Admin "Personal Info" tab. Submitted by the page's Save Changes button via #personal-form. */
export default function PersonalInfoForm({ profile, me, password }: { profile: Profile; me: MyProfileState; password: PasswordChangeState }) {
  const { form, setForm, isNameEdit, setIsNameEdit, isEmailEdit, setIsEmailEdit, isPhoneEdit, setIsPhoneEdit, photoRef, photoPreview, uploading, deletePhoto, savePersonal } = me;
  const { pwForm, pwSaving, pwError, changePassword, updatePw } = password;
  return (
    <form id="personal-form" onSubmit={savePersonal} className="flex flex-col gap-10" style={{ width: '100%' }}>
      <div className="w-full max-w-[909px] flex flex-col gap-7">
        <div>
          <h1 className='text-[16px] text-(--neutral-normal) font-semibold'>Profile Information</h1>
          <p className='text-[14px] font-medium text-(--soft-white-dark-active)'>Manage your personal details and account information</p>
        </div>

        {/* Profile picture */}
        <div className='flex flex-col gap-7'>
          <div className='flex max-w-[495px] justify-between gap-[12px] md:items-center md:gap-[16px] max-md:flex-col max-md:items-start'>
            <label className='shrink-0 text-[14px] font-medium text-(--gray-darker)'>Profile Picture</label>
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

          {/* Personal fields — one row per field (stacks below 768px). */}
          <div className='flex flex-col gap-4'>
            <ProfileFieldRow label='Full Name' htmlFor='name'>
              <InputField
                id='name'
                className='profile-text-field'
                type='text'
                placeholder='Enter your Full name'
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                disabled={!isNameEdit}
              />
              <Button type='button' variant='primary' size='small' className='shrink-0' onClick={() => setIsNameEdit(prev => !prev)} >Edit</Button>
            </ProfileFieldRow>

            <ProfileFieldRow label='Email' htmlFor='email'>
              <InputField
                id='email'
                value={form.email}
                className='profile-text-field'
                type='email'
                placeholder='Enter your email'
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                disabled={!isEmailEdit}
              />
              <Button type='button' variant='primary' size='small' className='shrink-0' onClick={() => setIsEmailEdit(prev => !prev)}>Edit</Button>
            </ProfileFieldRow>

            <ProfileFieldRow label='Phone No.' htmlFor='phone'>
              <InputField
                id='phone'
                value={form.phone}
                className='profile-text-field'
                type='text'
                placeholder='Enter your Phone number'
                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                disabled={!isPhoneEdit}
              />
              <Button type='button' variant='primary' size='small' className='shrink-0' onClick={() => setIsPhoneEdit(prev => !prev)}>Edit</Button>
            </ProfileFieldRow>

            {/* Role is read-only here — it's never actually editable through this
                form (the backend's /profile whitelist silently drops it either way),
                and changing someone's access role lives in Team Access instead. */}
            <ProfileFieldRow label='Role' htmlFor='role'>
              <InputField
                id='role'
                className='profile-text-field'
                type='text'
                value={ACCESS_ROLE_LABELS[form.role] ?? form.role}
                disabled
                readOnly
              />
              {/* No Edit for Role; this invisible stand-in keeps its input lined up
                  with the rows above on desktop. Hidden (<768px) so Role goes full width. */}
              <span aria-hidden="true" className="invisible shrink-0 max-md:hidden">
                <Button type='button' variant='primary' size='small' tabIndex={-1}>Edit</Button>
              </span>
            </ProfileFieldRow>
          </div>
        </div>
      </div>

      {/* divider */}
      <div className="border border-(--neutral-light-hover)"></div>

      {/* Login & Access */}
      <div className="bg-none flex flex-col gap-7 w-full max-w-[812px]">
        <div>
          <h1 className='text-[16px] text-(--neutral-normal) font-semibold leading-6'>Login &amp; Access</h1>
          <p className='text-[14px] font-medium text-(--soft-white-dark-active)'>Manage your account access and login preference.</p>
        </div>

        <div className='flex flex-col gap-3'>
          {[
            { id: 'old_password', label: 'Old Password', key: 'current_password' as const },
            { id: 'new_password', label: 'New Password', key: 'new_password' as const },
            { id: 'confirm_password', label: 'Confirm Password', key: 'confirm' as const },
          ].map(f => (
            <ProfileFieldRow key={f.id} label={f.label} htmlFor={f.id}>
              <InputField id={f.id} type="password"
                showPasswordToggle={true}
                autoComplete="new-password"
                placeholder={f.label}
                className="profile-text-field"
                value={pwForm[f.key]}
                onChange={(e) => updatePw(f.key, e.target.value)} />
            </ProfileFieldRow>
          ))}

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
  );
}
