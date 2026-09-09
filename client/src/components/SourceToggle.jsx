/**
 * SourceToggle.jsx
 * Purpose: Food / Consumer / All. Changing source is App's job to reset page.
 */
const OPTIONS = [
  { id: 'food', label: 'Food' },
  { id: 'consumer', label: 'Consumer' },
  { id: 'all', label: 'All' },
];

export default function SourceToggle({ source = 'food', onChange }) {
  return (
    <fieldset className="source-toggle">
      <legend>Source</legend>
      <div className="source-toggle-row" role="group" aria-label="Recall source">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className="source-toggle-button"
            aria-pressed={source === option.id}
            onClick={() => onChange?.(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
