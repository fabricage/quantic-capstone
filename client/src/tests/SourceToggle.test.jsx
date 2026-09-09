/**
 * SourceToggle.test.jsx
 * Purpose: Food / Consumer / All buttons report the next source.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SourceToggle from '../components/SourceToggle.jsx';

describe('SourceToggle', () => {
  it('marks the active source and emits Food / Consumer / All', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<SourceToggle source="food" onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Food' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Consumer' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await user.click(screen.getByRole('button', { name: 'Consumer' }));
    expect(onChange).toHaveBeenCalledWith('consumer');

    rerender(<SourceToggle source="consumer" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(onChange).toHaveBeenCalledWith('all');
  });
});
