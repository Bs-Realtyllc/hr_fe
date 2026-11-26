import { describe, expect, it } from 'vitest';
import { BACKEND_URL } from '@/config/env';
import { initials, photoUrl, reportsLabel } from './person';

describe('initials', () => {
  it.each([
    ['Aarav Sharma', 'AS'],
    ['  aarav   sharma  ', 'AS'],
    ['Madonna', 'M'],
    ['Anna Maria van der Berg', 'AB'],
    ['', '?'],
    ['   ', '?'],
  ])('%j → %s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});

describe('photoUrl', () => {
  it('builds the public photo URL and encodes the filename', () => {
    expect(photoUrl('me photo.jpg')).toBe(`${BACKEND_URL}/uploads/profile/photo/me%20photo.jpg`);
  });

  it.each([null, '', '../secret.pdf', 'a/b.jpg', 'a\\b.jpg', '..'])('rejects %j', (name) => {
    expect(photoUrl(name)).toBeNull();
  });
});

describe('reportsLabel', () => {
  it('is null for someone with no reports', () => {
    expect(reportsLabel(0, 0)).toBeNull();
  });
  it('shows direct and total counts', () => {
    expect(reportsLabel(2, 5)).toBe('2 direct · 5 total');
  });
});
