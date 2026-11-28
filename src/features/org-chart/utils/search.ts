import type { OrgChartMember } from '../types';

const norm = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // "José" matches "jose"
    .toLowerCase()
    .trim();

/**
 * People whose name or job title matches `query`, best matches first:
 * name starts with it → a word of the name starts with it → name contains
 * it → title contains it. Ties are broken by name. Empty query → [].
 */
export function searchMembers(
  members: Iterable<OrgChartMember>,
  query: string,
  limit = 8,
): OrgChartMember[] {
  const q = norm(query);
  if (!q) return [];

  const scored: { m: OrgChartMember; score: number }[] = [];
  for (const m of members) {
    const name = norm(m.name);
    const title = m.designation ? norm(m.designation) : '';
    let score = -1;
    if (name.startsWith(q)) score = 0;
    else if (name.split(/\s+/).some((w) => w.startsWith(q))) score = 1;
    else if (name.includes(q)) score = 2;
    else if (title.includes(q)) score = 3;
    if (score >= 0) scored.push({ m, score });
  }

  scored.sort(
    (a, b) =>
      a.score - b.score || a.m.name.localeCompare(b.m.name, undefined, { sensitivity: 'base' }),
  );
  return scored.slice(0, limit).map((s) => s.m);
}
