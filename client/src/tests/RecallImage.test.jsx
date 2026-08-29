/**
 * RecallImage.test.jsx
 * Purpose: FDA food recalls get a category SVG chosen from the product text.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RecallImage from '../components/RecallImage.jsx';

describe('RecallImage', () => {
  it('uses a formula category image for FDA formula product text', () => {
    render(
      <RecallImage
        recall={{
          source: 'food',
          product: 'Infant formula powder',
          imageUrl: '',
          imageAlt: '',
        }}
      />,
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/category-images/formula.svg');
    expect(img.getAttribute('alt')).toMatch(/formula/i);
  });

  it('does not render an image for non-food sources', () => {
    const { container } = render(
      <RecallImage recall={{ source: 'consumer', product: 'Crib' }} />,
    );
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows a category image for a bookmark stub without source', () => {
    render(<RecallImage recall={{ product: 'Infant formula powder' }} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/category-images/formula.svg');
  });
});
