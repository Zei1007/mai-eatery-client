import { Product, InventoryItem } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Meals', price: 95, category: 'Meals', image: 'https://picsum.photos/seed/tapsilog/400/400' },
  { id: 'p2', name: 'Longsilog', price: 85, category: 'Meals', image: 'https://picsum.photos/seed/longsilog/400/400' },
  { id: 'p3', name: 'Bangsilog', price: 105, category: 'Meals', image: 'https://picsum.photos/seed/bangsilog/400/400' },
  { id: 'p4', name: 'Tocilog', price: 85, category: 'Meals', image: 'https://picsum.photos/seed/tocilog/400/400' },
  { id: 'p5', name: 'Chicksilog', price: 90, category: 'Meals', image: 'https://picsum.photos/seed/chicksilog/400/400' },
  { id: 'p6', name: 'Extra Rice', price: 15, category: 'Sides', image: 'https://picsum.photos/seed/rice/400/400' },
  { id: 'p7', name: 'Extra Egg', price: 15, category: 'Sides', image: 'https://picsum.photos/seed/egg/400/400' },
  { id: 'p8', name: 'Iced Tea', price: 25, category: 'Drinks', image: 'https://picsum.photos/seed/icedtea/400/400' },
  { id: 'p9', name: 'Softdrinks', price: 20, category: 'Drinks', image: 'https://picsum.photos/seed/soda/400/400' },
  { id: 'p10', name: 'Coffee', price: 20, category: 'Drinks', image: 'https://picsum.photos/seed/coffee/400/400' },
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'i1', name: 'Beef Tapa', quantity: 10, unit: 'kg', minThreshold: 2 },
  { id: 'i2', name: 'Rice', quantity: 2, unit: 'sacks', minThreshold: 0.5 },
  { id: 'i3', name: 'Eggs', quantity: 120, unit: 'pcs', minThreshold: 30 },
  { id: 'i4', name: 'Longganisa', quantity: 5, unit: 'kg', minThreshold: 1 },
  { id: 'i5', name: 'Bangus', quantity: 15, unit: 'pcs', minThreshold: 5 },
  { id: 'i6', name: 'Tocino', quantity: 5, unit: 'kg', minThreshold: 1 },
  { id: 'i7', name: 'Chicken', quantity: 8, unit: 'kg', minThreshold: 2 },
  { id: 'i8', name: 'Cooking Oil', quantity: 10, unit: 'liters', minThreshold: 2 },
];
