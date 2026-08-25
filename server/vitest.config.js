/**
 * vitest.config.js
 * Purpose: Vitest config for the Express BFF (Node environment).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
