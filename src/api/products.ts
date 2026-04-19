import apiClient from './client';
import { Product } from '../types';

export const productsApi = {
  list: (search?: string, category?: string) =>
    apiClient.get<Product[]>('/products', { params: { search, category } }),

  get: (id: string) => apiClient.get<Product>(`/products/${id}`),

  create: (data: Omit<Product, 'id'>) => apiClient.post<Product>('/products', data),

  update: (id: string, data: Partial<Omit<Product, 'id'>>) =>
    apiClient.put<Product>(`/products/${id}`, data),

  delete: (id: string) => apiClient.delete(`/products/${id}`),
};
