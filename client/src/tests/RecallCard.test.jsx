/**
 * RecallCard.test.jsx
 * Purpose: Cards show shortened product (and reason) text instead of the full FDA dump.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RecallCard from '../components/RecallCard.jsx';

const longProduct =
  'Organic infant formula milk-based powder with added iron for babies 0-12 months packaged in 12.4 ounce cans distributed nationwide and also sold through grocery and pharmacy retailers across multiple states including California and New York';

const longReason =
  'The product is being recalled because it has the potential to be contaminated with Cronobacter sakazakii which can cause serious and sometimes fatal infections in infants and other vulnerable populations according to the firm notification';

describe('RecallCard', () => {
  it('shortens a long product title and reason', () => {
    render(
      <RecallCard
        recall={{
          id: 'F-1',
          firm: 'Acme Foods',
          product: longProduct,
          reason: longReason,
          classification: 'Class I',
          recallDate: '20240115',
          source: 'food',
          imageUrl: '',
          imageAlt: '',
        }}
      />,
    );

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
});
