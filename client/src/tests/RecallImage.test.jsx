/**
 * RecallImage.test.jsx
 * Purpose: FDA food recalls get a category SVG, or a Three.js tile when WebGL exists.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

  it('shows a 3D tile when WebGL is available', async () => {
    vi.resetModules();
    vi.doMock('../lib/webgl.js', () => ({
      canUseWebGL: () => true,
      resetWebGLDetection: () => {},
    }));
    vi.doMock('../lib/recallTileRuntime.js', () => ({
      registerTile: vi.fn(),
      unregisterTile: vi.fn(),
    }));
    vi.doMock('../lib/recallTileScene.js', () => ({
      createTileScene: () => ({
        scene: {},
        camera: { aspect: 1, updateProjectionMatrix: () => {} },
        tick: vi.fn(),
        dispose: vi.fn(),
      }),
    }));
    const { default: LiveTile } = await import('../components/RecallImage.jsx');
    const { container } = render(
      <LiveTile
        recall={{
          source: 'food',
          product: 'Infant formula powder',
          classification: 'Class I',
        }}
      />,
    );
    expect(container.querySelector('[data-recall-tile="webgl"]')).toHaveAttribute(
      'data-tile-kind',
      'formula',
    );
    expect(container.querySelector('canvas').getAttribute('aria-label')).toMatch(/formula/i);
    vi.resetModules();
    vi.doUnmock('../lib/webgl.js');
    vi.doUnmock('../lib/recallTileRuntime.js');
    vi.doUnmock('../lib/recallTileScene.js');
  });
});
