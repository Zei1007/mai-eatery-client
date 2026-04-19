import apiClient from './client';
import { InventoryItem } from '../types';

export interface SalesStats {
  total_sales: number;
  order_count: number;
  avg_order_value: number;
}

export interface ProductRanking {
  name: string;
  qty: number;
}

export const reportsApi = {
  sales: (start?: number, end?: number) =>
    apiClient.get<SalesStats>('/reports/sales', { params: { start, end } }),

  rankings: (start?: number, end?: number) =>
    apiClient.get<{ rankings: ProductRanking[] }>('/reports/rankings', { params: { start, end } }),

  lowStock: () => apiClient.get<InventoryItem[]>('/reports/low-stock'),
};
