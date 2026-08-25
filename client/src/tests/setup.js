/**
 * setup.js
 * Purpose: Shared Vitest setup — clean up the DOM after each test and load jest-dom.
 */
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
});
