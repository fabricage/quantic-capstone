/**
 * FilterBar.test.jsx
 * Purpose: Filter controls call onChange with the next filters object; Clear resets.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FilterBar from '../components/FilterBar.jsx';
import { EMPTY_FILTERS } from '../lib/filters.js';

describe('FilterBar', () => {
  it('emits the next filters object when classification, status, or dates change', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <FilterBar filters={EMPTY_FILTERS} onChange={onChange} />,
    );

    await user.selectOptions(screen.getByLabelText(/classification/i), 'Class I');
    expect(onChange).toHaveBeenLastCalledWith({
      ...EMPTY_FILTERS,
      classification: 'Class I',
    });

    rerender(
      <FilterBar
        filters={{ ...EMPTY_FILTERS, classification: 'Class I' }}
        onChange={onChange}
      />,
    );
    await user.selectOptions(screen.getByLabelText(/status/i), 'Ongoing');
    expect(onChange).toHaveBeenLastCalledWith({
      ...EMPTY_FILTERS,
      classification: 'Class I',
      status: 'Ongoing',
    });

    rerender(
      <FilterBar
        filters={{ ...EMPTY_FILTERS, classification: 'Class I', status: 'Ongoing' }}
        onChange={onChange}
      />,
    );
    await user.type(screen.getByLabelText(/^from$/i), '2024-01-15');
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)[0];
    expect(last.dateFrom).toBe('2024-01-15');
  });

  it('Clear restores EMPTY_FILTERS', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FilterBar
        filters={{
          classification: 'Class II',
          status: 'Terminated',
          dateFrom: '2024-01-01',
          dateTo: '2024-02-01',
        }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS);
  });

  it('shows an inline alert when the date range is invalid', () => {
    render(
      <FilterBar
        filters={{ ...EMPTY_FILTERS, dateFrom: '2024-06-02', dateTo: '2024-06-01' }}
        onChange={() => {}}
        dateRangeError
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/start date must be on or before/i);
  });
});
