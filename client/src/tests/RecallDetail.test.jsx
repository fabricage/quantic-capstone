/**
 * RecallDetail.test.jsx
 * Purpose: Detail fields, Back/Save, missing-recall recovery, sparse notice, category cue.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RecallDetail from '../components/RecallDetail.jsx';

const fullRecall = {
  id: 'F-123-2024',
  firm: 'Acme Foods',
  product: 'Infant formula milk-based powder',
  reason:
    'The product is being recalled because it has the potential to be contaminated with Cronobacter sakazakii which can cause serious and sometimes fatal infections in infants.',
  classification: 'Class I',
  status: 'Ongoing',
  state: 'CA',
  recallDate: '20240115',
  source: 'food',
  imageUrl: '',
  imageAlt: '',
};

describe('RecallDetail', () => {
  it('shows the full product, firm, reason, and metadata', () => {
    render(<RecallDetail recall={fullRecall} onBack={() => {}} onSave={() => {}} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      fullRecall.product,
    );
    expect(screen.getByText('Acme Foods')).toBeInTheDocument();
    expect(screen.getByText(fullRecall.reason)).toBeInTheDocument();
    expect(screen.getByText('Class I')).toBeInTheDocument();
    expect(screen.getByText('Ongoing')).toBeInTheDocument();
    expect(screen.getByText('CA')).toBeInTheDocument();
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
  });

  it('calls onBack and onSave', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onSave = vi.fn();
    render(<RecallDetail recall={fullRecall} onBack={onBack} onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onSave).toHaveBeenCalledWith(fullRecall);
  });

  it('shows Saved when the recall is already bookmarked', () => {
    render(<RecallDetail recall={fullRecall} saved onBack={() => {}} onSave={() => {}} />);
    expect(screen.getByRole('button', { name: /^saved$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<RecallDetail recall={fullRecall} onBack={onBack} onSave={() => {}} />);
    await user.keyboard('{Escape}');
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('recovers when the recall is missing', () => {
    render(<RecallDetail recall={null} onBack={() => {}} onSave={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn’t open that recall/i);
  });

  it('notices a sparse bookmark record', () => {
    render(
      <RecallDetail
        recall={{
          id: 'F-1',
          product: 'Infant formula',
          recallDate: '20240115',
          firm: '',
          reason: '',
          classification: '',
          status: '',
          state: '',
          source: 'food',
          imageUrl: '',
        }}
        onBack={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByText(/full fields unavailable/i)).toBeInTheDocument();
  });

  it('shows a CPSC photo in detail when the API sent Images', () => {
    render(
      <RecallDetail
        recall={{
          id: 'cpsc-26669',
          firm: 'Voomf',
          product: 'Crib mattress',
          reason: 'Entrapment',
          classification: 'Consumer Product',
          status: '',
          state: '',
          recallDate: '20260806',
          source: 'consumer',
          imageUrl: 'https://www.cpsc.gov/s3fs-public/crib.jpg',
          imageAlt: 'Recalled crib mattress',
        }}
        onBack={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'https://www.cpsc.gov/s3fs-public/crib.jpg',
    );
    expect(screen.getByText('Recalled crib mattress')).toBeInTheDocument();
    expect(screen.getByText('CPSC consumer product')).toBeInTheDocument();
    expect(screen.queryByText(/category illustration/i)).not.toBeInTheDocument();
  });

  it('shows an FDA category illustration and caption when imageUrl is empty', () => {
    render(<RecallDetail recall={fullRecall} onBack={() => {}} onSave={() => {}} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/category-images/formula.svg');
    expect(screen.getByText(/category illustration/i)).toBeInTheDocument();
  });
});
