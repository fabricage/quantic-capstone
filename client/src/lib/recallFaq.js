/**
 * recallFaq.js
 * Purpose: Static copy for the bottom-of-page glossary. No fetch — these
 * terms match the fields already on cards and on the detail page.
 *
 * Why a data file: the component stays a renderer, and tests can check the
 * same strings without mounting the whole app.
 */

export const FAQ_TITLE = 'How to read a recall';

export const FAQ_LEDE =
  'The words on each card come from two agencies that do not use the same vocabulary. FDA food recalls carry a class and a status. CPSC consumer-product recalls do not.';

export const FAQ_ITEMS = [
  {
    id: 'sources',
    question: 'What is the difference between FDA and CPSC?',
    paragraphs: [
      'FDA food recalls cover food, beverages, dietary supplements, and animal food that the U.S. Food and Drug Administration has listed in its Enforcement Reports.',
      'CPSC consumer-product recalls cover things you buy that are not food — cribs, tools, appliances, toys — announced by the U.S. Consumer Product Safety Commission.',
      'The Source toggle at the top of the page is Food, Consumer, or All. All shows one FDA row, then one CPSC row, repeating. Pick Food or Consumer if you only want one agency.',
    ],
  },
  {
    id: 'categories',
    question: 'What are the Dairy, Nursery, and other type chips?',
    paragraphs: [
      'Those chips are product types the server keeps as keyword lists — Dairy is milk, cheese, yogurt, and similar words; Nursery is cribs, strollers, and other infant gear. They are not shopper personas and they are not official FDA or CPSC categories.',
      'Pick one chip to narrow Latest recalls. Food types hide when you are on Consumer, and the reverse. You can still type a keyword or set Class I on top of a type. Clear search returns you to the unfiltered latest list.',
    ],
  },
  {
    id: 'fields',
    question: 'What does each field on a recall mean?',
    paragraphs: [
      'Product is the item being recalled. Firm is the company named on the notice — the recalling firm for FDA, or the manufacturer, importer, or retailer for CPSC.',
      'Reason is why the product was pulled. For FDA that is usually a contamination, undeclared allergen, or labeling problem. For CPSC it is usually the hazard (fire, entrapment, laceration).',
      'Date is the day the notice was published or announced, not the day you bought the product. Classification and Status are explained below — they only apply to FDA food.',
    ],
  },
  {
    id: 'class',
    question: 'What do FDA Class I, Class II, and Class III mean?',
    paragraphs: [
      'These are FDA health-hazard ratings for food recalls. They describe how serious the problem could be if someone used the product, not how many people bought it or how often the firm recalls.',
    ],
    terms: [
      {
        term: 'Class I',
        definition:
          'Reasonable chance of serious health consequences or death. Example: Listeria in ready-to-eat food, or infant formula with a pathogen.',
      },
      {
        term: 'Class II',
        definition:
          'May cause temporary or medically reversible harm, or the chance of serious harm is remote. Example: an undeclared allergen in a product that is not a common trigger for life-threatening reactions, or a labeling error.',
      },
      {
        term: 'Class III',
        definition:
          'Not likely to cause adverse health consequences. Example: a minor labeling issue that does not hide an allergen or a safety risk.',
      },
    ],
  },
  {
    id: 'status',
    question: 'What do Ongoing, Completed, and Terminated mean?',
    paragraphs: [
      'These statuses are FDA’s record of how far the food recall has gone. They are not a score, and they are not used by CPSC.',
    ],
    terms: [
      {
        term: 'Ongoing',
        definition:
          'The firm is still retrieving or correcting product. You may still see it on a shelf.',
      },
      {
        term: 'Completed',
        definition:
          'The firm has recovered or corrected everything it reasonably can. FDA has not yet closed the file.',
      },
      {
        term: 'Terminated',
        definition:
          'FDA has reviewed the recall and judged that reasonable efforts were made to remove or correct the product. The action is closed.',
      },
    ],
  },
  {
    id: 'cpsc',
    question: 'Why do CPSC recalls say “Consumer Product” and have no status?',
    paragraphs: [
      'CPSC does not classify notices as Class I, II, or III, and it does not use Ongoing / Completed / Terminated. Those words belong to FDA food enforcement.',
      'This site therefore shows Classification as “Consumer Product” and leaves Status blank. The important signal on a CPSC card is the hazard in Reason, plus whether a photo and a manufacturer country are present.',
      'The Classification and Status filters hide when you pick Consumer, because they would always be empty.',
    ],
  },
  {
    id: 'origin',
    question: 'What does Location (USA / China / Other) mean?',
    paragraphs: [
      'The same filter covers two different facts, because the two agencies report country differently.',
      'On an FDA card, “Recalling firm: USA” is the country of the company that issued the recall — often a U.S. distributor, even if ingredients came from elsewhere.',
      'On a CPSC card, “Manufacturer: China” is the country of manufacture when CPSC listed it. A U.S. retailer can still be named as the firm.',
    ],
  },
  {
    id: 'not-advice',
    question: 'Is this medical or legal advice?',
    paragraphs: [
      'No. This ledger restates public FDA and CPSC notices so you can search them. It is not a complete catalog of every recall, and it is not a substitute for the agency notice, a doctor, or a lawyer.',
      'If a product you own is listed, follow the instructions on the official notice — typically return, discard, or stop using it.',
    ],
  },
];
