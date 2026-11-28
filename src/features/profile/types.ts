// Types used only by the profile feature.

// Steps of the 2FA modal:
//  intro   -> "Set up two-factor authentication" screen (TwoFactorSetup)
//  scan    -> QR code + 6-digit code to confirm
//  backup  -> one-time backup codes returned by /auth/2fa/enable
//  disable -> confirm turning 2FA off with a current authenticator code
export type TwoFactorStep = 'intro' | 'scan' | 'backup' | 'disable';

/** Admin profile tabs. 'integrations' is admin-only (company Google Calendar). */
export type Tab = 'personal' | 'organization' | 'security' | 'notification' | 'integrations';

export type EmployeeTab = 'personal' | 'employment' | 'bank' | 'documents' | 'security' | 'notification' | 'organization';

// Matches the NotificationPreference schema in swagger.ts — the backend
// already filters this list to the types relevant to the caller's role.
export interface NotificationPreference {
  type: string;
  group: 'security' | 'email';
  label: string;
  description?: string;
  enabled: boolean;
}

// Matches the TeamAccessMember schema in swagger.ts.
export interface TeamAccessMember {
  id: number;
  name: string;
  email: string;
  designation: string | null;
  role: string;
  status: string;
  start_date: string | null;
}
