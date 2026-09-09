/**
 * App.test.jsx
 * Purpose: Brand, BFF search, filters, detail, pagination, chips, and persona ranking.
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
    const fetchMock = vi.fn().mockImplementation((url) => {
      const href = String(url);
      return Promise.resolve({
        ok: true,
        json: async () => ({
          total: 0,
          source: href.includes('source=consumer') ? 'consumer' : 'food',
          results: [],
        }),
      });
    });
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
    expect(requested.some((url) => url.includes('/api/recalls') && url.includes('q='))).toBe(
      false,
    );
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
    const recallCalls = fetchMock.mock.calls.filter((call) => {
      const href = String(call[0]);
      return href.includes('/api/recalls') && href.includes('q=formula');
    });
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

  const parentPersona = {
    id: 'parent-young-kids',
    label: 'Parent with young kids',
    description: 'Formula, lunchbox snacks, and foods kids eat often.',
  };

  const milkResults = [
    {
      id: 'F-milk-1',
      firm: 'Dairy Co',
      product: 'Whole milk',
      reason: 'Undeclared allergen',
      classification: 'Class II',
      recallDate: '20240110',
      source: 'food',
      imageUrl: '',
      imageAlt: '',
    },
    {
      id: 'F-milk-2',
      firm: 'Kids Snacks Inc',
      product: 'Yogurt pouches',
      reason: 'Possible contamination',
      classification: 'Class I',
      recallDate: '20240112',
      source: 'food',
      imageUrl: '',
      imageAlt: '',
    },
  ];

  it('shows latest and Class I home previews before the first search', async () => {
    const fetchMock = vi.fn().mockImplementation((url) => {
      const href = String(url);
      if (href.includes('/api/personas')) {
        return Promise.resolve({ ok: true, json: async () => ({ personas: [] }) });
      }
      const isConsumer = href.includes('source=consumer');
      const isClassI = href.includes('classification=Class');
      return Promise.resolve({
        ok: true,
        json: async () => ({
          total: 1,
          source: isConsumer ? 'consumer' : 'food',
          results: [
            {
              id: isConsumer ? 'cpsc-home' : isClassI ? 'F-class-i' : 'F-recent',
              firm: isConsumer ? 'Voomf' : isClassI ? 'High Risk Co' : 'Latest Dairy',
              product: isConsumer ? 'Crib mattress' : isClassI ? 'Infant formula' : 'Cheddar cheese',
              reason: 'Possible contamination',
              classification: isConsumer ? 'Consumer Product' : isClassI ? 'Class I' : 'Class II',
              recallDate: '20240115',
              source: isConsumer ? 'consumer' : 'food',
              imageUrl: isConsumer ? 'https://www.cpsc.gov/s3fs-public/crib.jpg' : '',
              imageAlt: '',
            },
          ],
        }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(screen.getByRole('heading', { name: /latest recalls/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /fda food/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /cpsc consumer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /class i high-risk/i })).toBeInTheDocument();
    expect(await screen.findByText('Latest Dairy')).toBeInTheDocument();
    expect(await screen.findByText('Voomf')).toBeInTheDocument();
    expect(await screen.findByText('High Risk Co')).toBeInTheDocument();
    expect(
      screen.getByText(/enter a keyword to search fda food recalls/i),
    ).toBeInTheDocument();
  });

  it('ranks the current page and shows why-lines when a persona is selected', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url) => {
      const href = String(url);
      if (href.includes('/api/personas')) {
        return Promise.resolve({ ok: true, json: async () => ({ personas: [parentPersona] }) });
      }
      if (href.includes('/api/persona-rank')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            fallback: false,
            ranked: [
              { id: 'F-milk-2', relevance: 5, why: 'Kids often eat yogurt pouches.' },
              { id: 'F-milk-1', relevance: 2, why: 'Less common in a lunchbox.' },
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ total: 2, source: 'food', results: milkResults }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await user.type(screen.getByRole('searchbox'), 'milk');
    await user.click(
      within(screen.getByRole('searchbox').closest('form')).getByRole('button', {
        name: /search/i,
      }),
    );
    expect(await screen.findByText('Dairy Co')).toBeInTheDocument();
    const cardTitles = () =>
      screen
        .getAllByRole('button', { name: /view details for/i })
        .map((el) => el.getAttribute('aria-label'));
    expect(cardTitles()[0]).toMatch(/whole milk/i);

    await user.click(screen.getByRole('button', { name: /parent with young kids/i }));

    expect(await screen.findByText('Kids often eat yogurt pouches.')).toBeInTheDocument();
    expect(screen.getByText('Less common in a lunchbox.')).toBeInTheDocument();
    expect(cardTitles()[0]).toMatch(/yogurt pouches/i);

    const rankCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/api/persona-rank'));
    expect(rankCall).toBeTruthy();
    expect(rankCall[1].method).toBe('POST');
    const body = JSON.parse(rankCall[1].body);
    expect(body.personaId).toBe('parent-young-kids');
    expect(body.recalls.map((r) => r.id)).toEqual(['F-milk-1', 'F-milk-2']);
    expect(body.query).toMatchObject({
      q: 'milk',
      classification: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      page: 1,
      location: '',
      source: 'food',
    });

    await user.click(screen.getByRole('button', { name: /parent with young kids/i }));
    await waitFor(() => {
      expect(screen.queryByText('Kids often eat yogurt pouches.')).not.toBeInTheDocument();
    });
    expect(cardTitles()[0]).toMatch(/whole milk/i);
  });

  it('keeps keyword order and shows a fallback notice when ranking fails', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url) => {
      const href = String(url);
      if (href.includes('/api/personas')) {
        return Promise.resolve({ ok: true, json: async () => ({ personas: [parentPersona] }) });
      }
      if (href.includes('/api/persona-rank')) {
        return Promise.resolve({ ok: true, json: async () => ({ fallback: true }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ total: 2, source: 'food', results: milkResults }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await user.type(screen.getByRole('searchbox'), 'milk');
    await user.click(
      within(screen.getByRole('searchbox').closest('form')).getByRole('button', {
        name: /search/i,
      }),
    );
    expect(await screen.findByText('Dairy Co')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /parent with young kids/i }));

    expect(await screen.findByText(/couldn’t personalize this page/i)).toBeInTheDocument();
    const titles = screen
      .getAllByRole('button', { name: /view details for/i })
      .map((el) => el.getAttribute('aria-label'));
    expect(titles[0]).toMatch(/whole milk/i);
    expect(screen.queryByText(/kids often eat/i)).not.toBeInTheDocument();
  });

  it('toggles Consumer and searches crib without FDA classification or status', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url) => {
      const href = String(url);
      if (href.includes('/api/personas')) {
        return Promise.resolve({ ok: true, json: async () => ({ personas: [] }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          total: 1,
          source: href.includes('source=consumer') ? 'consumer' : 'food',
          results: [
            {
              id: 'cpsc-26669',
              firm: 'Voomf',
              product: 'Crib mattress',
              reason: 'Entrapment',
              classification: 'Consumer Product',
              recallDate: '20260806',
              source: 'consumer',
              imageUrl: 'https://www.cpsc.gov/s3fs-public/crib.jpg',
              imageAlt: 'Crib',
            },
          ],
        }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Consumer' }));
    expect(screen.queryByLabelText(/classification/i)).not.toBeInTheDocument();

    await user.type(screen.getByRole('searchbox'), 'crib');
    await user.click(
      within(screen.getByRole('searchbox').closest('form')).getByRole('button', {
        name: /search/i,
      }),
    );

    expect(await screen.findByText('Voomf')).toBeInTheDocument();
    expect(screen.getByText('CPSC')).toBeInTheDocument();
    const searchUrls = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .filter((href) => href.includes('/api/recalls') && href.includes('q=crib'));
    expect(searchUrls.length).toBeGreaterThan(0);
    expect(searchUrls.every((href) => href.includes('source=consumer'))).toBe(true);
    expect(searchUrls.some((href) => href.includes('classification='))).toBe(false);
    expect(searchUrls.some((href) => href.includes('status='))).toBe(false);
  });

  it('searches a company chip through the BFF, switches source, and remembers the phrase', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url) => {
      const href = String(url);
      if (href.includes('/api/trending-searches')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            label: 'Companies with the most recalls',
            groups: [
              {
                id: 'food',
                label: 'FDA food',
                source: 'food',
                suggestions: ['FreshPoint'],
              },
              {
                id: 'consumer',
                label: 'CPSC consumer',
                source: 'consumer',
                suggestions: ['Truststone Group'],
              },
            ],
            suggestions: [],
          }),
        });
      }
      if (href.includes('/api/personas')) {
        return Promise.resolve({ ok: true, json: async () => ({ personas: [] }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          total: 1,
          source: href.includes('source=consumer') ? 'consumer' : 'food',
          results: [
            {
              id: href.includes('source=consumer') ? 'cpsc-trust' : 'F-fresh',
              firm: href.includes('source=consumer') ? 'Truststone Group' : 'FreshPoint',
              product: href.includes('source=consumer') ? 'Power bank' : 'Chicken salad',
              reason: 'Hazard',
              classification: href.includes('source=consumer') ? 'Consumer Product' : 'Class II',
              recallDate: '20260903',
              source: href.includes('source=consumer') ? 'consumer' : 'food',
              imageUrl: '',
              imageAlt: '',
            },
          ],
        }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(await screen.findByRole('button', { name: 'FreshPoint' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Truststone Group' })).toBeInTheDocument();
    expect(screen.getByText(/companies with the most recalls/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'FreshPoint' }));
    expect(await screen.findByText('Chicken salad')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Food' })).toHaveAttribute('aria-pressed', 'true');
    const foodUrls = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .filter((href) => href.includes('/api/recalls') && href.includes('q=FreshPoint'));
    expect(foodUrls.length).toBeGreaterThan(0);
    expect(foodUrls.every((href) => href.includes('source=food'))).toBe(true);
    expect(foodUrls.some((href) => href.includes('api.fda.gov'))).toBe(false);
    expect(screen.getAllByRole('button', { name: 'FreshPoint' }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Truststone Group' }));
    expect(await screen.findByText('Power bank')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Consumer' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const consumerUrls = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .filter((href) => href.includes('/api/recalls') && href.includes('q=Truststone'));
    expect(consumerUrls.length).toBeGreaterThan(0);
    expect(consumerUrls.every((href) => href.includes('source=consumer'))).toBe(true);

    expect(
      within(screen.getByLabelText(/recent searches/i)).getByRole('button', {
        name: 'Truststone Group',
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText(/recent searches/i)).getByRole('button', {
        name: 'FreshPoint',
      }),
    ).toBeInTheDocument();
  });

  it('shows a friendly search error without raw exception text', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url) => {
      const href = String(url);
      if (href.includes('/api/personas')) {
        return Promise.resolve({ ok: true, json: async () => ({ personas: [] }) });
      }
      if (href.includes('q=')) {
        return Promise.resolve({
          ok: false,
          status: 502,
          json: async () => ({
            error: 'ECONNREFUSED connect localhost:3001\n    at TCPConnectWrap',
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ total: 0, source: 'food', results: [] }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await user.type(screen.getByRole('searchbox'), 'milk');
    await user.click(
      within(screen.getByRole('searchbox').closest('form')).getByRole('button', {
        name: /search/i,
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t load recalls/i);
    expect(screen.queryByText(/ECONNREFUSED/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/TCPConnectWrap/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/TypeError/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Request failed/i)).not.toBeInTheDocument();
  });

  it('keeps home usable and shows a notice when personas fail to load', async () => {
    const fetchMock = vi.fn().mockImplementation((url) => {
      const href = String(url);
      if (href.includes('/api/personas')) {
        return Promise.reject(new Error('Request failed (500)'));
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          total: 1,
          source: 'food',
          results: [
            {
              id: 'F-recent',
              firm: 'Latest Dairy',
              product: 'Cheddar cheese',
              reason: 'Listeria',
              classification: 'Class II',
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
    expect(await screen.findByText(/couldn’t load shopper profiles/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /the recall ledger/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /latest recalls/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /who is this for/i })).not.toBeInTheDocument();
  });

  it('changes idle copy when the source toggle changes', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ total: 0, source: 'food', results: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(
      screen.getByText(/enter a keyword to search fda food recalls/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Consumer' }));
    expect(
      screen.getByText(/enter a keyword to search cpsc consumer-product recalls/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(
      screen.getByText(/enter a keyword to search fda food and cpsc consumer-product recalls/i),
    ).toBeInTheDocument();
  });
});
