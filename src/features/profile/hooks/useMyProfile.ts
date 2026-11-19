'use client';
import { useEffect, useRef, useState } from 'react';
import { employeesApi } from '@/lib/queries/employees';
import { api, errorMessage } from '@/lib/api';
import type { Profile } from '@/types';
import { profileService } from '../api/profileService';
import { PERSONAL_FIELDS, freshAvatarUrl } from '../utils';
import type { Flash } from './useFlash';

export function useMyProfile(flash: Flash, clearFlash: () => void) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  // Personal info form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
  });
  const [isNameEdit, setIsNameEdit] = useState(false)
  const [isEmailEdit, setIsEmailEdit] = useState(false)
  const [isPhoneEdit, setIsPhoneEdit] = useState(false)

  // Profile photo upload (ID documents are handled by EmployeeDocuments)
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  // ── Show profile ───────────────────────────────────────────────────────────
  // fresh: bypass the cache (after a save); otherwise reuse a recent read.
  const load = async ({ fresh = false }: { fresh?: boolean } = {}) => {
    setLoadError('');
    try {
      const p = fresh ? await profileService.refreshProfile() : await profileService.getProfile();

      setProfile(p);
      setForm({
        name: p.name || '',
        email: p.email || '',
        phone: p.phone || '',
        role: p.role || '',
      });
      setPhotoPreview(freshAvatarUrl(p.profile_picture));
    } catch (err) {
      // 401s are still handled by api.ts; anything else is shown with a retry button.
      setLoadError(err instanceof Error && err.message ? err.message : 'Unable to load your profile.');
    }
  };

  // ── Update personal info (name, email, phone, role) ── "Save Changes" ─────
  async function savePersonal(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !profile) return;

    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    // Validate first, before anything is sent to the backend.
    if (!name) {
      flash('Full name is required.', 'err');
      return;
    }
    if (!email) {
      flash('Email is required.', 'err');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      flash('Enter a valid email address.', 'err');
      return;
    }
    // Phone is optional, but if filled it must look like a phone number.
    // Allows optional country code (+ followed by 1-3 digits) and a 10-digit number
    const phoneRegex = /^\d{3}[-\s]?\d{3}[-\s]?\d{4}$/;

    if (phone && !phoneRegex.test(phone)) {
      flash('Enter a valid 10-digit phone number.', 'err');
      return;
    }

    const hasChanges = PERSONAL_FIELDS.some(
      (key) => form[key].trim() !== (profile[key] ?? '').trim()
    );
    if (!hasChanges) {
      flash('No changes to save.');
      return;
    }

    // Phone is sent even when empty so the user can clear it.
    const payload: Record<string, string> = { name, email, phone };

    setSaving(true);
    clearFlash();
    try {
      await api.put('/profile', payload);
      await employeesApi.invalidate(); // name/email/phone show in rosters
      await load({ fresh: true }); // refresh the header card and form from the saved data
      flash('Profile updated successfully.');
    } catch (err) {
      console.error('Profile update failed:', err);
      flash(err instanceof Error && err.message ? err.message : 'Failed to update profile.', 'err');
    } finally {
      setSaving(false);
    }
  }

  // ── Profile photo ── uploads as soon as a file is picked ─────────────────
  // Refresh only the photo, so unsaved edits in the name/email fields are kept.
  async function refreshPhoto() {
    try {
      const p = await profileService.refreshProfile();
      setProfile(prev => (prev ? { ...prev, profile_picture: p.profile_picture } : p));
      setPhotoPreview(freshAvatarUrl(p.profile_picture));
    } catch { /* keep current preview */ }
  }

  async function uploadPhoto(file: File) {
    const fd = new FormData();
    fd.append('photo', file);
    setUploading(u => ({ ...u, photo: true }));
    try {
      await api.postForm('/profile/photo', fd);
      flash('Profile photo updated.');
      await refreshPhoto();
    } catch (err) {
      flash(errorMessage(err, 'Upload failed. Max 5 MB, images only.'), 'err');
      // Put the old photo back, since the new one wasn't saved.
      setPhotoPreview(freshAvatarUrl(profile?.profile_picture ?? null));
    } finally {
      setUploading(u => ({ ...u, photo: false }));
    }
  }

  // Removes the saved photo on the backend (adjust the path if yours differs).
  async function deletePhoto() {
    if (!profile?.profile_picture || uploading.photo) return;
    setUploading(u => ({ ...u, photo: true }));
    try {
      await api.delete('/profile/photo');
      setProfile(prev => (prev ? { ...prev, profile_picture: '' } : prev));
      await profileService.invalidateProfile();
      setPhotoPreview(null);
      flash('Profile photo removed.');
    } catch (err) {
      flash(err instanceof Error && err.message ? err.message : 'Unable to remove photo.', 'err');
    } finally {
      setUploading(u => ({ ...u, photo: false }));
    }
  }

  function handlePhotoChange() {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset the input so choosing the same file again still triggers onChange.
      e.target.value = '';
      if (!file) return;

      // Validate before uploading.
      if (!file.type.startsWith('image/')) {
        flash('Please choose an image file.', 'err');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        flash('Image must be 5 MB or smaller.', 'err');
        return;
      }

      // Show the new image right away, then upload it.
      setPhotoPreview(URL.createObjectURL(file));
      uploadPhoto(file);
    };
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = !!profile && PERSONAL_FIELDS.some(
    (key) => form[key].trim() !== (profile[key] ?? '').trim()
  );

  return {
    profile,
    loadError,
    saving,
    form,
    setForm,
    isNameEdit,
    setIsNameEdit,
    isEmailEdit,
    setIsEmailEdit,
    isPhoneEdit,
    setIsPhoneEdit,
    photoRef,
    photoPreview,
    uploading,
    load,
    savePersonal,
    deletePhoto,
    handlePhotoChange,
    isDirty,
  };
}

export type MyProfileState = ReturnType<typeof useMyProfile>;
