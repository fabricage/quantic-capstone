/**
 * CategoryChips.test.jsx
 * Purpose: Source hides the other agency's chips; a second click clears.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CategoryChips from '../components/CategoryChips.jsx';

const categories = [
  { id: 'dairy', label: 'Dairy', sources: ['food'] },
  { id: 'nursery', label: 'Nursery', sources: ['consumer'] },
];

describe('CategoryChips', () => {
  it('shows both groups on All and only food on Food', () => {
    const { rerender } = render(
      <CategoryChips categories={categories} source="all" selectedId="" onSelect={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Dairy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nursery' })).toBeInTheDocument();

    rerender(
      <CategoryChips categories={categories} source="food" selectedId="" onSelect={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Dairy' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nursery' })).not.toBeInTheDocument();
  });

  it('emits the id on select and empty string when clicking the active chip', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { rerender } = render(
      <CategoryChips
        categories={categories}
        source="all"
        selectedId=""
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Dairy' }));
    expect(onSelect).toHaveBeenCalledWith('dairy');

    rerender(
      <CategoryChips
        categories={categories}
        source="all"
        selectedId="dairy"
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole('button', { name: 'Dairy' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Dairy' }));
    expect(onSelect).toHaveBeenCalledWith('');
  });
});
