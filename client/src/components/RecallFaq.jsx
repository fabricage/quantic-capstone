/**
 * RecallFaq.jsx
 * Purpose: Static glossary at the bottom of the page. Explains the fields
 * that already appear on cards — class, status, source, origin — without
 * another network call.
 */
import { FAQ_ITEMS, FAQ_LEDE, FAQ_TITLE } from '../lib/recallFaq.js';

export default function RecallFaq() {
  return (
    <section className="recall-faq" aria-labelledby="recall-faq-heading">
      <p className="recall-faq-eyebrow">Glossary</p>
      <h2 id="recall-faq-heading" className="recall-faq-title">
        {FAQ_TITLE}
      </h2>
      <p className="recall-faq-lede">{FAQ_LEDE}</p>

      <div className="recall-faq-list">
        {FAQ_ITEMS.map((item) => (
          <details key={item.id} className="recall-faq-item">
            <summary>{item.question}</summary>
            <div className="recall-faq-body">
              {item.paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
              {Array.isArray(item.terms) && item.terms.length > 0 ? (
                <dl>
                  {item.terms.map((entry) => (
                    <div key={entry.term} className="recall-faq-term">
                      <dt>{entry.term}</dt>
                      <dd>{entry.definition}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
