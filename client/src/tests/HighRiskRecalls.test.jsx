/**
 * HighRiskRecalls.test.jsx
 * Purpose: Class I strip says FDA food, explains severity, opens a recall,
 * and its shortcut asks App to filter the list.
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

  it('labels the strip FDA food and explains severity, not popularity', async () => {
    searchRecalls.mockResolvedValue({ total: 1, results: [classIRecall] });
    render(<HighRiskRecalls onSelect={() => {}} onBrowse={() => {}} />);

    expect(screen.getByRole('heading', { name: /class i high-risk/i })).toBeInTheDocument();
    expect(screen.getByText(/fda food only/i)).toBeInTheDocument();
    expect(screen.getByText(/severity,\s*not popularity/i)).toBeInTheDocument();
    expect(screen.getByText(/cpsc consumer recalls are not classified/i)).toBeInTheDocument();
    expect(await screen.findByText('Infant formula · Acme Foods')).toBeInTheDocument();
    expect(searchRecalls).toHaveBeenCalledWith({
      source: 'food',
      classification: 'Class I',
      limit: 3,
    });
  });

  it('opens a Class I recall when a strip item is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    searchRecalls.mockResolvedValue({ total: 1, results: [classIRecall] });
    render(<HighRiskRecalls onSelect={onSelect} onBrowse={() => {}} />);

    await user.click(
      await screen.findByRole('button', { name: /open class i recall: infant formula/i }),
    );
    expect(onSelect).toHaveBeenCalledWith(classIRecall);
  });

  it('calls onBrowse from the Show all Class I shortcut', async () => {
    const user = userEvent.setup();
    const onBrowse = vi.fn();
    searchRecalls.mockResolvedValue({ total: 1, results: [classIRecall] });
    render(<HighRiskRecalls onSelect={() => {}} onBrowse={onBrowse} />);

    await user.click(screen.getByRole('button', { name: /show all class i/i }));
    expect(onBrowse).toHaveBeenCalledTimes(1);
  });

  it('shows an error state when the strip request fails', async () => {
    searchRecalls.mockRejectedValue(new Error('network'));
    render(<HighRiskRecalls onSelect={() => {}} onBrowse={() => {}} />);
    expect(await screen.findByText(/couldn’t load class i recalls/i)).toBeInTheDocument();
  });
});
