import { useState, useEffect, useCallback } from 'react';
import { Order, ProductIngredient } from '../types';
import { ordersApi } from '../api/orders';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

interface DateFilter {
  start: string;
  end: string;
}

export function useOrders(enabled: boolean, dateFilter: DateFilter) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const start = dateFilter.start
        ? startOfDay(parseISO(dateFilter.start)).getTime()
        : undefined;
      const end = dateFilter.end
        ? endOfDay(parseISO(dateFilter.end)).getTime()
        : undefined;
      const res = await ordersApi.list(start, end);
      setOrders(res.data);
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [enabled, dateFilter.start, dateFilter.end]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const checkout = useCallback(async (items: { productId: string; quantity: number; ingredients?: ProductIngredient[] }[]) => {
    const res = await ordersApi.checkout(items);
    await refetch();
    return res.data;
  }, [refetch]);

  return { orders, loading, refetch, checkout };
}
