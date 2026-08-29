/**
 * RecentSearchChips.test.jsx
 * Purpose: Empty renders nothing; chips select a query; clear-all.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RecentSearchChips from '../components/RecentSearchChips.jsx';

describe('RecentSearchChips', () => {
  it('renders nothing when there are no searches', () => {
    const { container } = render(<RecentSearchChips searches={[]} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/recent searches/i)).not.toBeInTheDocument();
  });

  it('calls onSelect with the chip query', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <RecentSearchChips searches={['formula', 'cheese']} onSelect={onSelect} onClear={() => {}} />,
    );
    await user.click(screen.getByRole('button', { name: 'formula' }));
    expect(onSelect).toHaveBeenCalledWith('formula');
  });

  it('calls onClear from Clear all', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <RecentSearchChips searches={['formula']} onSelect={() => {}} onClear={onClear} />,
    );
    await user.click(screen.getByRole('button', { name: /clear all/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
