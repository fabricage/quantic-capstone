/**
 * ErrorBoundary.test.jsx
 * Purpose: A throwing child shows recovery copy, not a blank screen.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

function Boom() {
  throw new Error('secret stack dump');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('shows Try again copy when a child throws, without the raw error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText(/secret stack dump/i)).not.toBeInTheDocument();
  });
});
