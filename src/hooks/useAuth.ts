// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { authService } from '../services/auth';
import { router } from 'expo-router';

export const useAuth = () => {
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await authService.isAuthenticated();
      if (!isAuth) {
        router.replace('/(auth)/login');
      } else {
        const userRole = await authService.getRole();
        const userNumberId = await authService.getUserId();
        console.log('Auth loaded - Role:', userRole, 'UserId:', userNumberId);
        setRole(userRole);
        setUserId(userNumberId);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    router.replace('/(auth)/login');
  };

  return { role, userId, loading, logout };
};