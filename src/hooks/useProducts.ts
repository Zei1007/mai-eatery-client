import { useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { productsApi } from '../api/products';

export function useProducts(enabled: boolean) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await productsApi.list();
      setProducts(res.data);
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createProduct = useCallback(async (data: Omit<Product, 'id'>) => {
    await productsApi.create(data);
    await refetch();
  }, [refetch]);

  const updateProduct = useCallback(async (id: string, data: Partial<Omit<Product, 'id'>>) => {
    await productsApi.update(id, data);
    await refetch();
  }, [refetch]);

  const deleteProduct = useCallback(async (id: string) => {
    await productsApi.delete(id);
    await refetch();
  }, [refetch]);

  return { products, loading, refetch, createProduct, updateProduct, deleteProduct };
}
