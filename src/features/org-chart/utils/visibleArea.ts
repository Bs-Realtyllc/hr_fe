/** Screen rectangle, e.g. from getBoundingClientRect(). */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The person details panel floats over the chart (side panel or bottom sheet). */
const PANEL_SELECTOR = '.org-panel';

export function coveringPanelRect(): Box | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector(PANEL_SELECTOR)?.getBoundingClientRect() ?? null;
}

const area = (b: Box) => Math.max(0, b.right - b.left) * Math.max(0, b.bottom - b.top);

/**
 * How far the centre of the part of `container` that `cover` leaves visible
 * is from the container's own centre. Add it to a "centre on this" target so
 * the item lands beside or above the panel instead of under it.
 */
export function visibleCentreOffset(container: Box, cover: Box | null): { dx: number; dy: number } {
  const none = { dx: 0, dy: 0 };
  if (!cover) return none;
  const overlaps =
    cover.left < container.right &&
    cover.right > container.left &&
    cover.top < container.bottom &&
    cover.bottom > container.top;
  if (!overlaps) return none;

  // The open strips around the panel; the biggest one is where to centre.
  const strips: Box[] = [
    { ...container, right: Math.min(cover.left, container.right) }, // left of it
    { ...container, left: Math.max(cover.right, container.left) }, // right of it
    { ...container, bottom: Math.min(cover.top, container.bottom) }, // above it
    { ...container, top: Math.max(cover.bottom, container.top) }, // below it
  ];
  const best = strips.reduce((a, b) => (area(b) > area(a) ? b : a));
  if (area(best) === 0) return none;

  return {
    dx: (best.left + best.right) / 2 - (container.left + container.right) / 2,
    dy: (best.top + best.bottom) / 2 - (container.top + container.bottom) / 2,
  };
}
