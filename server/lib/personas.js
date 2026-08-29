/**
 * personas.js
 * Purpose: Four synthetic household presets. No PII, no sign-up.
 *
 * attributes stay server-side for the ranking prompt. The public list
 * only exposes id, label, and description.
 */

const PERSONAS = [
  {
    id: 'parent-young-kids',
    label: 'Parent with young kids',
    description: 'Formula, lunchbox snacks, and foods kids eat often.',
    attributes: {
      ageBand: '25-40',
      hasKids: true,
      household: 'family with young children',
      notes:
        'Prioritize infant formula, dairy, lunchbox foods, and allergens in products marketed to children.',
    },
  },
  {
    id: 'renter-twenties',
    label: 'Renter in their twenties',
    description: 'Convenience foods, coffee, and budget groceries.',
    attributes: {
      ageBand: '20-29',
      hasKids: false,
      household: 'apartment, possibly roommates',
      notes:
        'Prioritize ready-to-eat meals, frozen foods, coffee drinks, and inexpensive staples.',
    },
  },
  {
    id: 'retiree-meds',
    label: 'Retiree managing medications',
    description: 'Supplements, medical foods, and diet-related recalls.',
    attributes: {
      ageBand: '65+',
      hasKids: false,
      household: 'one or two adults',
      notes:
        'Prioritize dietary supplements, medical foods, low-sodium products, and pharmacy-adjacent items.',
    },
  },
  {
    id: 'allergy-household',
    label: 'Household with food allergies',
    description: 'Undeclared allergens and cross-contact risks.',
    attributes: {
      ageBand: 'any',
      hasKids: false,
      household: 'mixed ages, allergy-aware',
      notes:
        'Prioritize undeclared peanut, tree nut, milk, egg, sesame, soy, wheat, and cross-contact recalls.',
    },
  },
];

export function getPersonaById(id) {
  if (!id) return null;
  return PERSONAS.find((persona) => persona.id === id) ?? null;
}

export function listPersonas() {
  return PERSONAS.map(({ id, label, description }) => ({ id, label, description }));
}
