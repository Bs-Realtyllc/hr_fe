import { describe, expect, it } from 'vitest';
import { visibleCentreOffset } from './visibleArea';

// A 720×800 chart, like a 768px-wide tablet.
const chart = { left: 24, top: 200, right: 744, bottom: 1000 };

describe('visibleCentreOffset', () => {
  it('is zero with no panel', () => {
    expect(visibleCentreOffset(chart, null)).toEqual({ dx: 0, dy: 0 });
  });

  it('is zero when the panel is outside the chart', () => {
    const panel = { left: 800, top: 200, right: 1100, bottom: 1000 };
    expect(visibleCentreOffset(chart, panel)).toEqual({ dx: 0, dy: 0 });
  });

  it('moves left of a side panel', () => {
    const panel = { left: 384, top: 96, right: 744, bottom: 1000 };
    // Visible strip is 24..384, centre 204; chart centre is 384.
    expect(visibleCentreOffset(chart, panel)).toEqual({ dx: -180, dy: 0 });
  });

  it('moves above a bottom sheet', () => {
    const panel = { left: 8, top: 600, right: 760, bottom: 1016 };
    // Visible strip is 200..600, centre 400; chart centre is 600.
    expect(visibleCentreOffset(chart, panel)).toEqual({ dx: 0, dy: -200 });
  });

  it('is zero when the panel covers everything', () => {
    const panel = { left: 0, top: 0, right: 2000, bottom: 2000 };
    expect(visibleCentreOffset(chart, panel)).toEqual({ dx: 0, dy: 0 });
  });
});
