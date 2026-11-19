'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { TwoFactorSetupData } from '../components/security/TwoFactor';
import type { TwoFactorStep } from '../types';
import { extractBackupCodes, extractEnabled, normalizeSetup } from '../utils';
import type { Flash } from './useFlash';

export function useTwoFactor(flash: Flash) {
  // Two-factor authentication state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorStatusLoaded, setTwoFactorStatusLoaded] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<TwoFactorStep>('intro');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [otp, setOtp] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const loadTwoFactorStatus = async () => {
    try {
      const status = await api.get<unknown>('/auth/2fa/status');
      setTwoFactorEnabled(extractEnabled(status));
    } catch {
      /* keep the toggle off if status can't be read */
    } finally {
      setTwoFactorStatusLoaded(true);
    }
  };

  // ── Two-factor authentication ──────────────────────────────────────────────

  // Toggle click: OFF -> ON opens the setup intro, ON -> OFF opens the disable confirm.
  function handleTwoFactorToggle() {
    if (twoFactorLoading) return;
    setOtp('');
    setDisablePassword('');
    setTwoFactorError('');
    setSetupData(null);
    setBackupCodes([]);
    setTwoFactorStep(twoFactorEnabled ? 'disable' : 'intro');
    setShowTwoFactorSetup(true);
  }

  // Intro "Setup 2FA" button: ask the backend for a TOTP secret + QR code.
  async function startTwoFactorSetup() {
    if (twoFactorEnabled || twoFactorLoading) return;

    setTwoFactorLoading(true);
    setTwoFactorError('');
    setOtp('');

    try {
      const data = await api.post<unknown>('/auth/2fa/setup', {});
      const normalized = normalizeSetup(data);
      if (!normalized.qrDataUrl && !normalized.secret) throw new Error('Empty setup response');
      setSetupData(normalized);
      setTwoFactorStep('scan');
    } catch {
      setTwoFactorError('Unable to start 2FA setup. Please try again.');
    } finally {
      setTwoFactorLoading(false);
    }
  }

  // Verify the authenticator code and enable 2FA.
  async function confirmTwoFactorSetup() {
    if (!/^\d{6}$/.test(otp)) {
      setTwoFactorError('Enter a valid 6-digit authentication code.');
      return;
    }

    if (!setupData || twoFactorLoading) return;

    setTwoFactorLoading(true);
    setTwoFactorError('');

    try {
      const res = await api.post<unknown>('/auth/2fa/enable', {
        code: otp,
        secret: setupData.secret,
      });

      // Change the toggle only after the backend confirms success.
      setTwoFactorEnabled(true);
      setSetupData(null);
      setOtp('');

      const codes = extractBackupCodes(res);
      if (codes.length) {
        setBackupCodes(codes);
        setTwoFactorStep('backup');
      } else {
        setShowTwoFactorSetup(false);
        flash('Two-factor authentication enabled successfully.');
      }

      // Re-sync the persisted status.
      await loadTwoFactorStatus();
    } catch {
      setTwoFactorError('Invalid code or unable to enable 2FA.');
    } finally {
      setTwoFactorLoading(false);
    }
  }

  // Turn 2FA off: the backend requires the account password AND a current authenticator code.
  async function confirmDisableTwoFactor() {
    if (!disablePassword) {
      setTwoFactorError('Enter your account password.');
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setTwoFactorError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    if (twoFactorLoading) return;

    setTwoFactorLoading(true);
    setTwoFactorError('');

    try {
      await api.delete('/auth/2fa/disable', { password: disablePassword, code: otp });
      setTwoFactorEnabled(false);
      setShowTwoFactorSetup(false);
      setOtp('');
      setDisablePassword('');
      flash('Two-factor authentication disabled.');
      await loadTwoFactorStatus();
    } catch (err) {
      console.error('2FA disable failed:', err);
      setTwoFactorError(err instanceof Error && err.message ? err.message : 'Unable to disable 2FA.');
    } finally {
      setTwoFactorLoading(false);
    }
  }

  function closeTwoFactorModal() {
    if (twoFactorLoading) return;

    const finishedWithBackupCodes = twoFactorStep === 'backup';
    setShowTwoFactorSetup(false);
    setSetupData(null);
    setOtp('');
    setDisablePassword('');
    setTwoFactorError('');
    setBackupCodes([]);
    if (finishedWithBackupCodes) flash('Two-factor authentication enabled successfully.');
  }

  // Close the 2FA modal with Escape (except mid-request or while showing backup codes).
  useEffect(() => {
    if (!showTwoFactorSetup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && twoFactorStep !== 'backup') closeTwoFactorModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    loadTwoFactorStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    twoFactorEnabled,
    twoFactorStatusLoaded,
    showTwoFactorSetup,
    twoFactorStep,
    twoFactorLoading,
    twoFactorError,
    setTwoFactorError,
    setupData,
    otp,
    setOtp,
    disablePassword,
    setDisablePassword,
    backupCodes,
    handleTwoFactorToggle,
    startTwoFactorSetup,
    confirmTwoFactorSetup,
    confirmDisableTwoFactor,
    closeTwoFactorModal,
  };
}

export type TwoFactorState = ReturnType<typeof useTwoFactor>;
