/**
 * SuggestedSearchChips.jsx
 * Purpose: Grouped FDA / CPSC company chips. Hidden when every group is empty.
 * onSelect(phrase, source) so App can switch Food vs Consumer, then search.
 */
export default function SuggestedSearchChips({ label = '', groups = [], onSelect }) {
  const usable = (Array.isArray(groups) ? groups : []).filter(
    (group) => Array.isArray(group?.suggestions) && group.suggestions.length > 0,
  );
  if (!usable.length) return null;

  return (
    <div className="suggested-search-chips">
      {label ? (
        <p id="suggested-searches-label" className="suggested-search-chips-label">
          {label}
        </p>
      ) : null}
      {usable.map((group) => {
        const headingId = `suggested-searches-${group.id || group.source}`;
        return (
          <div key={group.id || group.source} className="suggested-search-group">
            {group.label ? (
              <p id={headingId} className="suggested-search-group-label">
                {group.label}
              </p>
            ) : null}
            <ul
              className="suggested-search-chip-list"
              aria-labelledby={group.label ? headingId : undefined}
            >
              {group.suggestions.map((phrase) => (
                <li key={`${group.source}:${phrase}`}>
                  <button type="button" onClick={() => onSelect?.(phrase, group.source)}>
                    {phrase}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
