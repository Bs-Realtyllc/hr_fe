import { describe, expect, it } from 'vitest';
import { member } from '../fixtures';
import {
  DEPARTMENT_COLORS,
  departmentColor,
  departmentKey,
  departmentName,
  UNASSIGNED_KEY,
  UNASSIGNED_TEAM,
} from './department';

describe('departmentKey / departmentName', () => {
  it('uses the id when there is one', () => {
    const m = member(1, 'A', null, { department_id: 3, department: 'IT' });
    expect(departmentKey(m)).toBe('id:3');
    expect(departmentName(m)).toBe('IT');
  });

  it('falls back to the trimmed, case-insensitive name', () => {
    expect(departmentKey(member(1, 'A', null, { department: ' Sales ' }))).toBe('name:sales');
  });

  it('treats no department as Unassigned', () => {
    expect(departmentKey(member(1, 'A'))).toBe(UNASSIGNED_KEY);
    expect(departmentName(member(1, 'A'))).toBe(UNASSIGNED_TEAM);
  });

  it('names a department that has an id but no name', () => {
    expect(departmentName(member(1, 'A', null, { department_id: 7 }))).toBe('Department 7');
  });
});

describe('departmentColor', () => {
  it('is stable for the same department and in range', () => {
    const a = member(1, 'A', null, { department_id: 2, department: 'IT' });
    const b = member(2, 'B', null, { department_id: 2, department: 'IT' });
    expect(departmentColor(a)).toBe(departmentColor(b));
    for (let id = 1; id < 50; id++) {
      const c = departmentColor(member(id, 'X', null, { department_id: id }));
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(DEPARTMENT_COLORS);
    }
  });

  it('spreads departments across the colours', () => {
    const used = new Set(
      Array.from({ length: 12 }, (_, i) =>
        departmentColor(member(i, 'X', null, { department_id: i + 1 })),
      ),
    );
    expect(used.size).toBe(DEPARTMENT_COLORS);
  });
});
