/**
 * App.test.jsx
 * Purpose: Brand, BFF search, filters, detail, pagination, and recent chips.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App.jsx';
import * as scroll from '../lib/scroll.js';

vi.mock('../lib/scroll.js', () => ({
  scrollElementIntoView: vi.fn(),
  scrollToResultsTop: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  localStorage.clear();
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
    await user.click(
      within(screen.getByRole('searchbox').closest('form')).getByRole('button', {
        name: /search/i,
      }),
    );

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
    await user.click(
      within(screen.getByRole('searchbox').closest('form')).getByRole('button', {
        name: /search/i,
      }),
    );
    const requested = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(requested.some((url) => url.includes('/api/recalls'))).toBe(false);
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
    await user.click(
      within(screen.getByRole('searchbox').closest('form')).getByRole('button', {
        name: /search/i,
      }),
    );
    expect(await screen.findByText('Acme Foods')).toBeInTheDocument();
    expect(screen.queryByText(longReason)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view details for infant formula/i }));
    expect(await screen.findByText(longReason)).toBeInTheDocument();
    const recallCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes('/api/recalls'),
    );
    expect(recallCalls).toHaveLength(1);

    await user.keyboard('{Escape}');
    expect(screen.getByRole('searchbox')).toHaveValue('formula');
    expect(screen.getByText('Acme Foods')).toBeInTheDocument();
    expect(screen.queryByText(longReason)).not.toBeInTheDocument();
  });

  it('scrolls results to the top and fetches skip on page change', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total: 45,
        source: 'food',
        results: [
          {
            id: 'F-2',
            firm: 'Dairy Co',
            product: 'Cheddar cheese',
            reason: 'Listeria',
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
    await user.type(screen.getByRole('searchbox'), 'cheese');
    await user.click(
      within(screen.getByRole('searchbox').closest('form')).getByRole('button', {
        name: /search/i,
      }),
    );
    expect(await screen.findByText('Dairy Co')).toBeInTheDocument();
    expect(scroll.scrollToResultsTop).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(scroll.scrollToResultsTop).toHaveBeenCalled();
    });
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes('skip=20'))).toBe(true);
    expect(urls.some((url) => url.includes('api.fda.gov'))).toBe(false);
  });

  it('turns successful searches into chips that re-run the query', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url) => {
      const href = String(url);
      if (href.includes('/api/personas')) {
        return Promise.resolve({ ok: true, json: async () => ({ personas: [] }) });
      }
      const isFormula = href.includes('q=formula');
      return Promise.resolve({
        ok: true,
        json: async () => ({
          total: 1,
          source: 'food',
          results: [
            {
              id: isFormula ? 'F-formula' : 'F-cheese',
              firm: isFormula ? 'Formula Co' : 'Dairy Co',
              product: isFormula ? 'Infant formula' : 'Cheddar cheese',
              reason: 'Listeria',
              classification: 'Class I',
              recallDate: '20240115',
              source: 'food',
              imageUrl: '',
              imageAlt: '',
            },
          ],
        }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await user.type(screen.getByRole('searchbox'), 'formula');
    await user.click(
      within(screen.getByRole('searchbox').closest('form')).getByRole('button', {
        name: /search/i,
      }),
    );
    expect(await screen.findByText('Formula Co')).toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'cheese');
    await user.click(
      within(screen.getByRole('searchbox').closest('form')).getByRole('button', {
        name: /search/i,
      }),
    );
    expect(await screen.findByText('Dairy Co')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'formula' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'cheese' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'formula' }));
    expect(await screen.findByText('Formula Co')).toBeInTheDocument();
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.filter((url) => url.includes('q=formula')).length).toBeGreaterThanOrEqual(2);
  });
});
