import { BACKEND_URL } from '@/config/env';

/** Up to two initials, robust to extra spaces: "  aarav  sharma " → "AS". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/**
 * Public URL of a profile photo, or null. The filename comes from the
 * backend; it is URL-encoded and rejected if it tries to leave the folder.
 */
export function photoUrl(filename: string | null): string | null {
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return null;
  }
  return `${BACKEND_URL}/uploads/profile/photo/${encodeURIComponent(filename)}`;
}

/** "1 direct · 3 total", or null for someone with no reports. */
export function reportsLabel(directCount: number, totalCount: number): string | null {
  if (directCount === 0) return null;
  return `${directCount} direct · ${totalCount} total`;
}
