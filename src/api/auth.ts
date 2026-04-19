import apiClient from './client';

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<{ access_token: string }>('/auth/login', { username, password }),

  logout: () => apiClient.post('/auth/logout'),

  me: () => apiClient.get<{ username: string }>('/auth/me'),
};
