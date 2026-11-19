'use client';
import {
  TwoFactorModal,
  TwoFactorSetup,
  TwoFactorVerify,
  TwoFactorBackupCodes,
  TwoFactorDisable,
} from './security/TwoFactor';
import type { TwoFactorState } from '../hooks/useTwoFactor';

/** The enable/disable 2FA wizard (intro → scan → backup codes, or disable). */
export default function TwoFactorFlow({ twoFactor }: { twoFactor: TwoFactorState }) {
  const { showTwoFactorSetup, twoFactorStep, twoFactorLoading, twoFactorError, setTwoFactorError, setupData, otp, setOtp, disablePassword, setDisablePassword, backupCodes, startTwoFactorSetup, confirmTwoFactorSetup, confirmDisableTwoFactor, closeTwoFactorModal } = twoFactor;
  if (!showTwoFactorSetup) return null;
  return (
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
  );
}
