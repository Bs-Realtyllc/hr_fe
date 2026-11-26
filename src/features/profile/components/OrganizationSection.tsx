'use client';
import Button from '@/components/ui/Button/Button';
import InputField from '@/components/ui/InputField/InputField';
import type { Profile } from '@/types';
import NotificationInfo from './NotificationInfo';
import ProfileFieldRow from './ProfileFieldRow';
import { ACCESS_ROLE_LABELS, formatJoinDate } from '../utils';
import type { CompanyInfoState } from '../hooks/useCompanyInfo';
import type { TeamAccessState } from '../hooks/useTeamAccess';

// Shared across roles — everyone can see company info, only admin can edit
// it, and Team Access management stays admin-only.
export default function OrganizationSection({ isAdmin, profile, company, team }: { isAdmin: boolean; profile: Profile | null; company: CompanyInfoState; team: TeamAccessState }) {
  const { companyInfo, setCompanyInfo, isCompanyNameEdit, setIsCompanyNameEdit, isCompanyEmailEdit, setIsCompanyEmailEdit, isCompanyWebEdit, setIsCompanyWebEdit } = company;
  const { teamAccessLoaded, teamAccessMembers, openMemberMenuId, setOpenMemberMenuId, viewMemberProfile, openEditRole } = team;
  return (
    <div className='flex flex-col w-full max-w-[929px] gap-11'>
      <div className='flex flex-col gap-7 w-full'>
        <div>
          <h1 className='text-(--neutral-normal) text-[16px] font-semibold'>Company Information</h1>
          <p className='text-(--soft-white-dark-active) text-[14px] font-medium'>
            Manage your company details and hiring identity.
          </p>
        </div>
        {/* One row per field (stacks below 768px). */}
        <div className='flex flex-col gap-4'>
          <ProfileFieldRow label='Company Name' htmlFor='company_name'>
            <InputField
              id='company_name'
              type='text'
              placeholder='Enter your company name'
              className='profile-text-field'
              value={companyInfo.name}
              onChange={(e) => setCompanyInfo((prev) => ({ ...prev, name: e.target.value }))}
              disabled={!isAdmin || !isCompanyNameEdit}
            />
            {isAdmin && (
              <Button type='button' variant='primary' size='medium' className='shrink-0' onClick={() => {
                setIsCompanyNameEdit(true);
                setTimeout(() => document.getElementById('company_name')?.focus(), 0);
              }}>Edit</Button>
            )}
          </ProfileFieldRow>
          <ProfileFieldRow label='Company Email' htmlFor='company_email'>
            <InputField
              id='company_email'
              type='email'
              placeholder='Enter your company email'
              className='profile-text-field'
              value={companyInfo.email}
              onChange={(e) => setCompanyInfo((prev) => ({ ...prev, email: e.target.value }))}
              disabled={!isAdmin || !isCompanyEmailEdit}
            />
            {isAdmin && (
              <Button type='button' variant='primary' size='medium' className='shrink-0' onClick={() => {
                setIsCompanyEmailEdit(true);
                setTimeout(() => document.getElementById('company_email')?.focus(), 0);
              }}>Edit</Button>
            )}
          </ProfileFieldRow>
          <ProfileFieldRow label='Company Website' htmlFor='company_website'>
            <InputField
              id='company_website'
              type='text'
              placeholder='Enter your company website'
              className='profile-text-field'
              value={companyInfo.website}
              onChange={(e) => setCompanyInfo((prev) => ({ ...prev, website: e.target.value }))}
              disabled={!isAdmin || !isCompanyWebEdit}
            />
            {isAdmin && (
              <Button type='button' variant='primary' size='medium' className='shrink-0' onClick={() => {
                setIsCompanyWebEdit(true);
                setTimeout(() => document.getElementById('company_website')?.focus(), 0);
              }}>Edit</Button>
            )}
          </ProfileFieldRow>
        </div>
      </div>

      {/* divider */}
      <div className='border border-(--neutral-light-hover)'></div>

      <div className='flex flex-col gap-7 w-full'>
        <div>
          <h1 className='text-(--neutral-normal) text-[16px] font-semibold'>Working Hours</h1>
          <p className='text-(--soft-white-dark-active) text-[14px] font-medium'>
            Company-wide default shift, used to flag late clock-ins. Leave blank if you don&apos;t want lateness tracked.
          </p>
        </div>
        <div className='flex flex-col gap-4'>
          <ProfileFieldRow label='Start Time' htmlFor='work_start'>
            <InputField
              id='work_start'
              type='time'
              className='profile-text-field'
              value={companyInfo.work_start}
              onChange={(e) => setCompanyInfo((prev) => ({ ...prev, work_start: e.target.value }))}
              disabled={!isAdmin}
            />
          </ProfileFieldRow>
          <ProfileFieldRow label='End Time' htmlFor='work_end'>
            <InputField
              id='work_end'
              type='time'
              className='profile-text-field'
              value={companyInfo.work_end}
              onChange={(e) => setCompanyInfo((prev) => ({ ...prev, work_end: e.target.value }))}
              disabled={!isAdmin}
            />
          </ProfileFieldRow>
          <ProfileFieldRow
            htmlFor='late_grace_minutes'
            label={<>
              Grace Period (minutes)
              <NotificationInfo text="Minutes after Start Time an employee can still clock in without being marked late. E.g. a 9:00 AM start with a 15-minute grace period only flags clock-ins after 9:15 AM." />
            </>}
          >
            <InputField
              id='late_grace_minutes'
              type='number'
              min={0}
              max={120}
              className='profile-text-field'
              value={companyInfo.late_grace_minutes}
              onChange={(e) => setCompanyInfo((prev) => ({ ...prev, late_grace_minutes: e.target.value }))}
              disabled={!isAdmin || !companyInfo.work_start}
            />
          </ProfileFieldRow>
        </div>
      </div>

      {isAdmin && (
        <>
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
            <div className="flex flex-col gap-2 overflow-x-auto">
              <div className="min-w-[640px]">
                {/* Header row shares the same grid template as data rows so columns line up exactly. */}
                <div className="grid grid-cols-[minmax(220px,1fr)_100px_160px_150px_32px] gap-4 items-center px-1 pb-2">
                  <span className='text-[13px] font-semibold text-(--soft-white-dark-active)'>Member</span>
                  <span className='text-[13px] font-semibold text-(--soft-white-dark-active)'>Role</span>
                  <span className='text-[13px] font-semibold text-(--soft-white-dark-active)'>Designation</span>
                  <span className='text-[13px] font-semibold text-(--soft-white-dark-active)'>Member Since</span>
                  <span />
                </div>

                {!teamAccessLoaded && (
                  <p className='text-[14px] text-(--soft-white-dark-active) py-4'>Loading…</p>
                )}
                {teamAccessLoaded && teamAccessMembers.length === 0 && (
                  <p className='text-[14px] text-(--soft-white-dark-active) py-4'>No team members found.</p>
                )}
                {teamAccessLoaded && teamAccessMembers.map((member) => (
                  <div
                    key={member.id}
                    className="grid grid-cols-[minmax(220px,1fr)_100px_160px_150px_32px] gap-4 items-center px-1 py-4 border-b border-(--neutral-light-hover) last:border-0"
                  >
                    <div className='flex flex-col min-w-0'>
                      <span className='text-[14px] font-medium text-(--gray-darker) truncate'>{member.name}</span>
                      <span className='text-[14px] font-medium text-(--soft-white-darker-hover) truncate'>{member.email}</span>
                    </div>
                    <span className='text-[14px] font-medium text-(--gray-darker)'>{ACCESS_ROLE_LABELS[member.role] ?? member.role}</span>
                    <span className='text-[14px] font-medium text-(--gray-darker) truncate'>{member.designation ?? '—'}</span>
                    <span className='text-[14px] font-medium text-(--gray-darker) whitespace-nowrap'>{formatJoinDate(member.start_date)}</span>
                    <div className='relative'>
                      <button
                        type='button'
                        aria-label='Member actions'
                        onClick={() => setOpenMemberMenuId((prev) => (prev === member.id ? null : member.id))}
                      >
                        <img src='/icons/dots.svg' alt="" />
                      </button>
                      {openMemberMenuId === member.id && (
                        <>
                          {/* Click-outside backdrop to close the menu. */}
                          <div className='fixed inset-0 z-10' onClick={() => setOpenMemberMenuId(null)} />
                          <div className='absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-(--neutral-light-hover) bg-(--soft-white-light) py-1 shadow-lg'>
                            <button
                              type='button'
                              onClick={() => viewMemberProfile(member.id)}
                              className='block w-full px-3 py-2 text-left text-[14px] text-(--gray-darker) hover:bg-(--soft-white-normal)'
                            >
                              View Profile
                            </button>
                            <button
                              type='button'
                              disabled={member.id === profile?.id}
                              onClick={() => openEditRole(member)}
                              title={member.id === profile?.id ? "You can't change your own role here." : undefined}
                              className='block w-full px-3 py-2 text-left text-[14px] text-(--gray-darker) hover:bg-(--soft-white-normal) disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent'
                            >
                              Edit Role
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
