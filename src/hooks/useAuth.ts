// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { authService } from '../services/auth';
import { router } from 'expo-router';

export const useAuth = () => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const isAuth = await authService.isAuthenticated();
    if (!isAuth) {
      router.replace('/(auth)/login');
    } else {
      const userRole = await authService.getRole();
      setRole(userRole);
    }
    setLoading(false);
  };

  const logout = async () => {
    await authService.logout();
    router.replace('/(auth)/login');
  };

  return { role, loading, logout };
};