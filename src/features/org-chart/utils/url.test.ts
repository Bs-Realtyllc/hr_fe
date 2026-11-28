import { describe, expect, it } from 'vitest';
import { orgChartSearch, parseOrgChartParams } from './url';

const parse = (qs: string) => parseOrgChartParams(new URLSearchParams(qs));

describe('parseOrgChartParams', () => {
  it('defaults to People with no one open', () => {
    expect(parse('')).toEqual({ view: 'people', personId: null });
  });

  it('reads the view and person', () => {
    expect(parse('view=teams&person=12')).toEqual({ view: 'teams', personId: 12 });
    expect(parse('view=outline')).toEqual({ view: 'outline', personId: null });
  });

  it.each(['view=admin', 'view=', 'view=TEAMS'])('ignores an unknown view (%s)', (qs) => {
    expect(parse(qs).view).toBe('people');
  });

  it.each([
    'person=abc',
    'person=-3',
    'person=0',
    'person=1.5',
    'person=1e3',
    'person=99999999999',
    'person=12<script>',
  ])('ignores a bad person id (%s)', (qs) => {
    expect(parse(qs).personId).toBeNull();
  });
});

describe('orgChartSearch', () => {
  it('leaves defaults out of the URL', () => {
    expect(orgChartSearch({ view: 'people', personId: null })).toBe('');
  });

  it('writes view and person', () => {
    expect(orgChartSearch({ view: 'teams', personId: 12 })).toBe('?view=teams&person=12');
  });

  it('keeps unrelated params and removes cleared ones', () => {
    expect(
      orgChartSearch({ view: 'people', personId: null }, '?view=teams&person=4&ref=mail'),
    ).toBe('?ref=mail');
  });

  it('round-trips', () => {
    const state = { view: 'outline' as const, personId: 7 };
    expect(parse(orgChartSearch(state).slice(1))).toEqual(state);
  });
});
