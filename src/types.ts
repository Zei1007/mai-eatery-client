
export type IngredientUnit = 'kg' | 'g' | 'pcs' | 'liters' | 'ml' | 'sacks' | 'grams';

export interface ProductIngredient {
  inventoryItemId: string;
  inventoryItemName: string;
  quantity: number;
  unit: IngredientUnit;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: 'Meals' | 'Drinks' | 'Sides' | 'Others';
  image?: string;
  ingredients?: ProductIngredient[];
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: 'kg' | 'pcs' | 'liters' | 'sacks' | 'grams';
  minThreshold: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  timestamp: number;
}

export interface StockLog {
  id: string;
  itemId: string;
  itemName?: string;
  itemUnit?: string;
  change: number;
  type: 'addition' | 'reduction' | 'sale';
  timestamp: number;
  reason?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  user: string;
  timestamp: number;
  type: 'auth' | 'inventory' | 'order' | 'menu' | 'system';
}
