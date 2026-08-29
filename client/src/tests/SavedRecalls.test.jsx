/**
 * SavedRecalls.test.jsx
 * Purpose: Empty state, list of bookmarks, and remove.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SavedRecalls from '../components/SavedRecalls.jsx';

const bookmarks = [
  { id: 'F-1', product: 'Infant formula', recallDate: '20240115' },
  { id: 'F-2', product: 'Cheddar cheese', recallDate: '20240201' },
];

describe('SavedRecalls', () => {
  it('shows an empty state when nothing is saved', () => {
    render(<SavedRecalls saved={[]} />);
    expect(screen.getByText(/no saved recalls yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('lists saved products', () => {
    render(<SavedRecalls saved={bookmarks} onSelect={() => {}} onRemove={() => {}} />);
    expect(screen.getByText(/infant formula/i)).toBeInTheDocument();
    expect(screen.getByText(/cheddar cheese/i)).toBeInTheDocument();
  });

  it('removes a bookmark from the list', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<SavedRecalls saved={bookmarks} onSelect={() => {}} onRemove={onRemove} />);
    const buttons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(buttons[0]);
    expect(onRemove).toHaveBeenCalledWith(bookmarks[0]);
  });
});
