import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('tapsi_token'));
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (isLoggedIn) {
      authApi.me()
        .then((res) => setUsername(res.data.username))
        .catch(() => {
          localStorage.removeItem('tapsi_token');
          setIsLoggedIn(false);
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for 401-triggered logout from axios interceptor
  useEffect(() => {
    const handler = () => setIsLoggedIn(false);
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const login = useCallback(async (user: string, pass: string) => {
    setLoading(true);
    try {
      const res = await authApi.login(user, pass);
      localStorage.setItem('tapsi_token', res.data.access_token);
      setIsLoggedIn(true);
      setUsername(user);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore — token may already be expired
    }
    localStorage.removeItem('tapsi_token');
    setIsLoggedIn(false);
    setUsername('');
  }, []);

  return { isLoggedIn, username, loading, login, logout };
}
