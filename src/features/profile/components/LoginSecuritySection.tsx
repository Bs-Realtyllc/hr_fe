'use client';
import { BSRealtyToggle } from '@bsrealtyllc/design-system';
import Button from '@/components/ui/Button/Button';
import type { TwoFactorState } from '../hooks/useTwoFactor';
import type { LoginHistoryState } from '../hooks/useLoginHistory';
import type { TrustedDevicesState } from '../hooks/useTrustedDevices';

// Shared by the admin Security tab and the non-admin Security tab — every
// role can manage its own 2FA, login sessions, and trusted devices.
export default function LoginSecuritySection({ twoFactor, loginHistory, trustedDevices }: { twoFactor: TwoFactorState; loginHistory: LoginHistoryState; trustedDevices: TrustedDevicesState }) {
  const { twoFactorEnabled, twoFactorStatusLoaded, twoFactorLoading, handleTwoFactorToggle } = twoFactor;
  const { openLoginHistory } = loginHistory;
  const { openTrustedDevices } = trustedDevices;
  return (
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
        {twoFactorEnabled && (
          <div className='flex justify-between'>
            <div>
              <p className='text-[16px] font-semibold text-(--gray-darker)'>Trusted Devices</p>
              <p className='text-[14px] font-medium text-(--soft-white-dark-active)'>Devices that skip the authenticator code for 30 days.</p>
            </div>
            <Button variant='primary' size='medium' type='button' onClick={openTrustedDevices}>Manage</Button>
          </div>
        )}
      </div>
    </div>
  );
}
