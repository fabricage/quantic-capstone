/**
 * SearchBar.jsx
 * Purpose: Labeled keyword form used to narrow the browse list.
 */
export default function SearchBar({ query = '', onChange, onSearch }) {
  function handleSubmit(event) {
    event.preventDefault();
    onSearch(String(query ?? '').trim());
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <label htmlFor="recall-search">Search recalls</label>
      <div className="search-bar-row">
        <input
          id="recall-search"
          type="search"
          name="q"
          value={query}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Product or firm, e.g. formula"
          autoComplete="off"
        />
        <button type="submit">Search</button>
      </div>
    </form>
  );
}
