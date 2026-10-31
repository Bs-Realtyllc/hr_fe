// Hands the 2FA login challenge from the login page to /two-factor-auth.
// sessionStorage keeps it per-tab and clears it when the tab closes.

const KEY = "twoFactorChallenge";
const MAX_AGE_MS = 10 * 60 * 1000; // temp tokens are short-lived; drop stale ones

export interface TwoFactorChallenge {
  tempToken: string;
  email: string;
  savedAt: number;
}

export function saveTwoFactorChallenge(c: Omit<TwoFactorChallenge, "savedAt">) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...c, savedAt: Date.now() }));
  } catch {
    /* storage blocked */
  }
}

export function readTwoFactorChallenge(): TwoFactorChallenge | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as TwoFactorChallenge;
    if (!c.tempToken || Date.now() - c.savedAt > MAX_AGE_MS) {
      clearTwoFactorChallenge();
      return null;
    }
    return c;
  } catch {
    return null;
  }
}

export function clearTwoFactorChallenge() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* storage blocked */
  }
}
