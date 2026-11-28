import { BACKEND_URL } from '@/config/env';
import type { TwoFactorSetupData } from './components/security/TwoFactor';

// "Member since" date, matching the mock's "September 30, 2026" format.
export function formatJoinDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Label for employees.role (admin/lead/employee/intern).
export const ACCESS_ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  lead: 'Team Lead',
  employee: 'Employee',
  intern: 'Intern',
};
export const ACCESS_ROLE_OPTIONS = Object.entries(ACCESS_ROLE_LABELS).map(([value, label]) => ({ value, label }));

// Fields edited in the Personal Info form and compared against the saved profile.
export const PERSONAL_FIELDS = ['name', 'email', 'phone'] as const;

export function avatarUrl(filename: string | null) {
  if (!filename) return null;
  return `${BACKEND_URL}/uploads/profile/photo/${filename}`;
}

// Adds a version query so the browser shows the new photo even if the
// backend saves it under the same filename (otherwise the old one stays cached).
export function freshAvatarUrl(filename: string | null) {
  const url = avatarUrl(filename);
  return url ? `${url}?v=${Date.now()}` : null;
}

// The backend may answer in camelCase or snake_case; accept both.
/* eslint-disable @typescript-eslint/no-explicit-any */
export function normalizeSetup(data: any): TwoFactorSetupData {
  return {
    secret: data?.secret ?? data?.base32 ?? '',
    otpauthUrl: data?.otpauthUrl ?? data?.otpauth_url ?? '',
    qrDataUrl: data?.qrDataUrl ?? data?.qr_data_url ?? data?.qrCode ?? data?.qr_code ?? '',
  };
}

export function extractEnabled(data: any): boolean {
  return Boolean(data?.enabled ?? data?.twoFactorEnabled ?? data?.two_factor_enabled ?? data?.is_enabled ?? false);
}

export function extractBackupCodes(data: any): string[] {
  const codes = data?.backupCodes ?? data?.backup_codes ?? data?.codes;
  return Array.isArray(codes) ? codes.map(String) : [];
}
/* eslint-enable @typescript-eslint/no-explicit-any */
