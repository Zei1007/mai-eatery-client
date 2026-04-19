import { useState, useEffect, useCallback } from 'react';
import { InventoryItem } from '../types';
import { reportsApi, ProductRanking } from '../api/reports';

export function useReports(enabled: boolean) {
  const [rankings, setRankings] = useState<ProductRanking[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const [rankingsRes, lowStockRes] = await Promise.all([
        reportsApi.rankings(),
        reportsApi.lowStock(),
      ]);
      setRankings(rankingsRes.data.rankings);
      setLowStock(lowStockRes.data);
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { rankings, lowStock, loading, refetch };
}
