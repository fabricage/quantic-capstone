/**
 * HighRiskRecalls.test.jsx
 * Purpose: Severity copy (Class I ≠ trending) and opening a Class I recall.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HighRiskRecalls from '../components/HighRiskRecalls.jsx';
import { searchRecalls } from '../api.js';

vi.mock('../api.js', () => ({
  searchRecalls: vi.fn(),
}));

const classIRecall = {
  id: 'F-class-i',
  firm: 'Acme Foods',
  product: 'Infant formula',
  reason: 'Possible contamination',
  classification: 'Class I',
  recallDate: '20240115',
  source: 'food',
  imageUrl: '',
  imageAlt: '',
};

describe('HighRiskRecalls', () => {
  beforeEach(() => {
    searchRecalls.mockReset();
  });

  it('explains that Class I is severity, not a trending or popular list', async () => {
    searchRecalls.mockResolvedValue({ total: 1, results: [classIRecall] });
    render(<HighRiskRecalls onSelect={() => {}} />);

    expect(screen.getByRole('heading', { name: /class i high-risk/i })).toBeInTheDocument();
    expect(screen.getByText(/severity, not popularity/i)).toBeInTheDocument();
    expect(screen.getByText(/not the same as a trending/i)).toBeInTheDocument();
    expect(await screen.findByText('Acme Foods')).toBeInTheDocument();
    expect(searchRecalls).toHaveBeenCalledWith({
      source: 'food',
      classification: 'Class I',
      limit: 5,
    });
  });

  it('opens a Class I recall when a preview card is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    searchRecalls.mockResolvedValue({ total: 1, results: [classIRecall] });
    render(<HighRiskRecalls onSelect={onSelect} />);

    await user.click(await screen.findByRole('button', { name: /view details for infant formula/i }));
    expect(onSelect).toHaveBeenCalledWith(classIRecall);
  });

  it('shows an error state when the preview request fails', async () => {
    searchRecalls.mockRejectedValue(new Error('network'));
    render(<HighRiskRecalls onSelect={() => {}} />);
    expect(await screen.findByText(/couldn’t load class i recalls/i)).toBeInTheDocument();
  });
});
