// src/services/auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  role: string;
  user_id: number;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login/', credentials);
    const { access, refresh, role, user_id } = response.data;
    
    console.log('Login response - Role:', role, 'User ID:', user_id);
    
    await AsyncStorage.setItem('access_token', access);
    await AsyncStorage.setItem('refresh_token', refresh);
    await AsyncStorage.setItem('user_role', role);
    await AsyncStorage.setItem('user_id', String(user_id)); // Ensure it's stored as string
    
    // Verify storage
    const savedRole = await AsyncStorage.getItem('user_role');
    const savedUserId = await AsyncStorage.getItem('user_id');
    console.log('Saved to storage - Role:', savedRole, 'User ID:', savedUserId);
    
    return response.data;
  },

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_role', 'user_id']);
  },

  async getRole(): Promise<string | null> {
    const role = await AsyncStorage.getItem('user_role');
    console.log('Getting role from storage:', role);
    return role;
  },

  async getUserId(): Promise<number | null> {
    const userId = await AsyncStorage.getItem('user_id');
    console.log('Getting userId from storage:', userId);
    if (userId && !isNaN(parseInt(userId, 10))) {
      return parseInt(userId, 10);
    }
    return null;
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem('access_token');
    console.log('Token exists:', !!token);
    return !!token;
  },
};