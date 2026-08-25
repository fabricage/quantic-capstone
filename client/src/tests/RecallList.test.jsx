/**
 * RecallList.test.jsx
 * Purpose: Loading, friendly error, empty, idle, and result-row states.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RecallList from '../components/RecallList.jsx';

const sampleRecall = {
  id: 'F-1',
  firm: 'Acme Foods',
  product: 'Infant formula',
  reason: 'Possible contamination',
  classification: 'Class I',
  recallDate: '20240115',
  source: 'food',
  imageUrl: '',
  imageAlt: '',
};

describe('RecallList', () => {
  it('shows a loading message', () => {
    render(
      <RecallList loading hasSearched={false} searchFailed={false} results={[]} />,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows a friendly error, never raw exception text', () => {
    render(
      <RecallList
        loading={false}
        searchFailed
        hasSearched
        results={[]}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn’t load recalls/i);
    expect(screen.queryByText(/TypeError|ECONNREFUSED|stack/i)).not.toBeInTheDocument();
  });

  it('shows an empty message for this keyword', () => {
    render(
      <RecallList
        loading={false}
        searchFailed={false}
        hasSearched
        query="zzzxnope"
        results={[]}
      />,
    );
    expect(screen.getByText(/no results for this keyword/i)).toBeInTheDocument();
  });

  it('shows an idle prompt before the first search', () => {
    render(
      <RecallList loading={false} searchFailed={false} hasSearched={false} results={[]} />,
    );
    expect(screen.getByText(/enter a keyword/i)).toBeInTheDocument();
  });

  it('renders a row for each recall', () => {
    render(
      <RecallList
        loading={false}
        searchFailed={false}
        hasSearched
        results={[sampleRecall, { ...sampleRecall, id: 'F-2', firm: 'Beta Co' }]}
      />,
    );
    expect(screen.getByText('Acme Foods')).toBeInTheDocument();
    expect(screen.getByText('Beta Co')).toBeInTheDocument();
  });
});
