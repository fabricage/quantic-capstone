/**
 * SuggestedSearchChips.jsx
 * Purpose: Two stacked marquees (FDA left, CPSC right) of 8 company chips.
 * Lookback radios stay above. Duplicate tracks are aria-hidden so each
 * firm is announced once; animation pauses on hover/focus.
 */
import {
  LOOKBACK_WINDOWS,
  chipAccessibleName,
  firmMonogram,
  formatRecallCount,
  suggestionCount,
  suggestionPhrase,
} from '../lib/suggestedChips.js';

function ChipList({ group, onSelect, headingId, hidden = false }) {
  return (
    <ul
      className="suggested-search-chip-list"
      aria-hidden={hidden ? true : undefined}
      aria-labelledby={!hidden && group.label ? headingId : undefined}
    >
      {group.suggestions.map((item, index) => {
        const phrase = suggestionPhrase(item);
        if (!phrase) return null;
        const count = suggestionCount(item);
        const countLabel = formatRecallCount(count);
        return (
          <li key={`${hidden ? 'dup' : 'live'}:${group.source}:${phrase}:${index}`}>
            <button
              type="button"
              className="suggested-search-chip"
              aria-label={chipAccessibleName(phrase, count)}
              tabIndex={hidden ? -1 : undefined}
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
  );
}

function ChipMarquee({ group, onSelect }) {
  const headingId = `suggested-searches-${group.id || group.source}`;
  // CPSC runs the other way so the two rows don't read as one long list.
  const reverse = group.source === 'consumer';

  return (
    <div className="suggested-search-group">
      {group.label ? (
        <p id={headingId} className="suggested-search-group-label">
          {group.label}
        </p>
      ) : null}
      <div
        className={`suggested-search-marquee${reverse ? ' is-reverse' : ''}`}
        data-direction={reverse ? 'right' : 'left'}
        role="region"
        aria-label={`${group.label || 'Companies'}. Scrolls automatically; hover or focus to pause.`}
      >
        <div className="suggested-search-marquee-track">
          <ChipList group={group} onSelect={onSelect} headingId={headingId} />
          <ChipList group={group} onSelect={onSelect} headingId={headingId} hidden />
        </div>
      </div>
    </div>
  );
}

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
        <h2 id="suggested-searches-label" className="suggested-search-chips-label">
          {label}
        </h2>
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
      {usable.map((group) => (
        <ChipMarquee key={group.id || group.source} group={group} onSelect={onSelect} />
      ))}
    </div>
  );
}
