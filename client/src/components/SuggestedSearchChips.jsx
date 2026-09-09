/**
 * SuggestedSearchChips.jsx
 * Purpose: Bigger FDA / CPSC company chips with a monogram + recall count.
 * A lookback row lets the user switch 1 month / 3 months / 1 year / etc.
 * onSelect(phrase, source) so App can switch Food vs Consumer, then search.
 */
import {
  LOOKBACK_WINDOWS,
  chipAccessibleName,
  firmMonogram,
  formatRecallCount,
  suggestionCount,
  suggestionPhrase,
} from '../lib/suggestedChips.js';

export default function SuggestedSearchChips({
  label = '',
  groups = [],
  windows = LOOKBACK_WINDOWS,
  windowId = '',
  ready = true,
  onWindowChange,
  onSelect,
}) {
  const usable = (Array.isArray(groups) ? groups : []).filter(
    (group) => Array.isArray(group?.suggestions) && group.suggestions.length > 0,
  );
  const windowOptions = Array.isArray(windows) && windows.length ? windows : LOOKBACK_WINDOWS;
  const showWindows = typeof onWindowChange === 'function';

  if (!usable.length && !showWindows) return null;

  return (
    <div className="suggested-search-chips">
      {label ? (
        <p id="suggested-searches-label" className="suggested-search-chips-label">
          {label}
        </p>
      ) : null}
      {showWindows ? (
        <div
          className="suggested-search-windows"
          role="radiogroup"
          aria-label="Show companies with the most recalls in this period"
        >
          {windowOptions.map((option) => {
            const selected = option.id === windowId;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={selected ? 'is-selected' : undefined}
                onClick={() => onWindowChange(option.id)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
      {usable.length === 0 && showWindows && ready ? (
        <p className="suggested-search-empty">No companies found for this period.</p>
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
              {group.suggestions.map((item, index) => {
                const phrase = suggestionPhrase(item);
                if (!phrase) return null;
                const count = suggestionCount(item);
                const countLabel = formatRecallCount(count);
                return (
                  <li key={`${group.source}:${phrase}:${index}`}>
                    <button
                      type="button"
                      className="suggested-search-chip"
                      aria-label={chipAccessibleName(phrase, count)}
                      onClick={() => onSelect?.(phrase, group.source)}
                    >
                      <span className="suggested-search-chip-logo" aria-hidden="true">
                        {firmMonogram(phrase)}
                      </span>
                      <span className="suggested-search-chip-copy">
                        <span className="suggested-search-chip-name">{phrase}</span>
                        {countLabel ? (
                          <span className="suggested-search-chip-count">{countLabel}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
