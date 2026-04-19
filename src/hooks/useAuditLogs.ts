import { useState, useEffect, useCallback } from 'react';
import { AuditLog } from '../types';
import { auditLogsApi } from '../api/auditLogs';

export function useAuditLogs(enabled: boolean) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await auditLogsApi.list();
      setAuditLogs(res.data);
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { auditLogs, loading, refetch };
}
