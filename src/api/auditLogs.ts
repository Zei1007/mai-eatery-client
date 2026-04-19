import apiClient from './client';
import { AuditLog } from '../types';

export const auditLogsApi = {
  list: (logType?: string, user?: string, start?: number, end?: number) =>
    apiClient.get<AuditLog[]>('/audit-logs', { params: { log_type: logType, user, start, end } }),
};
