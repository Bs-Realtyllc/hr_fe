'use client';
import { BSRealtyAvatar } from '@bsrealtyllc/design-system';
import Button from '@/components/Button/Button';
import InputField from '@/components/InputField/InputField';
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

              {/* Role is read-only here — it's never actually editable through this
                  form (the backend's /profile whitelist silently drops it either way),
                  and changing someone's access role lives in Team Access instead. */}
              <div>
                <InputField
                  id='role'
                  className='profile-text-field'
                  type='text'
                  value={ACCESS_ROLE_LABELS[form.role] ?? form.role}
                  disabled
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* divider */}
      <div className="border border-(--neutral-light-hover)"></div>

      {/* Login & Access */}
      <div className="bg-none flex flex-col gap-7 w-[812px]">
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
  );
}
