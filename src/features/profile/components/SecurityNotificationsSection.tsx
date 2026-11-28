'use client';
import { BSRealtyToggle } from '@bsrealtyllc/design-system';
import NotificationInfo from './NotificationInfo';
import type { NotificationPreferencesState } from '../hooks/useNotificationPreferences';

// Also shared across roles — new_login_detected / password_changed apply to
// every role (see notificationTypes.ts), not just admin.
export default function SecurityNotificationsSection({ notifications }: { notifications: NotificationPreferencesState }) {
  const { notificationPreferences, notificationPreferencesLoaded, savingNotificationType, toggleNotificationPreference } = notifications;
  return (
    <div className='flex flex-col gap-7 mb-5'>
      <div className='flex flex-col gap-7'>
        <div>
          <h1 className='text-[16px] font-semibold text-(--neutral-normal) '>Security Notifications</h1>
          <p className='text-[14px] text-(--soft-white-dark-active) font-medium'>Receive alerts about important account activity.</p>
        </div>

        <div className="flex flex-col gap-4">
          {!notificationPreferencesLoaded && (
            <p className='text-[14px] text-(--soft-white-dark-active)'>Loading…</p>
          )}
          {notificationPreferencesLoaded && notificationPreferences
            .filter((p) => p.group === 'security')
            .map((pref) => (
              <div key={pref.type} className='flex justify-between mr-10'>
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
    </div>
  );
}
