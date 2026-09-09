/**
 * SuggestedSearchChips.test.jsx
 * Purpose: Empty renders nothing; grouped chips pass phrase + source.
 * Count chips and lookback radios are the extra surface for this card.
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

    expect(screen.getByText('AF')).toBeInTheDocument();
    expect(screen.getByText('40 recalls')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /acme foods inc, 40 recalls/i }));
    expect(onSelect).toHaveBeenCalledWith('Acme Foods Inc', 'food');

    const year = screen.getByRole('radio', { name: '1 year' });
    expect(year).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: '3 months' }));
    expect(onWindowChange).toHaveBeenCalledWith('3m');
  });
});
