'use client';
import { BSRealtyAvatar } from '@bsrealtyllc/design-system';
import type { Profile } from '@/types';
import { ACCESS_ROLE_LABELS } from '../utils';
import type { MyProfileState } from '../hooks/useMyProfile';

export default function ProfileHeaderCard({ profile, me }: { profile: Profile; me: MyProfileState }) {
  const { photoRef, photoPreview, uploading, handlePhotoChange } = me;
  return (
    <div className="mb-9 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-(--soft-white-normal-hover) bg-(--soft-white-light) p-6 max-sm:p-4">
      {/* Wraps on phones: "Member since" drops below the identity instead of crowding it. */}
      <div className="flex min-w-0 flex-col items-center justify-center gap-1">
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
                onChange={handlePhotoChange()} />
            </div>
          </div>
          {/* Identity */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className='text-[16px] text-(--neutral-normal) font-medium leading-6 break-words'>
              {profile.name}
            </div>
            <div className="text-[14px] text-(--gray-normal-hover) leading-5 font-medium break-all">
              {profile.email}
            </div>
          </div>
        </div>

        <div className='w-full pl-18'>
          <span className="py-1 px-3 rounded-lg" style={{ background: '#DCF1E4', color: '#16A34A', fontWeight: 500, fontSize: '12px' }}>
            {ACCESS_ROLE_LABELS[profile.role] ?? profile.role}
          </span>
        </div>
      </div>

      <div className='flex-col'>
        {/* Join date */}
        {profile.start_date && (
          <div className='text-right max-sm:text-left' style={{ flexShrink: 0 }}>
            <div className="text-(--gray-normal-hover) text-[14px]">Member since</div>
            <div style={{ fontWeight: 500, fontSize: 16, color: 'var(--neutral-normal)' }}>
              {new Date(profile.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
