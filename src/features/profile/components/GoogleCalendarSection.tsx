'use client';
import { useState } from 'react';
import Button from '@/components/ui/Button/Button';
import MaskIcon from '@/components/ui/MaskIcon';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import type { Flash } from '../hooks/useFlash';

// Admin Profile → Integrations. The company's single Google Calendar account:
// scheduled meetings (and their Meet links) are created on its calendar.
export default function GoogleCalendarSection({ flash }: { flash: Flash }) {
  const { status, loadFailed, busy, loadStatus, connect, sync, disconnect } = useGoogleCalendar(flash);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const connected = !!status?.connected;

  let statusText: string;
  if (loadFailed) statusText = 'Unable to load the connection status.';
  else if (!status) statusText = 'Loading…';
  else if (!connected) statusText = 'Not connected. Meetings can’t be scheduled until an admin connects a Google account.';
  else if (status.webhookActive) statusText = 'Connected. Changes made in Google Calendar show up here automatically.';
  else statusText = 'Connected. Use Sync now to pull changes made in Google Calendar.';

  return (
    <div className='flex flex-col gap-7'>
      <div>
        <h1 className='text-[16px] font-semibold text-(--neutral-normal)'>Integrations</h1>
        <p className='text-[14px] text-(--soft-white-dark-active) font-medium'>Connect company-wide services. Only admins can see this.</p>
      </div>

      <div className='flex justify-between items-start gap-6 max-md:flex-col'>
        <div className='flex gap-3 min-w-0'>
          <MaskIcon src='/icons/google-meet.svg' size={24} color='var(--neutral-normal)' />
          <div className='min-w-0'>
            <span className='flex items-center gap-2'>
              <h2 className='text-[16px] font-semibold text-(--gray-darker)'>Google Calendar</h2>
              {status && (
                <span
                  className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${connected ? 'bg-(--success-light) text-(--success-dark)' : 'bg-(--soft-white-normal) text-(--soft-white-dark-active)'}`}
                >
                  {connected ? 'Connected' : 'Not connected'}
                </span>
              )}
            </span>
            <p className='text-[14px] font-medium text-(--soft-white-dark-active)'>{statusText}</p>
            <p className='text-[14px] font-medium text-(--soft-white-dark-active)'>
              Meetings and their Google Meet links are created on this account’s calendar.
            </p>
          </div>
        </div>

        <div className='flex shrink-0 items-center gap-3'>
          {loadFailed && (
            <Button variant='secondary' size='medium' type='button' onClick={loadStatus}>Retry</Button>
          )}

          {status && !connected && (
            <Button variant='primary' size='medium' type='button' onClick={connect} disabled={busy !== null}>
              {busy === 'connect' ? 'Opening Google…' : 'Connect'}
            </Button>
          )}

          {connected && !confirmingDisconnect && (
            <>
              <Button variant='primary' size='medium' type='button' onClick={sync} disabled={busy !== null}>
                {busy === 'sync' ? 'Syncing…' : 'Sync now'}
              </Button>
              <Button variant='secondary' size='medium' type='button' onClick={connect} disabled={busy !== null}>
                {busy === 'connect' ? 'Opening Google…' : 'Reconnect'}
              </Button>
              <Button variant='text' size='medium' type='button' onClick={() => setConfirmingDisconnect(true)} disabled={busy !== null}>
                Disconnect
              </Button>
            </>
          )}

          {connected && confirmingDisconnect && (
            <>
              <span className='text-[14px] font-medium text-(--gray-darker)'>Disconnect? New meetings can’t be scheduled.</span>
              <Button
                variant='primary'
                size='medium'
                type='button'
                disabled={busy !== null}
                onClick={async () => {
                  await disconnect();
                  setConfirmingDisconnect(false);
                }}
              >
                {busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
              </Button>
              <Button variant='text' size='medium' type='button' onClick={() => setConfirmingDisconnect(false)} disabled={busy !== null}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
