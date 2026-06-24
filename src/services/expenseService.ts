// src/services/expenseService.ts
import api from './api';
import { Expense, ExpenseCategory, ExpenseFormData, ProfitReport } from '../types/expense';

export const expenseService = {
  // Expenses
  async getExpenses(): Promise<Expense[]> {
    try {
      const response = await api.get('/expenses/');
      return Array.isArray(response.data) ? response.data : (response.data.results || []);
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn('Expenses endpoint not found. Return empty array.');
        return [];
      }
      console.error('Error fetching expenses:', error);
      return [];
    }
  },

  async createExpense(data: ExpenseFormData): Promise<Expense> {
    const response = await api.post('/expenses/', data);
    return response.data;
  },

  async updateExpense(id: number, data: Partial<ExpenseFormData>): Promise<Expense> {
    const response = await api.patch(`/expenses/${id}/`, data);
    return response.data;
  },

  async deleteExpense(id: number): Promise<void> {
    await api.delete(`/expenses/${id}/`);
  },

  // Expense Categories
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    try {
      const response = await api.get('/expense-categories/');
      return Array.isArray(response.data) ? response.data : (response.data.results || []);
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn('Expense categories endpoint not found. Return empty array.');
        return [];
      }
      console.error('Error fetching expense categories:', error);
      return [];
    }
  },

  async createExpenseCategory(data: { name: string; description?: string }): Promise<ExpenseCategory> {
    const response = await api.post('/expense-categories/', data);
    return response.data;
  },

  async updateExpenseCategory(id: number, data: { name: string; description?: string }): Promise<ExpenseCategory> {
    const response = await api.patch(`/expense-categories/${id}/`, data);
    return response.data;
  },

  async deleteExpenseCategory(id: number): Promise<void> {
    await api.delete(`/expense-categories/${id}/`);
  },

  // Profit Report
  async getProfitReport(date?: string): Promise<ProfitReport> {
    try {
      const url = date ? `/reports/profit/?date=${date}` : '/reports/profit/';
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Return fallback data if endpoint doesn't exist
        console.warn('Profit report endpoint not found. Using fallback data.');
        return {
          date: date || new Date().toISOString().split('T')[0],
          revenue: 0,
          expenses: 0,
          profit: 0,
        };
      }
      throw error;
    }
  },
};