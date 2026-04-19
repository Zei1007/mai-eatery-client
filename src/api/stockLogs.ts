import apiClient from './client';
import { StockLog } from '../types';

export const stockLogsApi = {
  list: (itemId?: string, start?: number, end?: number) =>
    apiClient.get<StockLog[]>('/stock-logs', { params: { item_id: itemId, start, end } }),
};
