/**
 * SuggestedSearchChips.test.jsx
 * Purpose: Grouped chips in opposite marquees; lookback radios still switch
 * the window. Duplicate tracks are aria-hidden so each firm is announced once.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SuggestedSearchChips from '../components/SuggestedSearchChips.jsx';

const groups = [
  {
    id: 'food',
    label: 'FDA food',
    source: 'food',
    suggestions: ['Acme Foods'],
  },
  {
    id: 'consumer',
    label: 'CPSC consumer',
    source: 'consumer',
    suggestions: ['Voomf'],
  },
];

describe('SuggestedSearchChips', () => {
  it('renders nothing when groups are empty', () => {
    const { container } = render(<SuggestedSearchChips groups={[]} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/companies with the most recalls/i)).not.toBeInTheDocument();
  });

  it('calls onSelect with the phrase and the group source', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SuggestedSearchChips
        label="Companies with the most recalls"
        groups={groups}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByText('Companies with the most recalls')).toBeInTheDocument();
    expect(screen.getByText('FDA food')).toBeInTheDocument();
    expect(screen.getByText('CPSC consumer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Acme Foods' }));
    expect(onSelect).toHaveBeenCalledWith('Acme Foods', 'food');

    await user.click(screen.getByRole('button', { name: 'Voomf' }));
    expect(onSelect).toHaveBeenCalledWith('Voomf', 'consumer');

    const marquees = document.querySelectorAll('.suggested-search-marquee');
    expect(marquees).toHaveLength(2);
    expect(marquees[0]).toHaveAttribute('data-direction', 'left');
    expect(marquees[1]).toHaveAttribute('data-direction', 'right');
    expect(marquees[1]).toHaveClass('is-reverse');
  });

  it('keeps eight firms per row and hides the looping copy from assistive tech', () => {
    const eight = Array.from({ length: 8 }, (_, i) => ({
      phrase: `Firm ${i + 1}`,
      count: i + 1,
    }));
    const { container } = render(
      <SuggestedSearchChips
        label="Companies with the most recalls"
        groups={[
          { id: 'food', label: 'FDA food', source: 'food', suggestions: eight },
          {
            id: 'consumer',
            label: 'CPSC consumer',
            source: 'consumer',
            suggestions: eight.map((item) => ({ ...item, phrase: `Cpsc ${item.phrase}` })),
          },
        ]}
      />,
    );

    expect(screen.getAllByRole('button', { name: /^firm 1,/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /^cpsc firm 8,/i })).toHaveLength(1);
    expect(container.querySelectorAll('.suggested-search-chip')).toHaveLength(32);
    expect(container.querySelectorAll('[aria-hidden="true"] .suggested-search-chip')).toHaveLength(
      16,
    );
  });

  it('shows a monogram, recall count, and lookback radios', async () => {
    const user = userEvent.setup();
    const onWindowChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <SuggestedSearchChips
        label="Companies with the most recalls"
        windowId="1y"
        onWindowChange={onWindowChange}
        onSelect={onSelect}
        groups={[
          {
            id: 'food',
            label: 'FDA food',
            source: 'food',
            suggestions: [{ phrase: 'Acme Foods Inc', count: 40 }],
          },
        ]}
      />,
    );

    expect(screen.getAllByText('AF').length).toBeGreaterThan(0);
    expect(screen.getAllByText('40 recalls').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /acme foods inc, 40 recalls/i }));
    expect(onSelect).toHaveBeenCalledWith('Acme Foods Inc', 'food');

    const year = screen.getByRole('radio', { name: '1 year' });
    expect(year).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: '3 months' }));
    expect(onWindowChange).toHaveBeenCalledWith('3m');
  });
});
