// src/services/userService.ts
import api from './api';
import { User, CreateUserRequest, UpdateUserRequest, ResetPasswordRequest } from '../types/user';

export const userService = {
  async getUsers(params?: {
    search?: string;
    role?: 'staff' | 'owner';
    active?: boolean;
  }): Promise<User[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.append('search', params.search);
      if (params?.role) queryParams.append('role', params.role);
      if (params?.active !== undefined) queryParams.append('active', String(params.active));
      
      const url = `/auth/users/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await api.get(url);
      return Array.isArray(response.data) ? response.data : (response.data.results || []);
    } catch (error: any) {
      console.error('Error fetching users:', error.response?.data || error.message);
      throw error;
    }
  },

  async createUser(data: CreateUserRequest): Promise<User> {
    try {
      const response = await api.post('/auth/users/', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating user:', error.response?.data || error.message);
      throw error;
    }
  },

  async updateUser(id: number, data: UpdateUserRequest): Promise<User> {
    try {
      const response = await api.patch(`/auth/users/${id}/`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating user:', error.response?.data || error.message);
      throw error;
    }
  },

  async resetPassword(id: number, data: ResetPasswordRequest): Promise<void> {
    try {
      await api.post(`/auth/users/${id}/reset_password/`, data);
    } catch (error: any) {
      console.error('Error resetting password:', error.response?.data || error.message);
      throw error;
    }
  },

  async deactivateUser(id: number): Promise<void> {
    try {
      await api.delete(`/auth/users/${id}/`);
    } catch (error: any) {
      console.error('Error deactivating user:', error.response?.data || error.message);
      throw error;
    }
  },

  async activateUser(id: number): Promise<void> {
    try {
      await api.post(`/auth/users/${id}/activate/`);
    } catch (error: any) {
      console.error('Error activating user:', error.response?.data || error.message);
      throw error;
    }
  },
};