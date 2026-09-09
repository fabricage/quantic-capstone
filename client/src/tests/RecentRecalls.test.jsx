/**
 * RecentRecalls.test.jsx
 * Purpose: Latest FDA + CPSC columns render and a card opens detail.
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

const consumerRecall = {
  id: 'cpsc-26669',
  firm: 'Voomf',
  product: 'Crib mattress',
  reason: 'Entrapment',
  classification: 'Consumer Product',
  recallDate: '20260806',
  source: 'consumer',
  imageUrl: 'https://www.cpsc.gov/s3fs-public/crib.jpg',
  imageAlt: 'Crib',
};

describe('RecentRecalls', () => {
  beforeEach(() => {
    searchRecalls.mockReset();
    searchRecalls.mockImplementation((opts = {}) => {
      if (opts.source === 'consumer') {
        return Promise.resolve({ total: 1, results: [consumerRecall] });
      }
      return Promise.resolve({ total: 1, results: [recentRecall] });
    });
  });

  it('shows latest FDA and CPSC consumer columns', async () => {
    render(<RecentRecalls onSelect={() => {}} />);

    expect(screen.getByRole('heading', { name: /latest recalls/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /fda food/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /cpsc consumer/i })).toBeInTheDocument();
    expect(await screen.findByText('Dairy Co')).toBeInTheDocument();
    expect(await screen.findByText('Voomf')).toBeInTheDocument();
    expect(searchRecalls).toHaveBeenCalledWith({ source: 'food', limit: 5 });
    expect(searchRecalls).toHaveBeenCalledWith({ source: 'consumer', limit: 5 });
  });

  it('opens a recall from the FDA column', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<RecentRecalls onSelect={onSelect} />);

    await user.click(await screen.findByRole('button', { name: /view details for cheddar cheese/i }));
    expect(onSelect).toHaveBeenCalledWith(recentRecall);
  });

  it('opens a recall from the CPSC column', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<RecentRecalls onSelect={onSelect} />);

    await user.click(await screen.findByRole('button', { name: /view details for crib mattress/i }));
    expect(onSelect).toHaveBeenCalledWith(consumerRecall);
  });
});
