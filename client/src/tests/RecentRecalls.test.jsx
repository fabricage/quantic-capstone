/**
 * RecentRecalls.test.jsx
 * Purpose: Latest FDA column renders and a card opens detail.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecentRecalls from '../components/RecentRecalls.jsx';
import { searchRecalls } from '../api.js';

vi.mock('../api.js', () => ({
  searchRecalls: vi.fn(),
}));

const recentRecall = {
  id: 'F-recent',
  firm: 'Dairy Co',
  product: 'Cheddar cheese',
  reason: 'Listeria',
  classification: 'Class II',
  recallDate: '20240201',
  source: 'food',
  imageUrl: '',
  imageAlt: '',
};

describe('RecentRecalls', () => {
  beforeEach(() => {
    searchRecalls.mockReset();
  });

  it('shows a latest FDA food column', async () => {
    searchRecalls.mockResolvedValue({ total: 1, results: [recentRecall] });
    render(<RecentRecalls onSelect={() => {}} />);

    expect(screen.getByRole('heading', { name: /latest recalls/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /fda food/i })).toBeInTheDocument();
    expect(await screen.findByText('Dairy Co')).toBeInTheDocument();
    expect(searchRecalls).toHaveBeenCalledWith({ source: 'food', limit: 5 });
  });

  it('opens a recall from the FDA column', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    searchRecalls.mockResolvedValue({ total: 1, results: [recentRecall] });
    render(<RecentRecalls onSelect={onSelect} />);

    await user.click(await screen.findByRole('button', { name: /view details for cheddar cheese/i }));
    expect(onSelect).toHaveBeenCalledWith(recentRecall);
  });
});
