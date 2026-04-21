// Seed data has moved to the server (app/main.py).
// Category and unit options are kept here for form selects.

export const PRODUCT_CATEGORIES = ['Meals', 'Drinks', 'Sides', 'Others'] as const;
export const INVENTORY_UNITS = ['kg', 'pcs', 'liters', 'sacks', 'grams'] as const;

// Maps each inventory base unit to the selectable units when adding an ingredient
export const COMPATIBLE_INGREDIENT_UNITS: Record<string, string[]> = {
  kg:     ['kg', 'g'],
  liters: ['liters', 'ml'],
  pcs:    ['pcs'],
  sacks:  ['sacks'],
  grams:  ['grams', 'g'],
};
