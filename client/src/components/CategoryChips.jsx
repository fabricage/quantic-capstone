/**
 * CategoryChips.jsx
 * Purpose: Server-defined product types. Food chips hide on Consumer, and
 * vice versa. All shows both groups. Selecting the active chip clears it.
 */
export default function CategoryChips({
  categories = [],
  source = 'all',
  selectedId = '',
  onSelect,
}) {
  const rows = (Array.isArray(categories) ? categories : []).filter((row) => {
    if (!row?.id || !row?.label) return false;
    const sources = Array.isArray(row.sources) ? row.sources : [];
    if (source === 'all') return sources.length > 0;
    return sources.includes(source);
  });
  const food = rows.filter((row) => row.sources.includes('food'));
  const consumer = rows.filter((row) => row.sources.includes('consumer'));
  if (!food.length && !consumer.length) return null;

  function renderGroup(label, items) {
    if (!items.length) return null;
    const headingId = `category-chips-${label}`;
    return (
      <div className="category-chips-group" key={label}>
        {source === 'all' ? (
          <p id={headingId} className="category-chips-group-label">
            {label}
          </p>
        ) : null}
        <div
          className="category-chips-row"
          role="group"
          aria-label={source === 'all' ? label : 'Product type'}
        >
          {items.map((item) => {
            const selected = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                className={selected ? 'is-selected' : undefined}
                aria-pressed={selected}
                onClick={() => onSelect?.(selected ? '' : item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="category-chips">
      <p className="category-chips-label">Browse by type</p>
      {renderGroup('FDA food', food)}
      {renderGroup('CPSC consumer', consumer)}
    </div>
  );
}
