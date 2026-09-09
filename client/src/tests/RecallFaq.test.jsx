/**
 * RecallFaq.test.jsx
 * Purpose: The glossary is static — every class, status, and CPSC caveat
 * is on the page with no fetch.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import RecallFaq from '../components/RecallFaq.jsx';
import { FAQ_ITEMS, FAQ_TITLE } from '../lib/recallFaq.js';

describe('RecallFaq', () => {
  it('renders the heading, lede, and every question without fetching', () => {
    render(<RecallFaq />);

    expect(screen.getByRole('heading', { name: FAQ_TITLE })).toBeInTheDocument();
    expect(
      screen.getByText(/fda food recalls carry a class and a status/i),
    ).toBeInTheDocument();
    for (const item of FAQ_ITEMS) {
      expect(screen.getByText(item.question)).toBeInTheDocument();
    }
  });

  it('defines Class I, II, and III and the three FDA statuses', async () => {
    const user = userEvent.setup();
    render(<RecallFaq />);

    await user.click(screen.getByText(/what do fda class i, class ii, and class iii mean/i));
    expect(screen.getByText('Class I')).toBeInTheDocument();
    expect(screen.getByText('Class II')).toBeInTheDocument();
    expect(screen.getByText('Class III')).toBeInTheDocument();
    expect(screen.getByText(/reasonable chance of serious health consequences/i)).toBeInTheDocument();
    expect(screen.getByText(/temporary or medically reversible/i)).toBeInTheDocument();
    expect(screen.getByText(/not likely to cause adverse health consequences/i)).toBeInTheDocument();

    await user.click(screen.getByText(/what do ongoing, completed, and terminated mean/i));
    expect(screen.getByText('Ongoing')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Terminated')).toBeInTheDocument();
    expect(screen.getByText(/still retrieving or correcting product/i)).toBeInTheDocument();
  });

  it('explains that CPSC has no FDA class or status', async () => {
    const user = userEvent.setup();
    render(<RecallFaq />);

    await user.click(
      screen.getByText(/why do cpsc recalls say .+consumer product.+and have no status/i),
    );
    expect(screen.getByText(/does not classify notices as class i, ii, or iii/i)).toBeInTheDocument();
    expect(screen.getByText(/leaves status blank/i)).toBeInTheDocument();
  });
});
