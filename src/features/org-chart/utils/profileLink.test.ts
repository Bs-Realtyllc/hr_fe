import { describe, expect, it } from 'vitest';
import { profileHrefFor } from './profileLink';

describe('profileHrefFor', () => {
  it('hides the link when nobody is signed in', () => {
    expect(profileHrefFor(null, 5)).toBeNull();
  });

  it('sends everyone to /profile for their own card', () => {
    for (const role of ['admin', 'lead', 'employee', 'intern'] as const) {
      expect(profileHrefFor({ id: 5, role }, 5)).toBe('/profile');
    }
  });

  it.each(['admin', 'lead', 'intern'] as const)('lets %s open other employee pages', (role) => {
    expect(profileHrefFor({ id: 1, role }, 5)).toBe('/employees/5');
  });

  it('does not link other people for the employee role (the page is not theirs to open)', () => {
    expect(profileHrefFor({ id: 1, role: 'employee' }, 5)).toBeNull();
  });
});
