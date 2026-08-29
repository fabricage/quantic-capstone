/**
 * PersonaCards.test.jsx
 * Purpose: Public labels render; clicking toggles selection.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PersonaCards from '../components/PersonaCards.jsx';

const personas = [
  {
    id: 'parent-young-kids',
    label: 'Parent with young kids',
    description: 'Formula, lunchbox snacks, and foods kids eat often.',
  },
  {
    id: 'renter-twenties',
    label: 'Renter in their twenties',
    description: 'Convenience foods, coffee, and budget groceries.',
  },
];

describe('PersonaCards', () => {
  it('shows labels and descriptions', () => {
    render(<PersonaCards personas={personas} selectedId="" onSelect={() => {}} />);
    expect(screen.getByText('Parent with young kids')).toBeInTheDocument();
    expect(screen.getByText(/lunchbox snacks/i)).toBeInTheDocument();
    expect(screen.getByText('Renter in their twenties')).toBeInTheDocument();
  });

  it('toggles selection on click', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { rerender } = render(
      <PersonaCards personas={personas} selectedId="" onSelect={onSelect} />,
    );
    await user.click(screen.getByRole('button', { name: /parent with young kids/i }));
    expect(onSelect).toHaveBeenCalledWith('parent-young-kids');

    rerender(
      <PersonaCards
        personas={personas}
        selectedId="parent-young-kids"
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole('button', { name: /parent with young kids/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: /parent with young kids/i }));
    expect(onSelect).toHaveBeenCalledWith('');
  });
});
