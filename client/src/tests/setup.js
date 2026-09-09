/**
 * setup.js
 * Purpose: Shared Vitest setup — clean up the DOM after each test and load jest-dom.
 * jsdom has no GPU; stub canvas.getContext so canUseWebGL() is a quiet false
 * and 2D blit calls in tile tests do not throw.
 */
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

HTMLCanvasElement.prototype.getContext = function getContext(type) {
  if (type === '2d') {
    return {
      canvas: this,
      drawImage() {},
      clearRect() {},
    };
  }
  return null;
};

afterEach(() => {
  cleanup();
});
