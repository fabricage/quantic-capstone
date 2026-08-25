/**
 * categoryImage.js
 * Purpose: Map product text to a category SVG. openFDA has no product photos.
 *
 * More specific patterns run first. Beverages are matched before produce
 * so "apple juice" is a drink, not produce.
 */

const CATEGORIES = [
  {
    id: 'formula',
    patterns: [/\binfant formula\b/i, /\bbaby formula\b/i, /\bformula\b/i],
  },
  {
    id: 'nuts',
    patterns: [
      /\balmonds?\b/i,
      /\bwalnuts?\b/i,
      /\bpeanuts?\b/i,
      /\bcashews?\b/i,
      /\bpistachios?\b/i,
      /\bpecans?\b/i,
      /\bhazelnuts?\b/i,
      /\bnut butter\b/i,
      /\bnuts?\b/i,
    ],
  },
  {
    id: 'dairy',
    patterns: [
      /\bice cream\b/i,
      /\byogurt\b/i,
      /\bcheese\b/i,
      /\bbutter\b/i,
      /\bcream\b/i,
      /\bmilk\b/i,
      /\bdairy\b/i,
    ],
  },
  {
    id: 'seafood',
    patterns: [
      /\bshellfish\b/i,
      /\bseafood\b/i,
      /\bsalmon\b/i,
      /\btuna\b/i,
      /\bshrimp\b/i,
      /\bcrab\b/i,
      /\blobster\b/i,
      /\boysters?\b/i,
      /\bfish\b/i,
    ],
  },
  {
    id: 'meat',
    patterns: [
      /\bsausage\b/i,
      /\bchicken\b/i,
      /\bturkey\b/i,
      /\bbeef\b/i,
      /\bpork\b/i,
      /\bbacon\b/i,
      /\bham\b/i,
      /\bmeat\b/i,
    ],
  },
  {
    id: 'beverage',
    patterns: [
      /\bjuice\b/i,
      /\bsoda\b/i,
      /\bbeverage\b/i,
      /\bdrink\b/i,
      /\bcoffee\b/i,
      /\btea\b/i,
      /\bbeer\b/i,
      /\bwine\b/i,
      /\bwater\b/i,
    ],
  },
  {
    id: 'produce',
    patterns: [
      /\bspinach\b/i,
      /\blettuce\b/i,
      /\btomatoes?\b/i,
      /\bberries\b/i,
      /\bberry\b/i,
      /\bapple\b/i,
      /\bfruit\b/i,
      /\bvegetable\b/i,
      /\bproduce\b/i,
    ],
  },
  {
    id: 'packaged',
    patterns: [/.*/],
  },
];

export function matchCategory(productText) {
  const text = String(productText ?? '');
  for (const category of CATEGORIES) {
    if (category.patterns.some((pattern) => pattern.test(text))) {
      return category.id;
    }
  }
  return 'packaged';
}

export function categoryImageSrc(productText) {
  return `/category-images/${matchCategory(productText)}.svg`;
}

export function categoryImageAlt(productText) {
  const id = matchCategory(productText);
  return `${id} category`;
}
