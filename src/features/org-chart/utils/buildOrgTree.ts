import type { OrgChartMember, OrgNode, OrgTree } from '../types';

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const optString = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/**
 * Validates the raw GET /org-chart response. Rows that are not usable
 * (missing id or name) are dropped instead of crashing the chart, and
 * optional fields of the wrong type become null.
 */
export function parseOrgChart(raw: unknown): OrgChartMember[] {
  if (!Array.isArray(raw)) return [];
  const rows: OrgChartMember[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    if (!isInt(o.id) || typeof o.name !== 'string' || !o.name.trim()) continue;
    rows.push({
      id: o.id,
      name: o.name.trim(),
      profile_picture: optString(o.profile_picture),
      designation: optString(o.designation),
      department_id: isInt(o.department_id) ? o.department_id : null,
      department: optString(o.department),
      manager_id: isInt(o.manager_id) ? o.manager_id : null,
      status: typeof o.status === 'string' ? o.status : 'active',
    });
  }
  return rows;
}

const byName = (a: OrgNode, b: OrgNode) =>
  a.member.name.localeCompare(b.member.name, undefined, { sensitivity: 'base' }) ||
  a.member.id - b.member.id;

/**
 * Builds the reporting tree from the flat member list.
 *
 * Defensive against bad data even though the backend cleans it:
 *  - duplicate ids: the first row wins
 *  - manager not in the list, or self-managed: the person becomes a root
 *  - reporting cycles: the link that closes the cycle is dropped
 * Everything is iterative, so a very deep chain cannot overflow the stack.
 */
export function buildOrgTree(members: readonly OrgChartMember[]): OrgTree {
  const byId = new Map<number, OrgNode>();
  for (const member of members) {
    if (byId.has(member.id)) continue;
    byId.set(member.id, { member, children: [], depth: 0, directCount: 0, totalCount: 0 });
  }

  // Resolve each person's effective manager id (null = root).
  const managerOf = new Map<number, number | null>();
  for (const node of byId.values()) {
    const m = node.member.manager_id;
    managerOf.set(node.member.id, m != null && m !== node.member.id && byId.has(m) ? m : null);
  }

  // Break cycles: walk up from each person; a repeat means a loop.
  // Colour marks: 1 = on the current walk, 2 = known to reach a root.
  const state = new Map<number, 1 | 2>();
  for (const start of byId.keys()) {
    const path: number[] = [];
    let cur: number | null = start;
    while (cur != null && !state.has(cur)) {
      state.set(cur, 1);
      path.push(cur);
      cur = managerOf.get(cur) ?? null;
    }
    if (cur != null && state.get(cur) === 1) {
      // `cur` is on this walk, so the last person on the path points back
      // into it: cut that link to make them a root.
      managerOf.set(path[path.length - 1], null);
    }
    for (const id of path) state.set(id, 2);
  }

  const roots: OrgNode[] = [];
  for (const [id, managerId] of managerOf) {
    const node = byId.get(id)!;
    if (managerId == null) roots.push(node);
    else byId.get(managerId)!.children.push(node);
  }

  // Top-down pass: sort children, set depth, record visit order.
  roots.sort(byName);
  const order: OrgNode[] = [];
  const stack = [...roots].reverse();
  let levels = 0;
  while (stack.length) {
    const node = stack.pop()!;
    order.push(node);
    levels = Math.max(levels, node.depth + 1);
    node.children.sort(byName);
    node.directCount = node.children.length;
    for (let i = node.children.length - 1; i >= 0; i--) {
      node.children[i].depth = node.depth + 1;
      stack.push(node.children[i]);
    }
  }

  // Bottom-up pass: children are always visited after their parent.
  for (let i = order.length - 1; i >= 0; i--) {
    const node = order[i];
    node.totalCount = node.children.reduce((sum, c) => sum + 1 + c.totalCount, 0);
  }

  const departments = new Set<string>();
  for (const node of byId.values()) {
    const key = node.member.department_id ?? node.member.department;
    if (key != null) departments.add(String(key));
  }

  return { roots, byId, stats: { people: byId.size, levels, departments: departments.size } };
}
