import { useState, useEffect, useCallback } from 'react';
import { StockLog } from '../types';
import { stockLogsApi } from '../api/stockLogs';

export function useStockLogs(enabled: boolean) {
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await stockLogsApi.list();
      setStockLogs(res.data);
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { stockLogs, loading, refetch };
}
