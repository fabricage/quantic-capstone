/**
 * categories.js
 * Purpose: Server-owned product-type dictionary. A category is a named bundle
 * of keywords — not a shopper persona. The client only sees id / label / sources.
 *
 * FDA food uses Lucene ORs on product_description + reason_for_recall.
 * CPSC has no equivalent, so those rows are fetched then filtered in memory.
 *
 * `exclude` keeps "apple juice" out of Produce (juice is a Beverage).
 */

export const CATEGORIES = [
  {
    id: 'formula',
    label: 'Infant formula',
    sources: ['food'],
    keywords: ['infant formula', 'baby formula', 'formula'],
  },
  {
    id: 'dairy',
    label: 'Dairy',
    sources: ['food'],
    keywords: ['milk', 'cheese', 'yogurt', 'ice cream', 'butter', 'cream', 'dairy'],
  },
  {
    id: 'produce',
    label: 'Produce',
    sources: ['food'],
    keywords: [
      'spinach',
      'lettuce',
      'tomato',
      'tomatoes',
      'berries',
      'berry',
      'apple',
      'fruit',
      'vegetable',
      'produce',
    ],
    exclude: ['juice', 'cider', 'soda', 'drink'],
  },
  {
    id: 'nuts',
    label: 'Nuts',
    sources: ['food'],
    keywords: [
      'almond',
      'almonds',
      'walnut',
      'walnuts',
      'peanut',
      'peanuts',
      'cashew',
      'cashews',
      'pistachio',
      'pistachios',
      'pecan',
      'pecans',
      'hazelnut',
      'hazelnuts',
      'nut butter',
      'nuts',
    ],
  },
  {
    id: 'seafood',
    label: 'Seafood',
    sources: ['food'],
    keywords: [
      'shellfish',
      'seafood',
      'salmon',
      'tuna',
      'shrimp',
      'crab',
      'lobster',
      'oyster',
      'oysters',
      'fish',
    ],
  },
  {
    id: 'meat',
    label: 'Meat',
    sources: ['food'],
    keywords: ['sausage', 'chicken', 'turkey', 'beef', 'pork', 'bacon', 'ham', 'meat'],
  },
  {
    id: 'beverage',
    label: 'Beverages',
    sources: ['food'],
    keywords: [
      'juice',
      'soda',
      'beverage',
      'drink',
      'coffee',
      'tea',
      'beer',
      'wine',
      'water',
    ],
  },
  {
    id: 'nursery',
    label: 'Nursery',
    sources: ['consumer'],
    keywords: [
      'crib',
      'bassinet',
      'stroller',
      'play yard',
      'playyard',
      'high chair',
      'pacifier',
      'infant',
      'nursery',
    ],
  },
  {
    id: 'furniture',
    label: 'Furniture',
    sources: ['consumer'],
    keywords: ['dresser', 'chest', 'furniture', 'table', 'chair', 'sofa', 'mattress'],
  },
  {
    id: 'electronics',
    label: 'Electronics',
    sources: ['consumer'],
    keywords: [
      'battery',
      'lithium',
      'charger',
      'speaker',
      'headphone',
      'headphones',
      'power bank',
      'adapter',
    ],
  },
  {
    id: 'toys',
    label: 'Toys',
    sources: ['consumer'],
    keywords: ['toy', 'toys', 'doll', 'magnet', 'magnets', 'balloon'],
  },
];

const BY_ID = new Map(CATEGORIES.map((row) => [row.id, row]));

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWord(haystack, phrase) {
  const trimmed = String(phrase ?? '').trim();
  if (!trimmed) return false;
  const pattern = new RegExp(`\\b${escapeRegExp(trimmed)}\\b`, 'i');
  return pattern.test(haystack);
}

/**
 * Unknown ids and ids that do not apply to this source become null
 * (same idea as an unknown FDA classification: ignore, do not 400).
 */
export function resolveCategory(raw, source = 'all') {
  const id = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!id) return null;
  const category = BY_ID.get(id);
  if (!category) return null;
  const src = String(source ?? '').trim().toLowerCase();
  if (src && src !== 'all' && !category.sources.includes(src)) return null;
  return category;
}

export function getCategoryById(raw) {
  const id = String(raw ?? '')
    .trim()
    .toLowerCase();
  return BY_ID.get(id) || null;
}

export function publicCategories() {
  return CATEGORIES.map(({ id, label, sources }) => ({
    id,
    label,
    sources: [...sources],
  }));
}

export function publicCategory(category) {
  if (!category) return null;
  return { id: category.id, label: category.label, sources: [...category.sources] };
}

export function textMatchesCategory(text, category) {
  if (!category) return true;
  const hay = String(text ?? '');
  const excluded = (category.exclude || []).some((word) => hasWord(hay, word));
  if (excluded) return false;
  return category.keywords.some((word) => hasWord(hay, word));
}

export function recallMatchesCategory(recall, category) {
  if (!category) return true;
  const hay = [recall?.product, recall?.reason, recall?.firm].filter(Boolean).join(' ');
  return textMatchesCategory(hay, category);
}

export function applyCategoryFilter(rows, category) {
  if (!category) return Array.isArray(rows) ? rows : [];
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    recallMatchesCategory(row, category),
  );
}

export function categoryCoversSource(category, source) {
  if (!category) return false;
  if (source === 'all') return true;
  return category.sources.includes(source);
}
