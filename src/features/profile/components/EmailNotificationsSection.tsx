'use client';
import { BSRealtyToggle } from '@bsrealtyllc/design-system';
import NotificationInfo from './NotificationInfo';
import type { NotificationPreferencesState } from '../hooks/useNotificationPreferences';

// Email Notifications is shared across roles — the backend already returns
// only the types relevant to the caller's role (requester types for
// employee/intern, the "submitted" approver types for lead, etc.), so the
// list renders directly from whatever GET /notifications/preferences sends
// back instead of a hardcoded per-role set.
export default function EmailNotificationsSection({ notifications }: { notifications: NotificationPreferencesState }) {
  const { notificationPreferences, notificationPreferencesLoaded, savingNotificationType, toggleNotificationPreference } = notifications;
  return (
    <div className='flex flex-col gap-7'>
      <div>
        <h1 className='text-[16px] font-semibold text-(--neutral-normal)'>Email Notifications</h1>
        <p className='text-[14px] text-(--soft-white-dark-active) font-medium'>Manage when you receive updates via email.</p>
      </div>

      <div className="flex flex-col gap-4">
        {!notificationPreferencesLoaded && (
          <p className='text-[14px] text-(--soft-white-dark-active)'>Loading…</p>
        )}
        {notificationPreferencesLoaded && notificationPreferences
          .filter((p) => p.group === 'email')
          .map((pref) => (
            <div key={pref.type} className='flex justify-between'>
              <span className='flex items-center gap-2'>
                <p className='text-[16px] font-semibold text-(--gray-darker)'>{pref.label}</p>
                <NotificationInfo text={pref.description} />
              </span>
              <BSRealtyToggle
                checked={pref.enabled}
                onChange={() => toggleNotificationPreference(pref.type)}
                disabled={savingNotificationType === pref.type}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
