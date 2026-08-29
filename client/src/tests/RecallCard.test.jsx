/**
 * RecallCard.test.jsx
 * Purpose: Cards show shortened product (and reason) text instead of the full FDA dump.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RecallCard from '../components/RecallCard.jsx';

const longProduct =
  'Organic infant formula milk-based powder with added iron for babies 0-12 months packaged in 12.4 ounce cans distributed nationwide and also sold through grocery and pharmacy retailers across multiple states including California and New York';

const longReason =
  'The product is being recalled because it has the potential to be contaminated with Cronobacter sakazakii which can cause serious and sometimes fatal infections in infants and other vulnerable populations according to the firm notification';

const sampleRecall = {
  id: 'F-1',
  firm: 'Acme Foods',
  product: longProduct,
  reason: longReason,
  classification: 'Class I',
  recallDate: '20240115',
  source: 'food',
  imageUrl: '',
  imageAlt: '',
};

describe('RecallCard', () => {
  it('shortens a long product title and reason', () => {
    render(<RecallCard recall={sampleRecall} />);

    const title = screen.getByRole('heading', { level: 2 }).textContent;
    expect(title.length).toBeLessThan(longProduct.length);
    expect(title).toMatch(/…$/);
    expect(screen.queryByText(longProduct)).not.toBeInTheDocument();

    const reason = screen.getByText(/cronobacter/i).textContent;
    expect(reason.length).toBeLessThan(longReason.length);
    expect(screen.getByText('Acme Foods')).toBeInTheDocument();
    expect(screen.getByText('Class I')).toBeInTheDocument();
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
  });

  it('toggles save without opening detail', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onToggleSave = vi.fn();
    render(
      <RecallCard
        recall={sampleRecall}
        onSelect={onSelect}
        onToggleSave={onToggleSave}
        saved={false}
      />,
    );
    await user.click(screen.getByRole('button', { name: /save /i }));
    expect(onToggleSave).toHaveBeenCalledWith(sampleRecall);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
