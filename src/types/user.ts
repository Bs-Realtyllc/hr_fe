import type { Role } from './employee';

/** The signed-in user, as returned by /auth/login and stored by lib/auth. */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  designation?: string;
  department?: string;
}
