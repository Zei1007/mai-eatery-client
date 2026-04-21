import apiClient from './client';
import { InventoryItem } from '../types';

interface StockAdjust {
  amount: number;
  type: 'addition' | 'reduction';
  reason?: string;
}

export const inventoryApi = {
  list: () => apiClient.get<InventoryItem[]>('/inventory'),

  get: (id: string) => apiClient.get<InventoryItem>(`/inventory/${id}`),

  create: (data: Omit<InventoryItem, 'id'>) => apiClient.post<InventoryItem>('/inventory', data),

  update: (id: string, data: Partial<Omit<InventoryItem, 'id'>>) =>
    apiClient.put<InventoryItem>(`/inventory/${id}`, data),

  delete: (id: string, reason?: string) =>
    apiClient.delete(`/inventory/${id}`, { data: { reason } }),

  adjust: (id: string, data: StockAdjust) =>
    apiClient.post<InventoryItem>(`/inventory/${id}/adjust`, data),

  importCSV: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<InventoryItem[]>('/inventory/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
