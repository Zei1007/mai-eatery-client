import apiClient from './client';

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const exportsApi = {
  inventory: async () => {
    const res = await apiClient.get('/export/inventory', { responseType: 'blob' });
    downloadBlob(res.data, 'inventory.csv');
  },

  orders: async (start?: number, end?: number) => {
    const res = await apiClient.get('/export/orders', { params: { start, end }, responseType: 'blob' });
    downloadBlob(res.data, 'orders.csv');
  },

  stockLogs: async () => {
    const res = await apiClient.get('/export/stock-logs', { responseType: 'blob' });
    downloadBlob(res.data, 'stock_logs.csv');
  },

  auditLogs: async () => {
    const res = await apiClient.get('/export/audit-logs', { responseType: 'blob' });
    downloadBlob(res.data, 'audit_logs.csv');
  },
};
