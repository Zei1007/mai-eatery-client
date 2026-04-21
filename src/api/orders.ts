import apiClient from './client';
import { Order, ProductIngredient } from '../types';

interface CartItem {
  productId: string;
  quantity: number;
  ingredients?: ProductIngredient[];
}

export const ordersApi = {
  list: (start?: number, end?: number) =>
    apiClient.get<Order[]>('/orders', { params: { start, end } }),

  get: (id: string) => apiClient.get<Order>(`/orders/${id}`),

  checkout: (items: CartItem[]) =>
    apiClient.post<Order>('/orders/checkout', { items }),
};
