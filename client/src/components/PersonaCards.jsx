/**
 * PersonaCards.jsx
 * Purpose: Toggle a synthetic persona so the current result page can be reranked.
 */
export default function PersonaCards({ personas = [], selectedId = '', onSelect }) {
  if (!personas.length) return null;

  return (
    <section className="persona-cards" aria-label="Personas">
      <h2 className="persona-cards-title">Who is this for?</h2>
      <p className="persona-cards-lede">
        Optional. We reorder this page for the selected persona and add a one-line why
        on each card. Without a ranking key, keyword order stays put.
      </p>
      <ul className="persona-card-list">
        {personas.map((persona) => {
          const selected = persona.id === selectedId;
          return (
            <li key={persona.id}>
              <button
                type="button"
                className="persona-card"
                aria-pressed={selected}
                onClick={() => onSelect?.(selected ? '' : persona.id)}
              >
                <strong>{persona.label}</strong>
                <span>{persona.description}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
