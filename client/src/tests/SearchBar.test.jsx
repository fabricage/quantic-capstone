/**
 * SearchBar.test.jsx
 * Purpose: Submit trims the query and onChange fires while typing.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SearchBar from '../components/SearchBar.jsx';

describe('SearchBar', () => {
  it('submits a trimmed query', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(
      <SearchBar query="  formula  " onChange={() => {}} onSearch={onSearch} />,
    );
    await user.click(screen.getByRole('button', { name: /search/i }));
    expect(onSearch).toHaveBeenCalledWith('formula');
  });

  it('calls onChange while typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchBar query="" onChange={onChange} onSearch={() => {}} />);
    await user.type(screen.getByRole('searchbox'), 'ab');
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.map((call) => call[0]).join('')).toContain('a');
  });

  it('keeps the label directly above the input with nothing in between', () => {
    render(<SearchBar query="" onChange={() => {}} onSearch={() => {}} />);
    const label = screen.getByText(/search recalls/i);
    const input = screen.getByRole('searchbox');
    expect(label.nextElementSibling).toContainElement(input);
  });
});
