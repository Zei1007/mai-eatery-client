import { useState, useEffect, useCallback } from 'react';
import { InventoryItem } from '../types';
import { inventoryApi } from '../api/inventory';

interface StockAdjust {
  amount: number;
  type: 'addition' | 'reduction';
  reason?: string;
}

export function useInventory(enabled: boolean) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await inventoryApi.list();
      setInventory(res.data);
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const adjustStock = useCallback(async (id: string, data: StockAdjust) => {
    await inventoryApi.adjust(id, data);
    await refetch();
  }, [refetch]);

  const createItem = useCallback(async (data: Omit<InventoryItem, 'id'>) => {
    await inventoryApi.create(data);
    await refetch();
  }, [refetch]);

  const importCSV = useCallback(async (file: File) => {
    await inventoryApi.importCSV(file);
    await refetch();
  }, [refetch]);

  const deleteItem = useCallback(async (id: string) => {
    await inventoryApi.delete(id);
    await refetch();
  }, [refetch]);

  return { inventory, loading, refetch, adjustStock, importCSV, createItem, deleteItem };
}
