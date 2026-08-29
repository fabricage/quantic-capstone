/**
 * PersonaCards.jsx
 * Purpose: Toggle a synthetic persona. Card 10 will use the selection to rank.
 */
export default function PersonaCards({ personas = [], selectedId = '', onSelect }) {
  if (!personas.length) return null;

  return (
    <section className="persona-cards" aria-label="Personas">
      <h2 className="persona-cards-title">Who is this for?</h2>
      <p className="persona-cards-lede">
        Optional. Search order does not change yet — ranking comes in the next card.
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
