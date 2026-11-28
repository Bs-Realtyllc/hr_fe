import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NodeToggle from './NodeToggle';
import { OrgChartContext } from './OrgChartContext';

function renderToggle(props: Partial<Parameters<typeof NodeToggle>[0]> = {}) {
  const toggle = vi.fn();
  render(
    <OrgChartContext.Provider
      value={{
        currentUserId: null,
        highlightedId: null,
        toggle,
        showDepartment: true,
        selectedEmployeeId: null,
      }}
    >
      <NodeToggle
        id="2"
        label="Aarav Sharma"
        childCount={2}
        collapsed={false}
        hiddenCount={0}
        {...props}
      />
    </OrgChartContext.Provider>,
  );
  return toggle;
}

describe('NodeToggle', () => {
  it('renders nothing for someone with no reports', () => {
    renderToggle({ childCount: 0 });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows − with an accessible label when expanded', () => {
    renderToggle();
    const btn = screen.getByRole('button', { name: 'Hide everyone below Aarav Sharma' });
    expect(btn.textContent).toBe('−');
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('shows +N when collapsed', () => {
    renderToggle({ collapsed: true, hiddenCount: 3 });
    const btn = screen.getByRole('button', { name: 'Show 3 below Aarav Sharma' });
    expect(btn.textContent).toBe('+3');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('toggles by node id and does not let the click reach the canvas', () => {
    const outer = vi.fn();
    const toggle = vi.fn();
    render(
      <div onClick={outer}>
        <OrgChartContext.Provider
          value={{
            currentUserId: null,
            highlightedId: null,
            toggle,
            showDepartment: true,
            selectedEmployeeId: null,
          }}
        >
          <NodeToggle id="2" label="A" childCount={1} collapsed={false} hiddenCount={0} />
        </OrgChartContext.Provider>
      </div>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(toggle).toHaveBeenCalledWith('2');
    expect(outer).not.toHaveBeenCalled();
  });
});
