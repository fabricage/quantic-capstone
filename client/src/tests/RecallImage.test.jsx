/**
 * RecallImage.test.jsx
 * Purpose: FDA food recalls get a category SVG chosen from the product text.
 */
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('renders nothing when the source is consumer and imageUrl is empty', () => {
    const { container } = render(
      <RecallImage recall={{ source: 'consumer', product: 'Crib', imageUrl: '' }} />,
    );
    expect(container.querySelector('img')).toBeNull();
  });

  it('uses the CPSC photo when consumer imageUrl is present', () => {
    render(
      <RecallImage
        recall={{
          source: 'consumer',
          product: 'Crib',
          imageUrl: 'https://www.cpsc.gov/s3fs-public/crib.jpg',
          imageAlt: 'Recalled crib',
        }}
      />,
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://www.cpsc.gov/s3fs-public/crib.jpg');
    expect(img).toHaveAttribute('alt', 'Recalled crib');
  });

  it('hides a consumer photo that fails to load', () => {
    const { container } = render(
      <RecallImage
        recall={{
          source: 'consumer',
          product: 'Crib',
          imageUrl: 'https://www.cpsc.gov/s3fs-public/missing.jpg',
          imageAlt: 'Missing',
        }}
      />,
    );
    fireEvent.error(screen.getByRole('img'));
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows a category image for a bookmark stub without source', () => {
    render(<RecallImage recall={{ product: 'Infant formula powder' }} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/category-images/formula.svg');
  });
});
