import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { smallTeam } from '../fixtures';
import OrgChartSearch from './OrgChartSearch';

function setup() {
  const onSelect = vi.fn();
  render(<OrgChartSearch members={smallTeam} onSelect={onSelect} />);
  const input = screen.getByRole('combobox', { name: 'Find a person or title' });
  return { input, onSelect };
}

describe('OrgChartSearch', () => {
  it('shows no list until something is typed', () => {
    const { input } = setup();
    fireEvent.focus(input);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('lists matching people with their titles', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'sharma' } });
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      'ASAarav SharmaEngineering Manager',
      'BSBishal SharmaFinance Lead',
    ]);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(options[0].getAttribute('aria-selected')).toBe('true');
  });

  it('moves with the arrow keys (wrapping) and picks with Enter', () => {
    const { input, onSelect } = setup();
    fireEvent.change(input, { target: { value: 'sharma' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[1].id);
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // wraps to first
    fireEvent.keyDown(input, { key: 'ArrowUp' }); // wraps to last
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bishal Sharma' }));
    expect((input as HTMLInputElement).value).toBe('Bishal Sharma');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('picks with the mouse', () => {
    const { input, onSelect } = setup();
    fireEvent.change(input, { target: { value: 'maya' } });
    fireEvent.mouseDown(screen.getByRole('option', { name: /Maya Rai/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });

  it('says when nothing matches and Enter does nothing', () => {
    const { input, onSelect } = setup();
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getByText('No one matches “zzz”')).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('Escape closes the list first, then clears the text', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'john' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect((input as HTMLInputElement).value).toBe('john');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('closes the list on blur', () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: 'john' } });
    fireEvent.blur(input);
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
