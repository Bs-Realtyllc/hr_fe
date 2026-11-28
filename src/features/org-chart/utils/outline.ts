import type { ChartItem } from './chartItems';

/** One visible line of the Outline view. */
export interface OutlineRow {
  item: ChartItem;
  /** 1-based, as aria-level wants. */
  level: number;
  /** Position among siblings (1-based) and number of siblings, for aria-posinset/setsize. */
  posInSet: number;
  setSize: number;
  parentId: string | null;
  hasChildren: boolean;
  expanded: boolean;
}

/**
 * The rows a reader can currently see, top to bottom: every item whose
 * ancestors are all expanded. Iterative, so deep trees are safe.
 */
export function visibleRows(
  roots: readonly ChartItem[],
  collapsed: ReadonlySet<string>,
): OutlineRow[] {
  const rows: OutlineRow[] = [];
  type Frame = {
    item: ChartItem;
    level: number;
    pos: number;
    size: number;
    parentId: string | null;
  };
  const stack: Frame[] = [];
  const pushChildren = (list: readonly ChartItem[], level: number, parentId: string | null) => {
    for (let i = list.length - 1; i >= 0; i--) {
      stack.push({ item: list[i], level, pos: i + 1, size: list.length, parentId });
    }
  };
  pushChildren(roots, 1, null);
  while (stack.length) {
    const { item, level, pos, size, parentId } = stack.pop()!;
    const hasChildren = item.children.length > 0;
    const expanded = hasChildren && !collapsed.has(item.id);
    rows.push({ item, level, posInSet: pos, setSize: size, parentId, hasChildren, expanded });
    if (expanded) pushChildren(item.children, level + 1, item.id);
  }
  return rows;
}

/** Every item id that has children: "Collapse all" collapses these. */
export function allParentIds(roots: readonly ChartItem[]): Set<string> {
  const ids = new Set<string>();
  const stack = [...roots];
  while (stack.length) {
    const item = stack.pop()!;
    if (item.children.length) {
      ids.add(item.id);
      stack.push(...item.children);
    }
  }
  return ids;
}
