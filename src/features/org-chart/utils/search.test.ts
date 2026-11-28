import { describe, expect, it } from 'vitest';
import { member, smallTeam } from '../fixtures';
import { searchMembers } from './search';

const names = (q: string, rows = smallTeam, limit?: number) =>
  searchMembers(rows, q, limit).map((m) => m.name);

describe('searchMembers', () => {
  it('returns nothing for an empty or blank query', () => {
    expect(names('')).toEqual([]);
    expect(names('   ')).toEqual([]);
  });

  it('is case-insensitive and ignores surrounding spaces', () => {
    expect(names('  JOHN ')).toEqual(['John Doe']);
  });

  it('ranks name prefix, then word prefix, then substring, then title', () => {
    const rows = [
      member(1, 'Sharma Tech', null, { designation: 'Ops' }), // name prefix
      member(2, 'Aarav Sharma'), // word prefix
      member(3, 'Kusharman Rai'), // substring
      member(4, 'Hari Bista', null, { designation: 'Sharma Liaison' }), // title only
    ];
    expect(names('sharma', rows)).toEqual([
      'Sharma Tech',
      'Aarav Sharma',
      'Kusharman Rai',
      'Hari Bista',
    ]);
  });

  it('breaks ties by name', () => {
    expect(names('sharma')).toEqual(['Aarav Sharma', 'Bishal Sharma']);
  });

  it('matches job titles', () => {
    expect(names('developer')).toEqual(['John Doe', 'Priya Thapa']);
  });

  it('ignores accents', () => {
    expect(names('jose', [member(1, 'José García')])).toEqual(['José García']);
  });

  it('caps the number of results', () => {
    expect(names('a', smallTeam, 3)).toHaveLength(3);
  });

  it('treats regex characters literally', () => {
    expect(names('.*')).toEqual([]);
  });
});
