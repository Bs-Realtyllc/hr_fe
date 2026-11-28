import AppShell from '@/components/layout/AppShell';

// Every route in the (app) group requires a signed-in user and renders inside
// the shell (sidebar, mobile top bar, clock widget). Pages that must work
// signed out belong in (auth) or (public) instead.
export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
