// Query keys for the profile feature. Every cached read and every
// invalidation uses these, so a typo can't split the cache in two.
export const profileKeys = {
  /** GET /profile — the signed-in user's own record. */
  me: ['profile'] as const,
};
