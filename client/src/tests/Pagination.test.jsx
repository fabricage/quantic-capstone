/**
 * Pagination.test.jsx
 * Purpose: Empty hide, single-page selector, numbered nav, jump, and page-size change.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Pagination from '../components/Pagination.jsx';

describe('Pagination', () => {
  it('renders nothing when total is 0', () => {
    const { container } = render(
      <Pagination
        page={1}
        pageSize={20}
        total={0}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('still shows the per-page selector on a single page', () => {
    render(
      <Pagination
        page={1}
        pageSize={20}
        total={15}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />,
    );
    expect(screen.getByLabelText(/per page/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  it('navigates with Previous, Next, and numbered pages', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        page={2}
        pageSize={20}
        total={60}
        onPageChange={onPageChange}
        onPageSizeChange={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: /previous/i }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);
    await user.click(screen.getByRole('button', { name: 'Page 1' }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it('jumps to a typed page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        page={1}
        pageSize={20}
        total={80}
        onPageChange={onPageChange}
        onPageSizeChange={() => {}}
      />,
    );
    await user.type(screen.getByLabelText(/jump to page/i), '3');
    await user.click(screen.getByRole('button', { name: /^go$/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('notifies the parent when page size changes', async () => {
    const user = userEvent.setup();
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        page={1}
        pageSize={20}
        total={15}
        onPageChange={() => {}}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    await user.selectOptions(screen.getByLabelText(/per page/i), '50');
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });
});
