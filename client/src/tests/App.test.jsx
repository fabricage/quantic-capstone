/**
 * App.test.jsx
 * Purpose: Brand, BFF search, filter validation, and detail view with Escape.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App.jsx';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('renders the brand name', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /the recall ledger/i })).toBeInTheDocument();
  });

  it('searches through /api/recalls and never calls api.fda.gov', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total: 1,
        source: 'food',
        results: [
          {
            id: 'F-123-2024',
            firm: 'Acme Foods',
            product: 'Infant formula',
            reason: 'Possible contamination',
            classification: 'Class I',
            recallDate: '20240115',
            source: 'food',
            imageUrl: '',
            imageAlt: '',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await user.type(screen.getByRole('searchbox'), 'formula');
    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(await screen.findByText('Acme Foods')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalled();
    const requested = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(requested.some((url) => url.includes('/api/recalls'))).toBe(true);
    expect(requested.some((url) => url.includes('api.fda.gov'))).toBe(false);
  });

  it('shows an inline date-range error and does not hit the API', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await user.type(screen.getByLabelText(/^from$/i), '2024-12-31');
    await user.type(screen.getByLabelText(/^to$/i), '2024-01-01');
    expect(screen.getByRole('alert')).toHaveTextContent(/start date must be on or before/i);

    await user.type(screen.getByRole('searchbox'), 'milk');
    await user.click(screen.getByRole('button', { name: /search/i }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens detail from a card and Escape returns to the same search', async () => {
    const user = userEvent.setup();
    const longReason =
      'The product is being recalled because it has the potential to be contaminated with Cronobacter sakazakii which can cause serious and sometimes fatal infections in infants and other vulnerable populations according to the firm notification';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total: 1,
        source: 'food',
        results: [
          {
            id: 'F-123-2024',
            firm: 'Acme Foods',
            product: 'Infant formula',
            reason: longReason,
            classification: 'Class I',
            status: 'Ongoing',
            state: 'CA',
            recallDate: '20240115',
            source: 'food',
            imageUrl: '',
            imageAlt: '',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await user.type(screen.getByRole('searchbox'), 'formula');
    await user.click(screen.getByRole('button', { name: /search/i }));
    expect(await screen.findByText('Acme Foods')).toBeInTheDocument();
    expect(screen.queryByText(longReason)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view details for infant formula/i }));
    expect(await screen.findByText(longReason)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(screen.getByRole('searchbox')).toHaveValue('formula');
    expect(screen.getByText('Acme Foods')).toBeInTheDocument();
    expect(screen.queryByText(longReason)).not.toBeInTheDocument();
  });
});
