/**
 * SuggestedSearchChips.test.jsx
 * Purpose: Empty renders nothing; grouped chips pass phrase + source.
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
});
