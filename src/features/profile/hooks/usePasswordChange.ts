'use client';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Profile } from '@/types';
import type { Flash } from './useFlash';

export function usePasswordChange(profile: Profile | null, flash: Flash) {
  // Security
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  // ── Change password ── saved by its own "Change Password" button ──────────

  // The backend's password route doesn't check the old password, so we verify it
  // first by trying to log in with the user's email + old password.
  // Returns true if the password is correct, false if it's wrong.
  async function verifyOldPassword(password: string): Promise<boolean> {
    try {
      await api.public.post(
        '/auth/login',
        { email: profile?.email, password },
        { credentials: 'include' },
      );
      // 200 = correct password (including "2FA code required" responses).
      return true;
    } catch (err) {
      if (err instanceof ApiError && [400, 401, 403].includes(err.status)) return false;
      throw new Error('Unable to verify your old password. Please try again.');
    }
  }

  async function changePassword() {
    if (pwSaving || !profile) return;

    const { current_password, new_password, confirm } = pwForm;

    let error = '';
    if (!current_password) error = 'Enter your old password.';
    else if (!new_password) error = 'Enter a new password.';
    else if (new_password.length < 8) error = 'New password must be at least 8 characters.';
    else if (!/[A-Za-z]/.test(new_password) || !/\d/.test(new_password))
      error = 'New password must contain at least one letter and one number.';
    else if (new_password === current_password) error = 'New password must be different from the old password.';
    else if (!confirm) error = 'Confirm your new password.';
    else if (new_password !== confirm) error = 'Passwords do not match.';

    if (error) {
      setPwError(error);
      return;
    }

    setPwSaving(true);
    setPwError('');
    try {
      const oldPasswordCorrect = await verifyOldPassword(current_password);
      if (!oldPasswordCorrect) {
        setPwError('Old password is incorrect.');
        return;
      }

      await api.put('/auth/password', { current_password, new_password });
      setPwForm({ current_password: '', new_password: '', confirm: '' });
      flash('Password changed successfully.');
    } catch (err) {
      console.error('Password change failed:', err);
      setPwError(err instanceof Error && err.message ? err.message : 'Unable to change password.');
    } finally {
      setPwSaving(false);
    }
  }

  function updatePw(field: 'current_password' | 'new_password' | 'confirm', value: string) {
    setPwForm(prev => ({ ...prev, [field]: value }));
    setPwError('');
  }

  return {
    pwForm,
    pwSaving,
    pwError,
    changePassword,
    updatePw,
  };
}

export type PasswordChangeState = ReturnType<typeof usePasswordChange>;
